# Feature Development Guide — Backend

This guide walks a developer through adding a new feature to the TaskFlow Laravel 11 backend, from idea to test to documentation. The **code** (routes, Form Requests, Resources, Services, Policies, migrations, models) is the source of truth; the steps below reflect the current patterns.

---

## 1. Define the scope

1. **What domain object** does the feature affect? (task, user, project, etc.)
2. **Which API endpoint(s)** are needed? (list, create, show, update, delete)
3. **What new fields** are required on the model / migration? (title, description, status, priority, assigned_to, due_date, etc.)
4. **What business rules** differentiate this feature from existing ones? (status transitions, validation, authorization).

*Write a brief bullet list; keep it short enough to fit in a pull request description.*

---

## 2. Database migration

1. **Create the migration**

   ```bash
   docker exec taskflow-backend php artisan make:migration create_<feature>_table --table=<existing_or_new>
   ```

2. **Edit the up/down methods** to add columns, enums, foreign keys, indexes exactly as the feature requires.  
   *Reference the existing migrations (`2024_01_15_000000_create_tasks_table.php`, `2024_01_15_000001_add_role_to_users_table.php`) for the exact syntax.*

3. **Run the migration**

   ```bash
   docker exec -e DB_CONNECTION=sqlite -e DB_DATABASE=:memory: taskflow-backend php artisan migrate
   ```

4. **Update the Eloquent model** (`app/Models/<*.php>`) to add `$fillable` / `$casts` for the new columns.

---

## 3. Repository interface & implementation (if needed)

- If the new feature requires custom queries beyond the basic `paginate` pattern, add a new method to `TaskRepositoryInterface` (`app/Repositories/Contracts/TaskRepositoryInterface.php`) and implement it in `EloquentTaskRepository` (`app/Repositories/Eloquent/TaskRepository.php`).
- If the feature is simple CRUD, you may skip the repository layer and have the Service call the Model directly (as permitted by ADR‑012).

---

## 4. Form Requests

1. **Create a Form Request** (if validation is needed):

   ```bash
   docker exec taskflow-backend php artisan make:request Store<Feature>Request
   docker exec taskflow-backend php artisan make:request Update<Feature>Request
   ```

2. **Define `rules()`** – validate each incoming field, using `Rule::in()` for enums, `exists:table,column` for foreign keys, `nullable`, `min`, `max` as appropriate.

3. **Define `authorize()`** – return `$this->user()->can('create', <Model>::class) | $this->user()->can('update', $task)` etc. This ties into Policies (see step 5).

---

## 5. Policies & authorization

1. **If a new model** is introduced, create a Policy:

   ```bash
   docker exec taskflow-backend php artisan make:policy <Policy>Policy
   ```

2. **Define methods** (`view`, `create`, `update`, `delete`) that return booleans based on the `User` role and/or the resource’s own rules.

3. **Register the Policy** in `app/Providers/AuthServiceProvider.php`:

   ```php
   protected $policies = [
       <Model>::class => <Policy>::class,
   ];
   ```

4. **Use `$this->authorize()`** in Controllers, or Gate checks in Services if the rule is not model‑centric.

---

## 6. Service layer

1. **Create a Service class** (if the feature has business logic):

   ```bash
   docker exec taskflow-backend php artisan make:service <Feature>Service
   ```

2. **Implement use‑case methods** that call the Repository, perform validation, manage transactions (`DB::transaction`), and throw descriptive exceptions (`InvalidStatusTransitionException`, `AssigneeNotFoundException`, etc.).

3. **Keep the Service free of HTTP concerns** – no `Request`, no `Response`, no route model binding. It receives plain arrays and returns model instances or arrays.

---

## 7. Controllers

1. **Create / update the Controller** (`app/Http/Controllers/Api/<Feature>Controller.php`) using dependency injection (`private readonly <Feature>Service $<feature>Service`).

2. **Methods** – map HTTP verbs to Service methods:

   - `index()` – call `list<Features>()` and return `<Feature>Resource::collection()`.
   - `store()` – validate via Form Request, call `create<Feature>()`, return `<Feature>Resource`.
   - `show($id)` – resolve model via route model binding, authorize via Policy, return `<Feature>Resource`.
   - `update($id)` – authorize, call `update<Feature>()`, return updated resource.
   - `destroy($id)` – authorize `delete` policy, call `delete<Feature>()`, return `204 No Content`.

3. **Authorization** – always `$this->authorize('verb', $resource)` before calling the Service. This mirrors the existing `TaskPolicy` / `UserPolicy` pattern.

---

## 7. API Resources

1. **Create / update the Resource** (`app/Http/Resources/<Feature>Resource.php`) to shape the JSON response.

2. **Include only the fields** that the API contract requires. Use `whenLoaded()` for relationships.

3. **Create a Collection class** (`app/Http/Resources/<Feature>Collection.php`) if the endpoint returns a list with pagination meta/links.

---

## 8. Routes

Edit `routes/api.php` (or the appropriate route file) adding the new endpoints with the correct middleware:

```php
// Example: task‑related routes (already present, just showing the pattern)
Route::middleware('auth:sanctum')->group(function () {
    Route::apiResource('tasks', TaskController::class);
    Route::middleware('role:admin')->group(function () {
        Route::apiResource('users', UserController::class)->only(['index', 'show']);
    });
});
```

- Add throttling (`throttle:5,1` for public routes, `throttle:60,1` for authenticated) as appropriate.
- Protect admin‑only routes with `role:admin` middleware.

---

## 9. Tests

1. **Unit test the Service** (mock the Repository):

   ```php
   class <Feature>ServiceTest extends TestCase
   {
       private <Feature>Service $service;
       private <Feature>RepositoryInterface $repo;

       protected function setUp(): void
       {
           parent::setUp();
           $this->repo = Mockery::mock(<Feature>RepositoryInterface::class);
           $this->service = new <Feature>Service($this->repo);
       }

       public function test_<scenario>(): void
       {
           // arrange
           $data = [...];
           $this->repo->shouldReceive('method')->once()->with($data)->andReturn(...);

           // act
           $result = $this->service->method($data);

           // assert
           $this->assertEquals(...);
       }
   }
   ```

2. **Feature (integration) test** using `RefreshDatabase`:

   ```php
   class <Feature>Test extends TestCase
   {
       use RefreshDatabase;

       public function test_authenticated_user_can_<action>(): void
       {
           $user = User::factory()->create();
           // ... set up any related objects

           $this->actingAs($user, 'sanctum')
               ->json('POST', '/api/<resource>', $payload)
               ->assertStatus(201)
               ->assertJsonStructure([...]);
       }
   }
   ```

3. **Run the test suite** inside Docker (required for SQLite overrides):

   ```bash
   docker exec -e DB_CONNECTION=sqlite -e DB_DATABASE=:memory: taskflow-backend php artisan test
   ```

   Baseline: **30** tests, **152** assertions (after the new tests are added, re‑run to verify the baseline has not dropped).

---

## 10. Documentation

1. **Update the API overview** (`docs/backend/api/overview.md`) – add the new endpoint to the tables, adjust pagination notes if `per_page` changes.
2. **Add/expand the endpoint doc** – e.g. `docs/backend/api/endpoints/tasks.md` for task‑related features, or create a new `docs/backend/api/endpoints/<feature>.md` if the feature is orthogonal.
3. **Update the coding‑conventions** or `folder‑structure` docs only if the new feature introduces a new directory or changes naming.
4. **Add an entry in the “Documentation index”** of the relevant doc file, keeping the index alphabetical/ordered.

---

## Quick checklist (run before opening a PR)

- [ ] Migration created and run locally (`php artisan migrate`).
- [ ] Model `$fillable` / `$casts` updated.
- [ ] Form Request(s) created with correct rules.
- [ ] Policy created (if needed) and registered.
- [ ] Service method(s) implemented, business rules enforced.
- [ ] Controller method(s) added, with `$this->authorize()` calls.
- [ ] Resource(s) and Collection(s) shaped correctly.
- [ ] Routes added with correct middleware & throttling.
- [ ] Tests written (unit + feature) and passing inside Docker.
- [ ] Documentation files updated (overview, endpoint, conventions if needed).
- [ ] `composer install` / `php artisan route:list` to verify no duplicate route names.

*If any step is missing, the PR will be returned for revisions.* 

---

*This guide mirrors the current code patterns (Service & Repository, Form Requests, API Resources, Policies) and the test baseline described in the project's CONTRIBUTING.md. When in doubt, look at the existing task/user implementation as the reference.*