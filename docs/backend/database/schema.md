# Database Schema — TaskFlow Backend

This document summarises the Eloquent models, fillable / casts, and relationships for the TaskFlow Laravel 11 backend. The **migrations** and **model code** are the source of truth; this page exists to help developers and consumers understand the data shape.

## Eloquent models

### `app/Models/Task.php`

```php
class Task extends Model
{
    protected $fillable = [
        'title',
        'description',
        'status',
        'assigned_to',
        'due_date',
    ];

    protected $casts = [
        'due_date'   => 'date',
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

**`$fillable`** – mass‑assignment whitelist. The API Form Requests (`StoreTaskRequest`, `UpdateTaskRequest`) validate against these fields before calling the Service layer.

**`$casts`** – automatic type conversion:

- `due_date` → `date` (Laravel casts to `Carbon` instance; `toIso8601String()` in Resources).
- `created_at` / `updated_at` → `datetime`.

**Relationship** – `assignee` is a `belongsTo` to the `users` table via the `assigned_to` foreign key.

### `app/Models/User.php`

```php
class User extends Authenticatable
{
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
    ];

    protected $casts = [
        'role' => UserRole::class,        // backed enum
        'email_verified_at' => 'datetime',
    ];

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function isUser(): bool
    {
        return $this->role === 'user';
    }
```

**`$fillable`** – fields that may be mass‑assigned (e.g. during `User::create()` or `User::update()`).

**`$casts`** –

- `role` → `UserRole` (a PHP 8.1+ backed enum).
- `email_verified_at` → `datetime`.

**Helpers** – `isAdmin()` / `isUser()` are used by Policies and middleware.

---

## Enums (backed)

### `TaskStatus` (used by the `status` column on `tasks`)

```php
enum TaskStatus: string
{
    case Todo = 'todo';
    case InProgress = 'in_progress';
    case Done = 'done';
    case Cancelled = 'cancelled';
}
```

### `UserRole` (used by the `role` column on `users`)

```php
enum UserRole: string
{
    case Admin = 'admin';
    case User = 'user';
}
```

Both enums are stored as `varchar` in the database (`enum` column type) and are hydrated to the PHP backed enum by Laravel casts.

---

## Migrations (excerpt)

### `database/migrations/2024_01_15_000000_create_tasks_table.php`

```php
Schema::create('tasks', function (Blueprint $table) {
    $table->id();
    $table->string('title');                         // max 255 chars (backend contract)
    $table->text('description')->nullable();        // max 5000 chars (backend contract)
    $table->enum('status', ['todo', 'in_progress', 'done'])->default('todo');
    $table->foreignId('assigned_to')->constrained('users')->onDelete('cascade');
    $table->date('due_date')->nullable();
    $table->timestamps();

    $table->index(['status', 'assigned_to']);
    $table->index('created_at');
});
```

### `database/migrations/2024_01_15_000001_add_role_to_users_table.php`

```php
Schema::table('users', function (Blueprint $table) {
    $table->enum('role', ['admin', 'user'])->default('user')->after('email');
});
```

**Key points**

- `title` is `string` (not `text`) – the backend contract caps it at 255 characters; the UI limits it to 120.
- `description` is `text` – backend contract allows up to 5000 characters; UI limits to 2000.
- `status` is an `enum` with the three original values (`todo`, `in_progress`, `done`); the application also recognises `cancelled` as a valid operational status (handled via the `TaskStatus` PHP enum and business logic).
- `assigned_to` is a `foreignId` referencing `users.id` with `onDelete('cascade')`.
- `due_date` is a nullable `date`.
- `users.role` is an `enum` (`admin`, `user`) with default `user`.

---

## Relationships (ER summary)

```
users (1)──────(many) tasks
   │
   └─ assigned_to (FK → users.id, onDelete cascade)
```

- A **user** may own many tasks (as assignee).
- A **task** is always assigned to exactly one user (the `assignee`).
- Admins can re‑assign tasks; non‑admin users can only view/update their own tasks.

---

## Common queries (frequently used)

| Goal | Eloquent snippet |
|------|-----------------|
| List tasks for a user | `Task::where('assigned_to', $userId)->latest('created_at')->paginate(20);` |
| Active tasks (todo / in_progress) | `Task::active()->paginate(20);` |
| Tasks due after a date | `Task::whereNotNull('due_date')->where('due_date', '>', $date)->paginate(20);` |
| Count overdue tasks | `Task::whereNotNull('due_date')->where('due_date', '<', now())->count();` |

---

*If the schema evolves (new columns, renamed fields, changed enums) the code‑first migration and model should be updated first; this document will be refreshed in the same pull request.*