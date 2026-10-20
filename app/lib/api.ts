import { createRepository } from "endpoint-kit";
import { routes } from "~/api.gen";

/**
 * Typed API client for browser code (`clientLoader`, event handlers, effects). Requests go to
 * the same origin. In loaders and actions use `serverApi` from `~/lib/api.server` instead.
 *
 * @example
 * const { data, error } = await api.getTodosById({ params: { id: 1 } });
 */
export const api = createRepository({ baseUrl: "" }).mergeAll(routes).build();
