# API Endpoints — Tasks

This document describes the task‑related endpoints of the TaskFlow Laravel 11 API. All behaviour is defined by the actual code (routes, Form Requests, Controllers, Resources, Policies, Services). The code is the source of truth.

## Endpoint summary

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET` | `/api/tasks` | Authenticated | List tasks with optional filters, sorting and pagination. |
| `POST` | `/api/tasks` | Authenticated | Create a new task. |
| `GET` | `/api/tasks/{id}` | Assignee or admin | Retrieve a single task. |
| `PUT/PATCH` | `/api/tasks/{id}` | Assignee or admin | Partially or fully update a task. |
| `DELETE` | `/api/tasks/{id}` | Admin | Delete a task (admin only; last‑admin deletion returns **409**). |

## GET /api/tasks (list)

**Query parameters** (all optional)

| Parameter | Description | Example |
|-----------|-------------|---------|
| `page` | Page number (1‑indexed). | `page=2` |
| `per_page` | Number of items per page. Max **100**, default **20** (backend) / **10** (frontend normalises). | `per_page=50` |
| `status` | Filter by status. | `status=in_progress` |
| `priority` | Filter by priority. | `priority=high` |
| `assigned_to` | Filter by assignee user ID. | `assigned_to=3` |
| `search` | Free‑text search on `title`. | `search=laundry` |
| `sort_by` | Field to sort by. Default `created_at`. | `sort_by=due_date` |
| `sort_order` | `asc` or `desc`. Default `desc`. | `sort_order=asc` |

**Success response (200)**

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

**Filters in action** (repository `paginate` method)

- `status` → `Task::where('status', $filters['status'])`
- `assigned_to` → `Task::where('assigned_to', $filters['assigned_to'])`
- `search` → `Task::where('title', 'like', "%{$filters['search']}%")`
- sorting via `$orderBy`
- pagination cap `min($filters['per_page'] ?? 20, 100)`

**Policy**: Listed tasks respect `TaskPolicy.viewAny` (returns `true` for any authenticated user) and `TaskPolicy.view` for individual rows (user sees only their own tasks, admin sees all).

## POST /api/tasks (create)

**Request body (JSON)**

```json
{
  "title": "Do the laundry",
  "description": "Wash and fold",
  "status": "todo",
  "assigned_to": 3,
  "due_date": "2025-12-01",
  "priority": "high"
}
```

**Validation rules** ( `StoreTaskRequest` )

- `title` – required, string, max **255** (backend) / **120** (frontend). Must not be empty.
- `description` – nullable, string, max **5000** (backend) / **2000** (frontend).
- `status` – required, one of `todo`, `in_progress`, `done`, `cancelled`.
- `assigned_to` – required integer, must exist in `users` table (`exists:users,id`).
- `due_date` – nullable date; if omitted the task has no due date.
- `priority` – optional string; one of `low`, `medium`, `high`, `urgent` (backend stores it; UI may ignore).

**Throttle**: none specific to creation, but general authenticated‑route throttle (60/min) applies.

**Success response (201)**

```json
{
  "data": {
    "id": 7,
    "title": "Do the laundry",
    "description": "Wash and fold",
    "status": "todo",
    "assigned_to": 3,
    "due_date": "2025-12-01T00:00:00Z",
    "priority": "high",
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

**Business rules** (enforced in `TaskService.createTask`)

1. The assignee user must exist (`validateAssignee`).
2. Status transition is validated (see Service – only `todo → in_progress`, `in_progress → todo/done`, `done → in_progress` are allowed). If an invalid transition is supplied, an `InvalidStatusTransitionException` is thrown, resulting in a **422** error envelope with `code: INVALID_TRANSITION`.

**Failure responses**

- **422** – validation errors or invalid status transition.
- **401** – not authenticated.
- **403** – user is not assignee and not admin (policy check in controller).

**Controller** (`TaskController@store`)

```php
public function store(StoreTaskRequest $request): JsonResponse
{
    $task = $this->taskService->createTask($request->validated());
    return response()->json([
        'data' => new TaskResource($task),
    ], 201);
}
```

## GET /api/tasks/{id} (retrieve)

**URL parameter**: `{id}` – integer primary key.

**Success response (200)**

```json
{
  "data": {
    "id": 7,
    "title": "Do the laundry",
    "status": "todo",
    "assigned_to": 3,
    "due_date": "2025-12-01T00:00:00Z",
    "priority": "high",
    "created_at": "2025-11-20T12:34:56Z",
    "updated_at": "2025-11-20T12:34:56Z",
    "assignee": { "id": 3, "name": "demi@taskflow.dev" }
  }
}
```

**Policy**: `TaskPolicy.view` must return `true`; otherwise the controller returns **403**.

**Controller** (`TaskController@show`)

```php
public function show(Task $task): JsonResponse
{
    $this->authorize('view', $task);
    return response()->json([
        'data' => new TaskResource($task),
    ], 200);
}
```

**Failure responses**

- **403** – policy denied.
- **404** – task not found (model not found).

## PUT/PATCH /api/tasks/{id} (update)

**URL parameter**: `{id}` – integer.

**Request body** (same shape as create, only send the fields you wish to change; omitted fields are left unchanged.)

**Validation rules** ( `UpdateTaskRequest` ) – same as `StoreTaskRequest` but all fields are optional (the request only validates the fields that are present).

**Business rules** – same status‑transition checks as creation; if the new status is not reachable from the current status, `InvalidStatusTransitionException` is thrown (422).

**Success response (200)**

```json
{
  "data": {
    "id": 7,
    "title": "Do the laundry",
    "status": "in_progress",
    "assigned_to": 3,
    "due_date": "2025-12-01T00:00:00Z",
    "priority": "high",
    "updated_at": "2025-11-20T13:00:00Z",
    "assignee": { "id": 3, "name": "demi@taskflow.dev" }
  }
}
```

**Failure responses**

- **422** – validation errors or invalid status transition.
- **403** – policy denied (user is not assignee and not admin).
- **404** – task not found.

**Controller** (`TaskController@update`)

```php
public function update(UpdateTaskRequest $request, Task $task): JsonResponse
{
    $this->authorize('update', $task);
    $task = $this->taskService->updateTask($task, $request->validated());
    return response()->json([
        'data' => new TaskResource($task),
    ], 200);
}
```

## DELETE /api/tasks/{id} (admin delete)

**URL parameter**: `{id}` – integer.

**Access**: **admin only**. The `TaskPolicy.delete` method returns `true` only for admin users.

**Success response**: **204 No Content**. Body is empty.

**Failure responses**

- **403** – non‑admin attempting to delete.
- **409** – attempt to delete the last admin (enforced in `TaskService.deleteTask` or controller; returns a conflict envelope with `code: CANNOT_DELETE_LAST_ADMIN`).
- **404** – task not found.

**Controller** (`TaskController@destroy`)

```php
public function destroy(Task $task): JsonResponse
{
    $this->authorize('delete', $task);
    $this->taskService->deleteTask($task);
    return response()->json(null, 204);
}
```

## Priority field

- Stored as a string (`low`, `medium`, `high`, `urgent`).
- Frontend may display a coloured badge; the backend does not enforce any transition rules for priority.
- Can be filtered via the `priority` query parameter on the list endpoint.

## Links

- [API overview](api/overview.md) – full contract, pagination, error envelope.
- [Authentication](api/endpoints/auth.md) – login, register, logout, me/user.
- [Admin user management](api/endpoints/users.md) – user CRUD for admins.