# Environments — TaskFlow

This document summarises the **current** environments used throughout the TaskFlow project (development, CI, production‑preview). The **configuration files** (`.env.example`, `docker-compose.yml`, `vite.config.ts`, `phpunit.xml`) are the single source of truth; this page exists to help contributors understand how each environment is set up and how to switch between them.

## 1. Development environment (local + Docker)

- **Purpose** – Daily developer work: coding, running tests, manual exploration.
- **Stack** – Docker Compose (root stack) + host‑side Vite (optional).
- **How to start**

  ```bash
  # From the repository root
  cp backend/.env.example backend/.env
  cp frontend/.env.example frontend/.env

  # Edit .env files as needed (see docs/operations/configuration.md)
  
  docker compose -f docker/docker-compose.yml up -d --build mysql backend frontend
  ```

- **Environment variables** – see `docs/operations/configuration.md` for the full list; the most critical are:

  - `VITE_USE_MOCK` – set to `"false"` to call the real Laravel API; any other value (or unset) uses the localStorage mock.
  - `VITE_API_PROXY_TARGET` – on the host, set to `http://localhost:8080` to reach the API gateway instead of the Docker internal `http://backend:8000`.
  - `DB_CONNECTION`, `DB_HOST`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD` – backend database access.

- **Ports**

  - `3000` – Vite dev server (inside container) / static SPA if built.
  - `8080` – API gateway (backend service) exposed to the host.
  - `3307` – MySQL port forwarded from the host (useful for tools like DataGrip).

- **Mock mode** – by default `VITE_USE_MOCK` is not set to `"false"`; the frontend uses the `localStorage`‑backed mock database (`ttm.mock.db.v1`). To test against the real backend, set `VITE_USE_MOCK=false` in `frontend/.env` and restart the frontend service.

- **Typical developer workflow**

  1. `docker compose up -d` (starts MySQL, backend, frontend).
  2. `docker exec -e DB_CONNECTION=sqlite -e DB_DATABASE=:memory: taskflow-backend php artisan test` (runs PHPUnit with SQLite).
  3. `npm run dev` (if running Vite on the host) or rely on the container’s built‑in dev server.
  4. Browse to `http://localhost:3000` for the UI, `http://localhost:8080/api` for the API.

## 2. CI environment (GitHub Actions)

- **Purpose** – Automated test suite on every push / PR.
- **Stack** – GitHub Actions runners; **no Docker** is used for the backend test run; instead the PHPUnit suite is executed inside a temporary container via `docker exec` *only* when the workflow step invokes it, or the suite runs using the host’s PHP (which lacks `dom`/`xmlwriter`, so the CI step is allowed to fail). The baseline command referenced in `CONTRIBUTING.md` is:

  ```bash
  docker exec -e DB_CONNECTION=sqlite -e DB_DATABASE=:memory: taskflow-backend php artisan test
  ```

  This command is **not** run by default in the GitHub Actions workflow because the runner does not have Docker; the workflow step is marked “allowed to fail” and relies on the host PHPUnit if available, or simply runs `vendor/bin/pint` for style checks.

- **Node version** – the workflow uses Node 20 (`actions/setup-node@v3` with version `20`), but `frontend/package.json` requires `^22.18.0 || >=24.12.0`. This mismatch is tracked; the `npm run lint` step (`oxlint . && eslint .`) may still run, but the `npm run type-check` step may be skipped or produce warnings.

- **Test commands** (as defined in `package.json`)

  ```bash
  npx vitest run               # unit tests (baseline: 14 tests)
  npm run test:e2e             # Playwright e2e (requires Docker‑compose‑started dev stack)
  npm run test:unit            # watch mode (not typically in CI)
  npm run build                # build the static SPA (artifacts uploaded as a workflow artifact)
  ```

- **CI artefacts** – the `npm run build` step produces `frontend/dist/` which is uploaded as a `dist` artifact; the workflow may also upload `phpunit.xml` or test results for inspection.

## 3. Production‑preview / staging environment

- **Purpose** – A temporary environment to demo the latest changes to stakeholders before a release to production.
- **How it’s created** – Typically a **transient** Docker Compose up with the desired branch’s code, or a hosted platform (e.g., Vercel, Netlify) for the frontend and a platform‑as‑a‑service for the backend.
- **Environment variables** – Same set as development, but often with `VITE_USE_MOCK=false` and a pointing‑to a staging backend URL via `VITE_API_BASE_URL`.

- **Typical command (Docker‑based)**

  ```bash
  # Spin up a fresh environment using the current branch’s code
  git stash
  git checkout feature-branch
  cp backend/.env.example backend/.env
  cp frontend/.env.example frontend/.env
  # Override backend URL to staging
  echo "VITE_API_BASE_URL=http://staging.api.taskflow.dev" >> frontend/.env
  docker compose -f docker/docker-compose.yml up -d --build
  ```

- **Tear‑down**

  ```bash
  docker compose -f docker/docker-compose.yml down -v
  git stash pop
  ```

## 4. Summary of environment differences

| Feature | Development | CI | Production‑preview |
|---|---|---|---|
| **Docker** | Full root stack (mysql + backend + frontend) | Docker exec only (no full stack) | Full stack (often transient) |
| **Mock mode** | On by default (`VITE_USE_MOCK` unset) | Off (tests rely on host PHP or mocked) | Usually off (`VITE_USE_MOCK=false`) |
| **PHP unit tests** | `docker exec ... php artisan test` (SQLite) | Host PHP (allowed to fail) | `docker exec ... php artisan test` (SQLite) |
| **Frontend tests** | `npx vitest run` (jsdom) | `npx vitest run` (may fail on Node version mismatch) | `npx vitest run` |
| **Frontend build** | `npm run dev` (hot reload) | `npm run build` (artifact) | `npm run build` (serve static) |
| **Ports** | 3000 (Vite), 8080 (API), 3307 (MySQL) | N/A (host tools) | 80 (static) + optionally 8080 |

## 5. Switching between environments

- **Toggle mock mode** – edit `frontend/.env` and set/remove `VITE_USE_MOCK=false`.
- **Change API base URL** – edit `frontend/.env` `VITE_API_BASE_URL` or set `VITE_API_PROXY_TARGET` on the host.
- **Switch databases** – modify `backend/.env` `DB_CONNECTION` (`mysql` vs `sqlite`) and run the appropriate migration/seeder commands.
- **Enable/disable throttling** – the rate limits are defined in `routes/api.php`; they are always active; there is no feature flag in the environment.

## 6. Links

- [Configuration](operations/configuration.md) – detailed env‑var reference.  
- [Docker backend](operations/docker-backend.md) – how the backend container is built and run.  
- [Docker frontend](operations/docker-frontend.md) – how the frontend container is built and run.  
- [Backend coding conventions](backend/coding-conventions.md) – PHP standards.  
- [Frontend coding conventions](frontend/coding-conventions.md) – Vue/TS standards.  
- [CI workflow] (`.github/workflows/ci.yml`) – the actual GitHub Actions definition (not a doc file but the source of truth for CI behaviour).

---

*If any environment variable or command changes, update both the `.env.example` files and this documentation file in the same pull request to keep the environments consistent.*