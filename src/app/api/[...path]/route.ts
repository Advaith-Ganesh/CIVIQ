import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  assess,
  config,
  listIssues,
  submitReport,
  mutateIssue,
  metrics,
  includeIssue,
} from "@/lib/service";
import { isStaff, localDemo, rateLimit } from "@/lib/auth";
import { validateImage } from "@/lib/validation";
import { seed } from "../../../../prisma/seed";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { z } from "zod";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const json = (v: unknown, status = 200) => NextResponse.json(v, { status });
export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const p = (await params).path;
    if (p[0] === "meta")
      return json({
        categories: await db.category.findMany(),
        teams: await db.team.findMany(),
        localDemo: localDemo(),
        mode:
          process.env.AI_PROVIDER === "openai"
            ? "LIVE AI UNAVAILABLE"
            : "DEMO MODE",
      });
    if (p[0] === "public")
      return json(
        await db.issue.findMany({
          where: { reports: { some: {} } },
          select: {
            id: true,
            title: true,
            categoryId: true,
            status: true,
            lat: true,
            lng: true,
            location: true,
            synthetic: true,
          },
        }),
      );
    if (p[0] === "track") {
      const report = await db.report.findUnique({
        where: { reference: p[1] },
        include: {
          issue: {
            include: {
              category: true,
              events: {
                where: { public: true },
                orderBy: { createdAt: "asc" },
              },
              repairs: { include: { photograph: true } },
              reports: { include: { photographs: true } },
            },
          },
        },
      });
      if (!report) return json({ error: "Tracking reference not found." }, 404);
      return json({
        reference: report.reference,
        reportedAt: report.createdAt,
        issue: {
          id: report.issue.id,
          title: report.issue.title,
          category: report.issue.category.name,
          status: report.issue.status,
          location: report.issue.location,
          synthetic: report.synthetic,
          events: report.issue.events.map((e) => ({
            id: e.id,
            message: e.message,
            createdAt: e.createdAt,
          })),
          before: report.issue.reports.flatMap((r) =>
            r.photographs.map((p) => p.path),
          ),
          repairs: report.issue.repairs.map((r) => ({
            outcome: r.outcome,
            verified: r.verified,
            path: r.photograph.path,
          })),
        },
      });
    }
    if (!isStaff(request))
      return json(
        { error: "Staff access required. Enter your configured staff token." },
        401,
      );
    if (p[0] === "issues") {
      const issues = await listIssues();
      return json(
        p[1]
          ? issues.find((i) => i.id === p[1]) || null
          : { issues, metrics: metrics(issues) },
      );
    }
    if (p[0] === "settings") return json(await config());
    if (p[0] === "sources") return json(await db.datasetSource.findMany());
    return json({ error: "Not found" }, 404);
  } catch (e) {
    return json(
      { error: e instanceof Error ? e.message : "Request failed" },
      400,
    );
  }
}
export async function POST(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    if (!rateLimit(request))
      return json({ error: "Too many requests. Please wait a minute." }, 429);
    const p = (await params).path;
    const origin = request.headers.get("origin");
    if (origin && new URL(origin).host !== request.headers.get("host"))
      return json({ error: "Cross-origin write rejected." }, 403);
    if (p[0] === "upload") {
      const form = await request.formData(),
        file = form.get("file");
      if (!(file instanceof File)) throw new Error("Choose a photograph.");
      const bytes = Buffer.from(await file.arrayBuffer());
      validateImage(bytes, file.type);
      const metadata = await sharp(bytes, {
        limitInputPixels: 25000000,
      }).metadata();
      if (!metadata.width || !metadata.height)
        throw new Error("Invalid image.");
      const clean = await sharp(bytes, { limitInputPixels: 25000000 })
        .rotate()
        .resize({
          width: 2000,
          height: 2000,
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality: 85 })
        .toBuffer();
      await mkdir("data/uploads", { recursive: true });
      const name = `${randomUUID()}.jpg`;
      await writeFile(`data/uploads/${name}`, clean);
      const photo = await db.photograph.create({
        data: { path: `/media/${name}`, mime: "image/jpeg" },
      });
      return json(photo);
    }
    const body = await request.json();
    if (p[0] === "assess") {
      const input = z
        .object({
          description: z.string().min(12).max(2000),
          lat: z.number().min(50.85).max(50.97),
          lng: z.number().min(-1.5).max(-1.3),
          categoryId: z.string().optional(),
        })
        .parse(body);
      return json(await assess(input));
    }
    if (p[0] === "reports") return json(await submitReport(body), 201);
    if (p[0] === "reopen") {
      const { reference, reason } = z
        .object({
          reference: z.string(),
          reason: z.string().trim().min(12).max(1000),
        })
        .parse(body);
      const report = await db.report.findUniqueOrThrow({
        where: { reference },
        include: { issue: true },
      });
      if (
        !["Verified closed", "Resolved pending verification"].includes(
          report.issue.status,
        )
      )
        throw new Error(
          "Reopening requests are available after a repair outcome.",
        );
      await db.$transaction([
        db.issue.update({
          where: { id: report.issueId },
          data: { status: "Reopened", closedAt: null },
        }),
        db.event.create({
          data: {
            issueId: report.issueId,
            actorId: "resident",
            kind: "Reopened",
            message: `Resident reopening request: ${reason}`,
          },
        }),
      ]);
      return json({ ok: true });
    }
    if (!isStaff(request))
      return json({ error: "Staff access required." }, 401);
    if (p[0] === "issues")
      return json(
        await mutateIssue(
          p[1],
          z
            .object({
              action: z.string(),
              value: z.string().max(2000).optional(),
              photoId: z.string().optional(),
              scheduledAt: z.string().optional(),
            })
            .parse(body),
        ),
      );
    if (p[0] === "matches") {
      const { id, decision } = z
        .object({ id: z.string(), decision: z.enum(["Rejected", "Confirmed"]) })
        .parse(body);
      await db.$transaction(async (tx) => {
        const match = await tx.duplicateMatch.findUniqueOrThrow({
          where: { id },
          include: { report: true, issue: true },
        });
        if (match.decision !== "Pending")
          throw new Error("Match already reviewed.");
        if (
          decision === "Confirmed" &&
          match.report.issueId !== match.issueId
        ) {
          const source = await tx.issue.findUniqueOrThrow({
            where: { id: match.report.issueId },
            include: { reports: true },
          });
          if (
            ["Verified closed", "Resolved pending verification"].includes(
              source.status,
            )
          )
            throw new Error(
              "Reopen a repaired issue before reassociating its reports.",
            );
          await tx.report.update({
            where: { id: match.reportId },
            data: { issueId: match.issueId },
          });
          await tx.event.create({
            data: {
              issueId: source.id,
              actorId: "officer",
              kind: "Report association",
              message: `Report ${match.report.reference} associated with ${match.issueId}. Original issue history retained.`,
              public: false,
            },
          });
          if (source.reports.length === 1)
            await tx.issue.update({
              where: { id: source.id },
              data: { status: "Rejected" },
            });
        }
        await tx.duplicateMatch.update({ where: { id }, data: { decision } });
        await tx.event.create({
          data: {
            issueId: match.issueId,
            actorId: "officer",
            kind: "Duplicate review",
            message: `Match ${id}: ${decision}`,
            public: false,
          },
        });
      });
      return json({ ok: true });
    }
    if (p[0] === "settings") {
      const settings = z
        .object({
          weights: z
            .array(z.number().min(0).max(100))
            .length(6)
            .refine(
              (a) => a.reduce((s, n) => s + n, 0) === 100,
              "Weights must total 100.",
            ),
          distance: z.number().min(10).max(200),
        })
        .parse(body);
      await db.setting.upsert({
        where: { id: "config" },
        update: { value: JSON.stringify(settings) },
        create: { id: "config", value: JSON.stringify(settings) },
      });
      return json({ ok: true });
    }
    if (p[0] === "category") {
      const input = z
        .object({
          id: z.string(),
          name: z.string().min(2).max(80),
          keywords: z.string().max(400),
          teamId: z.string().nullable(),
          active: z.boolean(),
        })
        .parse(body);
      await db.category.update({ where: { id: input.id }, data: input });
      return json({ ok: true });
    }
    if (p[0] === "teams") {
      const input = z
        .object({
          name: z.string().trim().min(3).max(100),
          area: z.string().trim().min(3).max(200),
        })
        .parse(body);
      return json(await db.team.create({ data: input }));
    }
    if (p[0] === "reset") {
      if (!localDemo())
        return json(
          {
            error:
              "Demo reset is available only in local development demo mode.",
          },
          403,
        );
      if (body.confirm !== "RESET DEMO") throw new Error("Type RESET DEMO.");
      await seed(true);
      return json({ ok: true });
    }
    return json({ error: "Not found" }, 404);
  } catch (e) {
    return json(
      { error: e instanceof Error ? e.message : "Request failed" },
      400,
    );
  }
}
