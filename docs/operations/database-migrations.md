# Database Migrations

## Migration Commands

```bash
# Create migration
php artisan make:migration create_tasks_table --create=tasks

# Create migration with model
php artisan make:model Task -m

# Run pending migrations
php artisan migrate

# Rollback last batch
php artisan migrate:rollback

# Rollback specific steps
php artisan migrate:rollback --step=2

# Fresh migrate (drop all + migrate)
php artisan migrate:fresh

# Fresh + seed
php artisan migrate:fresh --seed

# Specific path
php artisan migrate --path=/database/migrations/custom

# Pretend (dry run)
php artisan migrate --pretend

# Status
php artisan migrate:status
```

---

## Migration Structure

```php
// database/migrations/2024_01_15_000000_create_tasks_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('tasks', function (Blueprint $table) {
            $table->id();                    // BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
            $table->string('title');         // VARCHAR(255)
            $table->text('description')->nullable();
            $table->enum('status', ['todo', 'in_progress', 'done'])->default('todo');
            $table->foreignId('assigned_to')->constrained('users')->onDelete('cascade');
            $table->date('due_date')->nullable();
            $table->timestamps();            // created_at, updated_at

            // Indexes
            $table->index(['status', 'assigned_to']);
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tasks');
    }
};
```

---

## Column Types Reference

| Method | SQL | Use For |
| --- | --- | --- |
| `$table->id()` | `BIGINT UNSIGNED AUTO_INCREMENT PK` | Primary key |
| `$table->uuid('id')->primary()` | `CHAR(36) PK` | UUID PK |
| `$table->string('title')` | `VARCHAR(255)` | Short text |
| `$table->string('title', 100)` | `VARCHAR(100)` | Limited length |
| `$table->text('description')` | `TEXT` | Long text |
| `$table->enum('status', ['a','b'])` | `ENUM('a','b')` | Fixed values |
| `$table->foreignId('user_id')` | `BIGINT UNSIGNED FK` | Foreign key |
| `$table->date('due_date')` | `DATE` | Date only |
| `$table->dateTime('started_at')` | `DATETIME` | Date + time |
| `$table->timestamp('verified_at')` | `TIMESTAMP` | With timezone |
| `$table->decimal('amount', 10, 2)` | `DECIMAL(10,2)` | Currency/precision |
| `$table->boolean('is_active')` | `TINYINT(1)` | True/false |
| `$table->json('meta')` | `JSON` | Structured data |
| `$table->timestamps()` | `created_at`, `updated_at` | Auto timestamps |
| `$table->softDeletes()` | `deleted_at` | Soft deletes |

---

## Indexes

```php
$table->index('email');                    // Single column
$table->index(['status', 'assigned_to']);  // Composite
$table->unique('email');                   // Unique constraint
$table->unique(['user_id', 'post_id']);    // Composite unique
$table->primary('id');                     // Primary key (auto)
$table->primary(['user_id', 'role_id']);   // Composite PK
$table->fullText('title');                 // Full text (MySQL)
$table->spatialIndex('location');          // Spatial (PostGIS)
```

---

## Foreign Keys

```php
// Inline (recommended)
$table->foreignId('assigned_to')->constrained('users')->onDelete('cascade');

// Explicit
$table->unsignedBigInteger('assigned_to');
$table->foreign('assigned_to')->references('id')->on('users')->onDelete('cascade');

// Disable FK checks (bulk import)
Schema::disableForeignKeyConstraints();
// ... operations ...
Schema::enableForeignKeyConstraints();
```

---

## Naming Conventions

| Object | Convention | Example |
| --- | --- | --- |
| Table | `snake_case`, plural | `tasks`, `user_profiles` |
| Column | `snake_case` | `assigned_to`, `due_date` |
| Index | `idx_{table}_{column(s)}` | `idx_tasks_status_assigned` |
| Unique | `uniq_{table}_{column(s)}` | `uniq_users_email` |
| Foreign Key | `fk_{table}_{column}` | `fk_tasks_assigned_to` |
| Migration | `YYYY_MM_DD_HHMMSS_action_table` | `2024_01_15_000000_create_tasks_table` |

---

## Best Practices

### 1. Always use foreignId + constrained
```php
// ✅ Good
$table->foreignId('assigned_to')->constrained('users')->onDelete('cascade');

// ❌ Avoid
$table->unsignedBigInteger('assigned_to');
```

### 2. Add indexes for query patterns
```php
// If you query: WHERE status = ? AND assigned_to = ?
$table->index(['status', 'assigned_to']);

// If you query: ORDER BY created_at DESC
$table->index('created_at');
```

### 3. Use enums for fixed values
```php
// Migration
$table->enum('status', ['todo', 'in_progress', 'done'])->default('todo');

// Model cast
protected $casts = ['status' => TaskStatus::class];

// Enum
enum TaskStatus: string { case Todo = 'todo'; case InProgress = 'in_progress'; case Done = 'done'; }
```

### 4. Use unsignedBigInteger for FK
```php
// ✅ Good
$table->foreignId('user_id')->constrained();

// ❌ Avoid
$table->integer('user_id')->unsigned();
```

### 5. Use timestamps + softDeletes when needed
```php
$table->timestamps();           // created_at, updated_at
$table->softDeletes();          // deleted_at (requires trait)
```

---

## Seeding

```bash
# Create seeder
php artisan make:seeder TaskSeeder

# Run specific seeder
php artisan db:seed --class=TaskSeeder

# All seeders
php artisan db:seed
```

```php
// database/seeders/TaskSeeder.php
class TaskSeeder extends Seeder
{
    public function run(): void
    {
        Task::factory()->count(20)->create([
            'assigned_to' => User::inRandomOrder()->first()?->id,
        ]);
    }
}
```

---

## Factory with States

```php
// database/factories/TaskFactory.php
class TaskFactory extends Factory
{
    protected $model = Task::class;

    public function definition(): array
    {
        return [
            'title' => $this->faker->sentence(3),
            'description' => $this->faker->optional()->paragraph(),
            'status' => $this->faker->randomElement(['todo', 'in_progress', 'done']),
            'assigned_to' => User::inRandomOrder()->first()?->id ?? User::factory(),
            'due_date' => $this->faker->optional()->dateTimeBetween('now', '+30 days'),
        ];
    }

    public function todo(): static { return $this->state(['status' => 'todo']); }
    public function inProgress(): static { return $this->state(['status' => 'in_progress']); }
    public function done(): static { return $this->state(['status' => 'done']); }
    public function overdue(): static { return $this->state(['due_date' => now()->subDays(5)]); }
}
```

Usage:
```php
Task::factory()->todo()->create();
Task::factory()->inProgress()->forUser($user)->count(5)->create();
```

---

## Migration Testing

```bash
# Test migration up/down
php artisan migrate:fresh --seed

# Test specific migration
php artisan migrate --path=/database/migrations/2024_01_15_000000_create_tasks_table.php

# Verify schema
php artisan migrate:status

# Check SQL without running
php artisan migrate --pretend
```

---

## Production Deployment

```bash
# Deploy script
php artisan migrate --force --no-interaction

# With seeder (staging only)
php artisan migrate --force --seed

# Rollback if needed
php artisan migrate:rollback --step=1
```

---

## Common Issues

| Issue | Solution |
| --- | --- |
| `Foreign key constraint fails` | Check referenced table exists, column types match |
| `Duplicate column name` | Check for duplicate `$table->id()` or column names |
| `Cannot drop table` | Disable FK checks: `Schema::disableForeignKeyConstraints()` |
| `Migration order wrong` | Check timestamp prefix, use `php artisan migrate:status` |
| `Cannot add foreign key` | Check column types match exactly (both BIGINT UNSIGNED) |