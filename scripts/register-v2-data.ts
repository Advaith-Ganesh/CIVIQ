import { readFile, access } from "node:fs/promises";
import { db } from "../src/lib/db";
async function register() {
  await db.datasetSource.update({
    where: { id: "southampton-waste" },
    data: {
      dataType: "OFFICIAL_AGGREGATE",
      licence:
        "Factual statistic displayed with attribution; broader source reuse terms unverified",
      coverage: "Southampton, UK",
      status: "verified_aggregate",
      importedCount: 1,
      payload: JSON.stringify({
        statistic: 47.1,
        unit: "fly-tipping incidents per 1,000 residents",
        referencePeriod: "2024/25",
        sourceUpdated: "2026-06-29",
        verifiedOn: "2026-10-17",
        notAnIssueFeed: true,
      }),
      note: "Official aggregate only. Recording practices affect comparisons. No geolocated council complaint feed has been imported.",
    },
  });
  const manifest = JSON.parse(
    await readFile("datasets/manifests/commons-smoke.json", "utf8"),
  ) as {
    samples: {
      id: string;
      sourceUrl: string;
      licence: string;
      coverage: string;
      importDate: string;
      referenceDateText: string;
      referenceDate: string;
      file: string;
      attribution: string;
      limitations: string;
    }[];
  };
  for (const sample of manifest.samples) {
    let present = false;
    try {
      await access(`datasets/cache/commons-smoke/${sample.file}`);
      present = true;
    } catch {}
    await db.datasetSource.upsert({
      where: { id: `commons-${sample.id}` },
      update: {
        payload: JSON.stringify(sample),
        period: sample.referenceDate.slice(0, 10),
        status: present ? "image_available" : "manifest_only",
      },
      create: {
        id: `commons-${sample.id}`,
        title: `Commons evaluation photograph ${sample.id}`,
        url: sample.sourceUrl,
        period: sample.referenceDate.slice(0, 10),
        retrievedAt: new Date(sample.importDate),
        importDate: new Date(sample.importDate),
        note: sample.limitations,
        dataType: "MODEL_EVALUATION",
        licence: sample.licence,
        coverage: sample.coverage,
        status: present ? "image_available" : "manifest_only",
        importedCount: 1,
        originalRecordId: sample.id,
        payload: JSON.stringify(sample),
      },
    });
    await db.importedRecord.upsert({
      where: {
        sourceId_originalRecordId: {
          sourceId: `commons-${sample.id}`,
          originalRecordId: sample.id,
        },
      },
      update: {},
      create: {
        sourceId: `commons-${sample.id}`,
        originalRecordId: sample.id,
        dataType: "MODEL_EVALUATION",
        referenceDate: new Date(sample.referenceDate),
        payload: JSON.stringify(sample),
      },
    });
  }
  try {
    const evaluation = JSON.parse(
      await readFile("docs/evaluation/v2-smoke-evaluation.json", "utf8"),
    );
    const id = `siglip-smoke-${evaluation.evaluatedAt}`;
    await db.modelEvaluation.upsert({
      where: { id },
      update: {},
      create: {
        id,
        modelId: evaluation.modelId,
        revision: evaluation.revision,
        dataset: evaluation.dataset,
        sampleSize: evaluation.sampleSize,
        result: JSON.stringify(evaluation),
        evaluatedAt: new Date(evaluation.evaluatedAt),
      },
    });
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
  }
  await db.photograph.updateMany({
    where: { path: { startsWith: "/demo/" } },
    data: { dataType: "SYNTHETIC_DEMO" },
  });
  console.log(
    "Registered verified aggregate context and separate evaluation provenance; no issue records created.",
  );
}
register()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
