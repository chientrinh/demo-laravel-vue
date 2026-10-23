# Frontend Documentation — Vue 3 SPA (TaskFlow)

This directory contains the documentation for the Vue 3 single‑page application of **TaskFlow**. All UI behaviour, component contracts, data‑fetching patterns and test expectations are defined by the actual source code in `frontend/src/`. The documents here exist to explain, summarise and guide — they are never the source of truth.

## Quick start for contributors

The development frontend runs inside Docker on port 3000 and proxies `/api` and `/sanctum` (the Sanctum CSRF cookie endpoint) to the backend container.

```bash
# From the repository root
docker compose -f docker/frontend/docker-compose.yml up -d --build
```

The app is available at <http://localhost:3000>. The browser reaches the API through the Vite proxy: `VITE_API_BASE_URL` defaults to `/api`, and the proxy target is set with `VITE_API_PROXY_TARGET` (default `http://backend:8000`). Set `VITE_USE_MOCK=false` in `frontend/.env` to call the real backend instead of the localStorage mock.

If you need to run the frontend on the host (e.g. for host‑side Vite debugging):

```bash
cd frontend
npm ci          # install dependencies
npm run dev     # Vite dev server; /api and /sanctum proxy to http://backend:8000 by default
# To override the proxy target:
VITE_API_PROXY_TARGET=http://localhost:8080 npm run dev
```

**Mock mode** is the default. To disable it, ensure `VITE_USE_MOCK=false` is set (exact string, case‑sensitive). Without that flag the app will use `localStorage`‑backed mock data (`ttm.mock.db.v1`).

## Documentation index

| Document | What you’ll find |
|---|---|
| [README.md](README.md) | Overview, stack, quick‑start, URLs, API at a glance, tests, known issues |
| [architecture.md](architecture.md) | App setup, router, guards, Vuetify configuration, module structure |
| [architecture-decisions.md](architecture-decisions.md) | Key architectural decisions and their current status |
| [coding-conventions.md](coding-conventions.md) | Vue/TS conventions, component patterns, styling, testing |
| [folder-structure.md](folder-structure.md) | Target directory layout and owner responsibilities |
| [routing.md](routing.md) | Exact route tree, guard logic, admin‑only routes |
| [state-management.md](state-management.md) | Pinia stores, getters, actions, module organisation |
| [data-fetching.md](data-fetching.md) | HTTP client (`HttpClient`), API error envelope, mock mode, axios aliases |
| [api-integration.md](api-integration.md) | How the SPA talks to the Laravel JSON API (DTO ↔ domain model mapping). |
| [forms-and-validation.md](forms-and-validation.md) | Vue form handling, validation libraries, client‑side vs server‑side rules. |
| [design-system.md](design-system.md) | Vuetify theme, Tailwind usage, shared components, mock HTML assets. |
| [testing.md](testing.md) | Vitest / Playwright test commands, baseline, mock mode considerations. |
| [feature-development-guide.md](feature-development-guide.md) | Step‑by‑step guide for adding a new frontend feature. |

## Local development

The frontend is developed inside the Docker service `frontend`. Do **not** run `npm test` or `npm run build` on the host without first copying the built output to `docker/frontend/dist/` if you intend to serve port 80.

```bash
# From the repository root (once Docker is up)
docker compose -f docker/frontend/docker-compose.yml up -d --build
```

Inside the container the dev server is reachable at <http://localhost:3000>. The `VITE_USE_MOCK` flag in `frontend/.env` controls whether the app talks to the real backend or uses the localStorage mock.

## Error envelope (API)

All API errors follow the shape defined in the Laravel backend (`bootstrap/app.php`):

```json
{
  "status_code": 422,
  "code": "VALIDATION_ERROR",
  "message": "The title field is required.",
  "errors": { "title": ["The title field is required."] },
  "details": { "title": ["The title field is required."] },
  "path": "api/tasks",
  "timestamp": "2026-..."
}
```

The backend envelope uses `status_code`; the frontend `HttpClient` reads `statusCode` and falls back to the Axios HTTP status (`response.status`) when it is absent, so the correct status is still surfaced.

## Known issues

- **Mock mode** is enabled by default (`VITE_USE_MOCK` not set to `false`). Set `VITE_USE_MOCK=false` to call the real Laravel API.
- **CI uses Node 20** while `frontend/package.json` requires `^22.18.0 || >=24.12.0`; this is a known version mismatch, not a blocker.
- **CI references `phpcs`**, but the backend only installs Pint. The style step is allowed to fail.
- The static frontend on port 80 is not rebuilt automatically; run `npm run build` in `frontend/` and copy `frontend/dist/*` to `docker/frontend/dist/` then restart the frontend stack.
- Login and registration are throttled to five requests per minute; a `429` response during repeated manual testing is expected.

## Links

- [Backend API overview](../docs/backend/api/overview.md) – full contract, pagination, error envelope.
- [Architecture decisions](architecture-decisions.md) – key choices and current status.
- [CONTEXT.md](../CONTEXT.md) – canonical domain glossary.
- [AGENTS.md](../AGENTS.md) – entrypoint and documentation routing.