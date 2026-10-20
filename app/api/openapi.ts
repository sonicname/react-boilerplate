import { api } from "auto-types-api";
import { createOpenApiDocument } from "auto-types-api/openapi";

// GET /api/openapi: OpenAPI 3.1 document built from the API files' schemas.
const modules = import.meta.glob(["./**/*.ts", "../modules/*/api/**/*.ts", "!./openapi.ts"], {
  eager: true,
});

export const loader = api.serve({
  GET: api.get({ summary: "OpenAPI document", tags: ["system"] }, () =>
    createOpenApiDocument({
      modules,
      from: "api",
      info: { title: "react-boilerplate", version: "1.0.0" },
    }),
  ),
});
