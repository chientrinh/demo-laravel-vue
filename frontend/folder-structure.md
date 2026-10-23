# Frontend Folder Structure — Vue 3 SPA

This document describes the **current** directory layout of the TaskFlow Vue 3 single‑page application. The source code in `frontend/src/` is the single source of truth; the layout below reflects what exists in the repository at the time of this rewrite.

## Root structure

```
frontend/
├── src/
│   ├── app/                ← router, guards, Vuetify setup, global config
│   ├── modules/            ← feature modules (auth, tasks, users)
│   │   ├── auth/           ← auth types, schemas, store, repository, service, pages
│   │   ├── tasks/          ← task domain types, schemas, store, repository, DTOs, mappers, UI
│   │   └── users/          ← user types, schemas, repository, DTOs, composables, pages
│   ├── adapters/           ← HTTP client, token/storage, mock DB
│   │   └── infrastructures/
│   │       ├── mockDb.ts   ← localStorage‑backed mock database
│   │   └── clients/
│   │       └── HttpClient.ts   ← Axios wrapper, mapper, mock mode
│   ├── shared/             ← reusable components, constants, utilities
│   └── main.ts             ← bootstrap Vue, Pinia, router
├── index.html              ← HTML template (single‑page)
├── package.json            ← dependencies, scripts, Node engine constraints
├── vite.config.ts          ← Vite config, aliases, proxy, test config
├── tsconfig.json           ← TypeScript configuration
├── eslint.config.js        ← ESLint configuration
├── oxlint.config.mjs       ← Oxlint configuration (non‑mutating)
├── .env.example            ← environment defaults (VITE_USE_MOCK, VITE_API_BASE_URL)
├── .env                    ← local overrides (not committed)
└── e2e/                    ← Playwright tests
```

## `src/app/` — Application‑wide setup

- **`main.ts`** – Creates the Vue app, installs Pinia and the router, mounts the app.
- **`router/`** – Route definitions and guards live in `src/app/router/routes.ts`.
- **`plugins/`** – Vuetify plugin setup, Tailwind integration, global directives.
- **`store/`** – Pinia store registration (typically one file that registers all feature stores).

## `src/modules/` — Feature modules

Each feature (auth, tasks, users) lives in its own sub‑folder; the structure inside each is consistent.

### `src/modules/auth/`

```
auth/
├── types.ts          ← TypeScript interfaces for auth state, login/register responses
├── store.ts          ← Pinia store for authentication status, token, user profile
├── data/             ← repository thin wrappers around HttpClient for auth endpoints
│   └── index.ts
├── service.ts        ← optional service layer (currently thin)
├── components/       ← Login.vue, Register.vue
└── pages/            ← (often the same as components; kept for clarity)
```

### `src/modules/tasks/`

```
tasks/
├── types.ts          ← Task interface (camelCase), TaskFilters, TaskSort
├── schemas/          ← DTO snake_case shapes; mappers live in HttpClient, but may also have local helpers
├── store.ts          ← Pinia store for task list, selected task, filters, status/priority filters
├── data/             ← repository calls to HttpClient; also supplies findTaskById
│   └── index.ts
├── mappers.ts        ← tiny functions that rename camelCase ↔ snake_case (e.g. assigned_to → assignedTo)
├── components/       ← TaskList.vue, TaskDetail.vue, CreateTaskForm.vue, UpdateTaskForm.vue
├── composables/      ← any reusable composables (e.g. useTaskStatus)
└── styles/           ← component‑specific scoped styles (optional)
```

### `src/modules/users/`

```
users/
├── types.ts          ← User interface (camelCase), role‑related types
├── schemas/          ← DTO snake_case for user create/update
├── store.ts          ← Pinia store for user‑related state (often just the current user)
├── data/             ← repository for user CRUD endpoints
│   └── index.ts
├── components/       ← UserList.vue, UserCreate.vue, UserDetail.vue
└── styles/           ← optional
```

## `src/adaptors/` — Infrastructure adapters

### `src/adaptors/infrastructures/mocks/mockDb.ts`

- **Purpose** – localStorage‑backed mock database used when `VITE_USE_MOCK` is not exactly `"false"`.
- **Key** – `ttm.mock.db.v1`.
- **Content** – JSON strings stored under the key; accounts (`email → password`) and tasks (`id, title, status, assigned_to, due_date, priority`). IDs are **strings** in the mock, whereas the real API uses integer IDs.
- **Never** MSW; the mock is a simple JSON read/write.

### `src/adaptors/infrastructures/clients/HttpClient.ts`

- **Purpose** – wrapper around Axios that

  - Adds the bearer token from the Pinia `auth` store.
  - Transforms **snake_case** API DTOs into **camelCase** domain types (mappers).
  - Provides `statusCode` on error objects for the UI.
  - Supports **mock mode**: when `VITE_USE_MOCK` is not `"false"`, returns mock data from `mockDb.ts` instead of making real HTTP calls.

- **Key functions** (abbreviated)

```ts
export async function listTasks(filters = {}) {
  if (import.meta.env.VITE_USE_MOCK !== 'false') {
    return mockDb.task.list(filters);
  }
  const { data } = await axios.get('/api/tasks', { params: filters });
  return { data: mapTaskDto(data.data), meta: data.meta };
}
```

## `src/shared/` — Reusable components, constants, utilities

- **Components** – generic `VBtn`, `VSelect`, `VTextField`, `VCard`, tables, etc., used across features.
- **Constants** – `taskStatusOptions`, `priorityOptions`, enum strings.
- **Utilities** – `formatDate`, `truncate`, `deepMerge`, etc.

```
shared/
├── components/
│   ├── TaskStatusBadge.vue
│   ├── PriorityBadge.vue
│   └── PaginationControls.vue
├── constants.ts
├── utils.ts
└── types.ts
```

## `src/main.ts` – Bootstrap

```ts
import { createApp } from 'vue';
import App from './App.vue';
import router from './app/router';
import pinia from '@/stores';
import vuetify from '@/app/plugins/vuetify';

const app = createApp(App);
app.use(router);
app.use(pinia);
app.use(vuetify);
app.mount('#app');
```

## `package.json` – scripts & engine constraints

```json
{
  "name": "taskflow-frontend",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "type-check": "vue-tsc --noEmit -p tsconfig.json",
    "test:unit": "vitest run",
    "test:e2e": "playwright test",
    "lint": "oxlint . && eslint .",
    "preview": "vite preview"
  },
  "dependencies": {
    "vue": "^3.5.42",
    "vue-router": "^5.3.1",
    "pinia": "^4.0.3",
    "vuetify": "^3.13.7",
    "axios": "^1.7.2",
    "tailwindcss": "^4.3.3",
    "date-fns": "^3.6.0"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.0.0",
    "vitest": "^1.6.0",
    "playwright": "^1.44.0",
    "oxlint": "^0.12.0",
    "eslint": "^8.57.0",
    "typescript": "^6.4.0"
  },
  "engines": {
    "node": "^22.18.0 || >=24.12.0"
  }
}
```

**Important**: The `engines.node` field enforces `^22.18.0 || >=24.12.0`. CI currently uses Node 20; this is a known mismatch, not a blocker.

## `vite.config.ts` – Vite configuration (excerpt)

```ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@modules': fileURLToPath(new URL('./src/modules', import.meta.url)),
      '@shared': fileURLToPath(new URL('./src/shared', import.meta.url)),
      '@adaptors': fileURLToPath(new URL('./src/adaptors', import.meta.url)),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_API_BASE_URL || 'http://backend:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  test: {
    alias: {
      '@': '/src',
    },
  },
});
```

**Proxy target** – set `VITE_API_PROXY_TARGET=http://localhost:8080` on the host to override the default `http://backend:8000` (which only resolves inside Docker).

## `tsconfig.json` – TypeScript configuration (excerpt)

- `target: ES2022`, `module: ESNext`, `strict: true`, `noImplicitAny: true`.
- Path aliases (`@`, `@modules`, `@shared`, `@adaptors`) match those in `vite.config.ts`.

## `eslint.config.js` & `oxlint.config.mjs`

- Both linters are configured to match the project’s code‑style expectations.
- `npm run lint` runs both `oxlint` and `eslint` with `--fix`; use `npx oxlint .` and `npx eslint .` for a non‑mutating check.
- The CI step that references `phpcs` is allowed to fail; only Pint is installed on the backend.

---

*If the folder structure evolves (new modules, renamed directories, added adapters) the relevant docs will be updated in the same pull request to keep the mapping accurate.*