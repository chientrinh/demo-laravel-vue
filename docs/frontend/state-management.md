# State Management — Pinia + Composables

This document describes the state management strategy for the Team Task Manager frontend.

---

## 1. Philosophy

| State Type | Solution | Examples |
|------------|----------|----------|
| **Global shared** | Pinia stores | Auth session, UI state (toasts, sidebar) |
| **Feature-specific reactive** | Composables | Task list, filters, form state |
| **Component-local** | `ref`/`reactive` | Dialog open, input values, temporary UI state |

**Principles:**
- Pinia for state shared across components/routes
- Composables for reusable feature logic with reactive state
- Component-local for ephemeral UI state
- No duplicate sources of truth

---

## 2. Pinia Stores

### Store Location Convention

| Store | Location | Scope |
|-------|----------|-------|
| Auth | `modules/auth/application/stores/auth.store.ts` | Feature |
| UI (toasts, sidebar) | `shared/stores/ui.store.ts` | Cross-cutting |
| App config | `shared/stores/app.store.ts` | Cross-cutting (if needed) |
| Tasks | `modules/tasks/application/stores/tasks.store.ts` | Feature (if needed) |

---

## 3. Auth Store (`modules/auth/application/stores/auth.store.ts`)

```typescript
// modules/auth/application/stores/auth.store.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { authService } from '../services/auth.service';
import type { User, UserRole } from '../domain/types';
import { httpClient } from '@/adapters/infrastructures/clients/HttpClient';

const TOKEN_KEY = 'auth_token';

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref<User | null>(null);
  const token = ref<string | null>(localStorage.getItem(TOKEN_KEY));
  const loading = ref(false);
  let _initialized = false;

  // Getters
  const isAuthenticated = computed(() => !!token.value && !!user.value);
  const userRole = computed(() => user.value?.role ?? 'guest');
  const userName = computed(() => user.value?.name ?? '');

  // Actions
  async function init(): Promise<void> {
    if (_initialized) return;
    _initialized = true;
    
    if (!token.value) return;
    
    httpClient.defaults.headers.common.Authorization = `Bearer ${token.value}`;
    
    try {
      user.value = await authService.me();
    } catch {
      await logout();
    }
  }

  async function login(credentials: { email: string; password: string; remember?: boolean }): Promise<void> {
    loading.value = true;
    try {
      const result = await authService.login(credentials);
      user.value = result.user;
      token.value = result.token;
      localStorage.setItem(TOKEN_KEY, result.token);
      httpClient.defaults.headers.common.Authorization = `Bearer ${result.token}`;
      
      const router = await import('vue-router').then(m => m.useRouter());
      const redirect = router.currentRoute.value.query.redirect as string || '/tasks';
      await router.push(redirect);
    } finally {
      loading.value = false;
    }
  }

  async function logout(): Promise<void> {
    loading.value = true;
    try {
      await authService.logout();
    } finally {
      user.value = null;
      token.value = null;
      localStorage.removeItem(TOKEN_KEY);
      delete httpClient.defaults.headers.common.Authorization;
      
      const router = await import('vue-router').then(m => m.useRouter());
      await router.push({ name: 'login' });
      loading.value = false;
    }
  }

  return {
    user,
    token,
    loading,
    isAuthenticated,
    userRole,
    userName,
    _initialized,
    init,
    login,
    logout,
  };
});
```

---

## 4. UI Store (`shared/stores/ui.store.ts`)

```typescript
// shared/stores/ui.store.ts
import { defineStore } from 'pinia';
import { ref } from 'vue';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

export const useUIStore = defineStore('ui', () => {
  // State
  const sidebarOpen = ref(true);
  const globalLoading = ref(false);
  const toasts = ref<Toast[]>([]);

  // Actions
  function toggleSidebar(): void {
    sidebarOpen.value = !sidebarOpen.value;
  }

  function setGlobalLoading(value: boolean): void {
    globalLoading.value = value;
  }

  function showToast(toast: Omit<Toast, 'id'>): void {
    const id = crypto.randomUUID();
    const duration = toast.duration ?? 5000;
    toasts.value.push({ ...toast, id });
    setTimeout(() => removeToast(id), duration);
  }

  function removeToast(id: string): void {
    const idx = toasts.value.findIndex(t => t.id === id);
    if (idx !== -1) toasts.value.splice(idx, 1);
  }

  // Convenience methods
  const toast = {
    success: (msg: string) => showToast({ type: 'success', message: msg }),
    error: (msg: string) => showToast({ type: 'error', message: msg }),
    warning: (msg: string) => showToast({ type: 'warning', message: msg }),
    info: (msg: string) => showToast({ type: 'info', message: msg }),
  };

  return {
    sidebarOpen,
    globalLoading,
    toasts,
    toggleSidebar,
    setGlobalLoading,
    showToast,
    removeToast,
    toast,
  };
});
```

---

## 5. Feature Composables

### `useTasks` — Task List State (`modules/tasks/ui/composables/useTasks.ts`)

```typescript
// modules/tasks/ui/composables/useTasks.ts
import { ref, computed, watch } from 'vue';
import { tasksService } from '../../application/services/tasks.service';
import type { Task, TaskStatus, TaskFilters } from '../../domain/types';
import { useUIStore } from '@/shared/stores/ui.store';

export function useTasks() {
  const uiStore = useUIStore();
  
  // State
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

  // Getters
  const hasTasks = computed(() => tasks.value.length > 0);
  const totalTasks = computed(() => meta.value?.total ?? 0);

  // Actions
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

  // Watch filters with debounce for search
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

  // Initialize
  fetch();

  return {
    tasks,
    loading,
    error,
    meta,
    filters,
    hasTasks,
    totalTasks,
    fetch,
    create,
    update,
    remove,
    changeStatus,
  };
}
```

### `useTaskForm` — Form State (`modules/tasks/ui/composables/useTaskForm.ts`)

```typescript
// modules/tasks/ui/composables/useTaskForm.ts
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
    clearErrors();
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

---

## 6. Auth Composable (`modules/auth/ui/composables/useAuth.ts`)

```typescript
// modules/auth/ui/composables/useAuth.ts
import { computed } from 'vue';
import { useAuthStore } from '../../application/stores/auth.store';

export function useAuth() {
  const authStore = useAuthStore();

  return {
    user: computed(() => authStore.user),
    token: computed(() => authStore.token),
    isAuthenticated: computed(() => authStore.isAuthenticated),
    userRole: computed(() => authStore.userRole),
    userName: computed(() => authStore.userName),
    loading: computed(() => authStore.loading),
    login: authStore.login,
    logout: authStore.logout,
    init: authStore.init,
  };
}
```

---

## 7. State Management Patterns

### Pattern: Composable Owns Loading State

```typescript
// ✅ Composable manages loading/error/data
const { tasks, loading, error, fetch } = useTasks();

// Component just uses refs
<template>
  <div v-if="loading">Loading...</div>
  <ErrorState v-else-if="error" :error="error" @retry="fetch" />
  <TasksTable v-else :tasks="tasks" />
</template>
```

### Pattern: Pinia for Cross-Component State

```typescript
// ✅ Auth state in Pinia (shared across routes)
const authStore = useAuthStore();

// ❌ Don't put task list in Pinia if only used in one view
// Use composable instead
```

### Pattern: Component-Local for Ephemeral State

```vue
<script setup>
import { ref } from 'vue';

const dialogOpen = ref(false);
const searchQuery = ref('');
const selectedItems = ref<string[]>([]);
</script>
```

---

## 8. Avoiding Duplicate State

| Anti-Pattern | Solution |
|--------------|----------|
| Task list in Pinia + composable | Keep only in composable |
| Auth user in both store and composable | Composable reads from store |
| Form data in store | Keep in component/composable |
| UI loading in multiple places | Single source: composable or UI store |

---

## 9. Persistence Strategy

| Data | Storage | Reason |
|------|---------|--------|
| Auth token | `localStorage` | Survives browser close |
| User preferences | `localStorage` | Theme, sidebar state |
| Form drafts | `sessionStorage` | Survives refresh only |
| Task list cache | Memory (Pinia/composable) | Fresh on navigation |

```typescript
// Persistence helpers
function saveToLocalStorage<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

function loadFromLocalStorage<T>(key: string, defaultValue: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '') as T;
  } catch {
    return defaultValue;
  }
}
```

---

## 10. Testing State

### Testing Composables

```typescript
// tests/composables/useTasks.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useTasks } from '@/modules/tasks/ui/composables/useTasks';
import { tasksService } from '@/modules/tasks/application/services/tasks.service';

vi.mock('@/modules/tasks/application/services/tasks.service');

describe('useTasks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads tasks on init', async () => {
    const mockTasks = [{ id: '1', title: 'Test', status: 'todo', ... }];
    vi.mocked(tasksService.list).mockResolvedValue({ tasks: mockTasks, meta: { page: 1, per_page: 20, total: 1, total_pages: 1 } });

    const { tasks, loading, fetch } = useTasks();
    
    expect(loading.value).toBe(true);
    await fetch();
    
    expect(loading.value).toBe(false);
    expect(tasks.value).toHaveLength(1);
  });
});
```

### Testing Pinia Stores

```typescript
// tests/stores/auth.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createTestingPinia } from '@pinia/testing';
import { useAuthStore } from '@/modules/auth/application/stores/auth.store';
import { authService } from '@/modules/auth/application/services/auth.service';

vi.mock('@/modules/auth/application/services/auth.service');

describe('useAuthStore', () => {
  beforeEach(() => {
    setActivePinia(createTestingPinia());
    vi.clearAllMocks();
  });

  it('login sets user and token', async () => {
    const mockResponse = { user: { id: '1', name: 'Test', role: 'user' }, token: 'abc' };
    vi.mocked(authService.login).mockResolvedValue(mockResponse);

    const store = useAuthStore();
    await store.login({ email: 'test@test.com', password: 'pass' });

    expect(store.user).toEqual(mockResponse.user);
    expect(store.token).toBe('abc');
    expect(store.isAuthenticated).toBe(true);
  });
});
```

---

## 11. DevTools Integration

### Pinia DevTools

- Install Vue DevTools browser extension
- Pinia stores appear in "Pinia" tab
- Time-travel debugging available
- Store actions logged

### Composables in DevTools

- Composables not directly visible in DevTools
- Reactive refs visible in component inspection
- Use `console.log` in composables for debugging

---

## 12. Migration from Options API

| Options API | Composition API (Pinia) |
|-------------|-------------------------|
| `data()` | `ref()` / `reactive()` |
| `computed` | `computed()` |
| `methods` | Functions in setup |
| `watch` | `watch()` / `watchEffect()` |
| `this.$store` | `useStore()` |
| `mapState` | `storeToRefs()` |
| `mapActions` | Direct store method calls |

```typescript
// Converting mapState/mapActions
import { storeToRefs } from 'pinia';
const authStore = useAuthStore();
const { user, isAuthenticated } = storeToRefs(authStore); // Reactive refs
const { login, logout } = authStore; // Direct method access
```