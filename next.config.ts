import type { NextConfig } from "next";
const config: NextConfig = {
  serverExternalPackages: ["@prisma/client"],
  devIndicators: false,
  distDir: process.env.DATABASE_URL?.includes("e2e") ? ".next-e2e" : ".next",
};
export default config;
