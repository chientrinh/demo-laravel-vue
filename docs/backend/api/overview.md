# API Overview — TaskFlow Backend

This document summarises the public JSON API of the TaskFlow Laravel 11 backend. All endpoints, request shapes, response formats, pagination, throttling and error envelopes are defined by the actual code (routes, Form Requests, Resources, exception handler). The code is the source of truth; this page exists to help consumers and developers.

## Base URL

```
http://localhost:8080/api
```

(Behind the Docker Compose setup; inside the Compose network the base is `http://backend:8000/api`.)

## Authentication

- All routes except `POST /api/login`, `POST /api/register` and `GET /api/health` require a **Sanctum bearer token**.
- Token is sent as `Authorization: Bearer <plainTextToken>`.
- Login and registration are **throttled** to **5 requests per minute** per IP (`throttle:5,1`).
- Authenticated routes use `throttle:60,1` by default.

## Roles

- `admin` – can manage users, see all tasks, assign tasks to anyone, delete tasks.
- `user` – can see / update only tasks assigned to them; cannot reassign or delete.

## API contract summary

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET` | `/api/health` | Public | Simple status check, returns `{status: "ok"}`. |
| `POST` | `/api/login` | Public, throttled 5/min | Authenticates with `email`/`password`, returns `{ token, user }`. |
| `POST` | `/api/register` | Public, throttled 5/min | Creates a **role =user** account, returns `{ token, user }`. Password must be confirmed and at least **8** characters. |
| `GET` | `/api/me` | Authenticated | Returns the current user resource (`{user}`). |
| `GET` | `/api/user` | Authenticated | Returns a **bare** user resource (same shape as `/api/me` but without extra wrapper). |
| `POST` | `/api/logout` | Authenticated | Revokes the current access token. |
| `GET/POST` | `/api/tasks` | Authenticated | List tasks with optional filters, sorting and pagination. |
| `GET/PUT/PATCH` | `/api/tasks/{id}` | Assignee or admin | Retrieve, partially update, or fully replace a task. |
| `DELETE` | `/api/tasks/{id}` | Admin | Delete a task (admin only; attempting to delete the last admin returns **409**). |
| `GET/POST` | `/api/users` | Admin | List or create users (admin only). |
| `GET/PUT/PATCH/DELETE` | `/api/users/{id}` | Admin | Retrieve, update or delete a user (admin only). |

## Task payloads (snake_case, integer IDs)

### Create / Update task (request)

```json
{
  "title": "Do the laundry",
  "description": "Wash and fold",
  "status": "todo",
  "assigned_to": 3,
  "due_date": "2025-12-01"
}
```

- `title` – max **255** characters (backend contract); UI limits to **120**.
- `description` – max **5000** characters (backend contract); UI limits to **2000**.
- `status` – one of `todo`, `in_progress`, `done`, `cancelled`.
- `assigned_to` – **required** integer, must exist in the `users` table.
- `due_date` – nullable date; if omitted the task has no due date.

### Task resource (response, single)

```json
{
  "data": {
    "id": 7,
    "title": "Do the laundry",
    "description": "Wash and fold",
    "status": "todo",
    "assigned_to": 3,
    "due_date": "2025-12-01T00:00:00Z",
    "created_at": "2025-11-20T12:34:56Z",
    "updated_at": "2025-11-20T12:34:56Z",
    "assignee": {
      "id": 3,
      "name": "demi@taskflow.dev",
      "email": "demi@taskflow.dev"
    }
  }
}
```

### Task collection (response, list)

```json
{
  "data": [ /* task resources */ ],
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 103,
    "total_pages": 6
  },
  "links": {
    "first": "/api/tasks?page=1",
    "last": "/api/tasks?page=6",
    "prev": null,
    "next": "/api/tasks?page=2"
  }
}
```

**Pagination**

- Default `per_page` = **20** (backend). Frontend default is **10** (the frontend normalises this).
- Maximum `per_page` = **100**.
- Query parameters: `page`, `per_page`, `status`, `priority`, `assigned_to`, `search`, `sort_by`, `sort_order`.

## Priority payload

- One of `low`, `medium`, `high`, `urgent`.
- Frontend may display a coloured badge; the backend stores the value as a string.

## User payload (response)

```json
{
  "id": 1,
  "name": "Olivia",
  "email": "olivia@taskflow.dev",
  "role": "admin",
  "email_verified_at": "2025-01-01T00:00:00Z",
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-01-01T00:00:00Z"
}
```

## Error envelope

All API errors follow the shape defined in `bootstrap/app.php`:

```json
{
  "status_code": 422,
  "code": "VALIDATION_ERROR",
  "message": "The given data was invalid.",
  "errors": [
    { "field": "title", "message": "The title field is required." }
  ],
  "details": [],
  "path": "/api/tasks",
  "timestamp": "2026-01-07T14:25:30Z"
}
```

- `status_code` – HTTP status number (e.g. 401, 403, 422, 404, 409).
- `code` – machine‑readable identifier (e.g. `VALIDATION_ERROR`, `INVALID_TRANSITION`, `NOT_FOUND`).
- `message` – human‑readable explanation.
- `errors` – array of field‑level error objects.
- `details` – free‑form additional information.
- `path` – the request URI.
- `timestamp` – ISO‑8601 UTC time at which the response was generated.

## Common HTTP status codes

| Code | When it occurs |
|------|----------------|
| **200** | Successful GET (e.g. `/api/tasks`, `/api/me`). |
| **201** | Successful creation (e.g. `POST /api/tasks`, `POST /api/register`). |
| **204** | Successful deletion (e.g. `DELETE /api/tasks/{id}` by admin). |
| **400** | Bad request (malformed JSON, missing required fields). |
| **401** | Not authenticated (no or invalid Sanctum token). |
| **403** | Forbidden – the authenticated user lacks the required role or policy permission. |
| **422** | Validation error or business‑rule violation (includes `code`/`message`/`details`). |
| **404** | Resource not found (e.g. `GET /api/tasks/999`). |
| **409** | Conflict – attempt to delete the last admin or assign a non‑existent user. |
| **429** | Too many requests – throttle limit exceeded (login/register). |

## Throttling details

| Endpoint | Limit | Header |
|----------|-------|--------|
| `POST /api/login` | 5 per minute | `Retry-After` may be sent |
| `POST /api/register` | 5 per minute | `Retry-After` may be sent |
| Authenticated routes (default) | 60 per minute | — |

## Versioning

The API does **not** version the URL at this time; all endpoints live under `/api`. If a breaking change is required, a new major version (e.g. `/api/v1/…`) will be introduced with a deprecation period.

## Links to detailed endpoint docs

- [Authentication (login, register, logout, me)](api/endpoints/auth.md)
- [Task CRUD and filtering](api/endpoints/tasks.md)
- [Admin user management](api/endpoints/users.md)

## Error‑handling details

See [api/error-handling.md](api/error-handling.md) for the full exception‑rendering logic and the JSON envelope specification.