# TaskFlow

TaskFlow is a full-stack team task management demo: a Laravel 11 JSON API, a Vue 3 single-page application, and MySQL 8, orchestrated with Docker Compose.

<a href="https://www.youtube.com/watch?v=LsNcbQzMs8s" target="_blank">https://www.youtube.com/watch?v=LsNcbQzMs8s</a>

---

## 📦 Docker Setup & Deployment

The entire demo runs with **Docker Compose** — no Node/npm or PHP installation is required on the host machine. All commands below can be **copied and pasted** sequentially in your terminal from the project root directory (after step 1.2).

### 1.1 Prerequisites

- **Docker Engine + Docker Compose v2** (latest).
- **Git**.

Verify that Docker is ready:

```bash
docker --version
docker compose version
```

### 1.2 Clone Repository

```bash
git clone git@github.com:chientrinh/demo-laravel-vue.git taskflow
cd taskflow
```

> Repository: `https://github.com/chientrinh/demo-laravel-vue.git` (Laravel 11 + Vue 3).
>
> All command blocks below should be run from the root `taskflow/` folder.

### 1.3 Start the Core Stack

```bash
docker compose -f docker/docker-compose.yml up -d --build
```

This starts MySQL, the backend (Apache/PHP 8.3), and the static frontend (Nginx, port 80). MySQL includes a healthcheck so the backend service will start only when the database is ready to accept connections.

### 1.4 Run Migrations & Seed Demo Data

```bash
docker exec taskflow-backend php artisan migrate --seed
```

Dependencies are already baked into the container image during build, and `APP_KEY` is pre-configured in `docker/docker-compose.yml`. The `migrate --seed` command sets up the tables and creates **6 demo accounts** along with sample tasks.

### 1.5 Start Frontend Development Server

```bash
docker compose -f docker/frontend/docker-compose.yml up -d --build --force-recreate
```

The frontend dev server runs on port **3000**. The `docker_default` network is already created by the core stack in step 1.3.

### 1.6 Access Points & Demo Accounts

| Component | URL |
| --- | --- |
| Dev Dashboard (Vite) | http://localhost:3000 |
| Static SPA (Nginx) | http://localhost:80 |
| REST API (Backend) | http://localhost:8080/api |
| Health Check | http://localhost:8080/api/health |

**Demo Accounts:**

| Email | Password | Role | Permissions |
| --- | --- | --- | --- |
| admin@taskflow.dev | password123 | admin | Read + write + manage users & tasks |
| olivia@taskflow.dev | password123 | admin | Read + write + manage users & tasks |
| phoenix@taskflow.dev | password123 | user | View and update assigned tasks only |
| lana@taskflow.dev | password123 | user | View and update assigned tasks only |
| demi@taskflow.dev | password123 | user | View and update assigned tasks only |
| candice@taskflow.dev | password123 | user | View and update assigned tasks only |

> **Note on demo data:** The seeder creates 6 accounts. If the dashboard appears empty, ensure you are logged in and check task assignments.

### 1.7 Quick Verification

```bash
curl http://localhost:8080/api/health            # Verify backend + database connectivity
docker exec taskflow-backend php artisan migrate:status
```

### 1.8 View Logs

```bash
docker compose -f docker/docker-compose.yml logs -f
docker compose -f docker/frontend/docker-compose.yml logs -f
```

### 1.9 Stop & Cleanup

```bash
# Stop frontend dev server
docker compose -f docker/frontend/docker-compose.yml down

# Stop core stack (MySQL + Backend + Static Nginx), preserving database data
docker compose -f docker/docker-compose.yml down

# Stop and REMOVE all data volumes (caution: deletes database)
docker compose -f docker/docker-compose.yml down -v
```

### 1.10 Troubleshooting

| Symptom | Solution |
| --- | --- |
| `network docker_default not found` | Run `docker compose -f docker/docker-compose.yml up -d` first to allow Compose to create `docker_default` (do not create manually) |
| Port 3000/8080/80 already in use | Run `docker ps` to find and stop conflicting processes, or adjust ports in the compose files |
| `error mounting ... docker-desktop-bind-mounts ... no such file` | Stale WSL2 bind mount. Run `docker rm -f taskflow-frontend-dev` then rerun step 1.5 with `--force-recreate` |
| Backend database connection error | Verify `DB_HOST=mysql` and `DB_CONNECTION=mysql` in `docker/docker-compose.yml` (service `backend`) |
| Frontend CORS error | Ensure `VITE_API_PROXY_TARGET` correctly points to the backend container |
| Initial build takes longer | Normal behavior — Docker image installs PHP/Node dependencies; subsequent builds will use cache |

---

## 👋 Project Overview

### 1.1 Problem Statement

TaskFlow is a team task management system for software engineering teams, designed to answer key workflow questions on a single screen:

- Who is working on what, what is the task status, and what is the progress?
- Who is assigned to each task, and what are their permissions?
- Track sprint progress and identify overdue tasks.

Instead of fragmented tracking, the system records **every task**, **status**, **assignee**, and **priority** in real-time — ensuring a single source of truth.

### 1.2 Implemented Features

- **Authentication & Session Persistence:** Sanctum HttpOnly + SameSite session cookies for SPA (no tokens stored in JavaScript); page reload automatically restores session via cookies; backend also supports Bearer tokens for API clients.
- **Two-tier Role-Based Access Control:** `admin` manages all tasks and users; `user` can only view and update tasks assigned to them (cannot reassign or delete tasks).
- **Home / Task List:** Task listing with status filters (todo/in_progress/done/cancelled), priority filters, and search by title.
- **Task CRUD:** Frontend enforces title ≤ 120, description ≤ 2000; backend validation limits are title ≤ 255, description ≤ 5000.
- **Task Assignment:** Admins can assign tasks to any user; regular users only view their assigned tasks.
- **Deletion Safeguards:** Only `admin` can delete tasks; administrators cannot self-delete, self-demote, or delete the last remaining admin.
- **UI:** Vuetify 3 (Material Design) + Tailwind CSS.
- **API Documentation:** Comprehensive API docs located in `docs/backend/api/`.
- **Health Check:** `/api/health` endpoint with database ping.

### 1.3 Architecture

3-tier monorepo, each with its own Docker configuration:

```
taskflow/
├── frontend/        # Vue 3 — UI, modular architecture + ports & adapters
├── backend/         # Laravel 11 — REST API, controller → service → repository → Eloquent
├── docker/          # Dockerfile + docker-compose for each layer
└── docs/            # Specifications, ADRs, design documentation (source of truth)
```

**Frontend** organized by feature modules (`src/modules/<feature>/`):

```
ui/<area> → application/services + stores (Pinia) → data/repositories → adapters/infrastructures (axios)
```

- `app/` is for composition only; business logic resides inside `modules/`.
- App-shared (`src/shared/`): UI primitives, providers, utilities, constants.
- HTTP infrastructure isolated in `src/adapters/` (ports & adapters) — modules do not directly depend on axios.

**Backend** follows the *skinny controller, fat service, DB-isolated repository* pattern:

```
Controller → Service → Repository → Eloquent → MySQL
```

- FormRequest for all input validation.
- `auth:sanctum` → `role:admin` middleware; ownership checks in policies (`TaskPolicy`, `UserPolicy`).
- All errors returned in a **unified envelope** `{ status_code, code, message, errors, details, path, timestamp }`; client logic checks error `code` rather than parsing error messages.

### 1.4 Core APIs

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/api/login` | Public — authenticate & set session cookie + return user |
| POST | `/api/register` | Public — register user & set session cookie |
| POST | `/api/logout` | Revoke session (requires authentication) |
| GET | `/api/me`, `/api/user` | Current user profile |
| GET/POST | `/api/tasks`, GET/PUT/PATCH/DELETE `/api/tasks/{id}` | Task management |
| GET/POST | `/api/users`, GET/PUT/PATCH/DELETE `/api/users/{id}` | User management (admin only) |
| GET | `/api/health` | Health check (includes database ping) |

### 1.5 Technical Highlights

- **Sanctum SPA Auth (HttpOnly Cookie):** SPA authenticates via `HttpOnly` + `SameSite` session cookies (no token in JS memory/localStorage) to mitigate XSS; backend also supports Bearer tokens for API clients.
- **Code-based Error Handling:** Consistent envelope `{ status_code, code, message, errors, details, path, timestamp }` with stable machine-readable codes (`VALIDATION_ERROR`, `DUPLICATE_EMAIL`, `FORBIDDEN`…), enabling frontend branching on `code`.
- **Repository Pattern:** `Repository` interfaces isolate Eloquent DB queries; services contain pure business logic for testability and maintainability.
- **Centralized Authentication:** Sanctum handles auth on the backend; SPA uses HttpOnly cookies, API clients use `Authorization: Bearer`.
- **Validation Boundaries:** Coordinated limits between frontend forms and backend validation (task title 120 frontend / 255 backend; description 2000 / 5000; page size 10 / 20).
- **Modern UI:** Built with Vuetify 3 and Tailwind CSS.
- **Unit Testing:** Backend test suite (30 tests, 152 assertions) runs in-memory with SQLite inside Docker.
- **Frontend Testing:** 14 Vitest unit/component tests, 2 Playwright E2E tests.

### 1.6 Testing

```bash
# Backend tests (30 tests, 152 assertions)
docker exec -e DB_CONNECTION=sqlite -e DB_DATABASE=:memory: taskflow-backend php artisan test
docker exec -e DB_CONNECTION=sqlite -e DB_DATABASE=:memory: taskflow-backend php artisan test --filter=UserTest
docker exec taskflow-backend ./vendor/bin/pint

# Frontend tests (14 Vitest tests)
cd frontend
npm run type-check
npx vitest run
npm run test:e2e
npm run build
```

`npm run test:unit` runs Vitest in watch mode. Baseline: 14 Vitest tests.

### 1.7 Documentation

All specifications, API contracts, data models, and ADRs reside in the [`docs/`](docs/) directory:

- [`docs/AGENT_INSTRUCTIONS.md`](docs/AGENT_INSTRUCTIONS.md) — Entrypoint and documentation routing.
- [`docs/backend/`](docs/backend/) — API contract, architecture, database, security, testing.
- [`docs/frontend/`](docs/frontend/) — SPA architecture, routing, state, data flow, forms, design system, testing.
- [`docs/features/`](docs/features/) — Feature behavior and acceptance criteria.
- [`docs/operations/`](docs/operations/) — Docker, environments, migrations, security, troubleshooting.
- [`docs/adr/`](docs/adr/) — Architecture Decision Records history.

### 1.8 License

Personal demo project for technical evaluation and learning.