# 0001 — Fullstack: Laravel 11 API + Vue 3 SPA

- **Status:** Accepted
- **Date:** 2024‑10‑22
- **Decision‑maker:** Team Lead

## Context

Need to build the Team Task Manager fullstack application. Requirements:

- Backend: REST API, authentication, authorisation, task CRUD
- Frontend: SPA, reactive UI, Material Design, responsive
- Team familiar with PHP/Laravel and TypeScript/Vue

## Decision

We will use **Laravel 11** for the backend API and **Vue 3 + Vuetify 3** for the frontend SPA.

- **Backend:** Laravel 11, PHP 8.3, MySQL 8, Sanctum, REST API
- **Frontend:** Vue 3.5, TypeScript 5.8, Vuetify 3.7, Vite 5, Pinia, Vue Router 4
- **Styling:** CSS Variables + Vuetify theme + optional TailwindCSS
- **Build:** Vite 5, ESLint + Prettier + Laravel Pint

## Considered Alternatives

| Alternative | Advantages | Disadvantages | Why rejected |
|-----------|------------|---------------|--------------|
| Laravel + Inertia + Vue | Single repo, less boilerplate | Less frontend control, harder to separate deploy | Need clear backend/frontend split |
| Laravel + Livewire | Full PHP, no JS needed | Poor UX, hard to make complex UI | Requires SPA reactive approach |
| Node.js (NestJS/Express) + Vue | All JS/TS | Team stronger in PHP | Leverage Laravel strengths |
| Go + Vue | High performance | High learning curve | Not suited to team size |

## Consequences

**Positive:**

- Clear separation of backend/frontend
- Strong Laravel ecosystem for auth, queue, scheduler
- Vue 3 Composition API + TypeScript type‑safety
- Vuetify 3 Material Design ready to use

**Negative / Trade‑offs:**

- Two separate repos/processes (dev server, build, deploy)
- Need to sync API contract between the two sides
- CORS, auth token management more complex than a monolith

**Follow‑up work:**

- Set up Sanctum token auth + CORS
- Define clear API contract (OpenAPI/Swagger)
- Set up CI/CD for both sides

## Related

- [ADR‑002: Sanctum Token Auth](./0002-sanctum-token-auth.md)
- [ADR‑003: Vuetify 3 Material Design](./0003-vuetify3-material-design.md)
- [ADR‑004: Modular Architecture](./0004-modular-architecture.md)

### Implementation note (2026‑10‑23)

The current stack has been updated to: Laravel 11, PHP 8.3, Vue 3.5.42, TypeScript 6, Vite 5.0.4, Vuetify 3.13.7, Pinia 4.0.3, Vue Router 5.3.1. The API contract is defined by the routes in `routes/api.php` and the OpenAPI documentation generated from the resources. The frontend uses Pinia stores under `src/modules/` and the HttpClient in `src/adaptors/infrastructures/clients/HttpClient.ts` with mock mode fallback (`VITE_USE_MOCK`). The Vuetify theme is configured in `src/app/plugins/vuetify.ts` with primary colour `#6C31DE`.