import { mkdirSync } from "node:fs";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

/**
 * The Drizzle client, server only (`.server` modules never reach the browser bundle).
 *
 * - `DATABASE_URL` set: Postgres through postgres-js. Required in production.
 * - Otherwise, in dev: an embedded Postgres (PGlite) persisted to `.data/pglite`, so no database
 *   service is needed to run the boilerplate. `pnpm db:studio` opens the same directory, and
 *   the two cannot have it open at the same time.
 *
 * Pending migrations from `drizzle/` run when the client is created (`pnpm db:generate` writes them).
 */
export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;

const migrationsFolder = "drizzle";

async function connectPostgres(url: string): Promise<Database> {
  const { drizzle } = await import("drizzle-orm/postgres-js");
  const { migrate } = await import("drizzle-orm/postgres-js/migrator");
  const db = drizzle(url, { schema });
  await migrate(db, { migrationsFolder });
  return db;
}

async function connectPglite(dataDir: string): Promise<Database> {
  // devDependency: loaded only here, so the production image does not need it.
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  mkdirSync(dataDir, { recursive: true }); // PGlite only creates the last path segment itself
  const db = drizzle(dataDir, { schema });
  await migrate(db, { migrationsFolder });
  await seed(db);
  return db;
}

/** Example rows for the dev database, inserted once while the table is empty. */
async function seed(db: Database) {
  if ((await db.$count(schema.todos)) > 0) return;
  await db.insert(schema.todos).values([
    { title: "Read the boilerplate README", done: true },
    { title: "Add your first module" },
  ]);
}

function connect(): Promise<Database> {
  const url = process.env.DATABASE_URL;
  if (url) return connectPostgres(url);
  if (import.meta.env.DEV) return connectPglite(".data/pglite");
  throw new Error("DATABASE_URL is not set (e.g. postgres://user:password@host:5432/dbname)");
}

// Kept on globalThis so dev-server module reloads reuse the connection instead of opening a new
// one (PGlite allows a single instance per data directory). A failed connection is not kept, so
// the next request retries.
declare global {
  var __db: Promise<Database> | undefined;
}

export const db = await (globalThis.__db ??= connect().catch((error: unknown) => {
  globalThis.__db = undefined;
  throw error;
}));
