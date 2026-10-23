# Backend Architecture Decisions

This document records the key architectural decisions for the TaskFlow Laravel 11 backend. All decisions remain the historical record of why the codebase is structured as it is; where the implementation has evolved, an **Implementation note (2026‑10‑23)** explains the current state.

---

## ADR‑001: Service & Repository Pattern

**Date:** 2024‑01‑15  
**Status:** Accepted

### Context

Need to organise backend code with clear separation of concerns.

### Decision

Adopt **Controller → Service → Repository → Model** pattern:

| Layer | Responsibility |
|-------|----------------|
| Controller | HTTP, validation, authorisation, response |
| Service | Business logic, transactions, orchestration |
| Repository | Data access, queries, pagination |
| Model | Eloquent relationships, casts, scopes |

### Consequences

**Positive**

- Clear separation of concerns
- Testable (mock Repository in Service tests)
- Swappable data layer
- Single responsibility per class

**Negative**

- More classes initially
- More indirection for simple CRUD

**Mitigation:** Only add Service/Repository when complexity justifies it.

### Implementation note (2026‑10‑23)

The pattern is fully in place. Controllers delegate to Services, which use Repository interfaces bound via `RepositoryServiceProvider`. Status‑transition validation lives in `TaskService` (ADR‑007), not in the Controller. Pagination defaults to `per_page=20`, capped at `100` (see Repository `paginate` method).

---

## ADR‑002: Repository Interface + Eloquent Implementation

**Date:** 2024‑01‑15  
**Status:** Accepted

### Context

Need to abstract data access for testing and flexibility.

### Decision

Create `Contracts/TaskRepositoryInterface` + `Eloquent/TaskRepository`; register in `RepositoryServiceProvider`.

### Consequences

**Positive**

- Mockable in Service unit tests
- Swappable implementation (e.g., cache decorator)
- Clear contract

**Negative**

- Extra file per repository
- Interface maintenance

**Mitigation:** Only create interface when needed (testing, multiple implementations).

### Implementation note (2026‑10‑23)

The interface defines `paginate`, `findByUser`, `create`, `update`, `delete`, `find`. The Eloquent implementation uses `Task::with('assignee')` and respects the `per_page` cap of 100. Test suite runs with SQLite in‑memory (`DB_CONNECTION=sqlite`, `DB_DATABASE=:memory:`).

---

## ADR‑003: Form Requests for Validation + Authorization

**Date:** 2024‑01‑15  
**Status:** Accepted

### Context

Need consistent validation and authorisation at the HTTP boundary.

### Decision

Use **Form Requests** for every operation:

| Request | Purpose |
|---|---|
| `StoreTaskRequest` | Create validation + `can('create', Task::class)` |
| `UpdateTaskRequest` | Update validation + `can('update', $task)` |
| `FindTasksQueryRequest` | Query‑param validation |

### Consequences

**Positive**

- Validation + auth in one place
- Automatic 422/403 responses
- Controllers stay thin
- Reusable across controllers

---

## ADR‑004: API Resources for Response Shaping

**Date:** 2024‑01‑15  
**Status:** Accepted

### Context

Need consistent, secure API responses.

### Decision

Use **API Resources** for all responses; never return Eloquent models directly.

### Consequences

**Positive**

- Consistent response shape
- Automatic relationship loading control (`whenLoaded`)
- Field exclusion (no passwords, tokens)
- Versioning support

---

## ADR‑005: Policies for Authorization

**Date:** 2024‑01‑15  
**Status:** Accepted

### Context

Need fine‑grained authorisation.

### Decision

**Policies** for model‑level authorisation:

```php
class TaskPolicy
{
    public function view(User $user, Task $task): bool
    {
        return $user->id === $task->assigned_to || $user->isAdmin();
    }

    public function update(User $user, Task $task): bool
    {
        return $user->id === $task->assigned_to || $user->isAdmin();
    }

    public function delete(User $user, Task $task): bool
    {
        return $user->isAdmin();
    }
}
```

### Consequences

**Positive**

- Centralised authorisation logic
- Testable in isolation
- Works with `$this->authorize()` and `@can` Blade

---

## ADR‑006: Custom Exceptions with `render()`

**Date:** 2024‑01‑15  
**Status:** Accepted

### Context

Need consistent error responses for business‑rule violations.

### Decision

Custom exceptions with a `render()` method; global handler in `bootstrap/app.php` maps them to the JSON error envelope.

### Consequences

**Positive**

- Consistent error envelope
- Business errors don’t leak stack traces
- Machine‑readable `code` for the frontend

---

## ADR‑007: Service Layer Owns Transactions

**Date:** 2024‑01‑15  
**Status:** Accepted

### Context

Where should database transactions live?

### Decision

**Service layer** owns transaction boundaries:

```php
public function createTask(array $data): Task
{
    return DB::transaction(function () use ($data) {
        $this->validateAssignee($data['assigned_to']);
        return $this->taskRepository->create($data);
    });
}
```

**Not** in Controller, not in Repository.

### Consequences

**Positive**

- Business‑logic atomicity
- Repository stays transaction‑agnostic
- Controller doesn’t manage DB

---

## ADR‑008: Enum Casts for Status/Role

**Date:** 2024‑01‑15  
**Status:** Accepted

### Context

How to handle fixed‑value columns (status, role)?

### Decision

**PHP 8.1+ Backed Enums + Laravel Casts:**

```php
// Migration
$table->enum('status', ['todo', 'in_progress', 'done'])->default('todo');

// Model
protected $casts = [
    'status' => TaskStatus::class,
];

// Enum
enum TaskStatus: string
{
    case Todo = 'todo';
    case InProgress = 'in_progress';
    case Done = 'done';
}
```

### Consequences

**Positive**

- Type safety in PHP
- IDE autocomplete
- Invalid values caught at hydration

---

## ADR‑009: Pagination Response Format

**Date:** 2024‑01‑15  
**Status:** Accepted

### Context

Standardise paginated list responses.

### Decision

**ResourceCollection with `meta`/`links`** (JSON example):

```json
{
  "data": [...],
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 42,
    "total_pages": 3
  },
  "links": {
    "first": "/api/tasks?page=1",
    "last": "/api/tasks?page=3",
    "prev": null,
    "next": "/api/tasks?page=2"
  }
}
```

**Query params:** `page`, `per_page` (max 100).

### Consequences

**Positive**

- Predictable shape for the frontend
- Built‑in links generation via Laravel's ResourceCollection

---

## ADR‑010: Sanctum Token Authentication

**Date:** 2024‑01‑15  
**Status:** Accepted

### Context

API authentication for the SPA.

### Decision

**Laravel Sanctum with personal access tokens**:

```php
// Login
$token = $user->createToken('api-token')->plainTextToken;

// Middleware
Route::middleware('auth:sanctum')->group(function () { ... });
```

**Token format:** `Authorization: Bearer {id}|{random_string}`

**Not:** Session cookies, JWT packages, Passport.

---

## ADR‑011: Role Column on Users Table

**Date:** 2024‑01‑15  
**Status:** Accepted

### Context

How to implement admin/user roles?

### Decision

**Enum column on users table**:

```php
// Migration
$table->enum('role', ['admin', 'user'])->default('user')->after('email');

// Model
protected $casts = ['role' => UserRole::class];

// Helper
public function isAdmin(): bool
{
    return $this->role === UserRole::Admin;
}
```

**Not:** Separate roles table, spatie/laravel‑permission (overkill for two roles).

### Consequences

**Positive**

- Simple, single‑column solution
- Built‑in enum handling

---

## ADR‑011: Soft Deletes Not Used

**Date:** 2024‑01‑15  
**Status:** Accepted

### Context

Should tasks support soft deletes?

### Decision

**No soft deletes** for tasks.

**Reason:** Task deletion is an intentional admin action; no “restore” requirement is expressed. Hard delete simplifies queries and storage.

**If needed later:** Add `deleted_at` column + `SoftDeletes` trait.

---

## ADR‑012: No Repository for Simple CRUD

**Date:** 2024‑01‑15  
**Status:** Accepted

### Context

When to create a Repository?

### Decision

**Only create a Repository when**

- Complex queries (pagination, filtering, joins)
- Multiple data sources
- Need to mock in Service tests
- Business logic in Service needs to be testable without DB

**Simple CRUD:** Service can call Model directly (example shown).

---

## ADR‑013: Co‑located Tests

**Date:** 2024‑01‑15  
**Status:** Accepted

### Context

Where to place tests?

### Decision

**Co‑located with source**:

```
tests/
├── Unit/
│   ├── Services/TaskServiceTest.php
│   └── Repositories/TaskRepositoryTest.php
└── Feature/
    ├── Auth/LoginTest.php
    └── Tasks/ListTasksTest.php
```

**Benefits**

- Easy to find
- Refactoring moves tests with code
- Clear ownership

---

## ADR‑014: Factories with States

**Date:** 2024‑01‑15  
**Status:** Accepted

### Context

How to create test data?

### Decision

**Model Factories with named states**:

```php
Task::factory()->todo()->create();
Task::factory()->inProgress()->forUser($user)->create();
Task::factory()->overdue()->count(5)->create();
```

**Factory method example**:

```php
public function todo(): static
{
    return $this->state(['status' => 'todo']);
}
```

---

## ADR‑015: SQLite In‑Memory for Testing

**Date:** 2024‑01‑15  
**Status:** Accepted

### Context

Database for test runs.

### Decision

**SQLite in‑memory** in `phpunit.xml`:

```xml
<php>
    <env name="DB_CONNECTION" value="sqlite"/>
    <env name="DB_DATABASE" value=":memory:"/>
</php>
```

**Benefits**

- Fast (no Docker/MySQL needed)
- Isolated per test run
- Works in CI without services

---

## ADR‑016: Laravel Pint + PHPStan for Code Quality

**Date:** 2024‑01‑15  
**Status:** Accepted

### Context

Code style and static analysis.

### Decision

**Pint (style) + PHPStan (analysis)**:

```bash
./vendor/bin/pint           # Fix style
./vendor/bin/pint --test    # Check
./vendor/bin/phpstan analyse # Analyze
```

**PHPStan level 5 baseline** with Larastan.

**Note (2026‑10‑23):** PHPStan is **not installed** in the CI image; the referenced `phpcs` step is allowed to fail. Only Pint is enforced.

---

## ADR‑017: Environment‑Based Config

**Date:** 2024‑01‑15  
**Status:** Accepted

### Context

Configuration management.

### Decision

**All config via `.env` + `config/*.php`**:

```php
// config/sanctum.php
'expiration' => env('SANCTUM_TOKEN_EXPIRATION', 30),
```

**Never** hardcode values; use `config('sanctum.expiration')` in code.

---

## ADR‑018: API Versioning via URL Prefix

**Date:** 2024‑01‑15  
**Status:** Accepted

### Context

How to version the API?

### Decision

**URL prefix** `/api/v1`:

```php
Route::prefix('v1')->group(function () {
    Route::apiResource('tasks', TaskController::class);
});
```

**Not:** Header‑based versioning (more complex for the frontend).

---

## ADR‑019: Rate Limiting Per Endpoint

**Date:** 2024‑01‑15  
**Status:** Accepted

### Context

Protect against abuse.

### Decision

**Route‑level rate limiting**:

```php
Route::post('/login', LoginController::class)
    ->middleware('throttle:5,1');

Route::middleware('auth:sanctum')->group(function () {
    Route::apiResource('tasks', TaskController::class)
        ->middleware('throttle:60,1');
});
```

**Backend:** Redis‑backed for multi‑instance setups.

---

## ADR‑020: CORS for Frontend Origin

**Date:** 2024‑01‑15  
**Status:** Accepted

### Context

Frontend on a different port/origin.

### Decision

**`config/cors.php` with explicit origin**:

```php
return [
    'paths' => ['api/*'],
    'allowed_methods' => ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
    'allowed_origins' => [env('FRONTEND_URL','http://localhost:5173')],
    'allowed_headers' => ['Content-Type','Authorization'],
    'supports_credentials' => false,
];
```

**Not:** `*` origin with credentials.

---

*All ADRs above preserve the original decision, context, and consequences. Implementation notes (2026‑10‑23) highlight where the code has evolved from the original proposal.*