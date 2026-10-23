# Backend Folder Structure

This document describes the **current** directory layout of the TaskFlow Laravel 11 backend. The code base is the source of truth; the layout below reflects what exists in the repository at the time of this rewrite.

## Root structure

```
backend/
├── app/
│   ├── Http/
│   │   ├── Controllers/
│   │   │   └── Api/
│   │   ├── Requests/
│   │   │   └── Task/
│   │   └── Resources/
│   ├── Services/
│   ├── Repositories/
│   │   ├── Contracts/
│   │   └── Eloquent/
│   ├── Models/
│   ├── Policies/
│   └── Providers/
├── routes/
│   └── api.php
├── database/
│   ├── migrations/
│   ├── factories/
│   └── seeders/
├── tests/
│   ├── Feature/
│   └── Unit/
├── .env.example
├── .env
├── composer.json
├── phpunit.xml
└── README.md
```

(Generated from the actual repository; no aspirational “to‑be‑created” markers are kept.)

## `app/Http/Controllers/Api/` — API controllers

- **Owner:** backend team  
- **Status:** present (see `routes/api.php`)  
- **Mandatory:** yes  

**Files present**

| File | Purpose |
|------|---------|
| `AuthController.php` | login, register, logout, me |
| `TaskController.php` | index, store, show, update, destroy |
| `UserController.php` | index, show (admin only) |

**Responsibilities**

- HTTP request handling  
- Form Request validation  
- Policy authorisation  
- Service delegation  
- API Resource responses  

**Must NOT contain**

- Business logic  
- Direct database queries  
- Transaction management  

---

## `app/Http/Requests/` — Form requests

- **Owner:** backend team  
- **Status:** present  

**Structure**

```
app/Http/Requests/
├── Auth/
│   ├── LoginRequest.php
│   └── RegisterRequest.php
└── Task/
    ├── StoreTaskRequest.php
    ├── UpdateTaskRequest.php
    └── FindTasksQueryRequest.php
```

**Naming convention:** `{Action}{Resource}Request`

| Request | Purpose |
|---------|---------|
| `StoreTaskRequest` | Validate task creation |
| `UpdateTaskRequest` | Validate partial task updates |
| `FindTasksQueryRequest` | Validate list filters/pagination |

**Example** (`StoreTaskRequest.php`):

```php
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

---

## `app/Http/Resources/` — API resources

- **Owner:** backend team  
- **Status:** present  

**Files present**

| File | Purpose |
|------|---------|
| `TaskResource.php` | shape a single task JSON response |
| `TaskCollection.php` | shape a paginated task list |
| `UserResource.php` | shape a single user JSON response |
| `UserCollection.php` | shape a paginated user list |

**Example** (`TaskResource.php`):

```php
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
```

**Example** (`TaskCollection.php`):

```php
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

## `app/Services/` — Business logic

- **Owner:** backend team  
- **Status:** present  

**Files present**

```
app/Services/
├── AuthService.php
├── TaskService.php
└── UserService.php
```

**Example** (`TaskService.php`):

```php
class TaskService
{
    public function __construct(
        private readonly TaskRepositoryInterface $taskRepository,
        private readonly UserRepositoryInterface $userRepository
    ) {}

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
}
```

**Rules**

- Business rules, validation, orchestration  
- Transaction boundaries (`DB::transaction`)  
- **No** HTTP concerns  
- **No** raw Eloquent queries  

---

## `app/Repositories/Contracts/` — Repository interfaces

- **Owner:** backend team  
- **Status:** present  

**Files present**

```
app/Repositories/Contracts/
├── TaskRepositoryInterface.php
└── UserRepositoryInterface.php
```

**Example** (`TaskRepositoryInterface.php`):

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

---

## `app/Repositories/Eloquent/` — Repository implementations

- **Owner:** backend team  
- **Status:** present  

**Files present**

```
app/Repositories/Eloquent/
├── TaskRepository.php
└── UserRepository.php
```

**Example** (`TaskRepository.php`):

```php
class TaskRepository implements TaskRepositoryInterface
{
    public function create(array $data): Task
    {
        return Task::create($data);
    }

    public function find(int|string $id): ?Task
    {
        return Task::with('assignee')->find($id);
    }

    public function update(Task $task, array $data): Task
    {
        $task->update($data);
        return $task->fresh();
    }

    public function delete(Task $task): void
    {
        $task->delete();
    }

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

---

## `app/Models/` — Eloquent models

- **Owner:** backend team  
- **Status:** present (Task and User models exist)  

**Files present**

```
app/Models/
├── Task.php
└── User.php
```

**Example** (`Task.php`):

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

---

## `app/Policies/` — Authorization policies

- **Owner:** backend team  
- **Status:** present  

**Files present**

```
app/Policies/
└── TaskPolicy.php
```

**Example** (`TaskPolicy.php`):

```php
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
```

**Registration** (`AuthServiceProvider`):

```php
protected $policies = [
    Task::class => TaskPolicy::class,
];
```

---

## `app/Providers/` — Service providers

- **Owner:** backend team  
- **Status:** present  

**Files present**

```
app/Providers/
├── AppServiceProvider.php
├── AuthServiceProvider.php
├── RepositoryServiceProvider.php
└── RouteServiceProvider.php
```

**`RepositoryServiceProvider.php`** (excerpt):

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

---

## `database/` — Database structure

- **Owner:** backend team  
- **Status:** present  

**Files present**

```
database/
├── migrations/
│   ├── 0001_01_01_000000_create_users_table.php
│   ├── 0001_01_01_000001_create_cache_table.php
│   ├── 0001_01_01_000002_create_jobs_table.php
│   ├── 2024_01_15_000000_create_tasks_table.php
│   └── 2024_01_15_000001_add_role_to_users_table.php
├── factories/
│   ├── TaskFactory.php
│   └── UserFactory.php
└── seeders/
    ├── DatabaseSeeder.php
    └── TaskSeeder.php
```

**Migration: tasks table** (excerpt):

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

**Migration: add role to users** (excerpt):

```php
Schema::table('users', function (Blueprint $table) {
    $table->enum('role', ['admin', 'user'])->default('user')->after('email');
});
```

---

## `routes/api.php` — API routes

- **Owner:** backend team  
- **Status:** present  

**Content** (excerpt):

```php
use Illuminate\Support\Facades\Route;

// Public routes
Route::post('/login', [AuthController::class, 'login']);
Route::post('/register', [AuthController::class, 'register']);

// Protected routes
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'me']);

    Route::apiResource('tasks', TaskController::class);

    // Admin only
    Route::middleware('role:admin')->group(function () {
        Route::apiResource('users', UserController::class)->only(['index', 'show']);
    });
});
```

**Throttling**

- `POST /api/login` and `POST /api/register` are limited to **5 requests per minute** (`throttle:5,1`).
- Authenticated routes use `throttle:60,1` by default.

---

## `tests/` — Test structure

- **Owner:** backend team  
- **Status:** present  

**Files present**

```
tests/
├── Unit/
│   ├── Services/
│   │   ├── TaskServiceTest.php
│   │   └── AuthServiceTest.php
│   ├── Repositories/
│   │   ├── TaskRepositoryTest.php
│   │   └── UserRepositoryTest.php
│   └── Policies/
│       └── TaskPolicyTest.php
├── Feature/
│   ├── Auth/
│   │   ├── LoginTest.php
│   │   └── RegisterTest.php
│   └── Tasks/
│       ├── ListTasksTest.php
│       ├── CreateTaskTest.php
│       ├── UpdateTaskTest.php
│       └── DeleteTaskTest.php
├── TestCase.php
└── CreatesApplication.php
```

**Important**: Tests must run inside the Docker container with SQLite overrides:

```bash
docker exec -e DB_CONNECTION=sqlite -e DB_DATABASE=:memory: taskflow-backend php artisan test
```

Baseline: **30** tests, **152** assertions.

---

## File / folder status summary

| Path                              | Status   | Action |
|-----------------------------------|----------|--------|
| `app/Http/Controllers/Api/`       | present  | – |
| `app/Http/Requests/`              | present  | – |
| `app/Http/Resources/`             | present  | – |
| `app/Services/`                   | present  | – |
| `app/Repositories/Contracts/`     | present  | – |
| `app/Repositories/Eloquent/`      | present  | – |
| `app/Models/Task.php`             | present  | – |
| `app/Policies/TaskPolicy.php`     | present  | – |
| `app/Providers/RepositoryServiceProvider.php` | present | – |
| `database/migrations/tasks`       | present  | – |
| `database/factories/TaskFactory.php` | present | – |
| `routes/api.php`                  | present  | – |
| `tests/Feature/Tasks/`            | present  | – |
| `tests/Unit/Services/`            | present  | – |

All paths listed are **present** in the current repository; no “missing” or “to‑be‑created” markers are retained.

---

## Naming conventions

| Type                 | Convention                | Example                |
|----------------------|--------------------------|------------------------|
| Controllers          | PascalCase + `Controller`| `TaskController`       |
| Form requests        | PascalCase + `Request`   | `StoreTaskRequest`     |
| Resources            | PascalCase + `Resource`  | `TaskResource`         |
| Services             | PascalCase + `Service`   | `TaskService`          |
| Interfaces           | PascalCase + `Interface` | `TaskRepositoryInterface` |
| Implementations      | PascalCase               | `EloquentTaskRepository` |
| Models               | PascalCase               | `Task`                 |
| Policies             | PascalCase + `Policy`    | `TaskPolicy`           |
| Migrations           | `YYYY_MM_DD_HHMMSS_…`    | `2024_01_15_000000_…`  |
| Factories            | PascalCase + `Factory`   | `TaskFactory`          |
| Seeders              | PascalCase + `Seeder`    | `TaskSeeder`           |
| Test classes         | PascalCase + `Test`      | `TaskServiceTest`      |
| Database tables      | snake_case, plural       | `tasks`                |
| Columns              | snake_case               | `assigned_to`          |
| Foreign keys         | `{singular}_id`          | `assigned_to`          |