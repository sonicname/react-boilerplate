import { defineConfig } from "drizzle-kit";

// drizzle-kit: `pnpm db:generate` (migrations from app/db/schema.ts), `pnpm db:migrate`,
// `pnpm db:studio`. Targets DATABASE_URL, or the dev PGlite directory when it is not set.

try {
  process.loadEnvFile();
} catch {
  // no .env file
}

const url = process.env.DATABASE_URL;

export default defineConfig({
  dialect: "postgresql",
  schema: "./app/db/schema.ts",
  out: "./drizzle",
  ...(url ? { dbCredentials: { url } } : { driver: "pglite", dbCredentials: { url: "./.data/pglite" } }),
});
