# Backend Documentation

This directory contains the documentation for the Laravel 11 API backend of **TaskFlow**. All behaviour is defined by the application code, migrations, requests, resources, services, policies, and tests; the documents here exist to explain, summarise, and guide — they are never the source of truth.

## Quick start for contributors

Run the test suite inside the Docker container:

```bash
docker exec -e DB_CONNECTION=sqlite -e DB_DATABASE=:memory: taskflow-backend php artisan test
docker exec taskflow-backend ./vendor/bin/pint
```

The `-e` overrides are required because Compose sets `DB_DATABASE=taskflow`, which overrides the SQLite database configured in `phpunit.xml`. Tests use `RefreshDatabase`; no MySQL is needed. Baseline: 30 PHPUnit feature tests and 152 assertions.

If you need to style‑check the code:

```bash
docker exec taskflow-backend ./vendor/bin/pint
```

## Documentation index

| Document | What you’ll find |
|---|---|
| [architecture.md](architecture.md) | Service & Repository pattern, request flow, authorization |
| [architecture-decisions.md](architecture-decisions.md) | Key architectural decisions and their current status |
| [coding-conventions.md](coding-conventions.md) | PHP 8.3+ conventions, DI, form requests, resources, policies |
| [folder-structure.md](folder-structure.md) | Target directory layout and owner responsibilities |
| [api/overview.md](api/overview.md) | Full API contract: endpoints, methods, request/response shapes, pagination, throttles |
| [api/error-handling.md](api/error-handling.md) | JSON error envelope, exception handling, status codes |
| [api/endpoints/auth.md](api/endpoints/auth.md) | Login, register, logout, “me” endpoint, throttling |
| [api/endpoints/tasks.md](api/endpoints/tasks.md) | Task CRUD, status/priority filters, assignment rules |
| [api/endpoints/users.md](api/endpoints/users.md) | Admin‑only user management, self‑delete / demotion protection |
| [database/schema.md](database/schema.md) | Eloquent models, fillable / casts, relationships |
| [database/migrations.md](database/migrations.md) | Migration scripts, indexes, seed data |
| [database/indexing.md](database/indexing.md) | Indexes, query performance, eager loading |
| [feature-development-guide.md](feature-development-guide.md) | Step‑by‑step guide for adding a new backend feature |

## Local development

The backend is developed inside the Docker service `taskflow-backend`. Do **not** run `php artisan test` or `./vendor/bin/pint` on the host; the host PHP installation lacks the Laravel `dom` and `xmlwriter` extensions required by some tests.

## Error envelope

All API responses follow the shape defined in `bootstrap/app.php`:

```json
{
  "status_code": 200,
  "code": "some-code",
  "message": "Human‑readable message",
  "errors": [],                // array of field‑level error objects
  "details": [],               // free‑form detail strings
  "path": "/api/tasks",
  "timestamp": "2026-01-01T00:00:00Z"
}
```

Auth failures return HTTP 401, forbidden actions return 403, validation errors return 422 with the `code`/`message`/`details` structure above.

## Known points

- **Pint only** – the CI step that references `phpcs` is allowed to fail; PHPStan is not installed.
- **Node 20 mismatch** – `frontend/package.json` requires `^22.18.0 || >=24.12.0`; the CI workflow uses Node 20. This is a known version mismatch, not a blocker.
- **Throttle** – login and registration are limited to five requests per minute per IP; a `429` response is expected during repeated manual testing.