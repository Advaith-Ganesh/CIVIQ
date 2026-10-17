import { beforeAll, afterAll, it, expect, vi } from "vitest";
import { execFileSync } from "node:child_process";
import { writeFileSync, rmSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
process.env.DATABASE_URL = "file:./v2-test.db";
process.env.AI_PROVIDER = "demo";
let db: PrismaClient;
let importManifest: (typeof import("../src/lib/importer"))["importManifest"];
let service: typeof import("../src/lib/service");
beforeAll(async () => {
  rmSync("prisma/v2-test.db", { force: true });
  writeFileSync("prisma/v2-test.db", "");
  execFileSync(
    "node",
    ["node_modules/prisma/build/index.js", "migrate", "deploy"],
    { env: process.env, stdio: "pipe" },
  );
  db = new PrismaClient();
  await (await import("../prisma/seed")).seed();
  importManifest = (await import("../src/lib/importer")).importManifest;
  service = await import("../src/lib/service");
});
afterAll(async () => {
  vi.restoreAllMocks();
  await db.$disconnect();
  await (await import("../src/lib/db")).db.$disconnect();
  rmSync("prisma/v2-test.db", { force: true });
});
it("imports idempotently while keeping aggregate and evaluation records out of issue counts", async () => {
  const original = await db.issue.count();
  const source = {
    id: "evaluation-licenced",
    name: "Reviewed evaluation sample",
    url: "https://example.org/dataset",
    licence: "CC0-1.0",
    licenceReviewed: true,
    attribution: "Test author",
    coverage: "International; not Southampton",
    referenceDate: "2021-01-01T00:00:00Z",
    dataType: "MODEL_EVALUATION",
    limitations:
      "Test provenance manifest without issue geography or a real production benchmark.",
  };
  const manifest = {
    source,
    records: [
      {
        id: "photo1",
        file: "photo.jpg",
        referenceDate: "2021-01-01T00:00:00Z",
      },
    ],
  };
  expect((await importManifest(manifest)).inserted).toBe(1);
  expect((await importManifest(manifest)).inserted).toBe(0);
  expect(await db.issue.count()).toBe(original);
  expect(
    (await db.importedRecord.findFirst({ where: { sourceId: source.id } }))
      ?.dataType,
  ).toBe("MODEL_EVALUATION");
});
it("persists a live-mode report with manual classification when the local model is offline", async () => {
  await db.setting.update({
    where: { id: "config" },
    data: {
      value: JSON.stringify({
        weights: [35, 20, 15, 10, 10, 10],
        distance: 75,
        provider: "local",
        reviewThreshold: 0.1,
        marginThreshold: 0.35,
      }),
    },
  });
  const photo = await db.photograph.create({
    data: {
      path: "/media/00000000-0000-0000-0000-000000000000.jpg",
      mime: "image/jpeg",
    },
  });
  vi.stubGlobal(
    "fetch",
    vi.fn().mockRejectedValue(new Error("Local service offline")),
  );
  // A missing local file is also an explicit image-analysis failure; neither failure blocks validated manual reporting.
  const report = await service.submitReport({
    description: "Blocked pavement restricting wheelchair access",
    categoryId: "pavement",
    photoId: photo.id,
    location: "Test crossing",
    lat: 50.96,
    lng: -1.47,
    accessibility: ["wheelchairObstruction"],
  });
  expect(report.reference).toMatch(/^CIV-/);
  const stored = await db.issue.findUniqueOrThrow({
    where: { id: report.issueId },
    include: { assessments: true },
  });
  expect(stored.accessibility).toContain("wheelchairObstruction");
  expect(stored.assessments[0].provider).toBe("manual:inference-unavailable");
  expect(
    (await db.imageAnalysis.findFirst({ where: { photographId: photo.id } }))
      ?.status,
  ).toBe("unavailable");
  vi.unstubAllGlobals();
});

it("resets only disposable demo issues even when they have analysis rows", async () => {
  const photo = await db.photograph.findFirstOrThrow({
    where: { report: { issueId: "demo-2" } },
  });
  await db.imageAnalysis.create({
    data: {
      photographId: photo.id,
      provider: "local",
      status: "unavailable",
      categoryId: "other",
      abstained: true,
      result: "{}",
    },
  });
  const userCount = await db.report.count({ where: { synthetic: false } });
  await (await import("../prisma/seed")).seed(true);
  expect(await db.report.count({ where: { synthetic: false } })).toBe(
    userCount,
  );
  expect(await db.issue.findUnique({ where: { id: "demo-2" } })).not.toBeNull();
});

it("preserves original IDs with slashes while creating route-safe historical issue IDs", async () => {
  const source = {
    id: "historical-route-test",
    name: "Isolated historical test",
    url: "https://example.org/fixture",
    licence: "CC0-1.0",
    licenceReviewed: true,
    attribution: "Test fixture",
    coverage: "Southampton test boundary",
    referenceDate: "2026-01-01T00:00:00Z",
    dataType: "PUBLIC_HISTORICAL",
    limitations:
      "Isolated test fixture; never imported into the working database.",
  };
  const manifest = {
    source,
    records: [
      {
        id: "ward/asset?001",
        referenceDate: source.referenceDate,
        categoryId: "pothole",
        description: "Historical test hole",
        location: "Test location",
        lat: 50.927,
        lng: -1.395,
      },
    ],
  };
  await importManifest(manifest);
  await importManifest(manifest);
  const imported = await db.issue.findMany({ where: { sourceId: source.id } });
  expect(imported).toHaveLength(1);
  expect(imported[0].id).toMatch(/^import-[a-f0-9]{32}$/);
  expect(imported[0].originalRecordId).toBe("ward/asset?001");
  const scored = await service.issueScore({
    ...imported[0],
    reports: [{ id: "one" }],
    assessments: [{ confidence: 0 }],
  });
  expect(scored.recurrence).toBe(0);
});
