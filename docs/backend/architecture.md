# Backend Architecture — Service & Repository Pattern

The TaskFlow Laravel 11 backend organises business logic around the **Controller → Service → Repository → Model** pattern. This separation makes the codebase testable, swappable, and easier to reason about.

## Request flow

```
Vue 3 Frontend → Laravel Controller → Service → Repository → Eloquent Model → MySQL
```

### 1. Controller — HTTP layer

**Responsibilities**

- Receive the HTTP request
- Validate via Laravel Form Requests
- Authorise via Policies (`TaskPolicy`, `UserPolicy`)
- Delegate to a Service
- Return an API Resource (JSON)

**Must NOT**

- Contain business logic
- Query the database directly
- Manage transactions

**Example** (`app/Http/Controllers/Api/TaskController.php`):

```php
public function index(FindTasksQueryRequest $request): JsonResponse
{
    $filters = $request->validated();
    $result = $this->taskService->listTasks($filters);
    return TaskResource::collection($result['tasks'])
        ->additional(['meta' => $result['meta']])
        ->response()
        ->setStatusCode(200);
}
```

### 2. Service — Business‑logic layer

**Responsibilities**

- Implement use‑cases (create, update, assign, complete, cancel a task)
- Orchestrate across repositories
- Manage database transactions (`DB::transaction`)
- Apply domain rules (valid status transitions, assignee existence)
- Emit/domain events if needed

**Must NOT**

- Depend on HTTP request/response
- Contain raw Eloquent queries
- Perform business rules that belong in the API layer

**Example** (`app/Services/TaskService.php`):

```php
public function listTasks(array $filters): array
{
    return $this->taskRepository->paginate($filters);
}

public function createTask(array $data): Task
{
    return DB::transaction(function () use ($data) {
        $this->validateAssignee($data['assigned_to']);
        return $this->taskRepository->create($data);
    });
}

private function validateAssignee(int $userId): void
{
    if (! User::find($userId)) {
        throw new AssigneeNotFoundException($userId);
    }
}
```

### 3. Repository — Data‑access layer

**Interface** (`app/Repositories/Contracts/TaskRepositoryInterface.php`):

```php
interface TaskRepositoryInterface
{
    public function create(array $data): Task;
    public function find(int|string $id): ?Task;
    public function update(Task $task, array $data): Task;
    public function delete(Task $task): void;
    public function paginate(array $filters): array;
    public function findByUser(int $userId, array $filters): array;
}
```

**Eloquent implementation** (`app/Repositories/Eloquent/TaskRepository.php`):

```php
class TaskRepository implements TaskRepositoryInterface
{
    public function paginate(array $filters): array
    {
        $query = Task::with('assignee');

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }
        if (!empty($filters['assigned_to'])) {
            $query->where('assigned_to', $filters['assigned_to']);
        }
        if (!empty($filters['search'])) {
            $query->where('title', 'like', "%{$filters['search']}%");
        }

        $sortBy = $filters['sort_by'] ?? 'created_at';
        $sortOrder = $filters['sort_order'] ?? 'desc';
        $query->orderBy($sortBy, $sortOrder);

        $perPage = min($filters['per_page'] ?? 20, 100);
        $paginator = $query->paginate($perPage, ['*'], 'page', $filters['page'] ?? 1);

        return [
            'tasks' => $paginator->items(),
            'meta' => [
                'page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'total_pages' => $paginator->lastPage(),
            ],
        ];
    }
    // ... other methods
}
```

**Responsibilities**

- Eloquent queries only
- Pagination, filtering, sorting
- Relationship loading (`assignee`)

**Must NOT**

- Contain business rules
- Depend on Controller or HTTP

### 4. Model — Eloquent data model

**File** (`app/Models/Task.php`):

```php
class Task extends Model
{
    protected $fillable = [
        'title', 'description', 'status', 'assigned_to', 'due_date'
    ];

    protected $casts = [
        'due_date' => 'date',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function scopeActive($query): Builder
    {
        return $query->whereIn('status', ['todo', 'in_progress']);
    }
}
```

### 5. Authorization — Policies

**File** (`app/Policies/TaskPolicy.php`):

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
```

**User policy** (`app/Policies/UserPolicy.php`) restricts admin‑only routes; non‑admin users may see only their own tasks.

**Gate** (`AuthServiceProvider`) defines higher‑level gates such as `access admin panel` if needed.

### 6. Dependency injection

Register repositories in `RepositoryServiceProvider`:

```php
class RepositoryServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(
            TaskRepositoryInterface::class,
            EloquentTaskRepository::class
        );
        $this->app->bind(
            UserRepositoryInterface::class,
            EloquentUserRepository::class
        );
    }
}
```

### 7. Pagination

- Default `per_page` = **20** (backend) / **10** (frontend)
- Maximum `per_page` = **100**
- Query parameters: `page`, `per_page`, `status`, `priority`, `assigned_to`, `search`, `sort_by`, `sort_order`

### 8. API resources

- **TaskResource** converts a single task to snake_case JSON (integer IDs).
- **TaskCollection** adds `meta` (page, per_page, total, total_pages) and `links` (first, last, prev, next).
- Never return Eloquent models directly; always use the resource.

### 9. Error handling

All API errors follow the envelope defined in `bootstrap/app.php`:

```json
{
  "status_code": 422,
  "code": "VALIDATION_ERROR",
  "message": "The given data was invalid.",
  "errors": [{ "field": "title", "message": "The title field is required." }],
  "details": [],
  "path": "/api/tasks",
  "timestamp": "2026-..."
}
```

Custom exceptions (e.g. `InvalidStatusTransitionException`) are rendered through the exception handler and produce the same shape with a `code` field.

### 10. Throttling

- `POST /api/login` and `POST /api/register` are rate‑limited to **5 requests per minute** per IP (`throttle:5,1`).
- Authenticated routes use `throttle:60,1` by default.

### 11. Roles and permissions

- Users have a `role` column: `admin` or `user` (enum).
- `isAdmin()` / `isUser()` helpers on the `User` model.
- Admin routes are protected with `role:admin` middleware; task access is governed by `TaskPolicy`.
- Non‑admin users may view / update only tasks assigned to them; they may **not** reassign or delete tasks.
- Attempting to delete the last admin returns HTTP 409.

### 12. Testing strategy

| Layer | Test type | Example |
|---|---|---|
| Service | Unit (mock Repository) | `TaskServiceTest` |
| Repository | Integration (SQLite) | `TaskRepositoryTest` |
| Controller | Feature (full stack, SQLite) | `TaskControllerTest` |
| Policy | Unit | `TaskPolicyTest` |

Tests must be run inside the container:

```bash
docker exec -e DB_CONNECTION=sqlite -e DB_DATABASE=:memory: taskflow-backend php artisan test
```

Baseline: **30** tests, **152** assertions.