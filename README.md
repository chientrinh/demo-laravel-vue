# TaskFlow

TaskFlow is a full-stack team task management demo: a Laravel 11 JSON API, a Vue 3 single-page application, and MySQL 8, orchestrated with Docker Compose.

## Stack

| Layer | Technology |
| --- | --- |
| Backend | Laravel 11, PHP 8.2+, Laravel Sanctum, PHPUnit, Pint |
| Frontend | Vue 3.5, TypeScript 6, Vite 8, Vue Router 5, Pinia 4, Vuetify 3, Tailwind 4 |
| Database | MySQL 8 |
| Infrastructure | Docker Compose, Apache/PHP for the API, Nginx for the static SPA |
| Documentation | Feature specs, ADRs, architecture, API, and operations guides in `docs/` |

## Repository Layout

```text
.
├── backend/                 Laravel API
│   ├── app/                 Controllers, services, repositories, policies, resources
│   ├── database/            Migrations, factories, seeders
│   ├── routes/api.php       API routes
│   └── tests/               PHPUnit feature and unit tests
├── frontend/                Vue SPA
│   └── src/
│       ├── adapters/        HTTP, storage, and mock infrastructure
│       ├── app/             Router, guards, config, Vuetify setup
│       ├── modules/         auth, tasks, and users feature modules
│       └── shared/          Reusable components, styles, constants, and utilities
├── docker/                  Compose files, Dockerfiles, Nginx config, static SPA output
├── docs/                    Project documentation
├── CONTEXT.md               Canonical domain glossary
└── CONTRIBUTING.md          Development and review workflow
```

## Prerequisites

- Docker Engine with Docker Compose v2
- Git
- Node.js `^22.18.0 || >=24.12.0` only for host-side frontend builds or tests

## Quick Start

Run all commands from the repository root.

### 1. Configure the backend

```bash
cp backend/.env.example backend/.env
```

Set the backend database connection in `backend/.env`:

```env
DB_CONNECTION=mysql
DB_HOST=mysql
DB_PORT=3306
DB_DATABASE=taskflow
DB_USERNAME=taskflow
DB_PASSWORD=taskflow_password
```

### 2. Start MySQL and the API

```bash
docker compose -f docker/docker-compose.yml up -d --build mysql backend
docker exec taskflow-backend php artisan key:generate
docker exec taskflow-backend php artisan migrate --seed
```

The seeders create six demo accounts. All use password `password123`.

| Email | Role |
| --- | --- |
| `admin@taskflow.dev` | admin |
| `olivia@taskflow.dev` | admin |
| `phoenix@taskflow.dev` | user |
| `lana@taskflow.dev` | user |
| `demi@taskflow.dev` | user |
| `candice@taskflow.dev` | user |

### 3. Start the development frontend

```bash
cp frontend/.env.example frontend/.env
docker compose -f docker/frontend/docker-compose.yml up -d --build
```

The development frontend runs at <http://localhost:3000>. It proxies `/api` to the backend container.

### 4. Optional: build the static frontend for port 80

Port 80 serves the contents of `docker/frontend/dist/`, which is not rebuilt automatically.

```bash
cd frontend
npm ci
npm run build
cd ..

mkdir -p docker/frontend/dist
rm -rf docker/frontend/dist/*
cp -a frontend/dist/. docker/frontend/dist/

docker compose -f docker/docker-compose.yml up -d frontend
```

## URLs

| Component | URL |
| --- | --- |
| Development frontend | <http://localhost:3000> |
| Static frontend | <http://localhost> |
| API | <http://localhost:8080/api> |
| Health check | <http://localhost:8080/api/health> |
| MySQL from the host | `127.0.0.1:3307` |

## API at a Glance

All endpoints except `POST /api/login`, `POST /api/register`, and `GET /api/health` require a Sanctum bearer token. Payloads and response fields are snake_case, with integer IDs.

| Method | Endpoint | Access |
| --- | --- | --- |
| `GET` | `/api/health` | Public |
| `POST` | `/api/login` | Public, throttled 5/minute |
| `POST` | `/api/register` | Public, throttled 5/minute |
| `GET` | `/api/me` | Authenticated |
| `GET` | `/api/user` | Authenticated |
| `POST` | `/api/logout` | Authenticated |
| `GET/POST` | `/api/tasks` | Authenticated |
| `GET/PUT/PATCH` | `/api/tasks/{id}` | Assignee or admin |
| `DELETE` | `/api/tasks/{id}` | Admin |
| `GET/POST` | `/api/users` | Admin |
| `GET/PUT/PATCH/DELETE` | `/api/users/{id}` | Admin |

Task statuses are `todo`, `in_progress`, `done`, and `cancelled`. Priorities are `low`, `medium`, `high`, and `urgent`.

See [docs/backend/api/overview.md](docs/backend/api/overview.md) for the full contract.

## Tests

Backend tests must run inside the container. The `-e` overrides are required because the Compose environment would otherwise override the SQLite test database.

```bash
docker exec -e DB_CONNECTION=sqlite -e DB_DATABASE=:memory: taskflow-backend php artisan test
docker exec -e DB_CONNECTION=sqlite -e DB_DATABASE=:memory: taskflow-backend php artisan test --filter=UserTest
docker exec taskflow-backend ./vendor/bin/pint
```

Current baseline: 30 tests, 152 assertions.

Frontend:

```bash
cd frontend
npm run type-check
npx vitest run
npm run test:e2e
npm run build
```

`npm run test:unit` starts Vitest in watch mode. Current baseline: 14 Vitest tests.

## Documentation

| Topic | Location |
| --- | --- |
| Glossary | [CONTEXT.md](CONTEXT.md) |
| Agent entrypoint | [docs/AGENT_INSTRUCTIONS.md](docs/AGENT_INSTRUCTIONS.md) |
| Architecture decisions | [docs/adr/](docs/adr/) |
| API contract | [docs/backend/api/overview.md](docs/backend/api/overview.md) |
| Backend architecture | [docs/backend/architecture.md](docs/backend/architecture.md) |
| Frontend architecture | [docs/frontend/architecture.md](docs/frontend/architecture.md) |
| Feature specifications | [docs/features/](docs/features/) |
| Operations | [docs/operations/](docs/operations/) |
| Contributing | [CONTRIBUTING.md](CONTRIBUTING.md) |

Documentation is written in English. The application code and migrations are authoritative when documentation and implementation disagree.

## Known Issues

- CI currently uses Node 20 while `frontend/package.json` requires Node `^22.18.0 || >=24.12.0`.
- CI references `phpcs`, but the backend only installs Pint. The style step is allowed to fail.
- The static frontend on port 80 requires a manual build and copy after frontend changes.
- Login and registration are throttled to five requests per minute, so a `429` response during repeated manual testing is expected.
