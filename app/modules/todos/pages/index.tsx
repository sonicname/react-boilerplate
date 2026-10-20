import { useEffect, useRef } from "react";
import { data, Form, Link, useNavigation } from "react-router";
import { serverApi } from "~/lib/api.server";
import type { Route } from "./+types/index";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Todos" }];
}

// GET /todos?q=...  →  GET /api/todos/items?q=... (in-process, typed)
export async function loader({ request, context }: Route.LoaderArgs) {
  const q = new URL(request.url).searchParams.get("q") ?? "";
  const todos = await serverApi({ request, context }).getTodosItems.orThrow({
    query: q ? { q } : {},
  });
  return { todos, q };
}

// POST /todos  →  POST /api/todos/items
export async function action({ request, context }: Route.ActionArgs) {
  const form = await request.formData();
  const { error } = await serverApi({ request, context }).postTodosItems({
    body: { title: String(form.get("title") ?? "") },
  });
  if (!error) return { error: null };
  // Declared error (409): typed status and body.
  if (error._tag === "EndpointError") {
    return data({ error: error.data.message }, { status: error.status });
  }
  // The API rejected the body (400).
  if (error._tag === "ApiError" && error.status === 400) {
    return data({ error: "Title must be 1 to 120 characters." }, { status: 400 });
  }
  throw error;
}

export default function Todos({ loaderData, actionData }: Route.ComponentProps) {
  const { todos, q } = loaderData;
  const navigation = useNavigation();
  const creating = navigation.state !== "idle" && navigation.formMethod === "POST";
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (navigation.state === "idle" && actionData?.error === null) form.current?.reset();
  }, [navigation.state, actionData]);

  return (
    <main className="container mx-auto max-w-2xl space-y-6 px-4 py-10">
      <h1 className="text-2xl font-semibold">Todos</h1>

      <Form method="get" role="search">
        <input
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Search todos"
          aria-label="Search todos"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
        />
      </Form>

      <Form ref={form} method="post" className="flex gap-2">
        <input
          name="title"
          placeholder="What needs doing?"
          aria-label="New todo"
          aria-invalid={actionData?.error ? true : undefined}
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
        />
        <button
          type="submit"
          disabled={creating}
          className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {creating ? "Adding..." : "Add"}
        </button>
      </Form>
      {actionData?.error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {actionData.error}
        </p>
      )}

      {todos.length === 0 ? (
        <p className="text-gray-500">{q ? `No todos match "${q}".` : "Nothing to do yet."}</p>
      ) : (
        <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
          {todos.map((todo) => (
            <li key={todo.id}>
              <Link
                to={`/todos/${todo.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-900"
              >
                <span className={todo.done ? "text-gray-400 line-through" : undefined}>
                  {todo.title}
                </span>
                <span className="text-xs text-gray-500">{todo.done ? "Done" : "Open"}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
