// SQLite can be pre-created on restricted hosts where engine creation is denied.
const fs = require("node:fs");
const path = require("node:path");
const url = process.env.DATABASE_URL || "file:./dev.db";
if (!url.startsWith("file:"))
  throw new Error("Phase 1 expects a SQLite file URL.");
const target = path.resolve("prisma", url.slice(5));
fs.mkdirSync(path.dirname(target), { recursive: true });
const fd = fs.openSync(target, "a");
fs.closeSync(fd);
