import { PrismaClient } from "@prisma/client";
import { categories, classify, priority } from "../src/lib/rules";
const db = new PrismaClient();
export async function seed(reset = false) {
  if (reset) {
    const demoIssues = await db.issue.findMany({
      where: { synthetic: true },
      include: {
        reports: { include: { matches: true } },
        matches: { include: { report: true } },
      },
    });
    const ids = demoIssues
      .filter(
        (i) =>
          !i.reports.some((r) => !r.synthetic) &&
          !i.matches.some((m) => !m.report.synthetic),
      )
      .map((i) => i.id);
    const repairPhotos = await db.repairEvidence.findMany({
      where: { issueId: { in: ids } },
      select: { photographId: true },
    });
    await db.$transaction([
      db.duplicateMatch.deleteMany({
        where: {
          OR: [{ issueId: { in: ids } }, { report: { issueId: { in: ids } } }],
        },
      }),
      db.repairEvidence.deleteMany({ where: { issueId: { in: ids } } }),
      db.photograph.deleteMany({
        where: {
          OR: [
            { report: { issueId: { in: ids } } },
            { id: { in: repairPhotos.map((p) => p.photographId) } },
          ],
        },
      }),
      db.report.deleteMany({ where: { issueId: { in: ids } } }),
      db.event.deleteMany({ where: { issueId: { in: ids } } }),
      db.assignment.deleteMany({ where: { issueId: { in: ids } } }),
      db.assessment.deleteMany({ where: { issueId: { in: ids } } }),
      db.issue.deleteMany({ where: { id: { in: ids } } }),
    ]);
  }
  for (const [id, name, role] of [
    ["resident", "Anonymous resident", "resident"],
    ["officer", "Demo maintenance officer", "staff"],
    ["system", "Deterministic rules", "system"],
  ])
    await db.actor.upsert({
      where: { id },
      update: {},
      create: { id, name, role },
    });
  for (const [id, name, area] of [
    ["highways", "Highways & accessibility", "Citywide roads and footways"],
    ["clean", "Clean streets", "City centre and neighbourhoods"],
    ["lighting", "Lighting & drainage", "Citywide infrastructure"],
  ])
    await db.team.upsert({
      where: { id },
      update: {},
      create: { id, name, area },
    });
  for (const [id, name, keywords] of categories)
    await db.category.upsert({
      where: { id },
      update: {},
      create: {
        id,
        name,
        keywords,
        teamId: ["pothole", "road", "pavement", "sign", "obstruction"].includes(
          id,
        )
          ? "highways"
          : ["light", "drain"].includes(id)
            ? "lighting"
            : "clean",
      },
    });
  await db.setting.upsert({
    where: { id: "config" },
    update: {},
    create: {
      id: "config",
      value: JSON.stringify({
        weights: [35, 20, 15, 10, 10, 10],
        distance: 75,
      }),
    },
  });
  await db.datasetSource.upsert({
    where: { id: "southampton-waste" },
    update: {},
    create: {
      id: "southampton-waste",
      title: "Southampton Data Observatory: Waste",
      url: "https://data.southampton.gov.uk/place/environment/waste/",
      period: "2024/25",
      retrievedAt: new Date("2026-10-17"),
      note: "47.1 fly-tipping incidents per 1,000 residents. Page updated 29 June 2026. Aggregate statistic only; issue locations are synthetic.",
    },
  });
  const fixtures = [
    [
      "pothole",
      "Deep pothole blocking wheelchair access at the crossing",
      "Portswood Road",
      50.927,
      -1.395,
      "Under review",
    ],
    [
      "light",
      "Broken streetlight lamp A101 near the junction",
      "Above Bar Street",
      50.9098,
      -1.4045,
      "Acknowledged",
    ],
    [
      "light",
      "Broken streetlight lamp A102 near the junction",
      "Above Bar Street",
      50.9099,
      -1.4044,
      "Submitted",
    ],
    [
      "dumping",
      "Dumped mattress and rubbish bags blocking the footpath",
      "St Mary’s Road",
      50.913,
      -1.396,
      "Scheduled",
    ],
    [
      "bin",
      "Overflowing bin outside the park entrance",
      "East Park",
      50.911,
      -1.402,
      "In progress",
    ],
    [
      "graffiti",
      "Graffiti paint on the wall by the walkway",
      "Ocean Village",
      50.898,
      -1.392,
      "Acknowledged",
    ],
    [
      "pavement",
      "Broken pavement slab causing a wheelchair trip danger",
      "Shirley High Street",
      50.923,
      -1.428,
      "Reopened",
    ],
    [
      "drain",
      "Blocked drain flooding the crossing after rain",
      "Bitterne Road",
      50.918,
      -1.37,
      "Under review",
    ],
    [
      "road",
      "Cracked road surface along the kerb",
      "Millbrook Road",
      50.918,
      -1.445,
      "Submitted",
    ],
    [
      "sign",
      "Bent traffic sign at the junction",
      "Bevois Valley",
      50.921,
      -1.398,
      "Scheduled",
    ],
    [
      "obstruction",
      "Fallen branch blocking access to the pavement",
      "Southampton Common",
      50.932,
      -1.411,
      "Acknowledged",
    ],
    [
      "pothole",
      "Pothole crater in tarmac near the bus stop",
      "Burgess Road",
      50.938,
      -1.397,
      "Verified closed",
    ],
    [
      "other",
      "Something damaged beside the park, unclear what it is",
      "Hoglands Park",
      50.907,
      -1.398,
      "Submitted",
    ],
    [
      "dumping",
      "Dumped black bags beside the fence",
      "St Denys",
      50.932,
      -1.384,
      "Submitted",
    ],
    [
      "bin",
      "Overflowing litter bin beside the bench",
      "Westquay",
      50.903,
      -1.407,
      "Resolved pending verification",
    ],
  ];
  for (let n = 0; n < fixtures.length; n++) {
    const [categoryId, description, location, lat, lng, status] = fixtures[
      n
    ] as [string, string, string, number, number, string];
    const id = `demo-${n + 1}`;
    if (await db.issue.findUnique({ where: { id } })) continue;
    const assessment = classify(description),
      createdAt = new Date(Date.now() - (n + 2) * 86400000);
    const score = priority({
      severity: assessment.severity,
      description,
      ageDays: n + 2,
      reports: 1,
      recurrence: 0,
      context: 0.5,
      evidenceConfidence: assessment.confidence,
    }).score;
    await db.issue.create({
      data: {
        id,
        title: description,
        description,
        categoryId,
        location,
        lat,
        lng,
        status,
        severity: assessment.severity,
        priority: score,
        synthetic: true,
        createdAt,
        closedAt: status === "Verified closed" ? new Date() : null,
        reports: {
          create: {
            id: `report-${id}`,
            reference: `CIV-DEMO-${String(n + 1).padStart(3, "0")}`,
            description,
            lat,
            lng,
            synthetic: true,
            createdAt,
            photographs: {
              create: {
                path: `/demo/${categoryId}.svg`,
                mime: "image/svg+xml",
              },
            },
          },
        },
        assessments: {
          create: {
            provider: "demo:keyword-rules",
            confidence: assessment.confidence,
            explanation: assessment.explanation,
          },
        },
        events: {
          create: [
            {
              actorId: "resident",
              kind: "Report",
              message: "Fictional demonstration report submitted.",
              createdAt,
            },
            {
              actorId: "officer",
              kind: "status",
              message: `Status: ${status}`,
              createdAt: new Date(createdAt.getTime() + 86400000),
            },
          ],
        },
      },
    });
    if (
      [
        "Scheduled",
        "In progress",
        "Verified closed",
        "Resolved pending verification",
      ].includes(status)
    )
      await db.assignment.create({
        data: {
          issueId: id,
          teamId:
            categoryId === "pothole"
              ? "highways"
              : categoryId === "sign"
                ? "highways"
                : "clean",
          scheduledAt: new Date(),
        },
      });
    if (["Verified closed", "Resolved pending verification"].includes(status)) {
      const photo = await db.photograph.create({
        data: { path: "/demo/repaired.svg", mime: "image/svg+xml" },
      });
      await db.repairEvidence.create({
        data: {
          issueId: id,
          photographId: photo.id,
          outcome:
            "Fictional repair fixture. Compare the illustration manually; no image AI assessment.",
          verified: status === "Verified closed",
        },
      });
    }
    if (status === "Reopened")
      await db.event.create({
        data: {
          issueId: id,
          actorId: "resident",
          kind: "Reopened",
          message:
            "Resident reports that the repair did not remove the trip hazard.",
        },
      });
  }
  for (let n = 0; n < 3; n++) {
    const ref = `CIV-DEMO-${16 + n}`;
    if (await db.report.findUnique({ where: { reference: ref } })) continue;
    const report = await db.report.create({
      data: {
        reference: ref,
        issueId: "demo-1",
        description: `Deep pothole at Portswood crossing, independent fictional confirmation ${n + 1}`,
        lat: 50.927 + n * 0.00002,
        lng: -1.395,
        synthetic: true,
        photographs: {
          create: { path: "/demo/pothole.svg", mime: "image/svg+xml" },
        },
      },
    });
    await db.duplicateMatch.create({
      data: {
        reportId: report.id,
        issueId: "demo-1",
        score: 0.89,
        distance: n * 3,
        explanation:
          "Fictional reports of the same pothole. Explicitly confirmed by a demo resident.",
        decision: "Resident confirmed",
      },
    });
  }
  if (
    !(await db.duplicateMatch.findFirst({
      where: { reportId: "report-demo-3" },
    }))
  )
    await db.duplicateMatch.create({
      data: {
        reportId: "report-demo-3",
        issueId: "demo-2",
        score: 0.62,
        distance: 13,
        explanation:
          "Intentional failure-case fixture: nearby lamps A101 and A102 are distinct assets. Reject this match.",
        decision: "Pending",
      },
    });
}
if (process.argv[1]?.endsWith("seed.ts"))
  seed()
    .then(() =>
      console.log("Seeded 18 fictional reports / 15 canonical issues."),
    )
    .finally(() => db.$disconnect());
