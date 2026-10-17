const { execFileSync, spawn } = require("node:child_process");
const fs = require("node:fs");
process.env.DATABASE_URL = "file:./e2e.db";
process.env.LOCAL_DEMO = "true";
process.env.AI_PROVIDER = "demo";
process.env.WATCHPACK_POLLING = "true";
fs.rmSync("prisma/e2e.db", { force: true });
require("./ensure-db.cjs");
for (const args of [
  ["node_modules/prisma/build/index.js", "migrate", "deploy"],
  ["node_modules/tsx/dist/cli.mjs", "prisma/seed.ts"],
])
  execFileSync(process.execPath, args, { stdio: "inherit", env: process.env });
const child = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "dev",
    "--webpack",
    "--hostname",
    "127.0.0.1",
    "--port",
    "3001",
  ],
  { stdio: "inherit", env: process.env },
);
process.on("SIGTERM", () => child.kill("SIGTERM"));
process.on("SIGINT", () => child.kill("SIGINT"));
child.on("exit", (code) => process.exit(code || 0));
