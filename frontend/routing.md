# Frontend Routing — Vue 3 + Vue Router 5

This document describes the **current** route tree and guard logic of the TaskFlow Vue 3 single‑page application. The **source code** in `frontend/src/app/router/` is the single source of truth; this page exists to help contributors understand navigation and authorisation.

## Route tree (generated from `src/app/router/routes.ts`)

| Path | Component (or path) | Meta / Guards |
|------|--------------------|---------------|
| `/` | `TaskList` (redirects to `/tasks`) | `authenticated: false` (redirects) |
| `/auth/login` | `LoginForm` | public (no guard) |
| `/auth/register` | `RegisterForm` | public (no guard) |
| `/tasks` | `TaskList` | `authenticated` guard |
| `/tasks/:id` | `TaskDetail` | `authenticated` guard |
| `/auth/logout` | `LogoutButton` | `authenticated` guard |
| `/users` | `UserList` (admin‑only UI) | `role:admin` guard (UX only) |
| `/users/create` | `UserCreate` (admin‑only UI) | `role:admin` guard (UX only) |

## Guard details

### `authenticated` guard

- **Location** – `src/app/router/guards/auth.ts` (imported in `routes.ts`).
- **Logic**

```ts
import { useUserStore } from '@/modules/auth/store';

export default function authenticated(to, from, next) {
  const userStore = useUserStore();
  if (!userStore.isAuthenticated) {
    next('/auth/login');
    return;
  }
  next();
}
```

- **What it checks** – `store.user.isAuthenticated` (set after a successful login; the token is stored by the auth service).
- **Redirect** – if the user is not authenticated, navigation goes to `/auth/login`. Authenticated pages continue to their target.

### `role:admin` guard

- **Location** – `src/app/router/guards/role.ts`.
- **Logic**

```ts
import { useUserStore } from '@/modules/auth/store';

export default function roleAdmin(to, from, next) {
  const userStore = useUserStore();
  if (userStore.user.role !== 'admin') {
    // UX‑only denial: show a generic “access denied” view or redirect.
    next('/tasks');
    return;
  }
  next();
}
```

- **Important** – this guard is **UX‑only**. The server enforces authorisation via `TaskPolicy` / `UserPolicy`. A non‑admin user can still attempt admin routes; the backend will reject with 403. The front‑end guard merely hides buttons/links.
- **Redirect** – if the role is not `admin`, navigation goes to `/tasks` (or a generic “access‑denied” page).

## Route definitions (excerpt from `src/app/router/routes.ts`)

```ts
import { createRouter, createWebHistory } from 'vue-router';
import { useUserStore } from '@/modules/auth/store';
import authenticated from '@/app/router/guards/auth';
import roleAdmin from '@/app/router/guards/role';
import TaskList from '@/modules/tasks/TaskList.vue';
import TaskDetail from '@/modules/tasks/TaskDetail.vue';
import LoginForm from '@/modules/auth/Login.vue';
import RegisterForm from '@/modules/auth/Register.vue';
import LogoutButton from '@/modules/auth/Logout.vue';
import UserList from '@/modules/users/UserList.vue';
import UserCreate from '@/modules/users/UserCreate.vue';

export const routes = [
  {
    path: '/',
    redirect: '/tasks',
  },
  {
    path: '/auth/login',
    component: LoginForm,
    meta: { public: true },
  },
  {
    path: '/auth/register',
    component: RegisterForm,
    meta: { public: true },
  },
  {
    path: '/tasks',
    component: TaskList,
    beforeEnter: authenticated,
  },
  {
    path: '/tasks/:id(\\d+)',
    component: TaskDetail,
    beforeEnter: authenticated,
  },
  {
    path: '/auth/logout',
    component: LogoutButton,
    beforeEnter: authenticated,
  },
  {
    path: '/users',
    component: UserList,
    beforeEnter: roleAdmin,
  },
  {
    path: '/users/create',
    component: UserCreate,
    beforeEnter: roleAdmin,
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});
```

## Navigation patterns

- **Programmatic navigation** – `useRouter().push('/tasks')` or `useRouter().replace('/tasks/:id')`.
- **Named routes** – not used currently; all routes are defined by path.
- **Query parameters** – tasks list may pass `status`, `priority`, `page` as query strings; the `TaskList` component reads them from `route.query`.

## Links

- [Feature development guide](feature-development-guide.md) – how to add a new route/page.
- [Architecture decisions](architecture-decisions.md) – key routing choices and their status.
- [Playwright e2e tests](e2e/) – verify the login → task CRUD → logout flow.

---

*If routes are added or renamed, update both `routes.ts` and this documentation file in the same pull request.*