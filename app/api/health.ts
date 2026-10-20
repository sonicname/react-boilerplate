import { api } from "auto-types-api";

// GET /api/health
export const loader = api.serve({
  GET: api.get({ summary: "Health check", tags: ["system"] }, () => ({
    ok: true as const,
    uptime: Math.round(process.uptime()),
  })),
});
