import { haversine } from "./rules";
import { recordType } from "./provenance";
export type GeoIssue = {
  id: string;
  lat: number;
  lng: number;
  categoryId: string;
  location: string;
  createdAt: Date | string;
  synthetic: boolean;
  dataType?: string;
};
export function findHotspots(
  issues: GeoIssue[],
  days = 30,
  radius = 150,
  now = new Date(),
) {
  const recent = issues.filter(
    (i) =>
      new Date(i.createdAt).getTime() <= now.getTime() &&
      new Date(i.createdAt).getTime() >= now.getTime() - days * 86400000,
  );
  const used = new Set<string>();
  return recent
    .flatMap((issue) => {
      if (used.has(issue.id)) return [];
      const members = recent.filter(
        (i) =>
          !used.has(i.id) &&
          i.categoryId === issue.categoryId &&
          recordType(i) === recordType(issue) &&
          haversine(issue, i) <= radius,
      );
      members.forEach((i) => used.add(i.id));
      if (members.length < 2) return [];
      const dates = members.map((i) => new Date(i.createdAt).getTime());
      return [
        {
          id: issue.id,
          location: issue.location,
          categoryId: issue.categoryId,
          dataType: recordType(issue),
          count: members.length,
          days,
          radius,
          lat: members.reduce((s, i) => s + i.lat, 0) / members.length,
          lng: members.reduce((s, i) => s + i.lng, 0) / members.length,
          recurrenceRate: (members.length - 1) / days,
          lastObserved: new Date(Math.max(...dates)).toISOString(),
          issueIds: members.map((i) => i.id),
          limitation:
            "Small observed sample; concentration is not a population-adjusted risk estimate. Distinct assets may be unrelated.",
        },
      ];
    })
    .sort((a, b) => b.count - a.count);
}
