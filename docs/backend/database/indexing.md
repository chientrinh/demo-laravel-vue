# Database Indexing — TaskFlow Backend

This document summarises the indexes defined on the TaskFlow Laravel 11 database tables and when the query optimizer typically uses them. The **migration files** are the source of truth; this page exists to help developers write efficient queries and understand query performance.

## `users` table indexes

| Index name (implicit) | Columns | Purpose |
|-----------------------|---------|---------|
| Primary key | `id` | Unique identifier; used by primary look‑ups (`Task::find($id)`, `User::find($id)`). |
| Email uniqueness | `email` (unique) | Enforces `unique` constraint on log‑in; also used by login Form Request validation. |
| Role index (implicit) | `role` | Not a separate index in the current migration, but the `enum` column is highly selective (only two values). The query optimizer may perform a full table scan; if frequent role‑based filtering is required, consider adding an explicit index. |

*No additional user‑defined indexes exist beyond the primary key and the unique email column.*

---

## `tasks` table indexes

| Index name (implicit) | Columns | Purpose |
|-----------------------|---------|---------|
| Primary key | `id` | Unique task identifier; used by `Task::find($id)`, `Task::where('id', $id)`. |
| Composite index | `([status], [assigned_to])` | Declared in the migration as `$table->index(['status', 'assigned_to']);`. This index is used by the Repository’s `paginate` method when filtering by **status** and/or **assigned_to** together. The left‑most prefix allows queries that filter only on `status` to also benefit, but a query that filters only on `assigned_to` may not use this index efficiently (consider a separate index if that pattern is common). |
| Created‑at index | `created_at` | Declared as `$table->index('created_at');`. Useful for `latest('created_at')` or `oldest('created_at')` ordering, and for “last‑N tasks” queries. |

*No other indexes (e.g. on `due_date`, `title`, or `priority`) are defined in the current migrations.*

---

## When indexes are used (typical patterns)

| Query pattern | Index used |
|---------------|------------|
| `Task::where('status', 'todo')->paginate(20)` | Composite `([status], [assigned_to])` – the left‑most prefix `status` is matched. |
| `Task::where('assigned_to', $userId)->paginate(20)` | May **not** use the composite index efficiently (it’s not the left‑most column). Consider adding a separate index on `assigned_to` if this query pattern is hot. |
| `Task::orderBy('created_at')->paginate(20)` | `created_at` index. |
| `Task::where('status', 'todo')->where('assigned_to', $userId)->paginate(20)` | Composite index (both columns appear; the optimizer can use it because both are present). |
| `Task::where('due_date', '>', $date)->paginate(20)` | **No** index (full table scan). Adding an index on `due_date` would improve performance if overdue‑task queries are frequent. |
| `User::where('role', 'admin')->first()` | No explicit index; the `enum` has only two values, so a table scan is cheap. |

---

## Recommendations (if performance becomes a concern)

1. **Add an index on `assigned_to`** if you frequently list tasks for a specific user (e.g., `Task::where('assigned_to', $userId)`).  
   ```php
   $table->index('assigned_to'); // in a new migration
   ```

2. **Add an index on `due_date`** if you often query overdue tasks.  
   ```php
   $table->index('due_date');
   ```

3. **Keep the composite `([status], [assigned_to])`** as is; it serves the common “list my tasks filtered by status and assignee” pattern.

4. **Do not over‑index** – each index adds overhead on INSERT/UPDATE operations. The current set reflects the actual query patterns in the codebase (Repository `paginate`, list‑by‑status, list‑by‑assignee, sorting by creation).

---

*All index information derives from the migration files located in `database/migrations/`. If a new index is added, create a new migration and update this document in the same pull request.*