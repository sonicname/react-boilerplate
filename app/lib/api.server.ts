import { createRepository, fetchAdapter } from "endpoint-kit";
import { routes } from "~/api.gen";
import { localFetch } from "~/api.gen.server";

/**
 * Typed API client for loaders and actions. Calls the API handlers in-process (no HTTP round
 * trip) and forwards the incoming request's cookie and authorization headers.
 *
 * @example
 * export async function loader({ request, context }: Route.LoaderArgs) {
 *   return serverApi({ request, context }).getTodosItems.orThrow();
 * }
 */
export function serverApi(args: { request: Request; context?: unknown }) {
  return createRepository({ baseUrl: "", adapter: fetchAdapter({ fetch: localFetch(args) }) })
    .mergeAll(routes)
    .build();
}
