# AGENTS.md

TaskFlow is a monorepo with a Laravel 11 API, a Vue 3 SPA, and MySQL, orchestrated with Docker Compose. Documentation is in English. Application code, migrations, and tests are the source of truth when docs disagree.

## Commands

Run backend tests and style checks inside the container. Host PHP lacks `dom` and `xmlwriter`, so `artisan test` fails outside Docker.

```bash
docker exec -e DB_CONNECTION=sqlite -e DB_DATABASE=:memory: taskflow-backend php artisan test
docker exec -e DB_CONNECTION=sqlite -e DB_DATABASE=:memory: taskflow-backend php artisan test --filter=UserTest
docker exec taskflow-backend ./vendor/bin/pint
```

The `-e` overrides are required: `phpunit.xml` sets SQLite `:memory:`, but Compose's `DB_DATABASE=taskflow` takes precedence. Tests use `RefreshDatabase`; no MySQL is needed. Baseline: 30 backend tests and 152 assertions.

Frontend:

```bash
cd frontend
npm run type-check
npx vitest run
npx vitest run src/__tests__/task-domain.spec.ts
npm run test:e2e
npm run lint
npm run build
```

`npm run test:unit` is Vitest watch mode. Baseline: 14 Vitest tests. `npm run lint` runs both oxlint and ESLint with `--fix`; use `npx oxlint .` and `npx eslint .` for a non-mutating check.

## Docker and Setup

- Start the root stack first so Compose creates `docker_default`: `docker compose -f docker/docker-compose.yml up -d --build`.
- Start the development frontend on port 3000 with `docker compose -f docker/frontend/docker-compose.yml up -d --build`.
- Never create `docker_default` manually; a hand-made network lacks the Compose labels the frontend stack expects.
- Ports: 3000 Vite development, 80 static SPA, 8080 API, 3307 MySQL.
- Backend source is bind-mounted, so code changes apply without rebuilding. Dependency changes require `composer install` inside the container.
- Port 80 is not rebuilt automatically. Run `npm run build` in `frontend/`, copy `frontend/dist/*` to `docker/frontend/dist/`, then restart `frontend`.
- Host-side `npm run dev` needs `VITE_API_PROXY_TARGET=http://localhost:8080`. Vite otherwise defaults to `http://backend:8000`, which resolves only inside Compose.
- Fresh clone: copy both `.env.example` files. Backend needs `DB_CONNECTION=mysql`, `DB_HOST=mysql`, and the `taskflow` / `taskflow_password` credentials, then `php artisan key:generate`.
- Seed data: `php artisan migrate --seed`. All six demo accounts use `password123`; `admin@taskflow.dev` is an admin.
- Login and registration are throttled to five requests per minute. A `429` during repeated manual testing is expected.

## Architecture Map

- API surface: `backend/routes/api.php`, mounted under `/api` by `bootstrap/app.php`.
- Backend flow: route → `auth:sanctum` or `role:admin` → FormRequest → Controller → Service → repository interface (bound in `RepositoryServiceProvider`) → Eloquent → API Resource.
- JSON errors are shaped centrally in `bootstrap/app.php`. Preserve `status_code`, `code`, `message`, `errors`, `details`, `path`, and `timestamp`.
- Authorization has two layers: the `role:admin` middleware and per-task `TaskPolicy` checks. Frontend guards and visibility are UX only.
- Cross-record rules live in `UserService`: no self-delete, no self-demotion, and no deleting the last admin. Keep these rules server-side.
- Frontend entry: `src/main.ts`; router and guards in `src/app/router`; HTTP, token, storage, and mock infrastructure in `src/adapters/infrastructures`.
- Frontend modules are `src/modules/<feature>/{domain,data,application,ui}` with a barrel `index.ts`. Repositories in `data/` own HTTP calls. Cross-module imports normally use the barrel.
- Some layering rules are not fully enforced: `shared/` imports task domain types, `FullLayout` imports the auth store, and UI/application code imports `getApiErrorMessage` from `HttpClient`. Follow existing code over aspirational rules.
- API payloads are snake_case with integer IDs. DTOs and mappers convert to camelCase domain types; frontend domain IDs are strings.
- Task statuses: `todo`, `in_progress`, `done`, `cancelled`. Priorities: `low`, `medium`, `high`, `urgent`.
- `backend/package.json` and `backend/vite.config.js` are unused Laravel scaffolding. The real SPA is `frontend/`; Docker never builds backend assets.

## Conventions and Traps

- `frontend/.env`: mock mode is enabled unless `VITE_USE_MOCK` is exactly `false`. Set `VITE_USE_MOCK=false` to call Laravel.
- The frontend mock database is `localStorage`-backed in `src/adapters/infrastructures/mocks/mockDb.ts`; it is not MSW.
- Backend validation limits differ from frontend form limits: task title 255 backend vs 120 frontend, description 5000 vs 2000, and page size 20 backend vs 10 frontend.
- `HttpClient` expects `statusCode` in error envelopes, while Laravel returns `status_code`. HTTP status remains available through Axios.
- Backend has Pint only. CI references `phpcs` and some docs may mention PHPStan, but neither is installed. The CI style step is allowed to fail.
- CI uses Node 20 while `frontend/package.json` requires `^22.18.0 || >=24.12.0`.
- Git: Conventional Commits (`feat:`, `fix:`, ...), branches such as `feat/...`, pull requests to `main`, squash merge.
- `docs/AGENT_INSTRUCTIONS.md` is the documentation entrypoint. Update the relevant document in the same pull request when behavior or contracts change.
- `.agents/` is a local, untracked skill/mapping directory. Do not make the application depend on it.

## Documentation Map

- `CONTEXT.md`: canonical domain glossary.
- `docs/AGENT_INSTRUCTIONS.md`: entrypoint and documentation routing.
- `docs/backend/`: API contract, architecture, database, security, and testing.
- `docs/frontend/`: SPA architecture, routing, state, data flow, forms, design system, and testing.
- `docs/features/`: implemented feature behavior and acceptance criteria.
- `docs/operations/`: Docker, environments, migrations, security, and troubleshooting.
- `docs/adr/`: architecture decision history. Do not rewrite accepted decisions; mark contradictions as superseded and add a new ADR.
- `docs/contributing/`: pull request and testing workflow.
