import { db } from "./db";
import {
  classify,
  duplicateMatches,
  priority,
  defaultWeights,
  canTransition,
  haversine,
} from "./rules";
import { reportSchema } from "./validation";
import { getAdapter } from "./ai";
import { randomBytes } from "node:crypto";
export const includeIssue = {
  category: true,
  reports: { include: { photographs: true, matches: true } },
  assignments: {
    include: { team: true },
    orderBy: { createdAt: "desc" as const },
  },
  events: { include: { actor: true }, orderBy: { createdAt: "asc" as const } },
  repairs: { include: { photograph: true } },
  assessments: true,
};
export async function config() {
  const row = await db.setting.findUnique({ where: { id: "config" } });
  return row
    ? JSON.parse(row.value)
    : { weights: defaultWeights, distance: 75 };
}
export async function assess(input: {
  description: string;
  categoryId?: string;
  lat: number;
  lng: number;
}) {
  getAdapter();
  const catalog = await db.category.findMany({ where: { active: true } });
  const assessment = classify(
    input.description,
    catalog.map((c) => [c.id, c.name, c.keywords] as const),
  );
  const issues = await db.issue.findMany();
  const settings = await config();
  return {
    assessment,
    matches: duplicateMatches(
      { ...input, categoryId: input.categoryId || assessment.categoryId },
      issues,
      settings.distance,
    ).map((m) => ({ ...m, issue: issues.find((i) => i.id === m.issueId) })),
  };
}
export async function issueScore(
  issue: {
    id: string;
    severity: number;
    description: string;
    lat: number;
    lng: number;
    categoryId: string;
    createdAt: Date;
    context: number;
    reports: { id: string }[];
    assessments: { confidence: number }[];
  },
  weights = defaultWeights,
) {
  const all = await db.issue.findMany({
    where: { categoryId: issue.categoryId, id: { not: issue.id } },
  });
  const recurrence = all.filter((i) => haversine(issue, i) < 75).length;
  return {
    ...priority(
      {
        severity: issue.severity,
        description: issue.description,
        ageDays: Math.max(
          0,
          (Date.now() - new Date(issue.createdAt).getTime()) / 86400000,
        ),
        reports: issue.reports.length,
        recurrence,
        context: issue.context,
        evidenceConfidence: issue.assessments[0]?.confidence || 0.35,
      },
      weights,
    ),
    recurrence,
  };
}
export async function listIssues() {
  const issues = await db.issue.findMany({
    where: { reports: { some: {} } },
    include: includeIssue,
  });
  const settings = await config();
  return Promise.all(
    issues.map(async (i) => ({
      ...i,
      calculated: await issueScore(i, settings.weights),
    })),
  );
}
export async function submitReport(raw: unknown) {
  const input = reportSchema.parse(raw);
  const photo = await db.photograph.findUnique({
    where: { id: input.photoId },
  });
  if (!photo || photo.reportId)
    throw new Error("Upload an unused photograph first.");
  const category = await db.category.findUnique({
    where: { id: input.categoryId },
  });
  if (!category?.active) throw new Error("Select an active category.");
  const { assessment, matches } = await assess(input);
  if (
    input.confirmIssueId &&
    !matches.some((m) => m.issueId === input.confirmIssueId)
  )
    throw new Error("The selected issue is not a current duplicate candidate.");
  return db.$transaction(async (tx) => {
    const ref = `CIV-${randomBytes(5).toString("hex").toUpperCase()}`;
    const issue = input.confirmIssueId
      ? await tx.issue.findUniqueOrThrow({
          where: { id: input.confirmIssueId },
        })
      : await tx.issue.create({
          data: {
            title: input.description.slice(0, 90),
            description: input.description,
            categoryId: input.categoryId,
            lat: input.lat,
            lng: input.lng,
            location: input.location,
            severity: assessment.severity,
            priority: priority({
              severity: assessment.severity,
              description: input.description,
              ageDays: 0,
              reports: 1,
              recurrence: 0,
              context: 0.5,
              evidenceConfidence: assessment.confidence,
            }).score,
          },
        });
    const report = await tx.report.create({
      data: {
        reference: ref,
        issueId: issue.id,
        description: input.description,
        lat: input.lat,
        lng: input.lng,
      },
    });
    const claimed = await tx.photograph.updateMany({
      where: { id: photo.id, reportId: null },
      data: { reportId: report.id },
    });
    if (claimed.count !== 1)
      throw new Error("This photograph is already attached to another report.");
    await tx.assessment.create({
      data: {
        issueId: issue.id,
        provider: "demo:keyword-rules",
        confidence: assessment.confidence,
        explanation: assessment.explanation,
      },
    });
    for (const m of matches)
      await tx.duplicateMatch.create({
        data: {
          reportId: report.id,
          issueId: m.issueId,
          score: m.score,
          distance: m.distance,
          explanation: m.explanation,
          decision:
            m.issueId === input.confirmIssueId
              ? "Resident confirmed"
              : "Pending",
        },
      });
    await tx.event.create({
      data: {
        issueId: issue.id,
        actorId: "resident",
        kind: "Report",
        message: input.confirmIssueId
          ? "Independent report associated after resident confirmation."
          : "Report submitted.",
      },
    });
    if (assessment.urgent)
      await tx.event.create({
        data: {
          issueId: issue.id,
          actorId: "system",
          kind: "Safety flag",
          message:
            "Potential urgent safety wording: immediate human review recommended.",
        },
      });
    return { reference: ref, issueId: issue.id };
  });
}
export async function mutateIssue(
  id: string,
  input: {
    action: string;
    value?: string;
    photoId?: string;
    scheduledAt?: string;
  },
) {
  return db.$transaction(async (tx) => {
    const issue = await tx.issue.findUniqueOrThrow({
      where: { id },
      include: { repairs: true },
    });
    let message = "",
      isPublic = true;
    if (input.action === "status") {
      if (
        !canTransition(
          issue.status,
          input.value || "",
          issue.repairs.length > 0,
        )
      )
        throw new Error(
          "Invalid status transition, or missing repair evidence.",
        );
      await tx.issue.update({
        where: { id },
        data: {
          status: input.value,
          closedAt: input.value === "Verified closed" ? new Date() : null,
        },
      });
      if (input.value === "Verified closed")
        await tx.repairEvidence.updateMany({
          where: { issueId: id },
          data: { verified: true },
        });
      message = `Status: ${issue.status} → ${input.value}${input.value === "Verified closed" ? " (manually verified by staff)" : ""}`;
    } else if (input.action === "assign") {
      const scheduledAt = input.scheduledAt
        ? new Date(input.scheduledAt)
        : undefined;
      if (scheduledAt && Number.isNaN(scheduledAt.getTime()))
        throw new Error("Invalid schedule date.");
      await tx.assignment.create({
        data: { issueId: id, teamId: input.value!, scheduledAt },
      });
      message = `Assigned to ${(await tx.team.findUniqueOrThrow({ where: { id: input.value } })).name}${scheduledAt ? `; scheduled ${scheduledAt.toISOString().slice(0, 10)}` : ""}`;
    } else if (input.action === "note") {
      if (!input.value?.trim()) throw new Error("Write a note.");
      message = input.value;
      isPublic = false;
    } else if (input.action === "override") {
      const value = Number(input.value?.split("|")[0]),
        reason = input.value?.split("|").slice(1).join("|");
      if (
        !Number.isInteger(value) ||
        value < 0 ||
        value > 100 ||
        !reason?.trim()
      )
        throw new Error("Enter a score from 0–100 and a reason.");
      await tx.issue.update({ where: { id }, data: { override: value } });
      message = `Priority override: ${value}. Reason: ${reason}`;
      isPublic = false;
    } else if (input.action === "classify") {
      const category = await tx.category.findUniqueOrThrow({
        where: { id: input.value },
      });
      await tx.issue.update({
        where: { id },
        data: { categoryId: category.id },
      });
      message = `Human classification: ${category.name}`;
    } else if (input.action === "repair") {
      const photo = await tx.photograph.findUniqueOrThrow({
        where: { id: input.photoId },
      });
      if (
        photo.reportId ||
        (await tx.repairEvidence.findUnique({
          where: { photographId: photo.id },
        }))
      )
        throw new Error("Photograph already used.");
      if (!input.value?.trim()) throw new Error("Describe the repair outcome.");
      await tx.repairEvidence.create({
        data: { issueId: id, photographId: photo.id, outcome: input.value },
      });
      message = `Repair evidence uploaded: ${input.value}`;
    } else throw new Error("Unknown action.");
    await tx.event.create({
      data: {
        issueId: id,
        actorId: "officer",
        kind: input.action,
        message,
        public: isPublic,
      },
    });
    return { ok: true };
  });
}
export function metrics(issues: Awaited<ReturnType<typeof listIssues>>) {
  const reports = issues.reduce((s, i) => s + i.reports.length, 0),
    closed = issues.filter((i) => i.status === "Verified closed");
  return {
    reports,
    unique: issues.length,
    duplicates: reports - issues.length,
    potential: issues.reduce(
      (s, i) =>
        s +
        i.reports.reduce(
          (n, r) =>
            n + r.matches.filter((m) => m.decision === "Pending").length,
          0,
        ),
      0,
    ),
    review: issues.filter((i) =>
      ["Submitted", "Under review", "Reopened"].includes(i.status),
    ).length,
    high: issues.filter(
      (i) =>
        (i.override ?? i.calculated.score) >= 65 &&
        !["Verified closed", "Rejected"].includes(i.status),
    ).length,
    scheduled: issues.filter((i) => i.status === "Scheduled").length,
    resolved: closed.length,
    average: closed.length
      ? closed.reduce(
          (s, i) =>
            s +
            ((i.closedAt || i.updatedAt).getTime() - i.createdAt.getTime()) /
              86400000,
          0,
        ) / closed.length
      : null,
  };
}
