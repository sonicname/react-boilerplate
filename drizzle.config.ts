import { defineConfig } from "drizzle-kit";
import { env } from "./app/lib/env.server";

// drizzle-kit: `pnpm db:generate` (migrations from app/db/schema.ts), `pnpm db:migrate`,
// `pnpm db:studio`. Targets DATABASE_URL, or the local PGlite directory when it is not set.

export default defineConfig({
  dialect: "postgresql",
  schema: "./app/db/schema.ts",
  out: "./drizzle",
  ...(env.DATABASE_URL
    ? { dbCredentials: { url: env.DATABASE_URL } }
    : { driver: "pglite", dbCredentials: { url: "./.data/pglite" } }),
});
