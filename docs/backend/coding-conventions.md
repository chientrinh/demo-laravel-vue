# Backend Coding Conventions — Laravel 11

This document defines the coding standards for the TaskFlow Laravel 11 backend. The application code, migrations, requests, resources, services, policies and tests are the source of truth; these conventions explain and summarise the existing practices.

---

## 1. General principles

1. **Readability over cleverness** — code is read more often than it is written.  
2. **Explicit over implicit** — clear names, no magic strings or numbers.  
3. **Single responsibility** — one reason to change per class or method.  
4. **Fail fast and loud** — validate at the boundary, throw descriptive exceptions.  
5. **No dead code** — delete unused code; version control is the backup.  
6. **Depend on abstractions** — inject interfaces, not concrete implementations.

---

## 2. PHP version & features

- **PHP 8.3+** is required.  
- Use **constructor property promotion** with `readonly` where appropriate.  
- Use **enums** for fixed sets (status, role).  
- Use **match expressions** over `switch` when the logic is simple.  
- Use **typed properties** everywhere.  
- Use **return types** on all public methods.

```php
// ✅ Modern PHP 8.3+
class TaskService
{
    public function __construct(
        private readonly TaskRepositoryInterface $taskRepository,
        private readonly UserRepositoryInterface $userRepository
    ) {}

    public function createTask(array $data): Task
    {
        return DB::transaction(fn() => $this->taskRepository->create($data));
    }
}
```

---

## 3. Layering rules

### Controller — HTTP only

```php
// ✅ Thin controller
class TaskController extends Controller
{
    public function __construct(
        private readonly TaskService $taskService
    ) {}

    public function store(StoreTaskRequest $request): JsonResponse
    {
        $task = $this->taskService->createTask($request->validated());
        return TaskResource::make($task)->response()->setStatusCode(201);
    }
}
```

**Rules**

- Validate via Form Request  
- Authorise via Policy  
- Call Service  
- Return API Resource  
- **No** business logic  
- **No** database queries  
- **No** transaction management  

### Service — business logic

```php
// ✅ Service with transactions
class TaskService
{
    public function __construct(
        private readonly TaskRepositoryInterface $taskRepository
    ) {}

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
}
```

**Rules**

- Business rules, validation, orchestration  
- Transaction boundaries  
- **No** HTTP concerns  
- **No** raw Eloquent queries  

### Repository — data access

```php
// ✅ Repository with pagination
class EloquentTaskRepository implements TaskRepositoryInterface
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
}
```

**Rules**

- Eloquent queries only  
- **No** business logic  
- **No** transaction management  

---

## 4. Dependency injection

### Constructor injection (required)

```php
// ✅ Constructor injection
class TaskController extends Controller
{
    public function __construct(
        private readonly TaskService $taskService
    ) {}
}
```

### Interface binding

```php
// RepositoryServiceProvider.php
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
```

**Rules**

- Declare dependencies as `private readonly`  
- Bind interfaces in the Service Provider  
- **Never** `new Service()` in another class  

---

## 5. Form requests & validation

### Naming: `{Action}{Resource}Request`

```php
// StoreTaskRequest.php
class StoreTaskRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', Task::class);
    }

    public function rules(): array
    {
        return [
            'title'        => ['required', 'string', 'max:255'],
            'description'  => ['nullable', 'string'],
            'status'       => ['required', Rule::in(['todo', 'in_progress', 'done'])],
            'assigned_to'  => ['required', 'exists:users,id'],
            'due_date'     => ['nullable', 'date', 'after_or_equal:today'],
        ];
    }
}
```

**Rules**

- One FormRequest per operation  
- `authorize()` for policy checks  
- `rules()` with explicit validation  
- Use `Rule::in()` for enums  
- Use `exists:table,column` for foreign keys  

---

## 6. API resources

### Resource & collection

```php
// TaskResource.php
class TaskResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                => $this->id,
            'title'             => $this->title,
            'description'       => $this->description,
            'status'            => $this->status,
            'assigned_to'       => $this->assigned_to,
            'due_date'          => $this->due_date?->toIso8601String(),
            'created_at'        => $this->created_at?->toIso8601String(),
            'updated_at'        => $this->updated_at?->toIso8601String(),
            'assignee'          => UserResource::make($this->whenLoaded('assignee')),
        ];
    }
}

// TaskCollection.php
class TaskCollection extends ResourceCollection
{
    public function toArray(Request $request): array
    {
        return [
            'data' => $this->collection,
            'meta' => [
                'page' => $this->currentPage(),
                'per_page' => $this->perPage(),
                'total' => $this->total(),
                'total_pages' => $this->lastPage(),
            ],
            'links' => [
                'first' => $this->url(1),
                'last' => $this->url($this->lastPage()),
                'prev' => $this->previousPageUrl(),
                'next' => $this->nextPageUrl(),
            ],
        ];
    }
}
```

**Rules**

- Never return Eloquent models directly  
- Use `whenLoaded()` for relationships  
- Collection includes pagination meta/links  

---

## 7. Policies & authorization

### Policy class

```php
// TaskPolicy.php
class TaskPolicy
{
    public function viewAny(User $user): bool
    {
        return true; // authenticated users may list
    }

    public function view(User $user, Task $task): bool
    {
        return $user->id === $task->assigned_to || $user->isAdmin();
    }

    public function create(User $user): bool
    {
        return true; // authenticated users may create
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

**In controller**

```php
public function show(Task $task): JsonResponse
{
    $this->authorize('view', $task); // throws 403 if denied
    return TaskResource::make($task);
}
```

**Rules**

- Policy per model  
- Register in `AuthServiceProvider`: `protected $policies = [Task::class => TaskPolicy::class];`  
- Use `$this->authorize()` in controllers  
- Gates for non‑model actions  

---

## 8. Exception handling

### Custom exceptions

```php
// InvalidStatusTransitionException.php
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

### Global handler (`bootstrap/app.php`)

```php
->withExceptions(function (Exceptions $exceptions): void {
    $exceptions->render(function (InvalidStatusTransitionException $e) {
        return response()->json([
            'status_code' => 422,
            'code' => 'INVALID_TRANSITION',
            'message' => $e->getMessage(),
            'details' => [
                'from' => $e->fromStatus,
                'to' => $e->toStatus,
            ],
        ], 422);
    });
});
```

**Rules**

- Custom exceptions produce the JSON error envelope defined in `bootstrap/app.php`  
- The envelope always includes `status_code`, `code`, `message`, `errors`, `details`, `path`, `timestamp`  

---

## 9. Database & Eloquent

### Model conventions

```php
// Task.php
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

**Rules**

- `$fillable` for mass assignment  
- `$casts` for type conversion  
- Relationship methods  
- Query scopes for reusable filters  

### Migrations

```php
Schema::create('tasks', function (Blueprint $table) {
    $table->id();
    $table->string('title');
    $table->text('description')->nullable();
    $table->enum('status', ['todo', 'in_progress', 'done'])->default('todo');
    $table->foreignId('assigned_to')->constrained('users')->onDelete('cascade');
    $table->date('due_date')->nullable();
    $table->timestamps();

    $table->index(['status', 'assigned_to']);
    $table->index('created_at');
});
```

**Rules**

- `id()` primary key  
- `string('title')` limited to 255 characters (backend contract)  
- `text('description')` nullable, max 5000 characters (backend contract)  
- `enum('status', [...])` with the four statuses  
- `foreignId('assigned_to')` → `users` table, `onDelete('cascade')`  
- `date('due_date')` nullable  

---

## 10. Testing

### Test structure

```
tests/
├── Unit/
│   ├── Services/TaskServiceTest.php
│   ├── Repositories/TaskRepositoryTest.php
│   └── Policies/TaskPolicyTest.php
├── Feature/
│   ├── Auth/LoginTest.php
│   ├── Auth/RegisterTest.php
│   ├── Tasks/ListTasksTest.php
│   ├── Tasks/CreateTaskTest.php
│   ├── Tasks/UpdateTaskTest.php
│   └── Tasks/DeleteTaskTest.php
└── CreatesApplication.php
```

### Service test example

```php
class TaskServiceTest extends TestCase
{
    private TaskService $service;
    private TaskRepositoryInterface $repo;

    protected function setUp(): void
    {
        parent::setUp();
        $this->repo = Mockery::mock(TaskRepositoryInterface::class);
        $this->service = new TaskService($this->repo);
    }

    public function test_create_task(): void
    {
        $data = ['title' => 'Test', 'status' => 'todo', 'assigned_to' => 1];
        $task = Task::factory()->make($data + ['id' => 1]);

        $this->repo->shouldReceive('create')
            ->once()
            ->with($data)
            ->andReturn($task);

        $result = $this->service->createTask($data);
        $this->assertEquals('Test', $result->title);
    }
}
```

### Feature test example

```php
class CreateTaskTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_create_task(): void
    {
        $user = User::factory()->create();
        $assignee = User::factory()->create();

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/tasks', [
                'title' => 'New Task',
                'status' => 'todo',
                'assigned_to' => $assignee->id,
            ])
            ->assertStatus(201)
            ->assertJsonStructure(['data' => ['id', 'title', 'status']]);
    }
}
```

**Important**: Tests must be run inside the Docker container with SQLite overrides:

```bash
docker exec -e DB_CONNECTION=sqlite -e DB_DATABASE=:memory: taskflow-backend php artisan test
```

Baseline: **30** PHPUnit tests, **152** assertions.

---

## 11. Code style

### Laravel Pint

```bash
# Check
./vendor/bin/pint --test

# Fix
./vendor/bin/pint
```

### PHPStan

> **Note (2026‑10‑23):** PHPStan is **not installed** in the CI image; the CI step that references `phpcs` is allowed to fail. Only Pint is enforced.

### phpunit.xml (excerpt)

```xml
<phpunit bootstrap="vendor/autoload.php">
    <testsuites>
        <testsuite name="Unit">
            <directory>tests/Unit</directory>
        </testsuite>
        <testsuite name="Feature">
            <directory>tests/Feature</directory>
        </testsuite>
    </testsuites>
    <php>
        <env name="APP_ENV" value="testing"/>
        <env name="DB_CONNECTION" value="sqlite"/>
        <env name="DB_DATABASE" value=":memory:"/>
    </php>
</phpunit>
```

---

## 12. Naming conventions

| Type                     | Convention                         | Example                |
|--------------------------|------------------------------------|------------------------|
| Controllers              | PascalCase + `Controller`          | `TaskController`       |
| Form requests            | PascalCase + `Request`             | `StoreTaskRequest`     |
| Resources                | PascalCase + `Resource`            | `TaskResource`         |
| Services                 | PascalCase + `Service`             | `TaskService`          |
| Interfaces               | PascalCase + `Interface`           | `TaskRepositoryInterface` |
| Implementations          | PascalCase                         | `EloquentTaskRepository` |
| Models                   | PascalCase                         | `Task`                 |
| Policies                 | PascalCase + `Policy`              | `TaskPolicy`           |
| Migrations               | `YYYY_MM_DD_HHMMSS_create_xtable`  | `2024_01_15_000000_create_tasks_table` |
| Factories                | PascalCase + `Factory`             | `TaskFactory`          |
| Seeders                  | PascalCase + `Seeder`              | `TaskSeeder`           |
| Test classes             | PascalCase + `Test`                | `TaskServiceTest`      |
| Database tables          | snake_case, plural                 | `tasks`                |
| Columns                  | snake_case                         | `assigned_to`          |
| Foreign keys             | `{singular}_id`                    | `assigned_to`          |

---

## 13. Role‑based authorisation (simple role column)

### User model

```php
// app/Models/User.php
class User extends Authenticatable
{
    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function isUser(): bool
    {
        return $this->role === 'user';
    }
}
```

### Migration: add role to users

```php
Schema::table('users', function (Blueprint $table) {
    $table->enum('role', ['admin', 'user'])->default('user')->after('email');
});
```

### Authorization checks

```php
// In policy / controller
$user->isAdmin();
$user->isUser();

// In Blade
@if ($user->isAdmin())
    <button>Admin action</button>
@endif
```

### Custom role middleware

```php
// app/Http/Middleware/RoleMiddleware.php
class RoleMiddleware
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        if (! $request->user()) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        if (! in_array($request->user()->role, $roles)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        return $next($request);
    }
}
```

### Register middleware (`bootstrap/app.php`)

```php
->withMiddleware(function (Middleware $middleware) {
    $middleware->alias([
        'role' => \App\Http\Middleware\RoleMiddleware::class,
    ]);
});
```

### Routes with role middleware

```php
Route::middleware(['auth:sanctum', 'role:admin'])->group(function () {
    Route::apiResource('users', UserController::class)->only(['index', 'show']);
});

Route::middleware(['auth:sanctum', 'role:admin,user'])->group(function () {
    Route::apiResource('tasks', TaskController::class);
});
```

### Policy integration

```php
// TaskPolicy.php
public function update(User $user, Task $task): bool
{
    return $user->id === $task->assigned_to || $user->isAdmin();
}
```

---

*These conventions reflect the current codebase. If a practice is not present in the code, it is aspirational and should be discussed in a pull request rather than assumed to be enforced.*