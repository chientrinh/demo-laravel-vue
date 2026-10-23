# Technical Assessment Answers

## 5. Short Questions (Written)

### 5.1. Performance & Security

#### 1. How would you improve the performance of `GET /api/tasks` when there are 1,000,000+ tasks?

To efficiently handle large datasets (1M+ records) in Laravel without degrading server resources or response times, I would apply the following strategies:

*   **Cursor-based Pagination:** Replace standard `OFFSET`/`LIMIT` pagination (`paginate()`) with Cursor-based pagination (`cursorPaginate()`). Standard pagination slows down significantly on high page numbers because the database must scan and skip previous rows, whereas Cursor pagination operates at $O(1)$ efficiency using indexed columns (e.g., `id` or `created_at`).
*   **Database Indexing:** Create composite indexes for columns frequently used in `WHERE` clauses, filtering, or sorting (e.g., `CREATE INDEX idx_tasks_user_status_created ON tasks(user_id, status, created_at)`).
*   **Eager Loading (Prevent N+1 Queries):** Always eager load relationships using `Task::with(['user', 'category'])` instead of lazy loading to reduce the query count from N+1 down to 1–2 queries.
*   **Select Only Required Columns:** Avoid using `SELECT *`. Fetch only the fields needed by the frontend UI (e.g., `Task::select(['id', 'title', 'status', 'created_at'])`) to minimize memory usage on both the server and database, as well as network payload size.
*   **Caching Strategy:** Utilize **Redis** or **Memcached** to cache query results for static/frequently accessed filters or the first page of results. Invalidate or update the cache when a task is created, updated, or deleted.
*   **Database Read Replicas:** Route heavy `GET` queries to a read-only database replica to prevent read operations from locking or putting pressure on the primary write database.

---

#### 2. How would you ensure the security of this Laravel + SPA setup?

*   **Secure Token Management & XSS Protection:**
    *   Keep the short-lived `accessToken` **in-memory** (Zustand/Pinia state) on the client side instead of `localStorage` to eliminate access token theft via Cross-Site Scripting (XSS).
    *   Store the `refreshToken` in an **HttpOnly, Secure, SameSite Cookie** managed by the server.
    *   Rely on Vue/React's default template escaping mechanisms to sanitize raw strings and prevent XSS injections.
*   **CSRF Protection:**
    *   When using stateful cookie-based authentication via **Laravel Sanctum**, enforce CSRF cookie initialization (`/sanctum/csrf-cookie`) prior to mutating API requests (`POST`, `PUT`, `DELETE`).
*   **SQL Injection Prevention:**
    *   Use **Laravel Eloquent ORM** or **Query Builder** with PDO parameter bindings for all database queries. Avoid raw query string concatenation with unformatted user input.
*   **HTTPS & Security Headers:**
    *   Enforce full SSL/TLS encryption (`HTTPS`).
    *   Configure HTTP Security Headers including `Content-Security-Policy` (CSP), `X-Frame-Options` (Clickjacking defense), `X-Content-Type-Options`, and `Strict-Transport-Security` (HSTS).
*   **Rate Limiting & Input Validation:**
    *   Apply Laravel's `throttle` middleware (e.g., `throttle:api`) to protect routes against Brute-Force and Denial of Service (DoS) attacks.
    *   Validate all incoming payloads on the backend strictly using **Form Request Validation** before executing business logic.

---

### 5.2. TypeScript / Vue 3

#### 1. What are the main benefits of using TypeScript in a Vue 3 SPA project?

*   **Early Error Detection (Type Safety):** Catches type mismatches, missing object properties, or invalid function calls at compile-time directly in the editor rather than during runtime in production.
*   **Enhanced Developer Experience (DX):** Enables intelligent autocompletion (IntelliSense), precise code navigation, and safe automated refactoring across the codebase.
*   **Self-Documenting Code:** Explicitly defines data structures (`Interfaces` and `Types`) for Component `Props`, `Emits`, `API Responses`, and `Store State`, making team collaboration much smoother without requiring extra documentation.
*   **Native Vue 3 Integration:** Vue 3 was written entirely in TypeScript, providing first-class typing support for the Composition API (`ref`, `reactive`), custom hooks, and typed props/emits.

---

#### 2. Show a small code example of a Vue 3 component using `<script setup lang="ts">` with typed props.

```vue
<script setup lang="ts">
// 1. Define interface for the data model
interface Task {
  id: number;
  title: string;
  isCompleted: boolean;
}

// 2. Define Typed Props with default values via withDefaults
const props = withDefaults(
  defineProps<{
    task: Task;
    priority?: 'low' | 'medium' | 'high';
  }>(),
  {
    priority: 'medium', // Default value for optional prop
  }
);

// 3. Define Typed Emits
const emit = defineEmits<{
  (e: 'toggle-complete', id: number): void;
  (e: 'delete', id: number): void;
}>();

const handleToggle = () => {
  emit('toggle-complete', props.task.id);
};
</script>

<template>
  <div class="task-card" :class="{ completed: task.isCompleted }">
    <h3>{{ task.title }}</h3>
    <span class="badge">{{ priority }}</span>
    
    <button @click="handleToggle">
      {{ task.isCompleted ? 'Undo' : 'Complete' }}
    </button>
    <button @click="emit('delete', task.id)">Delete</button>
  </div>
</template>

<style scoped>
.task-card {
  padding: 1rem;
  border: 1px solid #ccc;
  margin-bottom: 0.5rem;
}
.completed {
  text-decoration: line-through;
  opacity: 0.6;
}
</style>
```