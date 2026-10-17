import { z } from "zod";
import { db } from "./db";
import { dataTypes } from "./provenance";
const sourceSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{3,80}$/),
  name: z.string().min(3).max(160),
  url: z
    .url()
    .refine((s) => s.startsWith("https://"), "HTTPS source URL required."),
  licence: z.enum([
    "CC0-1.0",
    "CC-BY-4.0",
    "CC-BY-SA-4.0",
    "OGL-UK-3.0",
    "MIT",
    "Apache-2.0",
    "PUBLIC-DOMAIN",
  ]),
  licenceReviewed: z.literal(true),
  attribution: z.string().min(3).max(500),
  coverage: z.string().min(3).max(160),
  referenceDate: z.iso.datetime(),
  dataType: z.enum(dataTypes),
  limitations: z.string().min(12).max(1000),
});
const recordSchema = z.object({
  id: z.string().min(1).max(160),
  referenceDate: z.iso.datetime(),
  categoryId: z.string().optional(),
  description: z.string().min(3).max(2000).optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  location: z.string().max(160).optional(),
  file: z.string().max(300).optional(),
  value: z.number().optional(),
  unit: z.string().max(100).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export const manifestSchema = z
  .object({
    source: sourceSchema,
    records: z.array(recordSchema).min(1).max(500),
  })
  .superRefine((m, ctx) => {
    if (["SYNTHETIC_DEMO", "USER_SUBMITTED"].includes(m.source.dataType))
      ctx.addIssue({
        code: "custom",
        message:
          "Imports must be official aggregate, public historical or model evaluation data. User reports and demo fixtures use their own workflows.",
      });
    if (new Set(m.records.map((r) => r.id)).size !== m.records.length)
      ctx.addIssue({
        code: "custom",
        message: "Original record IDs must be unique.",
      });
    for (const r of m.records) {
      if (
        ["MODEL_EVALUATION", "OFFICIAL_AGGREGATE"].includes(
          m.source.dataType,
        ) &&
        (r.lat !== undefined || r.lng !== undefined)
      )
        ctx.addIssue({
          code: "custom",
          message:
            "Evaluation samples and aggregate records cannot acquire issue coordinates.",
        });
      if (
        m.source.dataType === "PUBLIC_HISTORICAL" &&
        (r.lat === undefined ||
          r.lng === undefined ||
          !r.categoryId ||
          !r.description ||
          !r.location)
      )
        ctx.addIssue({
          code: "custom",
          message:
            "Historical issues need explicit coordinates, category, description and location; missing locations are never invented.",
        });
      if (
        r.lat !== undefined &&
        (r.lat < 50.85 ||
          r.lat > 50.97 ||
          r.lng === undefined ||
          r.lng < -1.5 ||
          r.lng > -1.3)
      )
        ctx.addIssue({
          code: "custom",
          message:
            "Issue coordinates must be in the Southampton demo boundary.",
        });
    }
  });
export async function importManifest(raw: unknown) {
  const input = manifestSchema.parse(raw),
    source = input.source;
  return db.$transaction(async (tx) => {
    const existing = await tx.datasetSource.findUnique({
      where: { id: source.id },
    });
    if (existing && existing.dataType !== source.dataType)
      throw new Error("A source cannot change data classification.");
    await tx.datasetSource.upsert({
      where: { id: source.id },
      update: {
        title: source.name,
        url: source.url,
        note: source.limitations,
        licence: source.licence,
        coverage: source.coverage,
        status: "imported",
        period: source.referenceDate.slice(0, 10),
        payload: JSON.stringify({
          attribution: source.attribution,
          licenceReviewed: true,
        }),
      },
      create: {
        id: source.id,
        title: source.name,
        url: source.url,
        retrievedAt: new Date(),
        note: source.limitations,
        licence: source.licence,
        coverage: source.coverage,
        dataType: source.dataType,
        status: "imported",
        period: source.referenceDate.slice(0, 10),
        payload: JSON.stringify({
          attribution: source.attribution,
          licenceReviewed: true,
        }),
      },
    });
    let inserted = 0;
    for (const r of input.records) {
      if (
        await tx.importedRecord.findUnique({
          where: {
            sourceId_originalRecordId: {
              sourceId: source.id,
              originalRecordId: r.id,
            },
          },
        })
      )
        continue;
      if (source.dataType === "PUBLIC_HISTORICAL") {
        await tx.category.findUniqueOrThrow({ where: { id: r.categoryId } });
        await tx.issue.create({
          data: {
            id: `import-${source.id}-${r.id}`,
            title: r.description!.slice(0, 90),
            description: r.description!,
            categoryId: r.categoryId!,
            lat: r.lat!,
            lng: r.lng!,
            location: r.location!,
            severity: 2,
            priority: 0,
            status: "Under review",
            dataType: "PUBLIC_HISTORICAL",
            sourceId: source.id,
            originalRecordId: r.id,
            referenceDate: new Date(r.referenceDate),
            importedAt: new Date(),
            createdAt: new Date(r.referenceDate),
            reports: {
              create: {
                reference: `HIST-${source.id}-${r.id}`,
                description: r.description!,
                lat: r.lat!,
                lng: r.lng!,
                dataType: "PUBLIC_HISTORICAL",
                sourceId: source.id,
                originalRecordId: r.id,
                referenceDate: new Date(r.referenceDate),
                importedAt: new Date(),
                createdAt: new Date(r.referenceDate),
              },
            },
            events: {
              create: {
                actorId: "officer",
                kind: "Historical import",
                message: `Imported historical record from ${source.name}; not a live council feed.`,
              },
            },
          },
        });
      }
      await tx.importedRecord.create({
        data: {
          sourceId: source.id,
          originalRecordId: r.id,
          dataType: source.dataType,
          referenceDate: new Date(r.referenceDate),
          payload: JSON.stringify(r),
        },
      });
      inserted++;
    }
    const count = await tx.importedRecord.count({
      where: { sourceId: source.id },
    });
    await tx.datasetSource.update({
      where: { id: source.id },
      data: { importedCount: count, importDate: new Date() },
    });
    return { sourceId: source.id, inserted, total: count };
  });
}
