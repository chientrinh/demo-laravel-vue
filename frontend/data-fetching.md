# Frontend Data Fetching — HttpClient & API Integration

This document describes the **current** HTTP client and data‑fetching patterns used by the TaskFlow Vue 3 single‑page application. The **source code** in `frontend/src/adaptors/infrastructures/clients/HttpClient.ts` and the mock DB `mockDb.ts` are the single source of truth; this page exists to help contributors understand how the SPA talks to the Laravel JSON API.

## Overview

- **Base URL** – `/api` proxied through Vite dev server (default `http://backend:8000`) or `http://localhost:8080` when `VITE_API_PROXY_TARGET` is set.
- **Authentication** – bearer token from the Pinia `auth` store (`Authorization: Bearer <token>`).
- **Mock mode** – enabled by default (`VITE_USE_MOCK` not set to `"false"`). When on, all calls fall back to a `localStorage`‑backed mock database (`ttm.mock.db.v1`).
- **Response shape** – the Laravel API returns a JSON envelope (`status_code`, `code`, `message`, `errors`, `details`, `path`, `timestamp`). The `HttpClient` extracts `statusCode` for UI error handling.

## HttpClient file structure

- **Location** – `src/adaptors/infrastructures/clients/HttpClient.ts`.
- **Exported functions** – grouped by feature (tasks, auth, users, mock).

### Core helpers (internal, not exported)

```ts
// Axios instance with base URL and default headers
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://backend:8000',
  headers: {
    Accept: 'application/json',
  },
});

// Add bearer token interceptor (runs on every request)
api.interceptors.request.use(config => {
  const token = useUserStore().token; // Pinia store; may be null in mock mode
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor – normalise error envelope
api.interceptors.response.use(
  response => response,
  error => {
    // Ensure error.response?.status is always present for the UI
    if (error.response?.status === undefined) {
      error.response.status = 0; // fallback
    }
    // Extract statusCode from Laravel envelope if present
    if (error.response?.data?.status_code !== undefined) {
      error.response.status = error.response.data.status_code;
    }
    return Promise.reject(error);
  }
);
```

### Mock‑mode check (internal utility)

```ts
function isMockMode(): boolean {
  return import.meta.env.VITE_USE_MOCK !== 'false';
}
```

---

## Feature‑specific functions (exported)

### Auth

```ts
export async function login(credentials) {
  if (isMockMode()) {
    // mockDb expects { email, password }
    return mockDb.auth.login(credentials);
  }
  const { data } = await api.post('/api/login', credentials);
  // data = { token, user: { id, name, email, role } }
  return data;
}

export async function register(name, email, password, passwordConfirmation) {
  if (isMockMode()) {
    return mockDb.auth.register({ name, email, password });
  }
  const { data } = await api.post('/api/register', {
    name,
    email,
    password,
    password_confirmation: passwordConfirmation,
  });
  return data;
}

export async function logout() {
  if (isMockMode()) {
    // mockDb logout – just clear the stored token
    mockDb.auth.logout();
    return;
  }
  await api.post('/api/logout');
}
```

### Tasks

```ts
export async function listTasks(filters = {}) {
  if (isMockMode()) {
    return mockDb.task.list(filters); // returns { data: Task[], meta }
  }
  const { data } = await api.get('/api/tasks', { params: filters });
  // HttpClient response interceptor already put statusCode on error;
  // data structure: { data: Task[], meta: {page, per_page, total, total_pages}, links }
  return {
    data: mapTaskDto(data.data), // snake_case → camelCase mappers
    meta: data.meta,
    links: data.links,
  };
}

export async function createTask(dto) {
  if (isMockMode()) {
    return mockDb.task.create(dto); // dto already camelCase; mock stores as‑is
  }
  const { data } = await api.post('/api/tasks', dto);
  return mapTaskDto(data.data); // single task resource
}

export async function updateTask(id, dto) {
  if (isMockMode()) {
    return mockDb.task.update(id, dto);
  }
  const { data } = await api.put(`/api/tasks/${id}`, dto);
  return mapTaskDto(data.data);
}

export async function deleteTask(id) {
  if (isMockMode()) {
    mockDb.task.delete(id);
    return;
  }
  await api.delete(`/api/tasks/${id}`);
}
```

### Users (admin)

```ts
export async function listUsers(filters = {}) {
  if (isMockMode()) {
    return mockDb.user.list(filters);
  }
  const { data } = await api.get('/api/users', { params: filters });
  return mapUserDto(data.data);
}

export async function createUser(dto) {
  if (isMockMode()) {
    return mockDb.user.create(dto);
  }
  const { data } = await api.post('/api/users', dto);
  return mapUserDto(data.data);
}

export async function updateUser(id, dto) {
  if (isMockMode()) {
    return mockDb.user.update(id, dto);
  }
  const { data } = await api.put(`/api/users/${id}`, dto);
  return mapUserDto(data.data);
}

export async function deleteUser(id) {
  if (isMockMode()) {
    mockDb.user.delete(id);
    return;
  }
  await api.delete(`/api/users/${id}`);
}
```

---

## Mock database (`mockDb.ts`)

- **Key** – `ttm.mock.db.v1` stored in `localStorage`.
- **Structure** – JSON with two top‑level keys: `accounts` and `tasks`.

```ts
// Example localStorage content (pretty‑printed)
{
  "accounts": {
    "olivia@taskflow.dev": "password123",
    "phoenix@taskflow.dev": "password123",
    // ... other demo accounts
  },
  "tasks": {
    "1": {
      "id": "1",
      "title": "Write documentation",
      "status": "in_progress",
      "assigned_to": "olivia@taskflow.dev",
      "due_date": "2025-12-01",
      "priority": "high"
    },
    "2": { … }
  }
}
```

- **Functions** – `mockDb.auth.*`, `mockDb.task.*`, `mockDb.user.*` perform simple `get`/`set`/`delete` operations on that JSON.
- **ID format** – strings; the store sometimes wraps with `String(dto.id)` for consistency.
- **Never** MSW; the mock is purely `localStorage`‑based.

---

## DTO ⇆ domain model mapping (mappers)

The Laravel API returns **snake_case** JSON; the frontend domain models use **camelCase**. Small helper functions live in `src/modules/tasks/mappers.ts` (and analogous files for users) and are called inside `HttpClient` before data enters the Pinia store.

### Example: task mapper

```ts
export function mapTaskDto(raw) {
  if (!raw) return null;
  return {
    id: raw.id, // integer from API, string from mock – kept as‑is
    title: raw.title,
    description: raw.description,
    status: raw.status,
    assignedTo: raw.assigned_to, // camelCase
    dueDate: raw.due_date,
    priority: raw.priority,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    assignee: raw.assignee
      ? {
          id: raw.assignee.id,
          name: raw.assignee.name,
          email: raw.assignee.email,
        }
      : null,
  };
}
```

### Example: user mapper

```ts
export function mapUserDto(raw) {
  if (!raw) return null;
  return {
    id: raw.id,
    name: raw.name,
    email: raw.email,
    role: raw.role,
    emailVerifiedAt: raw.email_verified_at,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}
```

These mappers are invoked inside each `HttpClient` function (e.g. `listTasks` → `mapTaskDto(data.data)`) so that the Pinia store always receives camelCase data.

---

## Error handling in the client

- The response interceptor (see “Core helpers”) ensures `error.response.status` reflects the Laravel `status_code` when present.
- UI components read `error.response?.status` to decide which toast/message to show.
- Common situations

| Situation | `status_code` | UI action |
|-----------|--------------|----------|
| Validation error (422) | 422 | Show field‑level errors from `error.response.data.errors`. |
| Unauthenticated (401) | 401 | Redirect to login, clear token. |
| Forbidden (403) | 403 | Show “access denied” or hide button. |
| Not found (404) | 404 | Show “resource not found”. |
| Conflict / last‑admin (409) | 409 | Display conflict message (e.g. “Cannot delete the last admin”). |

---

## Links

- [State management](state-management.md) – Pinia store details.
- [Authentication](api/endpoints/auth.md) – login/register/logout flow.
- [API error handling](api/error-handling.md) – envelope schema.
- [Feature development guide](feature-development-guide.md) – adding new fetch calls.
- [Playwright e2e tests](e2e/) – verify the full data flow with mock mode on/off.

---

*If the API contract changes (new fields, different status codes, altered envelope), update both the Laravel side (`bootstrap/app.php`, resources, exceptions) and the `HttpClient` mappers/handlers in the same pull request.*