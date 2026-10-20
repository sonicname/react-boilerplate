import { data, Form, Link, redirect, useNavigation } from "react-router";
import { serverApi } from "~/lib/api.server";
import type { Route } from "./+types/[id]";

export function meta({ loaderData }: Route.MetaArgs) {
  return [{ title: loaderData ? loaderData.todo.title : "Todo" }];
}

// GET /todos/:id  →  GET /api/todos/items/:id
export async function loader({ request, context, params }: Route.LoaderArgs) {
  const result = await serverApi({ request, context }).getTodosItemsById({
    params: { id: params.id },
  });
  if (result.ok) return { todo: result.data };
  // Declared 404: render the error boundary with the API's message.
  if (result.error._tag === "EndpointError") {
    throw data(result.error.data.message, { status: result.error.status });
  }
  throw result.error;
}

// POST /todos/:id  →  PATCH or DELETE /api/todos/items/:id
export async function action({ request, context, params }: Route.ActionArgs) {
  const form = await request.formData();
  const api = serverApi({ request, context });
  if (form.get("intent") === "delete") {
    await api.deleteTodosItemsById.orThrow({ params: { id: params.id } });
    return redirect("/todos");
  }
  await api.patchTodosItemsById.orThrow({
    params: { id: params.id },
    body: { done: form.get("done") === "true" },
  });
  return null;
}

export default function TodoDetail({ loaderData }: Route.ComponentProps) {
  const { todo } = loaderData;
  const busy = useNavigation().state !== "idle";

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
      <Form method="post" className="flex gap-2">
        <input type="hidden" name="done" value={String(!todo.done)} />
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg border border-gray-300 px-4 py-2 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:hover:bg-gray-900"
        >
          {todo.done ? "Mark as open" : "Mark as done"}
        </button>
        <button
          type="submit"
          name="intent"
          value="delete"
          disabled={busy}
          className="rounded-lg px-4 py-2 text-red-600 hover:bg-red-50 disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-950"
        >
          Delete
        </button>
      </Form>
    </main>
  );
}
