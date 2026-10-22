import { useRouteLoaderData } from "react-router";

// Environment names and the public part of the configuration. Safe to import from browser code:
// the values come from the root loader (app/root.tsx), the full server config is in env.server.ts.

export const APP_ENVS = ["local", "development", "staging", "production"] as const;
export type AppEnv = (typeof APP_ENVS)[number];

/** Configuration the browser may see. Never put secrets here. */
export type PublicEnv = {
  APP_ENV: AppEnv;
  /** Public origin of this deployment, e.g. for absolute links and callbacks. */
  APP_URL: string;
};

/** The public configuration, on the server and in the browser (from the root loader). */
export function usePublicEnv(): PublicEnv {
  const data = useRouteLoaderData("root") as { env: PublicEnv } | undefined;
  if (!data) throw new Error("usePublicEnv() needs the root loader (app/root.tsx)");
  return data.env;
}
