import type { Todo } from "./schemas";

// In-memory store, server only (`.server` modules never reach the browser bundle).
// Replace with your database.

let nextId = 3;
const todos: Todo[] = [
  { id: 1, title: "Read the boilerplate README", done: true, createdAt: new Date(0).toISOString() },
  { id: 2, title: "Add your first module", done: false, createdAt: new Date(0).toISOString() },
];

export function listTodos(filter: { q?: string; done?: boolean }): Todo[] {
  const term = filter.q?.toLowerCase();
  return todos.filter(
    (todo) =>
      (!term || todo.title.toLowerCase().includes(term)) &&
      (filter.done === undefined || todo.done === filter.done),
  );
}

export function findTodo(id: number): Todo | undefined {
  return todos.find((todo) => todo.id === id);
}

export function findTodoByTitle(title: string): Todo | undefined {
  return todos.find((todo) => todo.title.toLowerCase() === title.toLowerCase());
}

export function createTodo(title: string): Todo {
  const todo = { id: nextId++, title, done: false, createdAt: new Date().toISOString() };
  todos.push(todo);
  return todo;
}

export function updateTodo(id: number, changes: Partial<Pick<Todo, "title" | "done">>): Todo | undefined {
  const todo = findTodo(id);
  return todo && Object.assign(todo, changes);
}

export function deleteTodo(id: number): boolean {
  const index = todos.findIndex((todo) => todo.id === id);
  if (index === -1) return false;
  todos.splice(index, 1);
  return true;
}
