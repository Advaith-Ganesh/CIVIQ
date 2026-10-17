import { readFile, readdir, stat } from "node:fs/promises";
import { resolve, relative, isAbsolute } from "node:path";
import { parse } from "csv-parse/sync";
import { importManifest } from "../src/lib/importer";
import { db } from "../src/lib/db";
const args = process.argv.slice(2);
const value = (flag: string) => args[args.indexOf(flag) + 1];
async function inputText(path: string) {
  if ((await stat(path)).size > 2_000_000)
    throw new Error("Import exceeds 2 MB.");
  return readFile(path, "utf8");
}
function csvRecords(text: string) {
  return (
    parse(text, { columns: true, skip_empty_lines: true }) as Record<
      string,
      string
    >[]
  ).map((r) => ({
    ...r,
    ...(r.lat ? { lat: Number(r.lat), lng: Number(r.lng) } : {}),
    ...(r.value ? { value: Number(r.value) } : {}),
  }));
}
async function run() {
  if (!args.includes("--manifest"))
    throw new Error(
      "Use --manifest source.json with optional --records file.csv|file.json, --images directory or --url approved-HTTPS-endpoint.",
    );
  const manifest = JSON.parse(await inputText(value("--manifest")));
  if (args.includes("--records")) {
    const path = value("--records"),
      text = await inputText(path);
    manifest.records = path.endsWith(".csv")
      ? csvRecords(text)
      : JSON.parse(text);
  }
  if (args.includes("--images")) {
    if (manifest.source.dataType !== "MODEL_EVALUATION")
      throw new Error(
        "Image directories are evaluation data, never Southampton issues.",
      );
    const root = resolve(value("--images"));
    manifest.records = [];
    for (const entry of await readdir(root, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      for (const file of await readdir(resolve(root, entry.name))) {
        if (!/\.(jpg|jpeg|png|webp)$/i.test(file)) continue;
        manifest.records.push({
          id: `${entry.name}/${file}`,
          categoryId: entry.name,
          file: `${entry.name}/${file}`,
          referenceDate: manifest.source.referenceDate,
        });
      }
    }
    for (const r of manifest.records) {
      const rel = relative(root, resolve(root, r.file));
      if (rel.startsWith("..") || isAbsolute(rel))
        throw new Error("Image path must remain in the selected directory.");
    }
  }
  if (args.includes("--url")) {
    const url = new URL(value("--url"));
    const allowed = [
      "data.southampton.gov.uk",
      "raw.githubusercontent.com",
      "commons.wikimedia.org",
    ];
    if (url.protocol !== "https:" || !allowed.includes(url.hostname))
      throw new Error(
        "Public endpoint host not allowlisted; download and review the data manually.",
      );
    const response = await fetch(url, {
      redirect: "error",
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error(`Endpoint returned ${response.status}`);
    const reader = response.body?.getReader();
    if (!reader) throw new Error("Empty endpoint response.");
    let size = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 2_000_000) {
        await reader.cancel();
        throw new Error("Import exceeds 2 MB.");
      }
      chunks.push(value);
    }
    const text = Buffer.concat(chunks).toString("utf8");
    if (text.length > 2_000_000) throw new Error("Import exceeds 2 MB.");
    manifest.records = url.pathname.endsWith(".csv")
      ? csvRecords(text)
      : JSON.parse(text);
  }
  console.log(await importManifest(manifest));
}
run()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
