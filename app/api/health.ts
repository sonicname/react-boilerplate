import { api } from "auto-types-api";
import { env } from "~/lib/env.server";

// GET /api/health
export const loader = api.serve({
  GET: api.get({ summary: "Health check", tags: ["system"] }, () => ({
    ok: true as const,
    env: env.APP_ENV,
    uptime: Math.round(process.uptime()),
  })),
});
