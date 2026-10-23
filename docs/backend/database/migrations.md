# Database Migrations — TaskFlow Backend

This document lists the migration files that exist in the repository, their purpose, and the exact SQL they execute. The migration files themselves are the source of truth; this page summarises them for developers and CI scripts.

## Migration list (by creation order)

| # | Migration filename | Purpose |
|---|-------------------|---------|
| 1 | `2024_01_15_000000_create_users_table.php` | Create the `users` table (auth columns, role enum). |
| 2 | `2024_01_15_000001_create_cache_table.php` | Laravel default cache table (usually not customised). |
| 3 | `2024_01_15_000002_create_jobs_table.php` | Laravel default jobs table. |
| 4 | `2024_01_15_000000_create_tasks_table.php` | Create the `tasks` table, foreign key to `users`, status enum. |
| 5 | `2024_01_15_000001_add_role_to_users_table.php` | Add `role` enum column to existing `users` table. |

(Only the migrations that are relevant to the task‑flow domain are shown; Laravel’s auto‑generated cache/jobs migrations are listed for completeness.)

---

### 1. `2024_01_15_000000_create_users_table.php`

**Up** (executed when `php artisan migrate` runs):

```php
Schema::create('users', function (Blueprint $table) {
    $table->id(); // bigint unsigned, primary key

    $table->string('name');                 // varchar(255), not null
    $table->string('email')->unique();       // varchar(255), unique, not null
    $table->timestamp('email_verified_at')->nullable();
    $table->string('password');             // varchar(255), hashed

    $table->enum('role', ['admin', 'user'])->default('user')->after('email');

    $table->rememberToken(); // varchar(100), used by Sanctum/Auth

    $table->timestamps(); // created_at, updated_at
});
```

**Down** ( `php artisan migrate:rollback` or `migrate:fresh` ):

```php
Schema::dropIfExists('users');
```

**Impact** – this is the foundation table for authentication (Sanctum) and for role‑based authorisation.

---

### 2. `2024_01_15_000001_create_cache_table.php`

Laravel default – creates the `cache` table used by the framework’s cache driver. Not customised for TaskFlow; contents are identical to a fresh Laravel install.

---

### 3. `2024_01_15_000002_create_jobs_table.php`

Laravel default – creates the `jobs` table for queue processing. Not customised.

---

### 4. `2024_01_15_000000_create_tasks_table.php`

**Up**:

```php
Schema::create('tasks', function (Blueprint $table) {
    $table->id(); // bigint unsigned PK

    $table->string('title');                 // max 255 chars (backend contract)
    $table->text('description')->nullable(); // max 5000 chars (backend contract)

    $table->enum('status', ['todo', 'in_progress', 'done'])->default('todo');

    $table->foreignId('assigned_to')
          ->constrained('users')
          ->onDelete('cascade');

    $table->date('due_date')->nullable();

    $table->timestamps(); // created_at, updated_at

    $table->index(['status', 'assigned_to']);
    $table->index('created_at');
});
```

**Down**:

```php
Schema::dropIfExists('tasks');
```

**Impact** – core task storage; every task ever created lives here. The `status` enum originally contained only `todo`, `in_progress`, `done`; the application code also treats `cancelled` as a valid status (handled in business logic, not in the DB schema originally, but the enum can be altered later if desired).

---

### 5. `2024_01_15_000001_add_role_to_users_table.php`

**Up**:

```php
Schema::table('users', function (Blueprint $table) {
    $table->enum('role', ['admin', 'user'])->default('user')->after('email');
});
```

**Down**:

```php
Schema::table('users', function (Blueprint $table) {
    $table->dropColumn('role');
});
```

**Impact** – adds the role column used by `TaskPolicy`, `UserPolicy`, and the `role:admin` middleware. The enum default is `user`; all newly created accounts are `user` unless an admin explicitly sets `admin`.

---

## Running migrations

```bash
# Fresh start (drops all tables and re‑runs)
docker exec taskflow-backend php artisan migrate:fresh --seed

# Incremental (add new migrations)
docker exec taskflow-backend php artisan migrate

# Reset to a specific point
docker exec taskflow-backend php artisan migrate:rollback --step=1
```

**Seed data** – `php artisan migrate --seed` runs the `DatabaseSeeder`, which creates the six demo accounts (all password `password123`) and a handful of sample tasks.

## Revision notes

- **2026‑10‑23** – The `status` enum in the `tasks` table currently contains `['todo', 'in_progress', 'done']`. The application code recognises `cancelled` as a valid operational status; if the database needs to store it, a new migration adding `'cancelled'` to the enum should be created and the enum definition in the model updated accordingly.
- The `role` enum on `users` has not changed since its introduction; no further migrations are pending.