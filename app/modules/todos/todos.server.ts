import { and, eq, ilike, sql } from "drizzle-orm";
import { db } from "~/db/client.server";
import { todos } from "~/db/schema";
import type { Todo } from "./schemas";

// Data access, server only (`.server` modules never reach the browser bundle).
// Rows come from the `todos` table (app/db/schema.ts); the API contract is the `Todo` Zod schema.

const toTodo = (row: typeof todos.$inferSelect): Todo => ({ ...row, createdAt: row.createdAt.toISOString() });

/** Escapes the LIKE wildcards so a search for "50%" matches literally. */
const escapeLike = (term: string) => term.replace(/[\\%_]/g, "\\$&");

export async function listTodos(filter: { q?: string; done?: boolean }): Promise<Todo[]> {
  const rows = await db
    .select()
    .from(todos)
    .where(
      and(
        filter.q ? ilike(todos.title, `%${escapeLike(filter.q)}%`) : undefined,
        filter.done === undefined ? undefined : eq(todos.done, filter.done),
      ),
    )
    .orderBy(todos.id);
  return rows.map(toTodo);
}

export async function findTodo(id: number): Promise<Todo | undefined> {
  const row = await db.query.todos.findFirst({ where: eq(todos.id, id) });
  return row && toTodo(row);
}

export async function findTodoByTitle(title: string): Promise<Todo | undefined> {
  const row = await db.query.todos.findFirst({ where: sql`lower(${todos.title}) = lower(${title})` });
  return row && toTodo(row);
}

export async function createTodo(title: string): Promise<Todo> {
  const [row] = await db.insert(todos).values({ title }).returning();
  return toTodo(row);
}

export async function updateTodo(
  id: number,
  changes: Partial<Pick<Todo, "title" | "done">>,
): Promise<Todo | undefined> {
  if (Object.keys(changes).length === 0) return findTodo(id);
  const [row] = await db.update(todos).set(changes).where(eq(todos.id, id)).returning();
  return row && toTodo(row);
}

export async function deleteTodo(id: number): Promise<boolean> {
  const deleted = await db.delete(todos).where(eq(todos.id, id)).returning({ id: todos.id });
  return deleted.length > 0;
}
