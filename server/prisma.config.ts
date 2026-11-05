import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// The prisma CLI's working directory varies (npm scripts run it from server/,
// you might run it from the root), so the env files are located relative to
// this file instead. server/.env wins if present, the repo root is the fallback.
const here = path.dirname(fileURLToPath(import.meta.url));
config({ path: [path.join(here, ".env"), path.join(here, "..", ".env")], quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env["DATABASE_URL"] ?? "",
  },
});
