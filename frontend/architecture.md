# Frontend Architecture — Vue 3 SPA

This document summarises the current architecture of the TaskFlow Vue 3 single‑page application. The **source code** in `frontend/src/` is the single source of truth; this page exists to help new contributors navigate the codebase.

## High‑level layout

```
src/
├── app/               ← router, guards, Vuetify setup, global config
├── modules/           ← feature modules (auth, tasks, users)
│   ├── auth/          ← auth types, schemas, store, repository, service, pages
│   ├── tasks/         ← task domain types, schemas, store, repository, DTOs, mappers, UI
│   └── users/         ← user types, schemas, repository, DTOs, composables, pages
├── adapters/          ← HTTP client, token/storage, mock DB
│   └── infrastructures/
│       └── mockDb.ts  ← localStorage‑backed mock database
└── shared/            ← reusable components, constants, utils
```

## Router & Guards

- **Entry point** – `src/main.ts` creates the Vue app, injects Pinia and the router.
- **Route tree** – defined in `src/app/router/routes.ts`. Key routes:

| Path | Component | Guard / Meta |
|------|-----------|--------------|
| `/` | `TaskList` | redirects to `/tasks` |
| `/auth/login` | `LoginForm` | public |
| `/auth/register` | `RegisterForm` | public |
| `/tasks` | `TaskList` | `authenticated` guard |
| `/tasks/:id` | `TaskDetail` | `authenticated` guard |
| `/auth/logout` | `LogoutButton` | `authenticated` guard |
| `/users` | `UserList` (admin only) | `role:admin` guard (UX only; server authorisation authoritative) |
| `/users/create` | `UserCreate` (admin only) | `role:admin` guard (UX only) |

- **`authenticated` guard** – checks `store.user.isAuthenticated`; redirects to `/auth/login` if missing.
- **`role:admin` guard** – reads `store.user.role`; currently a **UX control only**. The server enforces authorisation via `TaskPolicy` / `UserPolicy`. Frontend guards may hide buttons, but any action that bypasses the server is rejected.

## Pinia store organisation

- **Modules** live under `src/modules/<feature>/store/` (or directly in `src/modules/<feature>/` if the store is a single file).
- **Each module** exports `state`, `getters`, `actions`, `mutations`.
- **Shared state** (e.g. authentication status, user profile) is kept in the `auth` module; task‑specific state (list, filters, selected task) lives in the `tasks` module.
- **Getters** expose normalized domain objects (camelCase) while the underlying API DTOs remain snake_case.
- **Actions** perform HTTP calls via the `data/` repository classes; they never call Axios directly.

Example (`src/modules/tasks/store.ts` – abbreviated):

```ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { taskApi } from '@/adapters/infrastructures/HttpClient';
import type { Task } from '@/modules/tasks/types';

export const useTaskStore = defineStore('task', () => {
  const tasks = ref<Task[]>([]);
  const statusFilter = ref<string | null>(null);
  const priorityFilter = ref<string | null>(null);

  const filteredTasks = computed(() => {
    let result = [...tasks.value];
    if (statusFilter.value) {
      result = result.filter(t => t.status === statusFilter.value);
    }
    if (priorityFilter.value) {
      result = result.filter(t => t.priority === priorityFilter.value);
    }
    return result;
  });

  async function loadTasks(filters = {}) {
    const response = await taskApi.list(filters); // HttpClient wrapper
    tasks.value = response.data; // snake_case → camelCase mappers inside HttpClient
  }

  // ... other actions (create, update, delete, setFilters)
});
```

## HttpClient & API integration

- **File** – `src/adapters/infrastructures/clients/HttpClient.ts`.
- **Responsibilities**

  - Wrap Axios; add the bearer token from the Pinia `auth` store.
  - Transform **snake_case** API DTOs into **camelCase** domain types (mappers).
  - Provide `statusCode` on error objects for the UI.
  - Support mock mode: when `VITE_USE_MOCK` is not `false`, return mock data from `localStorage` (`ttm.mock.db.v1`) instead of making real HTTP calls.

- **Key functions**

  - `listTasks(filters)` → returns `{ data: Task[], meta }`.
  - `createTask(dto)` → returns created `Task`.
  - `updateTask(id, dto)` → returns updated `Task`.
  - `deleteTask(id)` → returns `void`.
  - `login(credentials)`, `register(name, email, password)` → return `{ token, user }`.

- **Mock mode** (default) – `HttpClient` checks `import.meta.env.VITE_USE_MOCK`. If it is not the exact string `"false"`, it falls back to `mockDb.ts` which reads/write `localStorage` entries under the key `ttm.mock.db.v1`. The mock DB stores accounts (`email → password`) and tasks (`id, title, status, assigned_to, due_date, priority`). IDs are strings in the mock, while the real API uses integer IDs.

## Module structure

### `src/modules/auth/`

- **Types** (`types.ts`) – TypeScript interfaces for login/register responses, user state.
- **Store** (`store.ts`) – Pinia store for authentication status, token, user profile.
- **Repository** (`data/index.ts`) – thin wrapper around `HttpClient` for auth endpoints.
- **Service** (`service.ts`) – optional, currently thin; may contain password‑validation logic.
- **Pages** (`Login.vue`, `Register.vue`) – UI forms that commit mutations / actions.

### `src/modules/tasks/`

- **Types** (`types.ts`) – `Task` interface (camelCase), `TaskFilters`, `TaskSort`.
- **DTOs** – snake_case shapes received from the API; mappers in `HttpClient` convert to camelCase `Task` for the store.
- **Store** (`store.ts`) – see example above; holds list, selected task, filters, status/priority filters.
- **Repository** (`data/index.ts`) – calls `HttpClient` for CRUD; also supplies `findTaskById`.
- **DTO mappers** (`mappers.ts`) – tiny functions that rename camelCase ↔ snake_case (e.g. `title` stays, `assigned_to` → `assignedTo`).
- **UI** (`TaskList.vue`, `TaskDetail.vue`, `CreateTaskForm.vue`, `UpdateTaskForm.vue`) – components that use the store, display badges for status/priority, handle form submit, show validation errors from the API envelope.

### `src/modules/users/`

- **Types**, **Store**, **Repository**, **Pages** – analogous to tasks, but admin‑only. The UI gated by `role:admin` guard (UX); server policies enforce the real restrictions.

## Shared components & utilities

- **`src/shared/`** contains reusable Vue components (buttons, inputs, table rows), constants (enum options for status/priority), and utility functions (date formatting, truncation).
- **Tailwind 4** utilities are used for styling; Vuetify 3 components are wrapped where a consistent look is needed (e.g., `VTextField` with `v‑model` binding, `VSelect` for priority/status).

## Styling & theming

- **Vuetify 3** – default theme, primary color `#6C31DE`, light mode background `#F8F5FC`.
- **Tailwind 4** – used for utility‑first spacing, colours, and responsive grid where Vuetify’s layout components are not needed.
- **Custom properties** are declared in `src/app/plugins/vuetify.ts`; the theme can be switched light/dark via `theme: 'light'` / `'dark'` in the Vite config.

## Key files (quick reference)

| File | Purpose |
|------|---------|
| `src/main.ts` | Bootstrap Vue, Pinia, router. |
| `src/app/router/routes.ts` | Route definitions & guards. |
| `src/app/plugins/vuetify.ts` | Vuetify theme config, Tailwind integration. |
| `src/adaptors/infrastructures/mocks/mockDb.ts` | localStorage mock DB (default mode). |
| `src/adaptors/infrastructures/clients/HttpClient.ts` | API calls, mock mode, DTO ↔ domain conversion. |
| `src/modules/tasks/store.ts` | Task‑state management. |
| `src/modules/tasks/types.ts` | Task domain types (camelCase). |
| `src/modules/tasks/data/index.ts` | Repository calls to HttpClient. |
| `src/modules/tasks/TaskList.vue` | List page with filters and table. |
| `src/modules/tasks/TaskDetail.vue` | Detail page for a single task. |
| `src/modules/auth/store.ts` | Auth state (login/logout, user info). |
| `src/modules/auth/types.ts` | Auth type definitions. |

---

*If the codebase evolves (new modules, renamed stores, changed API versions) the relevant docs will be updated in the same pull request to keep the mapping accurate.*