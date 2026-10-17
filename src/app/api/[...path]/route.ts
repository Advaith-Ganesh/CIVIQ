import {
  modelStatus,
  inferenceRequest,
  repairComparison,
  analyzePhotograph,
} from "@/lib/local-model";
import { importManifest } from "@/lib/importer";
import { findHotspots } from "@/lib/hotspots";
import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  assess,
  config,
  listIssues,
  submitReport,
  mutateIssue,
  metrics,
} from "@/lib/service";
import { isStaff, localDemo, rateLimit } from "@/lib/auth";
import { validateImage } from "@/lib/validation";
import { seed } from "../../../../prisma/seed";
import { mkdir, writeFile, readFile } from "node:fs/promises";
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
    if (p[0] === "meta") {
      const settings = await config();
      const model = settings.provider === "local" ? await modelStatus() : null;
      return json({
        categories: await db.category.findMany(),
        teams: await db.team.findMany(),
        localDemo: localDemo(),
        provider: settings.provider,
        model,
        mode:
          settings.provider === "demo"
            ? "DEMO MODE"
            : model?.loaded && !!model.classifications
              ? "LIVE MODEL"
              : model?.state === "loading"
                ? "MODEL LOADING"
                : "MODEL UNAVAILABLE · MANUAL REVIEW",
      });
    }
    if (p[0] === "evidence")
      return json(
        await db.datasetSource.findUnique({
          where: { id: "southampton-waste" },
        }),
      );
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
            dataType: true,
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
          dataType: report.dataType,
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
    if (p[0] === "ai-lab") {
      const [
        model,
        analyses,
        evaluations,
        correctedPredictions,
        applicationClassifications,
      ] = await Promise.all([
        modelStatus(),
        db.imageAnalysis.findMany({
          orderBy: { createdAt: "desc" },
          take: 10,
          include: { photograph: true },
        }),
        db.modelEvaluation.findMany({
          orderBy: { evaluatedAt: "desc" },
          take: 5,
        }),
        db.imageAnalysis.count({
          where: { correctedCategoryId: { not: null } },
        }),
        db.imageAnalysis.count({ where: { status: "available" } }),
      ]);
      return json({
        model,
        activeProvider: (await config()).provider,
        analyses,
        evaluations,
        correctedPredictions,
        applicationClassifications,
      });
    }
    if (p[0] === "hotspots") {
      const days = Number(new URL(request.url).searchParams.get("days") || 30);
      if (![7, 30, 90].includes(days))
        throw new Error("Use a 7, 30 or 90 day window.");
      return json({
        hotspots: findHotspots(
          await db.issue.findMany({ where: { reports: { some: {} } } }),
          days,
        ),
        days,
      });
    }
    if (p[0] === "search") {
      const params = new URL(request.url).searchParams;
      const q = params.get("q")?.slice(0, 200),
        categoryId = params.get("category") || undefined,
        status = params.get("status") || undefined,
        team = params.get("team") || undefined,
        from = params.get("from"),
        to = params.get("to"),
        type = params.get("type") || undefined;
      const filters: Prisma.IssueWhereInput = {
        ...(q
          ? {
              OR: [
                { title: { contains: q } },
                { location: { contains: q } },
                { reports: { some: { reference: { contains: q } } } },
              ],
            }
          : {}),
        ...(categoryId ? { categoryId } : {}),
        ...(status ? { status } : {}),
        ...(team ? { assignments: { some: { teamId: team } } } : {}),
        ...(type ? { dataType: type } : {}),
        ...(from || to
          ? {
              createdAt: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(`${to}T23:59:59Z`) } : {}),
              },
            }
          : {}),
      };
      const all = await listIssues(filters);
      const min = Number(params.get("minPriority") || 0),
        recurrence = params.get("recurrence") === "true";
      return json({
        issues: all.filter(
          (i) =>
            (i.override ?? i.calculated.score) >= min &&
            (!recurrence || i.calculated.recurrence > 0),
        ),
        queriedAt: new Date().toISOString(),
      });
    }
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
          photoId: z.string().optional(),
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
    if (p[0] === "lab-analyze") {
      const { photoId } = z.object({ photoId: z.string() }).parse(body);
      const settings = await config();
      return json(
        await analyzePhotograph(
          photoId,
          settings.reviewThreshold,
          settings.marginThreshold,
        ),
      );
    }
    if (p[0] === "lab-sample") {
      const { sourceId } = z
        .object({ sourceId: z.string().regex(/^commons-[0-9]+$/) })
        .parse(body);
      const source = await db.datasetSource.findUniqueOrThrow({
        where: { id: sourceId },
      });
      if (source.dataType !== "MODEL_EVALUATION")
        throw new Error("Only labelled evaluation samples are accepted here.");
      const metadata = JSON.parse(source.payload) as { file: string };
      if (!/^[0-9]+\.jpg$/.test(metadata.file))
        throw new Error("Invalid evaluation file.");
      const bytes = await readFile(
        `datasets/cache/commons-smoke/${metadata.file}`,
      );
      const clean = await sharp(bytes)
        .rotate()
        .resize({
          width: 2000,
          height: 2000,
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality: 85 })
        .toBuffer();
      const name = `${randomUUID()}.jpg`;
      await mkdir("data/uploads", { recursive: true });
      await writeFile(`data/uploads/${name}`, clean);
      const photo = await db.photograph.create({
        data: {
          path: `/media/${name}`,
          mime: "image/jpeg",
          dataType: "MODEL_EVALUATION",
          sourceId,
          originalRecordId: source.originalRecordId,
        },
      });
      const settings = await config();
      return json({
        photo,
        source,
        result: await analyzePhotograph(
          photo.id,
          settings.reviewThreshold,
          settings.marginThreshold,
        ),
      });
    }
    if (p[0] === "model-load") return json(await inferenceRequest("/load", {}));
    if (p[0] === "imports") return json(await importManifest(body));
    if (p[0] === "repair-compare") {
      const input = z
        .object({ beforeId: z.string(), afterId: z.string() })
        .parse(body);
      try {
        return json({
          available: true,
          ...(await repairComparison(input.beforeId, input.afterId)),
        });
      } catch (e) {
        return json({
          available: false,
          recommendation: "Insufficient evidence",
          warning:
            e instanceof Error
              ? e.message
              : "Model unavailable. Compare manually.",
        });
      }
    }
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
          provider: z.enum(["demo", "local"]).optional(),
          reviewThreshold: z.number().min(0).max(1).optional(),
          marginThreshold: z.number().min(0).max(5).optional(),
        })
        .parse(body);
      await db.setting.upsert({
        where: { id: "config" },
        update: { value: JSON.stringify({ ...(await config()), ...settings }) },
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
