import { api, reply } from "auto-types-api";
import { z } from "zod";
import { Problem, Todo, TodoChanges } from "../schemas";
import { deleteTodo, findTodo, updateTodo } from "../todos.server";

const params = z.object({ id: z.coerce.number<string | number>().int() });
const errors = { 404: Problem };
const notFound = (id: number) => ({ message: `Todo ${id} not found` });

// GET /api/todos/items/:id
const GET = api.get(
  { params, response: Todo, errors, summary: "Get a todo", tags: ["todos"] },
  ({ params, error }) => findTodo(params.id) ?? error(404, notFound(params.id)),
);

// PATCH /api/todos/items/:id  { title?, done? }
const PATCH = api.patch(
  { params, body: TodoChanges, response: Todo, errors, summary: "Update a todo", tags: ["todos"] },
  ({ params, body, error }) => updateTodo(params.id, body) ?? error(404, notFound(params.id)),
);

// DELETE /api/todos/items/:id
const DELETE = api.delete(
  { params, errors, summary: "Delete a todo", tags: ["todos"] },
  ({ params, error }) => (deleteTodo(params.id) ? reply(204) : error(404, notFound(params.id))),
);

export const loader = api.serve({ GET, PATCH, DELETE });
export const action = loader;
