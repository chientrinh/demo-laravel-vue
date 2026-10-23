# Testing Guidelines — TaskFlow

This document summarises the **current** testing guidelines for both the backend and the frontend of TaskFlow. The **source code**, **test files**, and **configuration** are the single source of truth; this page exists to help contributors write, run, and maintain tests that keep the project stable.

## 1. Backend testing (Laravel / PHPUnit)

### 1.1 Required test environment

- **PHPUnit** must be run **inside the Docker container** because the host PHP lacks `dom` and `xmlwriter` extensions required by some Laravel features.
- The essential command (defined in `CONTRIBUTING.md` and `docs/operations/environments.md`):

  ```bash
  docker exec -e DB_CONNECTION=sqlite -e DB_DATABASE=:memory: taskflow-backend php artisan test
  ```

- This runs all PHPUnit feature and unit tests with an **in‑memory SQLite** database, so no MySQL is needed.

### 1.2 Test baseline

- **30** PHPUnit tests, **152** assertions (as of the latest count).
- If you add new tests, re‑run the suite and verify the baseline has not dropped; if it has, adjust the new tests or update the baseline description in `CONTRIBUTING.md`.

### 1.3 Test organisation

```
tests/
├── Unit/
│   ├── Services/TaskServiceTest.php
│   ├── Repositories/TaskRepositoryTest.php
│   └── Policies/TaskPolicyTest.php
└── Feature/
    ├── Auth/
    │   ├── LoginTest.php
    │   └── RegisterTest.php
    └── Tasks/
        ├── ListTasksTest.php
        ├── CreateTaskTest.php
        ├── UpdateTaskTest.php
        └── DeleteTaskTest.php
```

- **Unit tests** mock the Repository interface (`Mockery`) and test Service methods in isolation.
- **Feature tests** use `RefreshDatabase` (or the SQLite override) and exercise the full request cycle (authentication → controller → service → repository → database → resource → response).

### 1.3.1 Example unit test (Service, mock Repository)

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

### 1.3.2 Example feature test (CreateTask)

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

### 1.4 Running a single test filter

```bash
docker exec -e DB_CONNECTION=sqlite -e DB_DATABASE=:memory: taskflow-backend \
  php artisan test --filter=UserTest
```

### 1.5 Pint (code style)

```bash
docker exec taskflow-backend ./vendor/bin/pint
# To check without fixing:
docker exec taskflow-backend ./vendor/bin/pint --test
```

### 1.6 Allowed failures

- The CI step that references `phpcs` is **allowed to fail** because only Pint is installed; do not add PHPStan or PHPCS configuration unless you intend to add the dependencies deliberately.

## 2. Frontend testing (Vitest + Playwright)

### 2.1 Unit / component tests

- **Framework** – Vitest with `jsdom` environment.
- **Configuration** – `vitest.config.ts` (see `frontend/vite.config.ts` alias setup, globals, environment).
- **Baseline** – **14** tests (run `npx vitest run`).
- **Running**

  ```bash
  cd frontend
  npx vitest run               # one‑shot run
  npm run test:unit            # watch mode
  ```

- **Example test** (see `frontend/__tests__/` or any `*.test.ts` file):

  ```ts
  import { describe, it, expect } from 'vitest';
  import { useTaskStore } from '@/modules/tasks/store';

  describe('useTaskStore', () => {
    it('starts with empty task list', () => {
      const store = useTaskStore();
      expect(store.tasks).toHaveLength(0);
    });

    it('loads tasks from mock mode', async () => {
      const store = useTaskStore();
      await store.load(); // calls mockDb.task.list under the hood
      expect(store.tasks).toHaveLength(6); // six demo tasks in mockDb
    });
  });
  ```

### 2.2 End‑to‑end tests (Playwright)

- **Framework** – Playwright (test file: `frontend/e2e/vue.spec.ts`).
- **Purpose** – Full‑stack flow: mock mode on/off, login, task CRUD, logout, admin routes.
- **Baseline** – suite runs; no fixed numeric baseline but typically a handful of `test.describe` blocks.
- **Running**

  ```bash
  cd frontend
  npm run test:e2e
  ```

- **Important**

  - The e2e suite expects the Docker dev stack to be up (`docker compose -f docker/docker-compose.yml up -d`).
  - If `VITE_USE_MOCK` is set to `"false"` in `frontend/.env`, the tests hit the real Laravel backend; otherwise they use the localStorage mock.
  - Ensure the test uses the correct selectors matching the current UI (see the sample `vue.spec.ts` for patterns).

### 2.2.1 Sample e2e test (vue.spec.ts – abbreviated)

```ts
import { test, expect } from '@playwright/test';

test('user can log in, create a task, and log out', async ({ page }) => {
  // 1. Visit login page
  await page.goto('/auth/login');

  // 2. Fill credentials (demo account)
  await page.fill('input[name="email"]', 'olivia@taskflow.dev');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');

  // 3. Verify we are redirected to the task list
  await expect(page).toHaveURL('/tasks');

  // 4. Click “Create task” and fill the form
  await page.click('text=Create task');
  await page.fill('input[name="title"]', 'New task from e2e');
  await page.selectOption('select[name="status"]', 'todo');
  await page.selectOption('select[name="priority"]', 'high');
  await page.fill('textarea[name="description"]', 'Description from e2e test');
  await page.click('button:has-text("Save")');

  // 5. Verify the new task appears in the list
  await expect(page.locator('text=New task from e2e')).toBeVisible();

  // 6. Log out
  await page.click('text=Logout');
  await expect(page).toHaveURL('/auth/login');
});
```

### 2.3 Test environment considerations

- **Node version** – CI uses Node 20 while `package.json` requires `^22.18.0 || >=24.12.0`. Locally you may use any matching Node version; the mismatch is tracked but does not block test execution.
- **Mock mode flag** – `VITE_USE_MOCK` in `frontend/.env`. Set to `"false"` to run tests against the real backend (Docker container must be reachable). Leave unset (or any value other than `"false"`) to run against the localStorage mock.
- **CI step** – the GitHub Actions workflow references `phpcs`, but only Pint is installed on the backend; the style step is allowed to fail.

## 3. General testing principles

| Principle | Description |
|---|---|
| **Deterministic data** | Use the seeded demo accounts (`password123`) and the mock DB’s seeded tasks; avoid random strings that may break snapshot stability. |
| **One assert per test** (when possible) | Makes it clear which expectation failed. |
| **Isolate units** | Mock external dependencies (Repository, HttpClient) in backend unit tests; mock `HttpClient` or use mock mode in frontend unit tests. |
| **Keep tests fast** | SQLite in‑memory for backend; jsdom for frontend; avoid heavy UI interactions in unit tests. |
| **Document edge cases** | If a test covers an unusual edge case (e.g., last‑admin deletion, 409 conflict), add a comment explaining why it matters. |
| **Run both suites before PR** | `npx vitest run` + `docker exec ... php artisan test` + `npm run lint` + `npm run build` (optional but recommended). |

## 4. Links

- [Backend testing.md (this file’s parent section)](testing.md) – general testing overview.
- [Frontend testing.md (this file’s parent section)] – Vitest + Playwright details.
- [CONTRIBUTING.md] – PR process and checklist.
- [CI workflow] (`.github/workflows/ci.yml`) – the actual GitHub Actions definition (source of truth for CI behaviour).
- [docker/phpunit.xml] – the PHPUnit configuration used inside Docker.

---

*If you add a new feature, add corresponding tests (unit + e2e if appropriate) and ensure the existing baseline is preserved. All new tests should pass the existing suite before the PR is merged.*