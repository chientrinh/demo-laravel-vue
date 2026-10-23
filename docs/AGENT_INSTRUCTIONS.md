# Documentation Entrypoint

This file routes maintainers and AI agents to the documentation they need. Read the relevant pages before changing code.

## Source of Truth

1. **Application code, migrations, and tests are authoritative.** Documentation explains and summarizes them; it does not define behavior that the code does not implement.
2. **When documentation and code disagree, inspect the code and fix the documentation in the same pull request.**
3. **Do not invent contracts.** Verify endpoint paths, fields, enum values, validation rules, and authorization rules against `backend/routes/api.php`, `backend/app/`, and `backend/database/migrations/`.
4. **Keep one canonical explanation per topic.** Link to the owning page instead of duplicating contracts.
5. **Write documentation in English.** Use the terms in [CONTEXT.md](../CONTEXT.md).

Documentation may describe planned work only when it is explicitly labelled `Status: planned` and does not imply that the behavior exists.

## Documentation Routing

| Work area | Read first | Then |
| --- | --- | --- |
| Add or change an API endpoint | [Backend README](backend/README.md) | [API overview](backend/api/overview.md), [error handling](backend/api/error-handling.md) |
| Change task behavior | [Task endpoints](backend/api/endpoints/tasks.md) | [Task feature spec](features/tasks/list.md), schema and policy docs |
| Change authentication | [Auth endpoints](backend/api/endpoints/auth.md) | [Login](features/authentication/login.md), [register](features/authentication/register.md), [security](backend/security.md) |
| Change user administration | [User endpoints](backend/api/endpoints/users.md) | [User feature specs](features/users/list.md), [security](backend/security.md) |
| Change database structure | [Schema](backend/database/schema.md) | [Migrations](backend/database/migrations.md), [indexing](backend/database/indexing.md) |
| Change backend structure | [Backend architecture](backend/architecture.md) | [Folder structure](backend/folder-structure.md), [coding conventions](backend/coding-conventions.md) |
| Add a frontend feature | [Frontend architecture](frontend/architecture.md) | [Folder structure](frontend/folder-structure.md), [feature guide](frontend/feature-development-guide.md) |
| Change routing or guards | [Routing](frontend/routing.md) | [Architecture](frontend/architecture.md) |
| Change frontend data flow | [Data fetching](frontend/data-fetching.md) | [API integration](frontend/api-integration.md), [state management](frontend/state-management.md) |
| Change forms or validation | [Forms and validation](frontend/forms-and-validation.md) | Relevant feature spec |
| Change styling or UI components | [Design system](frontend/design-system.md) | [Coding conventions](frontend/coding-conventions.md) |
| Change Docker or environment setup | [Docker backend](operations/docker-backend.md) | [Docker frontend](operations/docker-frontend.md), [configuration](operations/configuration.md) |
| Run or add tests | [Backend testing](backend/testing.md) | [Frontend testing](frontend/testing.md), [testing guidelines](contributing/testing-guidelines.md) |
| Prepare a pull request | [Pull request guide](contributing/pull-request.md) | [Testing guidelines](contributing/testing-guidelines.md) |
| Record an architecture decision | [ADR index](adr/README.md) | [ADR template](adr/template.md) |

## Current Contract Summary

- API prefix: `/api`.
- Authentication: Laravel Sanctum bearer tokens. Public routes are `POST /api/login`, `POST /api/register`, and `GET /api/health`.
- Roles: `admin`, `user`.
- Task statuses: `todo`, `in_progress`, `done`, `cancelled`.
- Task priorities: `low`, `medium`, `high`, `urgent`.
- API fields and JSON keys: snake_case. IDs are integers.
- Task list pagination: `per_page` defaults to 20 and is capped at 100.
- Registration always creates a user with role `user`.
- Admins manage users and may delete tasks. Users with role `user` see and update only their own tasks and cannot reassign or delete them.
- The frontend uses camelCase domain models and string IDs; DTOs and mappers convert at the HTTP boundary.

## Required Checks

Backend:

```bash
docker exec -e DB_CONNECTION=sqlite -e DB_DATABASE=:memory: taskflow-backend php artisan test
docker exec taskflow-backend ./vendor/bin/pint
```

Frontend:

```bash
cd frontend
npm run type-check
npx vitest run
npx oxlint .
npx eslint .
npm run build
```

## Change Checklist

1. Locate the owning feature and contract pages.
2. Verify the behavior in code before editing documentation.
3. Update all affected docs in the same change.
4. Mark planned work explicitly and do not present it as implemented.
5. Run the relevant checks.
6. Update [CONTEXT.md](../CONTEXT.md) if domain terminology changes.
7. Add or supersede an ADR when an architectural decision changes.

## Red Flags

- A documented endpoint or field is absent from the routes, requests, resources, or migrations.
- A document describes UUIDs, camelCase API fields, three task statuses, MSW, or PHPStan as current behavior.
- A frontend guard is treated as authorization rather than UX.
- A test command is documented without the container or SQLite overrides required by this repository.
- A planned feature is described as implemented.
