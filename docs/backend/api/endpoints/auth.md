# API Endpoints — Authentication

This document describes the authentication‑related endpoints of the TaskFlow Laravel 11 API. All behaviour is defined by the actual code (routes, Form Requests, Controllers, exception handler). The code is the source of truth.

## Endpoint summary

| Method | Endpoint | Access | Throttle | Response |
|--------|----------|--------|----------|----------|
| `POST` | `/api/login` | Public | 5 per minute | `{ token, user }` (HTTP 200) |
| `POST` | `/api/register` | Public | 5 per minute | `{ token, user }` (HTTP 201) |
| `POST` | `/api/logout` | Authenticated | — | `204 No Content` |
| `GET` | `/api/me` | Authenticated | — | `{ user }` |
| `GET` | `/api/user` | Authenticated | — | bare `{ user }` |

## POST /api/login

**Request body (JSON)**

```json
{
  "email": "user@taskflow.dev",
  "password": "password123"
}
```

**Throttle**: 5 requests per minute per IP. After exceeding, the response is **429** with the usual error envelope.

**Success response (200)**

```json
{
  "data": {
    "id": 3,
    "name": "demi@taskflow.dev",
    "email": "demi@taskflow.dev",
    "role": "user"
  },
  "token": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
}
```

**Failure responses**

- **401** – invalid credentials or account not activated.
- **429** – throttle limit exceeded.

**Code path** (relevant portion of `AuthController@login`)

```php
public function login(LoginRequest $request): JsonResponse
{
    $credentials = $request->validated();

    if (! auth()->attempt($credentials)) {
        return response()->json([
            'status_code' => 401,
            'code' => 'AUTHENTICATION_ERROR',
            'message' => 'The provided credentials are incorrect.',
            'errors': [],
            'details': [],
            'path' => request()->getRequestUri(),
            'timestamp' => now()->toISO8601String(),
        ], 401);
    }

    $user = auth()->user();
    $token = $user->createToken('api-token')->plainTextToken;

    return response()->json([
        'data' => new UserResource($user),
        'token' => $token,
    ], 200);
}
```

## POST /api/register

**Request body (JSON)**

```json
{
  "name": "Demi",
  "email": "demi@taskflow.dev",
  "password": "password123",
  "password_confirmation": "password123"
}
```

**Validation rules** (contained in `RegisterRequest`)

- `name` – required, string, max 255.
- `email` – required, string, email, max 255, unique.
- `password` – required, string, min 8, confirmed (matches `password_confirmation`).
- `password_confirmation` – required, string, must equal `password`.

**Throttle**: 5 requests per minute per IP.

**Success response (201)**

```json
{
  "data": {
    "id": 4,
    "name": "Demi",
    "email": "demi@taskflow.dev",
    "role": "user"
  },
  "token": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
}
```

The newly created user always receives the role **`user`** (the enum default). The response uses `UserResource` to shape the JSON.

**Failure responses**

- **422** – validation errors (e.g. password too short, email already taken).
- **429** – throttle limit exceeded.

**Code path** (`AuthController@register`)

```php
public function register(RegisterRequest $request): JsonResponse
{
    $validated = $request->validated();
    $user = User::create([
        'name' => $validated['name'],
        'email' => $validated['email'],
        'password' => Hash::make($validated['password']),
    ]);

    // role defaults to 'user' via the migration enum default

    $token = $user->createToken('api-token')->plainTextToken;

    return response()->json([
        'data' => new UserResource($user),
        'token' => $token,
    ], 201);
}
```

## POST /api/logout

**Access**: authenticated users only (Sanctum token required).

**Action**: Revokes the current access token (calls `$request->user()->currentAccessToken()->delete()`).

**Response**: **204 No Content**. No body is returned.

## GET /api/me

**Access**: authenticated only.

**Response** (same shape as the `data` object in the login/register responses):

```json
{
  "id": 3,
  "name": "demi@taskflow.dev",
  "email": "demi@taskflow.dev",
  "role": "user"
}
```

The controller simply returns the authenticated user resource:

```php
public function me(): JsonResponse
{
    return response()->json([
        'data' => new UserResource(auth()->user()),
    ], 200);
}
```

## GET /api/user

**Access**: authenticated only.

**Response**: a **bare** user resource (no wrapping `data` key). This endpoint is typically used by the admin UI to display the current account’s profile without the extra `data` wrapper.

```json
{
  "id": 3,
  "name": "demi@taskflow.dev",
  "email": "demi@taskflow.dev",
  "role": "user"
}
```

Controller:

```php
public function user(): JsonResponse
{
    return response()->json(
        new UserResource(auth()->user()),
        200
    );
}
```

## Links

- [API overview](api/overview.md) – full contract, pagination, error envelope.
- [Task endpoints](api/endpoints/tasks.md) – task CRUD and filtering.
- [User admin endpoints](api/endpoints/users.md) – admin‑only user management.