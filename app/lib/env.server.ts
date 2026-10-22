import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { z } from "zod";
import { APP_ENVS, type PublicEnv } from "./env";

/**
 * Server configuration, validated once at startup (server only).
 *
 * Sources, highest priority first:
 *   1. the process environment (the host, Docker `-e`, CI secrets)
 *   2. `.env`                   personal overrides and secrets, git-ignored
 *   3. `.env.<APP_ENV>`         committed defaults of each environment, never secrets
 *
 * `APP_ENV` (local | development | staging | production) picks the file in step 3. It defaults
 * to `local` in dev and to `production` when NODE_ENV is production (`pnpm start`, Docker).
 * The same build runs in every environment: nothing here is baked in at build time.
 */

const schema = z
  .object({
    APP_ENV: z.enum(APP_ENVS),
    APP_URL: z.url(),
    DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }).optional(),
    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  })
  .superRefine((env, ctx) => {
    // Only `local` may run without a database (it uses the embedded PGlite instead).
    if (env.APP_ENV !== "local" && !env.DATABASE_URL) {
      ctx.addIssue({ code: "custom", path: ["DATABASE_URL"], message: `required when APP_ENV=${env.APP_ENV}` });
    }
  });

export type Env = z.infer<typeof schema>;

/** Reads a dotenv file into process.env, keeping variables that are already set. */
function loadFile(path: string) {
  if (!existsSync(path)) return;
  for (const [key, value] of Object.entries(parseEnv(readFileSync(path, "utf8")))) {
    process.env[key] ??= value;
  }
}

/** Loads `.env` and `.env.<APP_ENV>` (see above) and returns the resolved APP_ENV. */
export function loadEnvFiles(): string {
  loadFile(".env");
  const appEnv = process.env.APP_ENV ?? (process.env.NODE_ENV === "production" ? "production" : "local");
  process.env.APP_ENV = appEnv;
  loadFile(`.env.${appEnv}`);
  return appEnv;
}

function load(): Env {
  const appEnv = loadEnvFiles();
  const result = schema.safeParse(process.env);
  if (result.success) return result.data;
  throw new Error(
    [`Invalid environment (APP_ENV=${appEnv}). See .env.example.`, z.prettifyError(result.error)].join("\n"),
  );
}

export const env: Env = load();

/** The part of `env` that the root loader sends to the browser. */
export const publicEnv: PublicEnv = { APP_ENV: env.APP_ENV, APP_URL: env.APP_URL };

export const isLocal = env.APP_ENV === "local";
export const isProduction = env.APP_ENV === "production";
