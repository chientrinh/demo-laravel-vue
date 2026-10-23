# Coding Conventions — Vue 3 + TypeScript

This document defines the coding standards for the Team Task Manager frontend.

---

## 1. Vue SFC Conventions

### Script Setup (Required)

```vue
<!-- ✅ Use <script setup lang="ts"> -->
<script setup lang="ts">
import { ref, computed } from 'vue';
import type { Task } from '@/modules/tasks/domain/types';

const props = defineProps<{
  task: Task;
  variant?: 'default' | 'compact';
}>();

const emit = defineEmits<{
  edit: [task: Task];
  delete: [id: string];
}>();

const displayName = computed(() => `${props.task.title}`);
</script>
```

### Props with `withDefaults`

```typescript
// ✅ Required props (no default)
interface Props {
  task: Task;
}

// ✅ Optional props with defaults
interface Props {
  variant?: 'default' | 'compact';
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
  disabled: false,
});
```

### Emits with Type Safety

```typescript
// ✅ Define emits with call signatures
const emit = defineEmits<{
  update: [value: string];
  submit: [data: FormData];
  cancel: [];
}>();

// Usage
emit('update', 'new value');
emit('submit', formData);
emit('cancel');
```

### Slots (Vue 3.3+)

```typescript
// ✅ Typed slots
const slots = defineSlots<{
  header: { title: string };
  default: { item: Task };
  footer?: never;
}>();
```

---

## 2. TypeScript Rules

### Strict Mode (Enforced)

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true
  }
}
```

### No `any` — Use Explicit Types

```typescript
// ❌ Bad
const data: any = await fetchData();

// ✅ Good
const data: Task[] = await fetchData();
const data: unknown = await fetchData(); // if truly unknown
```

### Generics for Reusables

```typescript
// ✅ Generic composable
export function useAsync<T>(fn: () => Promise<T>) {
  const data = ref<T | null>(null);
  // ...
}

// ✅ Generic component
interface Props<T> {
  items: T[];
  render: (item: T) => VNode;
}
```

### Type Imports

```typescript
// ✅ Use import type for types
import type { Task, TaskStatus } from '@/modules/tasks/domain/types';
import { ref, computed } from 'vue'; // values
```

---

## 3. Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Files (Vue) | kebab-case | `task-form.vue` |
| Files (TS) | kebab-case | `use-tasks.ts` |
| Components | PascalCase | `TaskForm.vue` |
| Composables | camelCase + `use` | `useTasks.ts` |
| Pinia Stores | camelCase | `auth.ts` (exports `useAuthStore`) |
| Types/Interfaces | PascalCase | `Task`, `TaskStatus` |
| Enums | PascalCase | `TaskStatus` |
| DTOs | PascalCase + `Dto` | `CreateTaskDto` |
| Constants | UPPER_SNAKE_CASE | `MAX_FILE_SIZE` |
| CSS Classes | kebab-case | `.task-card` |
| Events | kebab-case | `update:modelValue` |
| Props | camelCase | `maxLength` |

### Vue Component Registration

```typescript
// ✅ PascalCase in import, kebab-case in template
import TaskForm from '@/modules/tasks/ui/components/TaskForm.vue';
// <TaskForm /> in template
```

---

## 4. Import Conventions

### Path Aliases (Configured in `tsconfig.json` / `vite.config.ts`)

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "#/*": ["src/shared/types/*"]
    }
  }
}
```

### Import Order

```typescript
// 1. Vue / external libraries
import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useStore } from 'pinia';

// 2. Internal aliases (@/)
import { useAuth } from '@/modules/auth/ui/composables/useAuth';
import type { Task } from '@/modules/tasks/domain/types';

// 3. Relative imports (same feature)
import { tasksRepository } from '../data/repositories/tasks.repository';

// 4. Types last
import type { TaskFilters } from '../../domain/types';
```

### Barrel Exports (index.ts)

```typescript
// modules/tasks/index.ts
export { Task, TaskStatus } from './domain/types';
export { useTasks } from './ui/composables/useTasks';
export { TasksTable, TaskForm } from './ui/components';
// DO NOT export internals: dtos, mappers, repositories, services
```

---

## 5. Public Module APIs

Each module exposes a deliberate public API via `index.ts`:

```typescript
// modules/tasks/index.ts — PUBLIC API
export { 
  // Domain
  Task, 
  TaskStatus, 
  TaskFilters 
} from './domain/types';

// UI — includes service-backed composables
export { 
  useTasks, 
  useTaskForm 
} from './ui/composables';
export { 
  TasksTable, 
  TaskForm, 
  TaskStatusChip 
} from './ui/components';
```

**Rule:** Other modules must NOT import deep paths:
```typescript
// ❌ Forbidden
import { tasksRepository } from '@/modules/tasks/data/repositories/tasks.repository';

// ✅ Allowed (via public API)
import { useTasks } from '@/modules/tasks';
```

---

## 6. DTO and Domain Type Naming

### Domain Types (Business)

```typescript
// modules/tasks/domain/types.ts
export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  assignedTo: string;
  dueDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type TaskStatus = 'todo' | 'in_progress' | 'done';
```

### API DTOs (Wire Format)

```typescript
// modules/tasks/data/dtos/task.dto.ts
export interface TaskDto {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'done';
  assigned_to: string;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTaskDto {
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'done';
  assigned_to: string;
  due_date: string | null;
}
```

### Mappers (Boundary)

```typescript
// modules/tasks/data/mappers/task.mapper.ts
export function toDomain(dto: TaskDto): Task { ... }
export function toCreateDto(task: Partial<Task>): CreateTaskDto { ... }
```

---

## 7. Error Handling Conventions

### ApiError Type

```typescript
// shared/types/api.ts
export interface ApiError {
  status: number;
  code: string;
  message: string;
  details?: Record<string, string[]>;
  timestamp: string;
  path: string;
}
```

### Composable Error Pattern

```typescript
// In composable
const error = ref<ApiError | null>(null);

async function fetch(): Promise<void> {
  try {
    // ...
  } catch (e) {
    error.value = normalizeError(e);
    throw e; // Re-throw for caller if needed
  }
}
```

### Component Error Display

```vue
<template>
  <ErrorState v-if="error" :error="error" @retry="fetch" />
  <TasksTable v-else :tasks="tasks" />
</template>
```

---

## 8. Component Responsibilities

### Page Components (Route Targets)

- Own layout and page-level structure
- Compose child components
- Handle route params/query
- Minimal logic — delegate to composables

```vue
<!-- TasksListPage.vue -->
<script setup lang="ts">
import { onMounted } from 'vue';
import { useTasks } from '../composables/useTasks';
import TasksTable from '../components/TasksTable.vue';
import TaskFilters from '../components/TaskFilters.vue';
import { ErrorState, Loader } from '@/shared/components/common';

const { tasks, loading, error, filters, fetch } = useTasks();

onMounted(() => fetch());
</script>
```

### Feature Components

- Reusable within feature
- Accept props, emit events
- No direct API calls — use composables

```vue
<!-- TasksTable.vue -->
<script setup lang="ts">
import type { Task } from '../../domain/types';

const props = defineProps<{
  tasks: Task[];
}>();

const emit = defineEmits<{
  edit: [task: Task];
  delete: [id: string];
}>();
</script>
```

### Shared Components

- Generic, reusable across features
- No business logic
- Highly configurable via props/slots

---

## 9. Testing Expectations

| Layer | Tool | Coverage Target |
|-------|------|-----------------|
| Composables | Vitest | 80% |
| Pinia Stores | Vitest + @pinia/testing | 80% |
| Components | @testing-library/vue + Vitest | 70% |
| Router | Vitest + mock stores | 70% |
| E2E | Playwright | Critical flows |

### Test File Naming

```
*.test.ts        // Unit/component tests
*.spec.ts        // E2E tests (Playwright)
```

### Test Structure

```typescript
// describe blocks by feature
describe('useTasks', () => {
  it('loads tasks on init', async () => { ... });
  it('handles API error', async () => { ... });
});
```

---

## 10. Anti-Patterns to Avoid

| Anti-Pattern | Correct Approach |
|--------------|------------------|
| `this.$store` / `this.$router` | `useStore()`, `useRouter()` |
| `any` type | Explicit types or `unknown` |
| Direct API calls in components | Use composables |
| Business logic in components | Move to composables/application |
| Cross-module deep imports | Use `index.ts` public API |
| Duplicate state (Pinia + composable) | Single source of truth |
| `v-html` with user content | Sanitize or use text interpolation |
| Inline styles for layout | CSS variables + utility classes |

---

## 11. Linting & Formatting

### Commands

```bash
npm run lint        # Oxlint + ESLint
npm run format      # Prettier
npm run typecheck   # vue-tsc --noEmit
```

### Pre-commit (Lefthook)

```yaml
# lefthook.yml
pre-commit:
  parallel: true
  commands:
    lint:
      glob: "*.{vue,ts}"
      run: oxlint --fix {staged_files}
    format:
      glob: "*.{vue,ts,json}"
      run: prettier --write {staged_files}
    typecheck:
      glob: "*.{vue,ts}"
      run: npx tsc --noEmit --project tsconfig.app.json
```

---

## 12. Git Conventions

### Branch Names

```
feat/task-list-filtering
fix/login-validation-error
refactor/auth-store-structure
docs/api-integration-guide
```

### Commit Messages

```
feat: add task status filtering
fix: handle 401 redirect on token expiry
refactor: extract useTaskForm composable
docs: update api-integration.md
```

---

## 13. Vuetify Infrastructure Conventions

### Keep As-Is

- `src/shared/layouts/full/` — FullLayout, Topbar, Sidebar
- `src/shared/layouts/blank/` — BlankLayout
- `src/app/plugins/vuetify.ts` — Vuetify config
- `src/theme/` — Theme definitions
- `src/shared/styles/` — Global styles
- `src/components/style-components/` — Design system primitives

### Wrapper Components

```vue
<!-- shared/components/ui/BaseButton.vue -->
<script setup lang="ts">
import type { ButtonProps } from 'vuetify';

const props = defineProps<ButtonProps & { loading?: boolean }>();

const emit = defineEmits<{
  click: [event: MouseEvent];
}>();

// Add consistent loading behavior
</script>
```

**Rule:** Only wrap Vuetify when adding consistent behavior (loading, size variants, theme integration).