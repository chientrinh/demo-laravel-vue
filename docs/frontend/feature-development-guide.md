# Feature Development Guide

This guide provides a step-by-step process for implementing a new task-management feature in the Team Task Manager frontend.

---

## Overview

Each feature follows a consistent pattern:

```
Domain → Data → Application → UI; routes live in `app/router/`
```

---

## 1. Representative Flow: Loading Tasks

This is the canonical example for data-fetching features.

### Step 1: Define Domain Types

**File:** `modules/tasks/domain/types.ts`

```typescript
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

export interface TaskFilters {
  page?: number;
  per_page?: number;
  status?: TaskStatus;
  search?: string;
  sort_by?: 'created_at' | 'updated_at' | 'title' | 'due_date';
  sort_order?: 'asc' | 'desc';
}
```

**Rules:**
- Pure TypeScript — no Vue/Pinia imports
- Business concepts only
- Distinct from API DTOs

---

### Step 2: Define API DTOs

**File:** `modules/tasks/data/dtos/task.dto.ts`

```typescript
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

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  status?: 'todo' | 'in_progress' | 'done';
  assigned_to?: string;
  due_date?: string | null;
}

export interface TaskListParams {
  page?: number;
  per_page?: number;
  status?: 'todo' | 'in_progress' | 'done';
  assigned_to?: string;
  search?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface PaginatedTaskResponse {
  data: TaskDto[];
  meta: { page: number; per_page: number; total: number; total_pages: number };
}
```

---

### Step 3: Implement the Repository

**File:** `modules/tasks/data/repositories/tasks.repository.ts`

```typescript
import { httpClient } from '@/adapters/infrastructures/clients/HttpClient';
import type { TaskListParams, TaskDto, CreateTaskDto, UpdateTaskDto, PaginatedTaskResponse } from '../dtos/task.dto';

export const tasksRepository = {
  async findAll(params: TaskListParams = {}): Promise<PaginatedTaskResponse> {
    const response = await httpClient.get<PaginatedTaskResponse>('/tasks', { params });
    return response.data;
  },

  async findById(id: string): Promise<TaskDto> {
    const response = await httpClient.get<TaskDto>(`/tasks/${id}`);
    return response.data;
  },

  async create(data: CreateTaskDto): Promise<TaskDto> {
    const response = await httpClient.post<TaskDto>('/tasks', data);
    return response.data;
  },

  async update(id: string, data: UpdateTaskDto): Promise<TaskDto> {
    const response = await httpClient.put<TaskDto>(`/tasks/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await httpClient.delete(`/tasks/${id}`);
  },
};
```

---

### Step 4: Add Mappers

**File:** `modules/tasks/data/mappers/task.mapper.ts`

```typescript
import type { Task, TaskStatus } from '../../domain/types';
import type { TaskDto, CreateTaskDto, UpdateTaskDto } from '../dtos/task.dto';

export function toDomain(dto: TaskDto): Task {
  return {
    id: dto.id,
    title: dto.title,
    description: dto.description,
    status: dto.status as TaskStatus,
    assignedTo: dto.assigned_to,
    dueDate: dto.due_date ? new Date(dto.due_date) : null,
    createdAt: new Date(dto.created_at),
    updatedAt: new Date(dto.updated_at),
  };
}

export function toCreateDto(task: Pick<Task, 'title' | 'description' | 'status' | 'assignedTo' | 'dueDate'>): CreateTaskDto {
  return {
    title: task.title,
    description: task.description,
    status: task.status,
    assigned_to: task.assignedTo,
    due_date: task.dueDate?.toISOString().split('T')[0] ?? null,
  };
}

export function toUpdateDto(task: Partial<Pick<Task, 'title' | 'description' | 'status' | 'assignedTo' | 'dueDate'>>): UpdateTaskDto {
  const dto: UpdateTaskDto = {};
  if (task.title !== undefined) dto.title = task.title;
  if (task.description !== undefined) dto.description = task.description;
  if (task.status !== undefined) dto.status = task.status;
  if (task.assignedTo !== undefined) dto.assigned_to = task.assignedTo;
  if (task.dueDate !== undefined) dto.due_date = task.dueDate?.toISOString().split('T')[0] ?? null;
  return dto;
}
```

---

### Step 5: Implement the Application Service

**File:** `modules/tasks/application/services/tasks.service.ts`

```typescript
import { tasksRepository } from '../../data/repositories/tasks.repository';
import { toDomain, toCreateDto, toUpdateDto } from '../../data/mappers/task.mapper';
import type { Task, TaskFilters } from '../../domain/types';

export const tasksService = {
  async list(filters: TaskFilters = {}): Promise<{ tasks: Task[]; meta: any }> {
    const response = await tasksRepository.findAll(filters);
    return {
      tasks: response.data.map(toDomain),
      meta: response.meta,
    };
  },

  async create(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    const dto = await tasksRepository.create(toCreateDto(task));
    return toDomain(dto);
  },

  async update(id: string, task: Partial<Task>): Promise<Task> {
    const dto = await tasksRepository.update(id, toUpdateDto(task));
    return toDomain(dto);
  },

  async remove(id: string): Promise<void> {
    await tasksRepository.delete(id);
  },
};
```

**Rules:**
- Composables and stores call services, never repositories directly.
- Services may orchestrate multiple repository calls and apply business rules.
- Keep DTOs and mappers inside the data layer.

---

### Step 6: Implement Composable

**File:** `modules/tasks/ui/composables/useTasks.ts`

```typescript
import { ref, computed, watch } from 'vue';
import { tasksService } from '../../application/services/tasks.service';
import type { Task, TaskStatus, TaskFilters } from '../../domain/types';
import { useUIStore } from '@/shared/stores/ui.store';

export function useTasks() {
  const uiStore = useUIStore();
  
  const tasks = ref<Task[]>([]);
  const loading = ref(false);
  const error = ref<Error | null>(null);
  const meta = ref<{ page: number; per_page: number; total: number; total_pages: number } | null>(null);
  
  const filters = ref<TaskFilters>({
    page: 1,
    per_page: 20,
    status: undefined,
    search: '',
    sort_by: 'created_at',
    sort_order: 'desc',
  });

  const hasTasks = computed(() => tasks.value.length > 0);
  const totalTasks = computed(() => meta.value?.total ?? 0);

  async function fetch(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const response = await tasksService.list(filters.value);
      tasks.value = response.tasks;
      meta.value = response.meta;
    } catch (e) {
      error.value = e as Error;
      uiStore.toast.error('Failed to load tasks');
    } finally {
      loading.value = false;
    }
  }

  async function create(data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    const task = await tasksService.create(data);
    tasks.value.unshift(task);
    uiStore.toast.success('Task created');
    return task;
  }

  async function update(id: string, data: Partial<Task>): Promise<Task> {
    const task = await tasksService.update(id, data);
    const idx = tasks.value.findIndex(t => t.id === id);
    if (idx !== -1) tasks.value[idx] = task;
    uiStore.toast.success('Task updated');
    return task;
  }

  async function remove(id: string): Promise<void> {
    await tasksService.remove(id);
    tasks.value = tasks.value.filter(t => t.id !== id);
    uiStore.toast.success('Task deleted');
  }

  async function changeStatus(id: string, status: TaskStatus): Promise<void> {
    await update(id, { status });
  }

  // Debounced search
  let debounceTimer: ReturnType<typeof setTimeout>;
  watch(filters, (newFilters) => {
    clearTimeout(debounceTimer);
    if (newFilters.search !== undefined) {
      debounceTimer = setTimeout(() => {
        filters.value.page = 1;
        fetch();
      }, 300);
    } else {
      fetch();
    }
  }, { deep: true });

  // Initial load
  fetch();

  return {
    tasks,
    loading,
    error,
    meta,
    filters,
    hasTasks: computed(() => tasks.value.length > 0),
    totalTasks: computed(() => meta.value?.total ?? 0),
    fetch,
    create,
    update,
    remove,
    changeStatus,
  };
}
```

---

### Step 7: Build Pages and Components (Per Design Specs)

**Design Specs from HTML Design Files:**

#### Task List Page (`/tasks`) — Per `task-list.html`
- **Sidebar Navigation**: Dashboard, All Tasks, Create Task, My Tasks, Users, Create User, Edit User, My Profile, Logout
- **Header**: Search (⌘K), Notifications, User Profile (avatar, name, role, expand_more)
- **Breadcrumb**: Dashboard → Tasks → All Tasks
- **Page Header**: Title "Task Management", Total count badge, "+ Create Task" button
- **Quick Status Cards**: Backlog (14), Active In Progress (22), Completed Sprint (12), Urgent Blockers (2)
- **Filter & Search Toolbar**: 
  - Search input (placeholder: "Search by task title or keyword...")
  - Status Filter Dropdown (All Statuses, Todo, In Progress, Done)
  - Assignee Filter Multiselect (avatars with +N)
  - Priority Filter Dropdown (All, Urgent, High, Medium, Low)
  - Reset Filters button
- **Data Table** (v-data-table):
  - Columns: Select (checkbox), Task ID & Title, Assignee (avatar + name + role), Status (colored chips), Priority (colored badges), Due Date, Created, Actions
  - Status Chips: Todo (yellow), In Progress (blue), Done (green)
  - Priority Badges: Urgent (red/bolt), High (yellow), Medium (blue), Low (gray)
  - Row Actions: View (visibility), Edit (edit), Delete (delete with confirmation dialog)

#### Task Create Page (`/tasks/create`) — Per `task-create.html`
- **Dialog/Page Layout**: Max-width 1440px, 2-column grid (8 cols form + 4 cols sidebar)
- **Left Column (8 cols)**:
  - **Task Information Card**: Title (120 char limit, char counter), Issue Type select (Feature/Bug/Refactor/Research), Rich Text Description (markdown toolbar + textarea)
  - **Acceptance Criteria & Subtasks Card**: Checklist with progress bar, add/remove items
  - **Attachments & References Card**: File upload, links
- **Right Sidebar (4 cols)**:
  - **Task Properties Card**: Assignee dropdown (avatar + name + role), Status dropdown (To Do/In Progress/Code Review/Done), Priority segmented buttons (Low/Medium/High/Urgent with colored indicators), Due Date picker, Estimate (hrs), Sprint & Tags multi-select

#### Task Edit Page (`/tasks/:id/edit`) — Per `task-edit.html`
- Same layout as Create but pre-filled with existing data
- Shows Task ID badge, Created/Updated timestamps
- Status shows "In Progress (Active Sprint 44)" with context
- Priority selector with active state

### User Management UI

#### User List Page (`/users`) — Per `user-list.html`
- **Sidebar**: Active "Users" with "ADMIN" badge
- **Header**: Search, Role filter dropdown (All Roles/Admin/User), Export CSV, + Add User button
- **Data Table**: #, Name, Email, Role (Admin/User badges), Created At, Actions (Edit/Delete)
- Pagination with items per page selector

#### User Create Page (`/users/create`) — Per `user-create.html`
- **Form Fields**: Name*, Email*, Password*, Role* (radio: Admin/User with descriptions)
- Password visibility toggle
- Submit with loading state + toast notification

#### User Edit Page (`/users/:id/edit`) — Per `user-edit.html`
- **Read-only**: User ID (#204)
- **Editable**: Name, Email, Password (optional, leave blank to keep current), Role (Admin/User radio buttons)
- Timestamps: Created/Updated timestamps

**Page:** `modules/tasks/ui/pages/TasksListPage.vue`

```vue
<script setup lang="ts">
import { onMounted } from 'vue';
import { useTasks } from '../composables/useTasks';
import TasksTable from '../components/TasksTable.vue';
import TaskFilters from '../components/TaskFilters.vue';
import { ErrorState, Loader } from '@/shared/components/common';

const { tasks, loading, error, filters, fetch } = useTasks();

onMounted(() => fetch());
</script>

<template>
  <div class="tasks-list-view">
    <header class="page-header">
      <h1>Tasks</h1>
      <TaskFilters v-model:filters="filters" />
    </header>

    <div v-if="loading" class="loading">
      <Loader />
    </div>

    <ErrorState v-else-if="error" :error="error" @retry="fetch" />

    <div v-else class="tasks-content">
      <TasksTable 
        :tasks="tasks" 
        @edit="navigateToEdit"
        @delete="handleDelete"
      />
      
      <Pagination 
        v-if="meta"
        :page="filters.page"
        :totalPages="meta?.total_pages"
        @page-change="filters.page = $event"
      />
    </div>
  </div>
</template>
```

**Component:** `modules/tasks/ui/components/TasksTable.vue`

```vue
<script setup lang="ts">
import type { Task } from '../../domain/types';
import { TaskStatusChip } from './TaskStatusChip.vue';

const props = defineProps<{
  tasks: Task[];
}>();

const emit = defineEmits<{
  edit: [task: Task];
  delete: [id: string];
}>();
</script>

<template>
  <v-data-table :items="tasks" density="compact">
    <template #[`item.title`]="{ item }">
      <span class="font-weight-medium">{{ item.title }}</span>
    </template>
    <template #[`item.status`]="{ item }">
      <TaskStatusChip :status="item.status" />
    </template>
    <template #[`item.assignedTo`]="{ item }">
      {{ item.assignedTo }}
    </template>
    <template #[`item.dueDate`]="{ item }">
      <span :class="item.dueDate && new Date(item.dueDate) < new Date() ? 'text-error' : ''">
        {{ item.dueDate ? formatDate(item.dueDate) : '—' }}
      </span>
    </template>
    <template #[`item.actions`]="{ item }">
      <v-btn size="x-small" variant="text" @click="emit('edit', item)">Edit</v-btn>
      <v-btn size="x-small" variant="text" color="error" @click="emit('delete', item.id)">Delete</v-btn>
    </template>
  </v-data-table>
</template>
```

---

### Step 8: Register Route

**File:** `app/router/routes.ts`

```typescript
import type { RouteRecordRaw } from 'vue-router';

export const tasksRoutes: RouteRecordRaw[] = [
  {
    path: '/tasks',
    name: 'tasks',
    component: () => import('@/shared/layouts/full/FullLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        name: 'tasks-list',
        path: '',
        component: () => import('@/modules/tasks/ui/pages/TasksListPage.vue'),
        meta: { title: 'Tasks' },
      },
      {
        name: 'task-detail',
        path: ':id',
        component: () => import('@/modules/tasks/ui/pages/TaskDetailPage.vue'),
        meta: { title: 'Task Detail' },
        props: true,
      },
    ],
  },
];

export function registerRoutes(): RouteRecordRaw[] {
  return [
    ...tasksRoutes,
    // Future module routes
  ];
}
```

Routes are owned by the app shell, not by feature modules. Modules only expose page components.

---

### Step 9: Implement Loading, Empty, Error, Success States

| State | Component | Usage |
|-------|-----------|-------|
| Loading | `<Loader />` | Initial fetch |
| Refresh | Small spinner | Background refresh |
| Empty | `<EmptyState />` | No tasks found |
| Error | `<ErrorState />` | API failure |
| Success | Toast | Create/update/delete |

```vue
<template>
  <div v-if="loading" class="loading-full">Loading...</div>
  <ErrorState v-else-if="error" :error="error" @retry="fetch" />
  <EmptyState v-else-if="!hasTasks" message="No tasks found" action="Create Task" @action="openCreateDialog" />
  <TasksTable v-else :tasks="tasks" />
</template>
```

---

### Step 10: Verify Role-Aware UI Behavior

```vue
<!-- Admin-only delete button -->
<v-btn 
  v-if="isAdmin" 
  color="error" 
  @click="emit('delete', item.id)"
>
  Delete
</v-btn>

<!-- User can only edit own tasks -->
<v-btn 
  v-if="canEdit(task)" 
  @click="emit('edit', item)"
>
  Edit
</v-btn>
```

```typescript
// In composable or component
const authStore = useAuthStore();
const isAdmin = computed(() => authStore.userRole === 'admin');
const canEdit = (task: Task) => isAdmin.value || authStore.user?.id === task.assignedTo;
```

---

### Step 11: Add Tests and Run Checks

```bash
# Run all checks
npm run lint
npm run typecheck
npm run test
npm run test:e2e
```

**Test coverage for new feature:**
- [ ] Composable tests (Vitest)
- [ ] Component tests (Vue Test Utils + Testing Library)
- [ ] Store tests (if Pinia)
- [ ] E2E test (Playwright) for critical path

---

## 2. Representative Example: Task Form (Create/Edit)

### Form Composable

**File:** `modules/tasks/ui/composables/useTaskForm.ts`

```typescript
import { ref, computed } from 'vue';
import type { Task, TaskStatus } from '../../domain/types';

export function useTaskForm(initialTask?: Task | null) {
  const form = ref({
    title: initialTask?.title ?? '',
    description: initialTask?.description ?? '',
    status: initialTask?.status ?? 'todo' as TaskStatus,
    assignedTo: initialTask?.assignedTo ?? '',
    dueDate: initialTask?.dueDate ? initialTask.dueDate.toISOString().split('T')[0] : '',
  });

  const errors = ref<Partial<Record<keyof typeof form.value, string>>>({});
  const submitting = ref(false);

  const isValid = computed(() => 
    form.value.title.trim().length > 0 && 
    form.value.assignedTo.length > 0
  );

  function validate(): boolean {
    errors.value = {};
    if (!form.value.title.trim()) errors.value.title = 'Title is required';
    if (!form.value.assignedTo) errors.value.assignedTo = 'Assignee is required';
    return Object.keys(errors.value).length === 0;
  }

  function setFieldError(field: keyof typeof form.value, message: string): void {
    errors.value[field] = message;
  }

  function clearErrors(): void {
    errors.value = {};
  }

  function reset(task?: Task | null): void {
    form.value = {
      title: task?.title ?? '',
      description: task?.description ?? '',
      status: task?.status ?? 'todo',
      assignedTo: task?.assignedTo ?? '',
      dueDate: task?.dueDate ? task.dueDate.toISOString().split('T')[0] : '',
    };
    errors.value = {};
  }

  return {
    form,
    errors,
    submitting,
    isValid,
    validate,
    setFieldError,
    clearErrors,
    reset,
  };
}
```

### Form Component

**File:** `modules/tasks/ui/components/TaskForm.vue`

```vue
<script setup lang="ts">
import { ref, watch } from 'vue';
import { useTaskForm } from '../composables/useTaskForm';
import type { Task, TaskStatus } from '../../domain/types';

interface Props {
  modelValue?: Task | null;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  submit: [data: CreateTaskDto | UpdateTaskDto];
  cancel: [];
}>();

const { form, errors, submitting, isValid, validate, reset, clearErrors } = useTaskForm(props.modelValue);

watch(() => props.modelValue, (newTask) => {
  reset(newTask);
  clearErrors();
}, { immediate: true });

async function handleSubmit(): Promise<void> {
  if (!validate()) return;
  submitting.value = true;
  try {
    emit('submit', { ...form.value });
  } finally {
    submitting.value = false;
  }
}

function handleCancel(): void {
  emit('cancel');
}
</script>

<template>
  <v-dialog v-model="form.visible" max-width="600" persistent>
    <v-card>
      <v-card-title>Create Task</v-card-title>
      <v-card-text class="pt-0">
        <v-form @submit.prevent="handleSubmit">
          <v-row dense>
            <v-col cols="12">
              <v-text-field
                v-model="form.title"
                label="Title"
                :error-messages="errors.title"
                required
              />
            </v-col>
            <v-col cols="12">
              <v-textarea
                v-model="form.description"
                label="Description"
                rows="3"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-select
                v-model="form.status"
                :items="['todo', 'in_progress', 'done']"
                label="Status"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-select
                v-model="form.assignedTo"
                :items="assignees"
                label="Assignee"
                item-title="name"
                item-value="id"
                required
              />
            </v-col>
            <v-col cols="12">
              <v-date-picker
                v-model="form.dueDate"
                label="Due Date"
                :no-title="true"
              />
            </v-col>
          </v-row>
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="handleCancel">Cancel</v-btn>
        <v-btn 
          color="primary" 
          type="submit" 
          :loading="submitting" 
          :disabled="!isValid"
        >
          Save
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
```

---

## 3. Checklist for New Features

- [ ] Domain types defined in `domain/types.ts`
- [ ] DTOs in `data/dtos/*.dto.ts`
- [ ] Repository in `data/repositories/*.repository.ts`
- [ ] Mappers in `data/mappers/*.mapper.ts`
- [ ] Service in `application/services/*.service.ts`
- [ ] Store in `application/stores/*.store.ts` (if shared state is needed)
- [ ] Composable in `ui/composables/useXxx.ts`
- [ ] Page in `ui/pages/XxxPage.vue`
- [ ] Feature components in `ui/components/`
- [ ] Route registration in `app/router/routes.ts`
- [ ] Public exports in `index.ts`
- [ ] Loading, empty, error, success states
- [ ] Role-aware UI behavior
- [ ] Tests written and passing
- [ ] Lint, typecheck, build pass
- [ ] Documentation updated

---

## 4. Common Patterns Reference

### Debounced Search

```typescript
let debounceTimer: ReturnType<typeof setTimeout>;
watch(filters, (newFilters) => {
  clearTimeout(debounceTimer);
  if (newFilters.search !== undefined) {
    debounceTimer = setTimeout(() => {
      filters.value.page = 1;
      fetch();
    }, 300);
  } else {
    fetch();
  }
}, { deep: true });
```

### Optimistic Updates

```typescript
async function update(id: string, data: Partial<Task>): Promise<Task> {
  const previousTask = tasks.value.find(t => t.id === id);
  // Optimistic update
  tasks.value = tasks.value.map(t => t.id === id ? { ...t, ...data } : t);
  
  try {
    return tasksService.update(id, data);
  } catch (e) {
    // Rollback on error
    if (previousTask) {
      tasks.value = tasks.value.map(t => t.id === id ? previousTask : t);
    }
    throw e;
  }
}
```

### Pagination Watch

```typescript
watch(() => filters.value.page, () => {
  fetch();
});
```

---

## 5. When to Add Abstraction

| Scenario | Abstraction |
|----------|-------------|
| Multiple components need same logic | Composable |
| State shared across routes | Pinia store |
| Complex business orchestration | Application service |
| Multiple API calls for one operation | Application service |
| Reusable UI pattern | Shared component |
| Feature-specific reusable component | Feature component |

**Default:** Start simple. Add abstraction when duplication or complexity justifies it.