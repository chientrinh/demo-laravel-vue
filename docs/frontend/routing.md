# Routing — Vue Router 4

This document describes the routing strategy for the Team Task Manager frontend.

---

## 1. Router Setup

### Central Router (`app/router/index.ts`)

```typescript
// app/router/index.ts
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { tasksRoutes, authRoutes } from './routes';
import { useAuthStore } from '@/modules/auth/application/stores/auth.store';

const routes: RouteRecordRaw[] = [
  // Public routes
  ...authRoutes,
  
  // Protected routes
  ...tasksRoutes,
  
  // Catch-all (must be last)
  {
    path: '/:pathMatch(.*)*',
    redirect: { name: 'tasks-list' },
  },
];

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition;
    if (to.hash) return { el: to.hash, behavior: 'smooth' };
    return { top: 0 };
  },
});

// Global navigation guard
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();
  
  // Initialize auth on first navigation
  if (!authStore._initialized) {
    await authStore.init();
  }
  
  const requiresAuth = to.meta.requiresAuth !== false;
  const allowedRoles = to.meta.roles as string[] | undefined;
  
  if (requiresAuth && !authStore.isAuthenticated) {
    return next({ name: 'login', query: { redirect: to.fullPath } });
  }
  
  if (allowedRoles && !allowedRoles.includes(authStore.userRole)) {
    return next({ name: 'forbidden' });
  }
  
  // Redirect authenticated users away from auth pages
  if (['login', 'register'].includes(to.name as string) && authStore.isAuthenticated) {
    return next({ name: 'tasks-list' });
  }
  
  next();
});

export default router;
```

### Route Guards (`app/router/guards.ts`)

```typescript
// app/router/guards.ts
import type { NavigationGuardNext, RouteLocationNormalized } from 'vue-router';
import { useAuthStore } from '@/modules/auth/application/stores/auth.store';

export async function authGuard(
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: NavigationGuardNext
): Promise<void> {
  const authStore = useAuthStore();
  
  if (!authStore._initialized) {
    await authStore.init();
  }
  
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return next({ name: 'login', query: { redirect: to.fullPath } });
  }
  
  next();
}

export function roleGuard(
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: NavigationGuardNext
): void {
  const authStore = useAuthStore();
  const allowedRoles = to.meta.roles as string[] | undefined;
  
  if (allowedRoles && !allowedRoles.includes(authStore.userRole)) {
    return next({ name: 'forbidden' });
  }
  
  next();
}
```

---

## 2. Required Routes

### Auth Routes (`app/router/routes.ts`)

```typescript
// app/router/routes.ts
import type { RouteRecordRaw } from 'vue-router';

export const authRoutes: RouteRecordRaw[] = [
  {
    path: '/auth',
    component: () => import('@/shared/layouts/blank/BlankLayout.vue'),
    meta: { requiresAuth: false },
    children: [
      {
        name: 'login',
        path: '/auth/login',
        component: () => import('@/modules/auth/ui/pages/LoginPage.vue'),
        meta: { title: 'Login' },
      },
      {
        name: 'register',
        path: '/auth/register',
        component: () => import('@/modules/auth/ui/pages/RegisterPage.vue'),
        meta: { title: 'Register' },
      },
    ],
  },
];
```

### Task Routes (`app/router/routes.ts`)

```typescript
// app/router/routes.ts
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
```

### Route Metadata Types

```typescript
// shared/types/router.ts
import 'vue-router';

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean;
    roles?: string[];
    title?: string;
    layout?: 'full' | 'blank';
  }
}
```

---

## 3. Route Registration

### Central Registration (`app/router/routes.ts`)

```typescript
// app/router/routes.ts
import type { RouteRecordRaw } from 'vue-router';

export function registerRoutes(): RouteRecordRaw[] {
  return [
    ...authRoutes,
    ...tasksRoutes,
    // Future modules register here
    // ...usersRoutes,
  ];
}
```

### Main Router Index

```typescript
// app/router/index.ts
import { createRouter, createWebHistory } from 'vue-router';
import { registerRoutes } from './routes';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    ...registerRoutes(),
    {
      path: '/:pathMatch(.*)*',
      redirect: { name: 'tasks-list' },
    },
  ],
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition;
    if (to.hash) return { el: to.hash, behavior: 'smooth' };
    return { top: 0 };
  },
});

export default router;
```

---

## 4. Lazy Loading

All route components use dynamic imports for code splitting:

```typescript
// ✅ Lazy loaded (code split)
component: () => import('@/modules/tasks/ui/pages/TasksListPage.vue')

// ❌ Eager loaded (avoid)
import TasksListPage from '@/modules/tasks/ui/pages/TasksListPage.vue'
component: TasksListPage
```

**Vite automatically creates separate chunks** for each lazy-loaded route.

---

## 5. Layout Integration

### Layout Selection via Meta

```typescript
// In route definition
{
  path: '/auth',
  component: () => import('@/shared/layouts/blank/BlankLayout.vue'),
  meta: { layout: 'blank', requiresAuth: false },
  children: [...]
}

{
  path: '/tasks',
  component: () => import('@/shared/layouts/full/FullLayout.vue'),
  meta: { layout: 'full', requiresAuth: true },
  children: [...]
}
```

### Layout Components (Vuetify Infrastructure)

| Layout | Path | Purpose |
|--------|------|---------|
| `BlankLayout` | `src/shared/layouts/blank/BlankLayout.vue` | Auth pages (no sidebar/topbar) |
| `FullLayout` | `src/shared/layouts/full/FullLayout.vue` | Main app (sidebar + topbar) |

**Note:** These are Vuetify infrastructure components. Keep as-is.

---

## 6. Adding a New Route

### Step-by-Step

1. **Create the page component:**
   ```vue
   <!-- modules/new-feature/ui/pages/NewFeaturePage.vue -->
   <script setup lang="ts">
   // ...
   </script>
   ```

2. **Define the route in the central router:**
   ```typescript
   // app/router/routes.ts
   import type { RouteRecordRaw } from 'vue-router';

   export const newFeatureRoutes: RouteRecordRaw[] = [
     {
       path: '/new-feature',
       component: () => import('@/modules/new-feature/ui/pages/NewFeaturePage.vue'),
       meta: { requiresAuth: true, title: 'New Feature' },
     },
   ];
   ```

3. **Register it in `registerRoutes()`:**
   ```typescript
   export function registerRoutes(): RouteRecordRaw[] {
     return [ ...authRoutes, ...tasksRoutes, ...newFeatureRoutes ];
   }
   ```

4. **Add route guard metadata:**
   ```typescript
   meta: { requiresAuth: true, roles: ['admin'] }
   ```

5. **Test navigation:**
   - Direct URL access
   - Authenticated/unauthenticated
   - Role-based access

---

## 7. Navigation Patterns

### Programmatic Navigation

```typescript
// In composables/components
import { useRouter, useRoute } from 'vue-router';

const router = useRouter();
const route = useRoute();

// Navigate to task detail
router.push({ name: 'task-detail', params: { id: taskId } });

// Navigate with query
router.push({ name: 'tasks-list', query: { status: 'todo', page: 2 } });

// Redirect after login
const redirect = route.query.redirect as string || '/tasks';
router.push(redirect);

// Go back
router.back();
```

### Navigation Guards Composition

```typescript
// Combine multiple guards
router.beforeEach(authGuard);
router.beforeEach(roleGuard);
// Or use array
router.beforeEach([authGuard, roleGuard]);
```

---

## 8. Route Naming Conventions

| Pattern | Example |
|---------|---------|
| List | `tasks-list`, `users-list` |
| Detail | `task-detail`, `user-detail` |
| Create | `task-create` (if separate page) |
| Edit | `task-edit` (if separate page) |
| Auth | `login`, `register`, `forgot-password` |
| Error | `forbidden`, `not-found` |

### Route Parameters

```typescript
// Path with params
path: '/tasks/:id'

// Access in component
const route = useRoute();
const taskId = route.params.id; // string

// Typed params (with vue-router types)
const route = useRoute<{ params: { id: string } }>();
```

---

## 9. Handling Unknown Routes

```typescript
// Catch-all (must be last in routes array)
{
  path: '/:pathMatch(.*)*',
  redirect: { name: 'tasks-list' },
  // Or: component: () => import('@/shared/components/common/NotFoundPage.vue')
}
```

---

## 10. TypeScript Route Types

```typescript
// shared/types/router.ts (extend for type safety)
import 'vue-router';

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean;
    roles?: string[];
    title?: string;
    layout?: 'full' | 'blank';
  }
  
  // Typed route params
  interface RouteParams {
    id?: string;
    // Add other params as needed
  }
}
```

---

## 11. Navigation in Components

### Router Link (Preferred)

```vue
<!-- Vue Router link -->
<RouterLink :to="{ name: 'task-detail', params: { id: task.id } }">
  View Task
</RouterLink>

<!-- With query -->
<RouterLink :to="{ name: 'tasks-list', query: { status: 'todo' } }">
  Todo Tasks
</RouterLink>
```

### Programmatic (Composable)

```typescript
// In useTasks.ts or similar
function navigateToTask(id: string): void {
  router.push({ name: 'task-detail', params: { id } });
}

function navigateToListWithFilters(filters: TaskFilters): void {
  router.push({ name: 'tasks-list', query: filters });
}
```

---

## 12. Scroll Behavior

```typescript
// In router options
scrollBehavior(to, from, savedPosition) {
  if (savedPosition) return savedPosition;
  if (to.hash) return { el: to.hash, behavior: 'smooth' };
  return { top: 0 };
}
```

---

## 13. Testing Routes

```typescript
// tests/router/index.test.ts
import { createRouter, createWebHistory } from 'vue-router';
import { registerRoutes } from '@/app/router/routes';
import { createTestingPinia } from '@pinia/testing';

describe('Router', () => {
  let router: ReturnType<typeof createRouter>;
  
  beforeEach(() => {
    const pinia = createTestingPinia();
    router = createRouter({
      history: createWebHistory(),
      routes: registerRoutes(),
    });
  });
  
  it('redirects unauthenticated users to login', async () => {
    await router.push('/tasks');
    expect(router.currentRoute.value.name).toBe('login');
  });
  
  it('allows authenticated users to access tasks', async () => {
    const authStore = useAuthStore();
    authStore.user = { id: '1', role: 'user' } as any;
    authStore.token = 'token';
    
    await router.push('/tasks');
    expect(router.currentRoute.value.name).toBe('tasks-list');
  });
});
```