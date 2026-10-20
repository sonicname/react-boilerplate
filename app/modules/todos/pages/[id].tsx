import { dehydrate, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { routeKeyPrefix } from "endpoint-kit/tanstack-query";
import { Link, useNavigate } from "react-router";
import { api } from "~/lib/api";
import { serverApi } from "~/lib/api.server";
import { getQueryClient, makeQueryClient, routeMutation } from "~/lib/query";
import { loadTodo, todoQueries } from "../queries";
import type { Route } from "./+types/[id]";

export function meta({ loaderData }: Route.MetaArgs) {
  return [{ title: loaderData ? loaderData.title : "Todo" }];
}

// First load (SSR): GET /api/todos/:id in-process; a declared 404 renders the error boundary.
export async function loader({ request, context, params }: Route.LoaderArgs) {
  const queryClient = makeQueryClient();
  const todo = await loadTodo(queryClient, serverApi({ request, context }), params.id);
  return { title: todo.title, dehydratedState: dehydrate(queryClient) };
}

// Client navigations: over HTTP with api, or straight from the cache when the entry is fresh.
export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const todo = await loadTodo(getQueryClient(), api, params.id);
  return { title: todo.title };
}

export default function TodoDetail({ params }: Route.ComponentProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const detail = todoQueries.detail(api, params.id);
  const { data: todo } = useQuery(detail);
  const listKey = routeKeyPrefix(api.getTodos);

  const toggle = useMutation(
    routeMutation(api.patchTodosById, {
      onSuccess: (updated) => {
        queryClient.setQueryData(detail.queryKey, updated);
        return queryClient.invalidateQueries({ queryKey: listKey });
      },
    }),
  );
  const remove = useMutation(
    routeMutation(api.deleteTodosById, {
      onSuccess: async () => {
        // Stale but not refetched: this page is leaving (removing the entry now would make its
        // useQuery fetch the deleted todo again), and a later visit refetches and gets the 404.
        void queryClient.invalidateQueries({ queryKey: detail.queryKey, refetchType: "none" });
        await queryClient.invalidateQueries({ queryKey: listKey });
        await navigate("/todos");
      },
    }),
  );
  const busy = toggle.isPending || remove.isPending;

  // The loader put the todo in the cache before this renders.
  if (!todo) return null;

  return (
    <main className="container mx-auto max-w-2xl space-y-6 px-4 py-10">
      <Link to="/todos" className="text-sm text-blue-700 hover:underline dark:text-blue-400">
        &larr; All todos
      </Link>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">{todo.title}</h1>
        <p className="text-sm text-gray-500">
          {todo.done ? "Done" : "Open"} &middot; created{" "}
          <time dateTime={todo.createdAt}>{new Date(todo.createdAt).toLocaleDateString()}</time>
        </p>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => toggle.mutate({ params: { id: params.id }, body: { done: !todo.done } })}
          className="rounded-lg border border-gray-300 px-4 py-2 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:hover:bg-gray-900"
        >
          {todo.done ? "Mark as open" : "Mark as done"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => remove.mutate({ params: { id: params.id } })}
          className="rounded-lg px-4 py-2 text-red-600 hover:bg-red-50 disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-950"
        >
          Delete
        </button>
      </div>
      {(toggle.error ?? remove.error) && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {(toggle.error ?? remove.error)?._tag === "EndpointError"
            ? "This todo no longer exists."
            : "Something went wrong, try again."}
        </p>
      )}
    </main>
  );
}
