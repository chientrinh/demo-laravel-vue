# Frontend State Management — Pinia Stores

This document summarises the **current** Pinia store organisation in the TaskFlow Vue 3 single‑page application. The **source code** in `frontend/src/modules/*/store/` is the single source of truth; this page exists to help contributors understand data flow, getters, actions, and module boundaries.

## Store catalogue

| Feature module | Store name | Primary responsibilities |
|---|---|---|
| `auth` | `useUserStore` | Authentication status, token, user profile (name, email, role). |
| `tasks` | `useTaskStore` | Task list, selected task, filters (status, priority, search), loading states, CRUD actions. |
| `users` | `useUserStore` (admin) | Admin‑only user list, selected user for edit/create, often a thin wrapper around the auth user. |

Only the `auth` and `tasks` stores are actively used in the current UI; the `users` store exists for completeness and future admin features.

---

## `useUserStore` (auth)

- **File** – `src/modules/auth/store.ts`.
- **State**

```ts
export const useUserStore = defineStore('user', () => {
  const token = ref<string | null>(null);
  const user = ref({
    id: 0,
    name: '',
    email: '',
    role: 'user' as 'user' | 'admin',
    isAuthenticated: false,
  });
  const loading = ref(false);
```

- **Getters**

```ts
export const isAuthenticated: computedRef<boolean> = computed(
  () => user.value.isAuthenticated
);

export const userRole: computedRef<'user' | 'admin'> = computed(
  () => user.value.role
);

export const userName: computedRef<string> = computed(
  () => user.value.name
);
```

- **Actions**

```ts
async function login(credentials) {
  const { data } = await $http.auth.login(credentials); // HttpClient wrapper
  token.value = data.token;
  user.value = data.user;
  user.value.isAuthenticated = true;
  // persist token (Laravel Sanctum stores it; optionally also localStorage)
}

async function logout() {
  await $http.auth.logout(); // revokes the token on the server
  token.value = null;
  user.value = {
    id: 0,
    name: '',
    email: '',
    role: 'user',
    isAuthenticated: false,
  };
}
```

- **Persistence** – the token is stored by the backend (Sanctum) and also kept in `localStorage` via a simple interceptor in `HttpClient` if desired; the store simply mirrors what the API returns.

---

## `useTaskStore` (tasks)

- **File** – `src/modules/tasks/store.ts`.
- **State**

```ts
export const useTaskStore = defineStore('task', () => {
  const tasks = ref<Task[]>([]);
  const selectedTask = ref<Task | null>(null);
  const statusFilter = ref<string | null>(null);
  const priorityFilter = ref<string | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
```

- **Getters**

```ts
export const filteredTasks = computed(() => {
  return tasks.value.filter(t =>
    !statusFilter.value || t.status === statusFilter.value
  ).filter(t =>
    !priorityFilter.value || t.priority === priorityFilter.value
  );
});

const getTaskById = (id: number) => tasks.value.find(t => t.id === id);
```

- **Actions** (excerpt)

```ts
async function load(filters = {}) {
  loading.value = true;
  error.value = null;
  try {
    const { data, meta } = await $http.task.list(filters); // HttpClient
    tasks.value = data; // already mapped snake→camel by HttpClient
    // meta contains pagination info (page, per_page, total, total_pages)
  } catch (e) {
    error.value = e.response?.data?.message || 'Failed to load tasks';
  } finally {
    loading.value = false;
  }
}

async function createTask(dto) {
  try {
    const task = await $http.task.create(dto);
    tasks.value.unshift(task);
  } catch (e) {
    error.value = e.response?.data?.message || 'Failed to create task';
    throw e;
  }
}

async function updateTask(id: number, dto) {
  try {
    const task = await $http.task.update(id, dto);
    // replace in‑store
    const idx = tasks.value.findIndex(t => t.id === id);
    if (idx > -1) tasks.value[idx] = task;
    if (selectedTask.value?.id === id) selectedTask.value = task;
  } catch (e) {
    error.value = e.response?.data?.message || 'Failed to update task';
    throw e;
  }
}

async function deleteTask(id: number) {
  try {
    await $http.task.delete(id);
    tasks.value = tasks.value.filter(t => t.id !== id);
    if (selectedTask.value?.id === id) selectedTask.value = null;
  } catch (e) {
    error.value = e.response?.data?.message || 'Failed to delete task';
    throw e;
  }
}

function setStatusFilter(val: string | null) {
  statusFilter.value = val;
}

function setPriorityFilter(val: string | null) {
  priorityFilter.value = val;
}
```

- **Mock mode** – when `VITE_USE_MOCK !== 'false'`, the actions above delegate to `mockDb.task.*` instead of `$http.task.*`. The mock returns plain objects with string IDs; the store normalises them (e.g. `String(dto.id)`) before storing.

---

## `useUserStore` (admin users – thin wrapper)

- **File** – `src/modules/users/store.ts` (often just re‑exports the auth store or provides a small subset of actions such as `loadUsers`, `createUser`, `deleteUser`).  
- **Responsibilities** – admin UI calls these actions; the underlying API enforces `role:admin` policy.

---

## Data flow summary

1. **UI component** (e.g. `TaskList.vue`) reads state from `useTaskStore` (filtered tasks, selected task).  
2. **Component** triggers an action (e.g. `load()`, `createTask()`, `deleteTask()`).  
3. **Action** calls `HttpClient` (which may fall back to `mockDb` in mock mode).  
4. **HttpClient** returns data; the store updates its state, normalising IDs (string → number where needed).  
5. **Getters** (`filteredTasks`) compute derived lists based on `statusFilter` / `priorityFilter`.  
6. **Component** re‑renders automatically because the store state is reactive.

---

## Mock mode integration

- **Check** – `import.meta.env.VITE_USE_MOCK !== 'false'`.  
- **If true** – all `HttpClient` functions return data from `mockDb.ts` (`localStorage` key `ttm.mock.db.v1`).  
- **Mock data shape** – tasks have string IDs (`"1"`, `"2"` …), titles, status, assigned_to (string email or ID), due_date, priority. The store often converts `String(dto.id)` to a number for internal consistency, but the source of truth for IDs in mock mode is the string.

---

## Reload / rehydration after route change

- Pinia stores persist across route changes within the same browser session.  
- If the app is refreshed, the stores are initialised from the server response (login) or from `localStorage` (if mock mode is on and tokens were previously stored).  
- The `auth` store `isAuthenticated` flag is the single point to decide whether to show protected routes.

---

## Relating to the error envelope

- All API errors follow the shape defined in `bootstrap/app.php` (see `api/error-handling.md`).  
- When an action fails, the store catches `e.response?.status`; if `422`, it extracts `errors` array and stores a user‑friendly message in `error`.  
- UI components display the `error` state as inline toasts or banner messages.

---

*If a new feature requires additional global state, add a new Pinia store following the same patterns (state, getters, actions, keep it focused on a single feature). The store file should be placed under the appropriate `src/modules/<feature>/store/` directory.*