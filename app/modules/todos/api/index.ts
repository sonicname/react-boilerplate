import { api } from "auto-types-api";
import { z } from "zod";
import { NewTodo, Problem, Todo } from "../schemas";
import { createTodo, findTodoByTitle, listTodos } from "../todos.server";

// GET /api/todos?q=read&done=false
const GET = api.get(
  {
    query: z.object({ q: z.string().optional(), done: z.boolean().optional() }),
    response: z.array(Todo),
    summary: "List todos",
    tags: ["todos"],
  },
  ({ query }) => listTodos(query),
);

// POST /api/todos  { title }
const POST = api.post(
  { body: NewTodo, response: Todo, errors: { 409: Problem }, summary: "Create a todo", tags: ["todos"] },
  async ({ body, error }) => {
    if (await findTodoByTitle(body.title)) return error(409, { message: `"${body.title}" already exists` });
    return createTodo(body.title);
  },
);

// Endpoints stay unexported: React Router strips loader/action (and what only they use)
// from the browser bundle.
export const loader = api.serve({ GET, POST });
export const action = loader;
