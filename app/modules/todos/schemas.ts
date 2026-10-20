import { z } from "zod";

// Shared by the API files and the pages. Kept outside `api/`, where every `.ts` file is a route.

export const Todo = z.object({
  id: z.number().int(),
  title: z.string().trim().min(1).max(120),
  done: z.boolean(),
  createdAt: z.iso.datetime(),
});
export type Todo = z.infer<typeof Todo>;

export const NewTodo = Todo.pick({ title: true });
export const TodoChanges = Todo.pick({ title: true, done: true }).partial();

/** Body of declared error responses. */
export const Problem = z.object({ message: z.string() });
