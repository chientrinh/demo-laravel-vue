# API Error Handling — TaskFlow Backend

All API responses follow a single, central error envelope defined in `bootstrap/app.php`. The shape is enforced by the global exception handler; controllers, Form Requests and custom exceptions should never return raw Eloquent errors or unstructured JSON.

## Envelope schema

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

| Field | Type | Description |
|-------|------|-------------|
| `status_code` | `integer` | The HTTP status code that should be returned to the client (e.g. 401, 403, 422, 404, 409). |
| `code` | `string` | A machine‑readable identifier for the error type (e.g. `VALIDATION_ERROR`, `INVALID_TRANSITION`, `NOT_FOUND`). |
| `message` | `string` | Human‑readable explanation sent to the client. |
| `errors` | `array` | Array of field‑level error objects; each object has at minimum `field` and `message`. |
| `details` | `array` | Free‑form additional information (e.g. validation rule names, extra context). |
| `path` | `string` | The request URI that generated the error (e.g. `/api/tasks`). |
| `timestamp` | `string` (ISO‑8601) | UTC time at which the response was generated. |

The HTTP status code sent to the client is **always** the value of `status_code`. Middleware or reverse proxies must not override it.

## How errors are generated

### 1. Validation failures (Form Requests)

When a Form Request’s `rules()` method fails, Laravel automatically returns a **422** response with the envelope above. The `code` is set to `VALIDATION_ERROR` and `errors` contains the field‑level messages from the validator.

### 2. Custom business exceptions

Exceptions that extend `Exception` and define a `render()` method in `bootstrap/app.php` are caught and rendered into the envelope. Example:

```php
class InvalidStatusTransitionException extends Exception
{
    public function __construct(
        public readonly string $fromStatus,
        public readonly string $toStatus
    ) {
        parent::__construct(
            "Invalid status transition from {$fromStatus} to {$toStatus}",
            422
        );
    }
}
```

The global handler (`->withExceptions(...)`) maps this to:

```json
{
  "status_code": 422,
  "code": "INVALID_TRANSITION",
  "message": "Invalid status transition from todo to done.",
  "errors": [],
  "details": { "from": "todo", "to": "done" },
  "path": "/api/tasks/5",
  "timestamp": "2026-..."
}
```

### 3. Model‑not‑found (404)

If a route model‑binding resolves to `null`, Laravel returns a 404 response automatically; the exception handler wraps it:

```json
{
  "status_code": 404,
  "code": "NOT_FOUND",
  "message": "No query results for model [App\Models\Task] with primary key = 999.",
  "errors": [],
  "details": [],
  "path": "/api/tasks/999",
  "timestamp": "2026-..."
}
```

### 4. Authorization failures (403)

When `$this->authorize('view', $task)` or a Gate check fails, Laravel returns 403. The handler wraps it:

```json
{
  "status_code": 403,
  "code": "FORBIDDEN",
  "message": "Unauthorized action.",
  "errors": [],
  "details": [],
  "path": "/api/tasks/7",
  "timestamp": "2026-..."
}
```

## Error‑handler code (excerpt from `bootstrap/app.php`)

```php
->withExceptions(function (Exceptions $exceptions): void {
    $exceptions->render(function (ValidationException $e) {
        return response()->json([
            'status_code' => 422,
            'code' => 'VALIDATION_ERROR',
            'message' => 'The given data was invalid.',
            'errors' => $e->errors(),
            'details' => [],
            'path' => request()->getRequestUri(),
            'timestamp' => now()->toISO8601String(),
        ], 422);
    });

    $exceptions->render(function (InvalidStatusTransitionException $e) {
        return response()->json([
            'status_code' => 422,
            'code' => 'INVALID_TRANSITION',
            'message' => $e->getMessage(),
            'details' => [
                'from' => $e->fromStatus,
                'to' => $e->toStatus,
            ],
            'path' => request()->getRequestUri(),
            'timestamp' => now()->toISO8601String(),
        ], 422);
    });

    $exceptions->render(function (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
        return response()->json([
            'status_code' => 404,
            'code' => 'NOT_FOUND',
            'message' => $e->getMessage(),
            'errors' => [],
            'details' => [],
            'path' => request()->getRequestUri(),
            'timestamp' => now()->toISO8601String(),
        ], 404);
    });

    $exceptions->render(function (\Illuminate\Auth\Access\AuthorizationException $e) {
        return response()->json([
            'status_code' => 403,
            'code' => 'FORBIDDEN',
            'message' => 'Unauthorized action.',
            'errors' => [],
            'details' => [],
            'path' => request()->getRequestUri(),
            'timestamp' => now()->toISO8601String(),
        ], 403);
    });
});
```

## Practical notes for consumers

- Always read the `status_code` field first; it tells you the HTTP status to present.
- The `code` field can be used to programme‑matically branch (e.g. `INVALID_TRANSITION` → show a inline validation hint).
- `errors` array is the place to display field‑level messages in forms.
- `details` may contain extra structured data (transition from/to, validation rule names, etc.).
- The `timestamp` is useful for debugging and for correlation with server logs.

## What should NOT be done

- **Never** return raw Eloquent validation messages or database error strings outside the envelope.
- **Never** omit the `status_code` field; the front‑end relies on it to set the HTTP response code.
- **Never** include stack traces or debugging information in production responses; they are stripped by the handler.

---

*If you encounter an error envelope that does not conform to this schema, inspect the exception handler in `bootstrap/app.php` and the relevant Form Request or custom exception.*