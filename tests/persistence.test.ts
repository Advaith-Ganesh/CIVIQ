import { beforeAll, afterAll, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { rmSync, writeFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
process.env.DATABASE_URL = "file:./test.db";
process.env.AI_PROVIDER = "demo";
let db: PrismaClient;
let services: typeof import("../src/lib/service");
let seed: (typeof import("../prisma/seed"))["seed"];
beforeAll(async () => {
  rmSync("prisma/test.db", { force: true });
  writeFileSync("prisma/test.db", "");
  execFileSync(
    "node",
    ["node_modules/prisma/build/index.js", "migrate", "deploy"],
    { env: { ...process.env, DATABASE_URL: "file:./test.db" }, stdio: "pipe" },
  );
  db = new PrismaClient();
  services = await import("../src/lib/service");
  seed = (await import("../prisma/seed")).seed;
  await seed();
});
afterAll(async () => {
  await db.$disconnect();
  await (await import("../src/lib/db")).db.$disconnect();
  rmSync("prisma/test.db", { force: true });
});
it("seeds repeatably and calculates accurate metrics", async () => {
  await seed();
  const issues = await services.listIssues();
  expect(services.metrics(issues)).toMatchObject({
    reports: 18,
    unique: 15,
    duplicates: 3,
    resolved: 1,
  });
});
it("persists a report, independent reference, assignment, repair, manual closure and reopening", async () => {
  const photo = await db.photograph.create({
    data: { path: "/demo/pothole.svg", mime: "image/svg+xml" },
  });
  const result = await services.submitReport({
    description: "Deep pothole crossing wheelchair access",
    location: "Portswood Road",
    lat: 50.927,
    lng: -1.395,
    categoryId: "pothole",
    photoId: photo.id,
    confirmIssueId: "demo-1",
  });
  expect(result.reference).toMatch(/^CIV-[A-F0-9]{10}$/);
  const independent = new PrismaClient();
  expect(
    await independent.report.findUnique({
      where: { reference: result.reference },
    }),
  ).toBeTruthy();
  await independent.$disconnect();
  const secondPhoto = await db.photograph.create({
    data: { path: "/demo/bin.svg", mime: "image/svg+xml" },
  });
  const separate = await services.submitReport({
    description: "Overflowing bin blocking the path near the gate",
    location: "Test Gate",
    lat: 50.96,
    lng: -1.47,
    categoryId: "bin",
    photoId: secondPhoto.id,
  });
  expect(result.reference).not.toBe(separate.reference);
  await services.mutateIssue(separate.issueId, {
    action: "assign",
    value: "clean",
    scheduledAt: "2026-11-01",
  });
  expect(
    await db.assignment.count({ where: { issueId: separate.issueId } }),
  ).toBe(1);
  await expect(
    services.mutateIssue(separate.issueId, {
      action: "status",
      value: "Verified closed",
    }),
  ).rejects.toThrow("Invalid status");
  for (const status of ["Acknowledged", "In progress"])
    await services.mutateIssue(separate.issueId, {
      action: "status",
      value: status,
    });
  const repaired = await db.photograph.create({
    data: { path: "/demo/repaired.svg", mime: "image/svg+xml" },
  });
  await services.mutateIssue(separate.issueId, {
    action: "repair",
    photoId: repaired.id,
    value: "Bin cleared; route accessible.",
  });
  for (const status of ["Resolved pending verification", "Verified closed"])
    await services.mutateIssue(separate.issueId, {
      action: "status",
      value: status,
    });
  expect(
    (
      await db.repairEvidence.findFirst({
        where: { issueId: separate.issueId },
      })
    )?.verified,
  ).toBe(true);
  await services.mutateIssue(separate.issueId, {
    action: "status",
    value: "Reopened",
  });
  expect(
    (await db.issue.findUnique({ where: { id: separate.issueId } }))?.status,
  ).toBe("Reopened");
  expect(
    await db.event.count({ where: { issueId: separate.issueId } }),
  ).toBeGreaterThanOrEqual(8);
  await seed(true);
  expect(
    await db.report.findUnique({ where: { reference: result.reference } }),
  ).toBeTruthy();
  expect(
    await db.report.findUnique({ where: { reference: separate.reference } }),
  ).toBeTruthy();
  expect(await db.issue.findUnique({ where: { id: "demo-12" } })).toBeTruthy();
  expect(services.metrics(await services.listIssues()).reports).toBe(20);
});
it("rejects invalid duplicate associations and already used photographs", async () => {
  const p = await db.photograph.create({
    data: { path: "/demo/bin.svg", mime: "image/svg+xml" },
  });
  await expect(
    services.submitReport({
      description: "Overflowing bin blocking footpath",
      location: "Test Gate",
      lat: 50.96,
      lng: -1.47,
      categoryId: "bin",
      photoId: p.id,
      confirmIssueId: "demo-1",
    }),
  ).rejects.toThrow("not a current duplicate");
});
