# Contributing to TaskFlow

This guide covers local setup, quality checks, conventions, and the pull request process. Application code, migrations, and tests are authoritative when they disagree with documentation.

## Prerequisites

- Docker Engine with Docker Compose v2
- Git
- Node.js `^22.18.0 || >=24.12.0` for host-side frontend work

Backend tests run inside the `taskflow-backend` container. Host PHP is not a supported test environment.

## Local Setup

Start the root stack first so Compose creates the `docker_default` network:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

docker compose -f docker/docker-compose.yml up -d --build mysql backend
docker exec taskflow-backend php artisan key:generate
docker exec taskflow-backend php artisan migrate --seed
```

Configure `backend/.env` for MySQL:

```env
DB_CONNECTION=mysql
DB_HOST=mysql
DB_PORT=3306
DB_DATABASE=taskflow
DB_USERNAME=taskflow
DB_PASSWORD=taskflow_password
```

Start the development frontend:

```bash
docker compose -f docker/frontend/docker-compose.yml up -d --build
```

- Frontend: <http://localhost:3000>
- API: <http://localhost:8080/api>
- Static frontend: <http://localhost> after a manual build and copy

For host-side Vite, set `VITE_API_PROXY_TARGET=http://localhost:8080`. The default proxy target `http://backend:8000` only resolves inside Compose.

## Quality Gates

### Backend

```bash
docker exec -e DB_CONNECTION=sqlite -e DB_DATABASE=:memory: taskflow-backend php artisan test
docker exec -e DB_CONNECTION=sqlite -e DB_DATABASE=:memory: taskflow-backend php artisan test --filter=UserTest
docker exec taskflow-backend ./vendor/bin/pint
```

The SQLite overrides are required because Compose sets `DB_DATABASE=taskflow`, which otherwise takes precedence over `phpunit.xml`. Tests use `RefreshDatabase` and do not need MySQL.

Baseline: 30 backend tests and 152 assertions.

### Frontend

```bash
cd frontend
npm run type-check
npx vitest run
npm run test:e2e
npx oxlint .
npx eslint .
npm run build
```

`npm run test:unit` is Vitest watch mode. Use `npx vitest run` for a one-shot run. Baseline: 14 Vitest tests.

`npm run lint` runs both oxlint and ESLint with `--fix`. Use the non-mutating commands above when you only want to check.

## Branch and Commit Conventions

Create branches from `main` using a short, descriptive name:

```text
feat/task-status-filtering
fix/login-validation-error
docs/api-contract-sync
chore/update-dependencies
```

Use Conventional Commits:

```text
feat: add task status filtering
fix: align frontend error mapping with API
docs: correct pagination defaults
test: cover last-admin protection
chore: update frontend dependencies
```

Squash merge pull requests into `main`.

## Pull Request Process

1. Create a feature branch from `main`.
2. Make the change and add or update tests.
3. Run the relevant backend and frontend checks.
4. Update documentation in the same pull request when behavior or contracts change.
5. Open a pull request against `main` with a summary, test evidence, and any limitations.
6. Address review feedback and keep the branch current.
7. Squash merge after approval and passing checks.

## Code Conventions

### Backend

- Follow the route → FormRequest → Controller → Service → repository interface → Eloquent → API Resource flow.
- Put business rules in services, not controllers or frontend code.
- Use Form Requests for validation and API Resources for response shapes.
- Preserve the error envelope fields defined in `bootstrap/app.php`.
- Use constructor injection and readonly dependencies where appropriate.
- Run Pint before opening a pull request.
- Do not add PHPStan or PHPCS configuration unless the dependency and CI gate are added deliberately.

### Frontend

- Use `<script setup lang="ts">` and typed props/emits.
- Keep business features inside `src/modules/<feature>/`.
- Put HTTP calls in repositories under `data/`; components should not call Axios directly.
- Convert snake_case DTOs to camelCase domain models with mappers.
- Keep route guards and admin-only UI as UX controls. Server authorization remains authoritative.
- Follow the existing module, naming, and import patterns. Some historical layering rules are not fully enforced; match the code rather than inventing a new pattern.

## Documentation

Update the owning document when behavior or contracts change:

| Topic | Location |
| --- | --- |
| Glossary | `CONTEXT.md` |
| Documentation routing | `docs/AGENT_INSTRUCTIONS.md` |
| API contract | `docs/backend/api/` |
| Backend architecture and database | `docs/backend/` |
| Frontend architecture and data flow | `docs/frontend/` |
| Feature behavior | `docs/features/` |
| Docker and operations | `docs/operations/` |
| Architecture decisions | `docs/adr/` |

Do not rewrite an accepted ADR. Add a new ADR and mark the previous decision as superseded when the architecture changes.

## Known Repository Issues

- CI uses Node 20 while `frontend/package.json` requires Node `^22.18.0 || >=24.12.0`.
- CI references `phpcs`, but only Pint is installed. The style step is allowed to fail.
- The static frontend on port 80 is not rebuilt automatically.
- Login and registration are throttled to five requests per minute in each direction.
