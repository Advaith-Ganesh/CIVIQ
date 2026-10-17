export const categories = [
  ["pothole", "Potholes", "pothole crater hole tarmac"],
  ["road", "Damaged roads", "road surface cracks asphalt"],
  ["light", "Broken streetlights", "streetlight lamp lighting light"],
  [
    "dumping",
    "Fly-tipping",
    "dumped dumping fly tipping mattress rubbish bags",
  ],
  ["bin", "Overflowing public bins", "bin overflowing litter"],
  ["graffiti", "Graffiti", "graffiti paint tagging"],
  ["pavement", "Damaged pavements", "pavement slab trip wheelchair"],
  ["drain", "Blocked drains", "drain flood flooding water"],
  ["sign", "Damaged traffic signs", "sign traffic bent"],
  ["obstruction", "Obstructions", "obstruction fallen branch blocking"],
  ["other", "Other infrastructure problems", ""],
] as const;
export const statuses = [
  "Submitted",
  "Under review",
  "Acknowledged",
  "Scheduled",
  "In progress",
  "Resolved pending verification",
  "Verified closed",
  "Reopened",
  "Rejected",
] as const;
export const transitions: Record<string, string[]> = {
  Submitted: ["Under review", "Acknowledged", "Rejected"],
  "Under review": ["Acknowledged", "Rejected"],
  Acknowledged: ["Scheduled", "In progress", "Rejected"],
  Scheduled: ["In progress", "Acknowledged"],
  "In progress": ["Resolved pending verification", "Scheduled"],
  "Resolved pending verification": ["Verified closed", "Reopened"],
  "Verified closed": ["Reopened"],
  Reopened: ["Under review", "Acknowledged", "In progress"],
  Rejected: ["Under review"],
};
export const defaultWeights = [35, 20, 15, 10, 10, 10];
export const weightNames = [
  "Visible severity",
  "Public impact / accessibility",
  "Recurrence and age",
  "Independent confirmations",
  "Location context",
  "Evidence confidence",
];
export function classify(
  text: string,
  catalog: readonly (readonly [string, string, string])[] = categories,
) {
  const words: string[] = text.toLowerCase().match(/[a-z]+/g) || [];
  const ranked = catalog
    .map(([id, name, keywords]) => ({
      id,
      name,
      hits: keywords.split(" ").filter((w) => w && words.includes(w)).length,
    }))
    .sort((a, b) => b.hits - a.hits);
  const top = ranked[0];
  const ambiguous = !top?.hits || top.hits === ranked[1]?.hits;
  return {
    categoryId: top?.hits ? top.id : "other",
    confidence: ambiguous ? 0.35 : Math.min(0.9, 0.5 + top.hits * 0.12),
    explanation: ambiguous
      ? "Ambiguous wording; human classification required. No photograph analysis performed."
      : `Keyword rules matched ${top.hits} term(s) for ${top.name}. No photograph analysis performed.`,
    severity: /exposed|danger|deep|injur|wheelchair|live wire|collapse/i.test(
      text,
    )
      ? 5
      : /blocked|broken|overflow|flood/i.test(text)
        ? 3
        : 2,
    urgent: /live wire|exposed cable|collapse|injur|danger/i.test(text),
  };
}
export function haversine(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
) {
  const r = Math.PI / 180,
    dlat = (b.lat - a.lat) * r,
    dlng = (b.lng - a.lng) * r;
  return (
    6371000 *
    2 *
    Math.atan2(
      Math.sqrt(
        Math.sin(dlat / 2) ** 2 +
          Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dlng / 2) ** 2,
      ),
      Math.sqrt(
        1 -
          (Math.sin(dlat / 2) ** 2 +
            Math.cos(a.lat * r) *
              Math.cos(b.lat * r) *
              Math.sin(dlng / 2) ** 2),
      ),
    )
  );
}
export function similarity(a: string, b: string) {
  const tokenize = (s: string) =>
    new Set(
      (s.toLowerCase().match(/[a-z0-9]+/g) || []).filter(
        (w) =>
          w.length > 2 &&
          ![
            "the",
            "and",
            "this",
            "near",
            "with",
            "there",
            "that",
            "outside",
          ].includes(w),
      ),
    );
  const x = tokenize(a),
    y = tokenize(b);
  return (
    [...x].filter((w) => y.has(w)).length /
    Math.max(1, new Set([...x, ...y]).size)
  );
}
export type Candidate = {
  id: string;
  categoryId: string;
  description: string;
  lat: number;
  lng: number;
  status: string;
  createdAt: Date;
};
export function duplicateMatches(
  input: { categoryId: string; description: string; lat: number; lng: number },
  issues: Candidate[],
  threshold = 75,
  now = new Date(),
) {
  return issues
    .flatMap((i) => {
      const distance = haversine(input, i),
        text = similarity(input.description, i.description),
        age = (now.getTime() - new Date(i.createdAt).getTime()) / 86400000;
      if (
        distance > threshold ||
        i.categoryId !== input.categoryId ||
        ["Verified closed", "Rejected"].includes(i.status) ||
        age > 90
      )
        return [];
      const assets = (s: string) =>
        s
          .toLowerCase()
          .match(/(?:lamp|column|asset|pole)\s*#?\s*([a-z]*\d+)/)?.[1];
      const distinct =
        input.categoryId === "light" &&
        assets(input.description) &&
        assets(i.description) &&
        assets(input.description) !== assets(i.description);
      if (distinct) return [];
      const score = Math.min(
        0.95,
        0.4 * (1 - distance / threshold) +
          0.4 * text +
          0.1 +
          0.1 * Math.max(0, 1 - age / 90),
      );
      return score < 0.35
        ? []
        : [
            {
              issueId: i.id,
              score,
              distance,
              explanation: `${Math.round(distance)} m apart; same category; ${Math.round(text * 100)}% word overlap; ${Math.max(0, Math.round(age))} days old. Human confirmation required${input.categoryId === "light" ? "; nearby lamps may be separate assets" : ""}.`,
            },
          ];
    })
    .sort((a, b) => b.score - a.score);
}
export function priority(
  input: {
    severity: number;
    description: string;
    ageDays: number;
    reports: number;
    recurrence: number;
    context: number;
    evidenceConfidence: number;
  },
  weights = defaultWeights,
) {
  const values = [
    input.severity / 5,
    /wheelchair|school|crossing|blocking|access/i.test(input.description)
      ? 1
      : 0.4,
    Math.min(1, input.ageDays / 30 + input.recurrence * 0.2),
    Math.min(1, Math.max(0, input.reports - 1) / 4),
    input.context,
    input.evidenceConfidence,
  ];
  const breakdown = weightNames.map((name, i) => ({
    name,
    weight: weights[i],
    value: Math.max(0, Math.min(1, values[i])),
    points:
      Math.round(weights[i] * Math.max(0, Math.min(1, values[i])) * 10) / 10,
  }));
  return {
    score: Math.min(
      100,
      Math.round(breakdown.reduce((s, x) => s + x.points, 0)),
    ),
    breakdown,
  };
}
export function canTransition(from: string, to: string, hasRepair = false) {
  return (
    !!transitions[from]?.includes(to) &&
    (!["Resolved pending verification", "Verified closed"].includes(to) ||
      hasRepair)
  );
}
export function financialModel(
  reports: number,
  duplicates: number,
  minutes: number,
  hourly: number,
  monthly: number,
) {
  const hours = (reports * (duplicates / 100) * minutes) / 60;
  return {
    hours,
    value: hours * hourly,
    cost: monthly * 12,
    difference: hours * hourly - monthly * 12,
  };
}
