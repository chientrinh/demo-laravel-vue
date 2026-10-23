# API Endpoints — Users (admin only)

This document describes the user‑management endpoints of the TaskFlow Laravel 11 API. Access is restricted to users with the `admin` role; all behaviour is defined by the actual code (routes, Form Requests, Controllers, Resources, Policies). The code is the source of truth.

## Endpoint summary

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET` | `/api/users` | Admin | List all users. |
| `POST` | `/api/users` | Admin | Create a new user. |
| `GET` | `/api/users/{id}` | Admin | Retrieve a single user. |
| `PUT/PATCH` | `/api/users/{id}` | Admin | Update a user (password, role, etc.). |
| `DELETE` | `/api/users/{id}` | Admin | Delete a user (cannot delete the last admin; returns **409**). |

## GET /api/users (list)

**Query parameters** (all optional)

| Parameter | Description | Example |
|-----------|-------------|---------|
| `page` | Page number (1‑indexed). | `page=2` |
| `per_page` | Items per page. Max **100**, default **20** (backend). | `per_page=50` |
| `role` | Filter by role (`admin` or `user`). | `role=user` |
| `search` | Free‑text search on `name` or `email`. | `search=olivia` |

**Success response (200)**

```json
{
  "data": [ /* user resources (without password / token) */ ],
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 6,
    "total_pages": 1
  },
  "links": {
    "first": "/api/users?page=1",
    "last": "/api/users?page=1",
    "prev": null,
    "next": null
  }
}
```

**Filtering** – the repository `paginate` method applies `role` and `search` filters on the `users` table.

**Policy**: `UserPolicy.viewAny` returns `true` for any authenticated admin; individual rows are not further filtered beyond the `role` query param.

## POST /api/users (create)

**Request body (JSON)**

```json
{
  "name": "New User",
  "email": "newuser@taskflow.dev",
  "password": "password123",
  "password_confirmation": "password123",
  "role": "user"
}
```

**Validation rules** ( `StoreUserRequest` – analogous to `StoreTaskRequest` but for users )

- `name` – required, string, max 255.
- `email` – required, string, email, max 255, unique.
- `password` – required, string, min **8**, confirmed.
- `password_confirmation` – required, string, must equal `password`.
- `role` – optional enum, one of `admin`, `user`. If omitted, defaults to `user` (the migration enum default).

**Success response (201)**

```json
{
  "data": {
    "id": 7,
    "name": "New User",
    "email": "newuser@taskflow.dev",
    "role": "user",
    "email_verified_at": null,
    "created_at": "2025-11-20T12:34:56Z",
    "updated_at": "2025-11-20T12:34:56Z"
  }
}
```

**Business rules**

- The role column is an enum (`admin`, `user`) with default `user`. Admins can assign either role when creating a user.
- Password is always hashed via `Hash::make()`.
- The created user resource uses `UserResource` (excluding sensitive fields such as the plain‑text password).

**Failure responses**

- **422** – validation errors (e.g. duplicate email, password too short, invalid role).
- **403** – non‑admin attempting to create a user.

**Controller** (`UserController@store`)

```php
public function store(StoreUserRequest $request): JsonResponse
{
    $validated = $request->validated();
    $user = User::create([
        'name' => $validated['name'],
        'email' => $validated['email'],
        'password' => Hash::make($validated['password']),
        'role' => $validated['role'] ?? 'user',
    ]);

    return response()->json([
        'data' => new UserResource($user),
    ], 201);
}
```

## GET /api/users/{id} (retrieve)

**URL parameter**: `{id}` – integer primary key of the user.

**Success response (200)**

```json
{
  "data": {
    "id": 1,
    "name": "Olivia",
    "email": "olivia@taskflow.dev",
    "role": "admin",
    "email_verified_at": "2025-01-01T00:00:00Z",
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-01-01T00:00:00Z"
  }
}
```

**Policy**: `TaskPolicy` or `UserPolicy` must allow `view`; otherwise **403**.

**Controller** (`UserController@show`)

```php
public function show(User $user): JsonResponse
{
    $this->authorize('view', $user);
    return response()->json([
        'data' => new UserResource($user),
    ], 200);
}
```

**Failure responses**

- **403** – policy denied (non‑admin).
- **404** – user not found.

## PUT/PATCH /api/users/{id} (update)

**URL parameter**: `{id}` – integer.

**Request body** (only send the fields you wish to change; omitted fields are left unchanged.)

**Typical fields**: `name`, `email`, `password` (must confirm), `role`.

**Validation rules** ( `UpdateUserRequest` ) – analogous to `StoreUserRequest` but all fields are optional.

**Success response (200)**

```json
{
  "data": {
    "id": 1,
    "name": "Olivia Updated",
    "email": "olivia@taskflow.dev",
    "role": "admin",
    "updated_at": "2025-11-21T09:10:00Z"
  }
}
```

**Failure responses**

- **422** – validation errors (e.g. duplicate email, invalid role, password confirmation mismatch).
- **403** – non‑admin attempting to update.
- **404** – user not found.

**Controller** (`UserController@update`)

```php
public function update(UpdateUserRequest $request, User $user): JsonResponse
{
    $this->authorize('update', $user);
    $validated = $request->only(['name', 'email', 'password', 'role']);
    if (isset($validated['password'])) {
        $validated['password'] = Hash::make($validated['password']);
    }
    if (isset($validated['role'])) {
        $user->role = $validated['role'];
    }
    $user->save();

    return response()->json([
        'data' => new UserResource($user),
    ], 200);
}
```

**Note** – updating the role of the **last admin** to `user` is prevented by application logic (not by a database constraint). If an admin attempts to demote themselves to a non‑admin role when they are the final admin, the system returns **409** with `code: CANNOT_DEMOTE_LAST_ADMIN`.

## DELETE /api/users/{id} (admin delete)

**URL parameter**: `{id}` – integer.

**Access**: **admin only**. `TaskPolicy.delete` (or a dedicated admin check) permits deletion.

**Success response**: **204 No Content**. Body empty.

**Failure responses**

- **403** – non‑admin attempting to delete.
- **409** – attempt to delete the **last** admin (the system protects against having zero admins). Returns an envelope with `code: CANNOT_DELETE_LAST_ADMIN`.
- **404** – user not found.

**Controller** (`UserController@destroy`)

```php
public function destroy(User $user): JsonResponse
{
    $this->authorize('delete', $user);
    // Prevent deleting the last admin
    if ($user->isAdmin() && User::where('role', 'admin')->count() <= 1) {
        return response()->json([
            'status_code' => 409,
            'code' => 'CANNOT_DELETE_LAST_ADMIN',
            'message' => 'Cannot delete the last admin user.',
            'errors': [],
            'details': [],
            'path' => request()->getRequestUri(),
            'timestamp' => now()->toISO8601String(),
        ], 409);
    }
    $user->delete();
    return response()->json(null, 204);
}
```

## Priority / role protections

- The system never allows the **admin count** to drop below 1. Attempts to delete the last admin or demote the last admin are rejected with **409**.
- All admin‑only routes are protected by the `role:admin` middleware (in addition to `auth:sanctum`).

## Links

- [API overview](api/overview.md) – full contract, pagination, error envelope.
- [Authentication](api/endpoints/auth.md) – login, register, logout, me/user.
- [Task endpoints](api/endpoints/tasks.md) – task CRUD and filtering.