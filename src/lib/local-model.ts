import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { db } from "./db";
export type VisionCandidate = {
  categoryId: string;
  label: string;
  rawScore: number;
  score: number;
};
export type VisionResult = {
  available: boolean;
  provider: string;
  categoryId: string;
  suggestedCategoryId?: string;
  abstained: boolean;
  modelId?: string;
  revision?: string;
  inferredAt?: string;
  durationMs?: number;
  candidates: VisionCandidate[];
  reliabilityWarning: string;
  scoreType?: string;
  error?: string;
  reviewThreshold?: number;
  marginThreshold?: number;
  analysisId?: string;
};
export type ModelStatus = {
  state: string;
  loaded: boolean;
  device: string;
  vision?: { id: string; revision: string; licence: string };
  text?: { id: string; revision: string; licence: string };
  classifications?: number;
  averageInferenceMs?: number | null;
  lastError?: string | null;
  busy?: boolean;
  activeProvider?: string;
};
export async function inferenceRequest<T>(
  path: string,
  body?: unknown,
  timeout = 45000,
): Promise<T> {
  const base = process.env.INFERENCE_URL || "http://127.0.0.1:8001";
  const response = await fetch(new URL(path, base), {
    method: body ? "POST" : "GET",
    headers: {
      "Content-Type": "application/json",
      "X-Inference-Token":
        process.env.INFERENCE_TOKEN || "local-development-only",
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(timeout),
    cache: "no-store",
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(
      result.error ||
        result.detail ||
        `Inference request failed (${response.status}).`,
    );
  return result;
}
export async function modelStatus(): Promise<ModelStatus> {
  try {
    return await inferenceRequest<ModelStatus>("/health", undefined, 2000);
  } catch {
    return {
      state: "offline",
      loaded: false,
      device: "unavailable",
      lastError:
        "Local inference service is offline. Reports remain available with manual classification.",
    };
  }
}
export async function photoBytes(id: string) {
  const photo = await db.photograph.findUniqueOrThrow({ where: { id } });
  const name = photo.path.match(/^\/media\/([a-f0-9-]+\.jpg)$/)?.[1];
  if (!name)
    throw new Error(
      "Synthetic SVG fixtures are not submitted as real model photographs. Upload a JPEG, PNG or WebP image.",
    );
  return { photo, bytes: await readFile(`data/uploads/${name}`) };
}
export async function analyzePhotograph(
  photoId: string,
  threshold = 0.1,
  margin = 0.35,
): Promise<VisionResult> {
  const existing = await db.imageAnalysis.findFirst({
    where: { photographId: photoId, provider: "local", status: "available" },
    orderBy: { createdAt: "desc" },
  });
  if (existing) {
    const saved = JSON.parse(existing.result) as VisionResult;
    if (saved.reviewThreshold === threshold && saved.marginThreshold === margin)
      return { ...saved, analysisId: existing.id };
  }
  let result: VisionResult;
  try {
    const { bytes } = await photoBytes(photoId);
    result = await inferenceRequest<VisionResult>("/classify", {
      imageBase64: bytes.toString("base64"),
      reviewThreshold: threshold,
      marginThreshold: margin,
    });
  } catch (e) {
    result = {
      available: false,
      provider: "local",
      categoryId: "other",
      abstained: true,
      candidates: [],
      reliabilityWarning:
        "AI analysis unavailable. Choose the category manually; your report can still be submitted.",
      error: e instanceof Error ? e.message : "Inference failed.",
    };
  }
  const row = await db.imageAnalysis.create({
    data: {
      photographId: photoId,
      provider: "local",
      modelId: result.modelId,
      revision: result.revision,
      status: result.available ? "available" : "unavailable",
      categoryId: result.categoryId,
      abstained: result.abstained,
      durationMs: result.durationMs,
      result: JSON.stringify(result),
    },
  });
  return { ...result, analysisId: row.id };
}
const TEXT_MODEL = "sentence-transformers/all-MiniLM-L6-v2";
export async function descriptionEmbeddings(
  texts: string[],
): Promise<number[][]> {
  const keys = texts.map((t) =>
    createHash("sha256").update(`${TEXT_MODEL}:${t}`).digest("hex"),
  );
  const cached = await db.textEmbedding.findMany({
    where: { id: { in: keys } },
  });
  const byId = new Map(
    cached.map((r) => [r.id, JSON.parse(r.vector) as number[]]),
  );
  const missing = keys
    .map((key, i) => ({ key, text: texts[i] }))
    .filter((x) => !byId.has(x.key));
  for (let n = 0; n < missing.length; n += 24) {
    const batch = missing.slice(n, n + 24),
      result = await inferenceRequest<{
        embeddings: number[][];
        modelId: string;
        revision: string;
      }>("/embed", { texts: batch.map((x) => x.text) });
    for (let i = 0; i < batch.length; i++) {
      const x = batch[i],
        vector = result.embeddings[i];
      await db.textEmbedding.upsert({
        where: { id: x.key },
        update: {},
        create: {
          id: x.key,
          modelId: result.modelId,
          revision: result.revision,
          vector: JSON.stringify(vector),
        },
      });
      byId.set(x.key, vector);
    }
  }
  return keys.map((k) => byId.get(k)!);
}
export function cosine(a: number[], b: number[]) {
  if (a.length !== b.length || !a.length) return 0;
  const dot = a.reduce((sum, v, i) => sum + v * b[i], 0),
    norm = Math.sqrt(
      a.reduce((s, x) => s + x * x, 0) * b.reduce((s, x) => s + x * x, 0),
    );
  return norm ? dot / norm : 0;
}
export async function repairComparison(beforeId: string, afterId: string) {
  const [before, after] = await Promise.all([
    photoBytes(beforeId),
    photoBytes(afterId),
  ]);
  return inferenceRequest<{
    cosineSimilarity: number;
    recommendation: string;
    warning: string;
    modelId: string;
    inferredAt: string;
  }>("/compare", {
    beforeBase64: before.bytes.toString("base64"),
    afterBase64: after.bytes.toString("base64"),
  });
}
