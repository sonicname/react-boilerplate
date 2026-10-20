import { index, layout, prefix, type RouteConfig } from "@react-router/dev/routes";
import {
  buildApiModuleRouteConfig,
  buildApiRouteConfig,
  buildGlobRouteConfig,
  type GlobModules,
} from "modules-page-routing";

// Routes come from the file system (modules-page-routing):
//   modules/<module>/pages/**  →  /<module>/...
//   modules/<module>/api/**    →  /api/<module>/...
//   api/**                     →  /api/...
const pages = import.meta.glob("./modules/**/pages/**/*.{tsx,ts}");
const api = import.meta.glob("./api/**/*.ts");
const moduleApi = import.meta.glob("./modules/**/api/**/*.ts");

export default [
  layout("modules/__root.tsx", [
    index("modules/__homepage.tsx"),
    ...buildGlobRouteConfig(pages as GlobModules),
  ]),
  ...prefix("api", [...buildApiRouteConfig(api), ...buildApiModuleRouteConfig(moduleApi)]),
] satisfies RouteConfig;
