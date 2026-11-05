import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { PrismaClient } from "./generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { attachDatabasePool } from "@vercel/functions";
import { Pool } from "pg";

// Resolved against this file, not the working directory: npm scripts run from
// the workspace root, prisma and the seed run from server/, and Vercel runs
// from somewhere else again. server/.env wins if present, the repo root is the
// fallback, and on Vercel neither exists and the real env vars are used.
const here = path.dirname(fileURLToPath(import.meta.url));
config({ path: [path.join(here, "..", ".env"), path.join(here, "..", "..", ".env")], quiet: true });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

// Serverless functions can be re-invoked on a warm container, and nodemon
// reloads the module in dev. Cache the client on globalThis so we open one
// pool per process instead of one per reload/invocation.
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

// Every warm Vercel instance keeps its own pool, so keep each one small and let
// idle connections go quickly; attachDatabasePool keeps a suspending instance
// alive just long enough to actually release them.
function createClient(): PrismaClient {
  const pool = new Pool({ connectionString, max: 5, idleTimeoutMillis: 5_000 });
  attachDatabasePool(pool);
  return new PrismaClient({ adapter: new PrismaPg(pool) });
}

const prisma = globalForPrisma.prisma ?? createClient();

globalForPrisma.prisma = prisma;

export default prisma;
