# Frontend Coding Conventions — Vue 3 + TypeScript + Vuetify 3 + Tailwind 4

This document defines the coding standards for the TaskFlow Vue 3 single‑page application. The **source code** in `frontend/src/` is the single source of truth; these conventions summarise the existing patterns and enforce a consistent style.

---

## 1. General principles

1. **Readability over cleverness** — templates and scripts are read more often than written.  
2. **Explicit over implicit** — no magic strings, no implicit `any` types.  
3. **Single responsibility** — one component per view/section; one store module per feature.  
4. **Fail fast and loud** — validate at the boundary (Form Request on the backend, Vue `v‑validate` or native form validation on the frontend).  
5. **No dead code** — delete unused components, composables, or imports; version control is the backup.  
6. **Depend on abstractions** — inject services via Pinia stores or repository classes, not direct Axios calls inside components.

---

## 2. TypeScript & Vue syntax

- Use `<script setup lang="ts">` for all component files.  
- Declare prop types with `PropType` or inline types; avoid `any` unless absolutely necessary.  
- Use `ref` / `reactive` for state; keep reactive state **local** to the component or in a Pinia store.  
- Define `emits` explicitly; never rely on implicit event emission.

```ts
// ✅ Good
defineProps<{
  title: string;
  status: TaskStatus;
}>();
defineEmits<['update:status']>();

// ❌ Avoid
defineProps<any>();
```

- Use `type` over `interface` for simple value types when there is no need for extension.

```ts
type TaskStatus = 'todo' | 'in_progress' | 'done' | 'cancelled';
```

---

## 3. Component organisation

- Place each component in `src/modules/<feature>/ui/`.  
- A component folder should contain only the `.vue` file and, optionally, a local styles block (`<style scoped>`). Global styles go in `src/shared/styles/`.  
- Keep the template **declarative** and **minimal**; complex logic should live in the store or a composable.

```vue
<!-- ✅ Good -->
<template>
  <VBtn @click="toggleDone">
    {{ done ? 'Hoàn thành' : 'Chưa hoàn thành' }}
  </VBtn>
</template>

<script setup>
import { useTaskStore } from '@/modules/tasks/store';
import { taskStatusOptions } from '@/shared/constants';

const done = computed(() => store.status === 'done');
const toggleDone = async () => {
  await useTaskStore().updateTaskStatus(store.id, done.value ? 'todo' : 'done');
};
</script>

<style scoped>
/* component‑specific styles only */
</style>
```

---

## 4. Pinia store conventions

- Store files live under `src/modules/<feature>/store/` (or directly in the feature folder if the store is tiny).  
- Each store exports `state`, `getters`, `actions`, `mutations` using `defineStore`.  
- **State** should be minimal; derived data comes from getters.  
- **Getters** return **camelCase** domain objects; the underlying API DTOs stay snake_case.  
- **Actions** perform HTTP calls via the `HttpClient` repository; they never call Axios directly.  
- **Mutations** are synchronous and used only for simple state updates.

```ts
// ✅ Good
export const useTaskStore = defineStore('task', () => {
  const tasks = ref<Task[]>([]);
  const statusFilter = ref<string | null>(null);

  const filteredTasks = computed(() => {
    return tasks.value.filter(t =>
      !statusFilter.value || t.status === statusFilter.value
    );
  });

  async function load(filters = {}) {
    const { data } = await $http.task.list(filters);
    tasks.value = data; // HttpClient already maps snake→camel
  }

  function setStatusFilter(val: string | null) {
    statusFilter.value = val;
  }
});
```

---

## 5. HttpClient & API integration

- **File** – `src/adaptors/infrastructures/clients/HttpClient.ts`.  
- **Responsibilities**

  - Wrap Axios; add the bearer token from the Pinia `auth` store.  
  - Transform **snake_case** API DTOs into **camelCase** domain types (mappers).  
  - Provide `statusCode` on error objects for the UI.  
  - Support **mock mode**: when `VITE_USE_MOCK` is not exactly `"false"`, return mock data from `localStorage` (`ttm.mock.db.v1`) instead of making real HTTP calls.

- **Key functions** (examples)

```ts
// listTasks returns { data: Task[], meta }
export async function listTasks(filters = {}) {
  if (import.meta.env.VITE_USE_MOCK !== 'false') {
    return mockDb.task.list(filters); // localStorage mock
  }
  const { data } = await axios.get('/api/tasks', { params: filters });
  return { data: mapTaskDto(data.data), meta: data.meta };
}
```

- **Mock DB** – `src/adaptors/infrastructures/mocks/mockDb.ts` stores accounts (`email → password`) and tasks (`id, title, status, assigned_to, due_date, priority`). IDs are **strings** in the mock, while the real API uses integer IDs. The mock is **not** MSW; it is a simple `localStorage`‑backed JSON store.

---

## 6. Module structure (auth, tasks, users)

### `src/modules/auth/`

- **Types** (`types.ts`) – interfaces for login/register responses, user state.  
- **Store** (`store.ts`) – Pinia store for authentication status, token, user profile.  
- **Repository** (`data/index.ts`) – thin wrapper around `HttpClient` for auth endpoints.  
- **Pages** (`Login.vue`, `Register.vue`) – UI forms that commit mutations / actions.

### `src/modules/tasks/`

- **Types** (`types.ts`) – `Task` interface (camelCase), `TaskFilters`, `TaskSort`.  
- **DTOs** – snake_case shapes received from the API; mappers in `HttpClient` convert to camelCase `Task` for the store.  
- **Store** (`store.ts`) – holds list, selected task, filters, status/priority filters.  
- **Repository** (`data/index.ts`) – calls `HttpClient` for CRUD; also supplies `findTaskById`.  
- **DTO mappers** (`mappers.ts`) – tiny functions that rename camelCase ↔ snake_case (e.g. `assigned_to` → `assignedTo`).  
- **UI** (`TaskList.vue`, `TaskDetail.vue`, `CreateTaskForm.vue`, `UpdateTaskForm.vue`) – components that use the store, display badges for status/priority, handle form submit, show validation errors from the API envelope.

### `src/modules/users/`

- **Types**, **Store**, **Repository**, **Pages** – analogous to tasks, but admin‑only. The UI is gated by the `role:admin` guard (UX only); server policies enforce the real restrictions.

---

## 7. Shared components & utilities

- **`src/shared/`** contains reusable Vue components (buttons, inputs, table rows), constants (enum options for status/priority), and utility functions (date formatting, truncation).  
- **Tailwind 4** utilities are used for spacing, colours, and responsive grid where Vuetify’s layout components are not needed.  
- **Vuetify 3** components are wrapped where a consistent look is needed (e.g., `VTextField` with `v‑model` binding, `VSelect` for priority/status).  

### Example constant

```ts
// src/shared/constants.ts
export const taskStatusOptions = ['todo', 'in_progress', 'done', 'cancelled'] as const;
export const priorityOptions = ['low', 'medium', 'high', 'urgent'] as const;
```

---

## 8. Styling & theming

- **Vuetify 3** – default theme, primary colour `#6C31DE`, light mode background `#F8F5FC`.  
- **Tailwind 4** – used for utility‑first spacing, colours, and responsive grid where Vuetify’s layout components are not needed.  
- **Custom properties** are declared in `src/app/plugins/vuetify.ts`; the theme can be switched light/dark via `theme: 'light'` / `'dark'` in the Vite config (`vite.config.ts`).

```ts
// src/app/plugins/vuetify.ts
export default defineVuetifyApp({
  theme: {
    dark: false,
    themes: {
      light: {
        colors: {
          primary: '#6C31DE',
          secondary: '#42b983',
          accent: '#f2d400',
          error: '#b71c1c',
          info: '#2196f3',
          success: '#4caf50',
          warning: '#fb8c00',
        },
      },
    },
  },
});
```

---

## 9. Testing

- **Unit tests** for utilities and composables use **Vitest**.  
- **Component tests** may use `@vue/test-utils` together with Vitest.  
- **End‑to‑end tests** are Playwright tests under `frontend/e2e/`. They exercise the full flow: mock mode off, login, task CRUD, logout.  

### Vitest configuration (excerpt)

```js
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'jsdom',
  },
});
```

### Running tests

```bash
# From the frontend directory
npx vitest run               # one‑shot run (baseline: 14 tests)
npm run test:unit            # watch mode
npm run test:e2e             # Playwright suite
```

**Known**: the CI uses Node 20 while `package.json` requires `^22.18.0 || >=24.12.0`; this is a known version mismatch, not a blocker.

---

## 10. Form validation

- Use **Vue’s native `v‑model`** + **HTML5 validation** (`required`, `min`, `max`, `pattern`) for client‑side feedback.  
- Server‑side validation is always enforced via Laravel Form Requests; the frontend should display the error envelope returned by the API (`status_code`, `code`, `message`, `errors`).  
- Never duplicate validation logic entirely on the frontend; keep the backend as the source of truth.

### Example form (CreateTaskForm.vue)

```vue
<template>
  <VForm v-model="valid" @submit.prevent="onSubmit">
    <VTextField
      label="Tiêu đề"
      v-model="newTask.title"
      rule="required"
      :rules="[{ required: true, message: 'Tiêu đề bắt buộc' }]"
    />
    <VSelect
      label="Trạng thái"
      v-model="newTask.status"
      :options="statusOptions"
      rule="required"
    />
    <VSelect
      label="Ưu tiên"
      v-model="newTask.priority"
      :options="priorityOptions"
    />
    <VTextarea
      label="Mô tả"
      v-model="newTask.description"
      :rules="[{ maxLength: 2000 }]"
    />
    <VBtn type="submit">Lưu</VBtn>
  </VForm>
</template>

<script setup>
import { useTaskStore } from '@/modules/tasks/store';
import { taskStatusOptions, priorityOptions } from '@/shared/constants';

const errors = ref<string[]>([]);
const newTask = reactive({
  title: '',
  status: 'todo',
  priority: 'low',
  description: '',
});

const statusOptions = taskStatusOptions;
const priorityOptions = priorityOptions;

const store = useTaskStore();

function onSubmit() {
  store.createTask(newTask).catch(err => {
    // err.response.status === 422 → show error.envelope.errors
    if (err.response?.status === 422) {
      errors.value = err.response.data.errors?.map((e: any) => e.message) || [];
    }
  });
});
</script>
```

---

## 11. Design system (Vuetify 3 + Tailwind 4)

- The design system is **already implemented** in the codebase; this doc summarises the current state, not a design‑from‑scratch process.  
- **Vuetify 3** theme: primary `#6C31DE`, secondary `#42b983`, light background `#F8F5FC`.  
- **Tailwind 4** utilities are used for supplemental spacing/colours; the design tokens are defined in `src/app/plugins/vuetify.ts`.  
- **Mock HTML assets** under `docs/frontend/design/` must remain unchanged; they are reference assets only.

### Colour palette (as coded)

| Token | Value |
|------|-------|
| `primary` | `#6C31DE` |
| `secondary` | `#42b983` |
| `accent` | `#f2d400` |
| `error` | `#b71c1c` |
| `info` | `#2196f3` |
| `success` | `#4caf50` |
| `warning` | `#fb8c00` |

### Light/dark mode

- Light is the default; dark mode can be toggled via the UI but is not yet persisted. The Vite config (`vite.config.ts`) has `mode: 'light'` by default.

---

## 12. Naming conventions

| Element | Convention | Example |
|---------|------------|---------|
| Component files | PascalCase + `.vue` | `TaskList.vue`, `CreateTaskForm.vue` |
| Component PascalCase | PascalCase (no `vc-` prefix) | `TaskList`, `UserNav` |
| Store files | camelCase + `.ts` | `useTaskStore.ts`, `useAuthStore.ts` |
| Type files | PascalCase + `.ts` | `TaskTypes.ts`, `UserTypes.ts` |
| Repository files | `data/index.ts` (per module) | `src/modules/tasks/data/index.ts` |
| Composable/functions | camelCase | `loadTasks`, `formatDate` |
| Constants | SCREAMING_SNAKE_CASE (exported as `const`) | `taskStatusOptions`, `priorityOptions` |
| API endpoints (strings) | snake_case in code, but URLs are defined in routes | ` '/api/tasks' ` |
| Vuetify component names | PascalCase | `VBtn`, `VSelect`, `VTextField` |

---

*These conventions reflect the current codebase. When a practice is not present, it is aspirational and should be discussed in a pull request rather than assumed to be enforced.*