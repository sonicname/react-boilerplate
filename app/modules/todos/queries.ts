import type { QueryClient } from "@tanstack/react-query";
import type { RouteFailure } from "endpoint-kit";
import { routeQuery } from "endpoint-kit/tanstack-query";
import { data } from "react-router";
import type { Routes } from "~/api.gen";
import type { api } from "~/lib/api";

// Query options shared by the server (loaders, with `serverApi`) and the browser (clientLoaders
// and components, with `api`). Keys are `[method, path, input]`, so both sides read and write the
// same cache entries as long as they build the input the same way: always go through these.

/** `api` or `serverApi(...)`: both are built from the same generated routes. */
type Client = typeof api;

export const todoQueries = {
  /** GET /api/todos?q= — an empty search sends no `q`. */
  list: (client: Client, q: string) => routeQuery(client.getTodos, { query: q ? { q } : {} }),
  /** GET /api/todos/:id — `id` is the URL param string on both sides, never a number. */
  detail: (client: Client, id: string) => routeQuery(client.getTodosById, { params: { id } }),
};

/** Loads a todo into the cache (fresh entries are reused) and turns the API's 404 into a 404 page. */
export async function loadTodo(queryClient: QueryClient, client: Client, id: string) {
  try {
    return await queryClient.query(todoQueries.detail(client, id));
  } catch (cause) {
    const error = cause as RouteFailure<Routes["getTodosById"]>;
    if (error._tag === "EndpointError") throw data(error.data.message, { status: error.status });
    throw error;
  }
}
