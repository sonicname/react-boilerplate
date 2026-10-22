import { api, reply } from "auto-types-api";
import { z } from "zod";
import { Problem, Todo, TodoChanges } from "../schemas";
import { deleteTodo, findTodo, updateTodo } from "../todos.server";

const params = z.object({ id: z.coerce.number<string | number>().int() });
const errors = { 404: Problem };
const notFound = (id: number) => ({ message: `Todo ${id} not found` });

// GET /api/todos/:id
const GET = api.get(
  { params, response: Todo, errors, summary: "Get a todo", tags: ["todos"] },
  async ({ params, error }) => (await findTodo(params.id)) ?? error(404, notFound(params.id)),
);

// PATCH /api/todos/:id  { title?, done? }
const PATCH = api.patch(
  { params, body: TodoChanges, response: Todo, errors, summary: "Update a todo", tags: ["todos"] },
  async ({ params, body, error }) => (await updateTodo(params.id, body)) ?? error(404, notFound(params.id)),
);

// DELETE /api/todos/:id
const DELETE = api.delete(
  { params, errors, summary: "Delete a todo", tags: ["todos"] },
  async ({ params, error }) => ((await deleteTodo(params.id)) ? reply(204) : error(404, notFound(params.id))),
);

export const loader = api.serve({ GET, PATCH, DELETE });
export const action = loader;
