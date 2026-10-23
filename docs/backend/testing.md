# Testing — Laravel 11

## Tools

| Tool | Purpose |
|------|---------|
| **PHPUnit** | Unit/Feature test runner |
| **Pest** | Alternative (if preferred) |
| **Mockery** | Mocking dependencies |
| **SQLite** | In-memory DB for tests |

## Structure

```
tests/
├── Unit/
│   ├── Services/TaskServiceTest.php
│   ├── Repositories/TaskRepositoryTest.php
│   └── Policies/TaskPolicyTest.php
├── Feature/
│   ├── Auth/LoginTest.php
│   ├── Auth/RegisterTest.php
│   └── Tasks/
│       ├── ListTasksTest.php
│       ├── CreateTaskTest.php
│       ├── UpdateTaskTest.php
│       └── DeleteTaskTest.php
├── TestCase.php
└── CreatesApplication.php
```

---

## Configuration

### `phpunit.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<phpunit xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:noNamespaceSchemaLocation="./vendor/phpunit/phpunit/phpunit.xsd"
         bootstrap="vendor/autoload.php"
         colors="true"
         executionOrder="depends,defects"
         failOnWarning="true"
         beStrictAboutTestsThatDoNotTestAnything="true"
         beStrictAboutOutputDuringTests="true"
         beStrictAboutChangesToGlobalState="true">
    <testsuites>
        <testsuite name="Unit">
            <directory suffix="Test.php">./tests/Unit</directory>
        </testsuite>
        <testsuite name="Feature">
            <directory suffix="Test.php">./tests/Feature</directory>
        </testsuite>
    </testsuites>
    <source>
        <include>
            <directory>./app</directory>
        </include>
    </source>
    <php>
        <env name="APP_ENV" value="testing"/>
        <env name="DB_CONNECTION" value="sqlite"/>
        <env name="DB_DATABASE" value=":memory:"/>
        <env name="CACHE_DRIVER" value="array"/>
        <env name="QUEUE_CONNECTION" value="sync"/>
        <env name="MAIL_MAILER" value="array"/>
    </php>
</phpunit>
```

---

## Test Types

### Unit Tests (Services, Repositories, Policies)

```php
// tests/Unit/Services/TaskServiceTest.php
<?php

namespace Tests\Unit\Services;

use App\Services\TaskService;
use App\Repositories\Contracts\TaskRepositoryInterface;
use App\Models\Task;
use Tests\TestCase;
use Mockery;

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

    public function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    /** @test */
    public function it_creates_a_task(): void
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

    /** @test */
    public function it_validates_status_transition(): void
    {
        $task = Task::factory()->make(['status' => 'todo']);
        
        $this->expectException(InvalidStatusTransitionException::class);
        $this->service->updateTask($task, ['status' => 'done']);
    }
}
```

### Repository Test (Integration)

```php
// tests/Unit/Repositories/TaskRepositoryTest.php
<?php

namespace Tests\Unit\Repositories;

use App\Repositories\Eloquent\EloquentTaskRepository;
use App\Models\Task;
use Tests\TestCase;

class TaskRepositoryTest extends TestCase
{
    use RefreshDatabase;

    private EloquentTaskRepository $repo;

    protected function setUp(): void
    {
        parent::setUp();
        $this->repo = new EloquentTaskRepository();
    }

    /** @test */
    public function it_paginates_tasks_with_filters(): void
    {
        Task::factory()->count(5)->create(['status' => 'todo']);
        Task::factory()->count(3)->create(['status' => 'done']);

        $result = $this->repo->paginate(['status' => 'todo', 'per_page' => 2]);

        $this->assertCount(2, $result['tasks']);
        $this->assertEquals(5, $result['meta']['total']);
    }
}
```

### Policy Test

```php
// tests/Unit/Policies/TaskPolicyTest.php
<?php

namespace Tests\Unit\Policies;

use App\Models\{User, Task};
use Tests\TestCase;

class TaskPolicyTest extends TestCase
{
    /** @test */
    public function user_can_view_own_task(): void
    {
        $user = User::factory()->create();
        $task = Task::factory()->create(['assigned_to' => $user->id]);

        $this->assertTrue($user->can('view', $task));
    }

    /** @test */
    public function user_cannot_view_other_task(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $task = Task::factory()->create(['assigned_to' => $other->id]);

        $this->assertFalse($user->can('view', $task));
    }

    /** @test */
    public function admin_can_delete_any_task(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $task = Task::factory()->create();

        $this->assertTrue($admin->can('delete', $task));
    }
}
```

---

### Feature Tests (Controllers)

```php
// tests/Feature/Tasks/CreateTaskTest.php
<?php

namespace Tests\Feature\Tasks;

use App\Models\User;
use Tests\TestCase;

class CreateTaskTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function authenticated_user_can_create_task(): void
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

    /** @test */
    public function unauthenticated_user_cannot_create_task(): void
    {
        $this->postJson('/api/tasks', ['title' => 'Test'])
            ->assertStatus(401);
    }

    /** @test */
    public function validation_fails_for_missing_title(): void
    {
        $user = User::factory()->create();
        $assignee = User::factory()->create();

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/tasks', [
                'status' => 'todo',
                'assigned_to' => $assignee->id,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['title']);
    }
}
```

---

## Factories

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
    public function overdue(): static { return $this->state(['due_date' => $this->faker->dateTimeBetween('-30 days', '-1 day')]); }
}
```

---

## Running Tests

```bash
# All tests
php artisan test

# Parallel execution
php artisan test --parallel

# Specific test
php artisan test --filter=TaskServiceTest

# With coverage
php artisan test --coverage

# Parallel with coverage
php artisan test --parallel --coverage
```

---

## Coverage Targets

| Metric | Target |
|--------|--------|
| Statements | 70% → 80% |
| Branches | 60% → 70% |
| Functions | 70% → 80% |
| Lines | 70% → 80% |

---

## CI Integration

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-php@v4
        with:
          php-version: '8.3'
          extensions: mbstring, xml, ctype, iconv, intl, pdo_sqlite, redis
          tools: composer:v2
      - run: composer install --prefer-dist --no-progress
      - run: composer test
```