import { boolean, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

// Database schema (Drizzle). Every table exported here is available on `db.query.<table>`.
// After changing it, run `pnpm db:generate` to write a migration into `drizzle/`.

export const todos = pgTable("todos", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  title: text().notNull(),
  done: boolean().notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
