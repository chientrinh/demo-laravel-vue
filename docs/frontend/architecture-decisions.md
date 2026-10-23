# Architecture Decisions

This document records key architectural decisions for the Team Task Manager frontend.

---

## ADR-001: Business Code Under `modules/`

**Date:** 2024-01-15  
**Status:** Accepted

### Context

We need to organize business features (auth, tasks, users) in a way that scales and maintains clear boundaries.

### Decision

Place each business feature under `src/modules/` with a standard internal structure:
```
modules/
├── auth/
├── tasks/
└── users/
```

Each module contains:
- `domain/` — Business types and rules
- `application/stores/` — Pinia state containers
- `application/services/` — Use cases and orchestration
- `data/repositories/` — API access
- `data/dtos/` and `data/mappers/` — API contracts and transformations
- `ui/pages/`, `ui/components/`, `ui/composables/` — Vue presentation
- `index.ts` — Public API

Feature routes are registered in `app/router/`, not inside the module.

### Consequences

**Positive:**
- Clear feature boundaries
- Self-contained modules
- Easy to find related code
- Supports team ownership per module

**Negative:**
- More directories initially
- Requires discipline to maintain public API

**Mitigation:** Enforce via linting and code review.

---

## ADR-002: Reusable Non-Business Code in `shared/`

**Date:** 2024-01-15  
**Status:** Accepted

### Context

Need a place for genuinely reusable code that isn't feature-specific.

### Decision

Create `src/shared/` for cross-cutting concerns:

| Folder | Purpose |
|--------|---------|
| `components/common/` | Loader, EmptyState, ErrorState |
| `components/ui/` | Vuetify wrappers (BaseButton, BaseInput) |
| `components/form/` | FormField, FormError |
| `composables/` | useDebounce, useToast, useLocalStorage |
| `layouts/` | Application layouts (full, blank) |
| `styles/` | Global SCSS and theme variables |
| `types/` | ApiError, PaginatedResponse, global declarations |
| `utils/` | Date, string, currency helpers |
| `constants/` | App-wide constants |

### Rules

1. `shared/` **never** imports from `modules/`
2. Only genuinely reused code (≥2 features) goes here
3. Vuetify infrastructure stays in `shared/layouts/`, `shared/styles/`, `theme/`, `app/plugins/`

### Consequences

**Positive:**
- Clear separation of concerns
- Reuse without feature coupling
- Easy to test in isolation

**Negative:**
- Temptation to over-generalize
- "Shared" can become a junk drawer

**Mitigation:** Require ≥2 consumers before moving to `shared/`.

---

## ADR-003: External Communication in `adapters/`

**Date:** 2024-01-15  
**Status:** Accepted

### Context

Need a clear boundary for external systems (HTTP, analytics, Sentry).

### Decision

Place infrastructure implementations in `src/adapters/infrastructures/`:

```
adapters/
└── infrastructures/
    ├── clients/
    │   └── HttpClient.ts      # Axios instance
    └── interfaces/
        └── IHttpClient.ts     # Optional abstraction
```

### Rules

- Feature modules import `httpClient` from adapters
- Feature-specific API calls stay in `modules/*/data/repositories/*.repository.ts`
- Adapters never import from `modules/`

### Consequences

**Positive:**
- Single HTTP configuration
- Easy to swap/mock for testing
- Clear external boundary

**Negative:**
- Extra indirection for simple apps

**Mitigation:** Only add abstraction when needed (testing, multiple backends).

---

## ADR-004: When `domain/`, `application/`, `data/` Are Necessary

**Date:** 2024-01-15  
**Status:** Accepted

### Context

Not every feature needs all three layers. When to use each?

### Decision

| Layer | When Required | When Optional |
|-------|---------------|---------------|
| `domain/` | Always — types are the contract | Never |
| `data/` | Always — API boundary exists | Never |
| `application/` | Complex orchestration, multi-API, cross-entity rules | Simple CRUD pass-through |

### Simple Feature (e.g., static content)

```
modules/content/
├── domain/types.ts
├── data/repositories/content.repository.ts
├── ui/pages/ContentViewPage.vue
└── index.ts
```

### Complex Feature (e.g., tasks with status transitions, permissions)

```
modules/tasks/
├── domain/types.ts, rules.ts
├── application/services/tasks.service.ts
├── application/stores/tasks.store.ts
├── data/repositories/tasks.repository.ts
├── data/dtos/create-task.dto.ts, update-task.dto.ts
├── data/mappers/task.mapper.ts
├── ui/pages/TasksListPage.vue, TaskDetailPage.vue
├── ui/composables/useTasks.ts, useTaskForm.ts
└── index.ts
```

### Consequences

**Positive:**
- Right-sized architecture per feature
- Avoids over-engineering simple features
- Clear escalation path as features grow

---

## ADR-005: Vue Uses `composables/` (Not `hooks/`)

**Date:** 2024-01-15  
**Status:** Accepted

### Context

Vue 3 Composition API uses "composables" — not "hooks" (React terminology).

### Decision

- Directory: `ui/composables/`
- File naming: `useTasks.ts`, `useTaskForm.ts`
- Export: `export function useTasks() { ... }`
- Never use `hook` prefix or `hooks/` directory

### Consequences

**Positive:**
- Consistent with Vue ecosystem
- Clear Vue 3 terminology
- Avoids React confusion

---

## ADR-006: Vuetify Infrastructure Reuse

**Date:** 2024-01-15  
**Status:** Accepted

### Context

The app shell, layouts, theme, and Vuetify configuration provide reusable infrastructure for the Team Task Manager.

### Decision

**Retain Vuetify infrastructure as-is:**

| Infrastructure | Purpose |
|----------------|---------|
| `shared/layouts/full/` | Main application shell |
| `shared/layouts/blank/` | Auth pages layout |
| `app/plugins/vuetify.ts` | Vuetify configuration |
| `theme/` | Theme definition |
| `shared/styles/` | Global styles |
| `components/style-components/` | Design system primitives |

Business features live in `modules/` and compose these primitives through `shared/components/` when reuse is needed.

### Consequences

**Positive:**
- No regression risk to the application shell
- Faster delivery of business features
- Consistent visual language across modules

**Negative:**
- Template-specific layout components add surface area inside `shared/`

**Mitigation:** Keep layout changes minimal; keep demo content out of `shared/layouts/`.

---

## ADR-007: Authentication and Role-Aware UI Organization

**Date:** 2024-01-15  
**Status:** Accepted

### Context

Need to handle auth state, route protection, and role-based UI.

### Decision

**Auth Module (`modules/auth/`):**
- Pinia store: `useAuthStore` in `application/stores/auth.store.ts` (user, token, login, logout, init)
- Composable: `useAuth` (reactive access to store)
- Components: `LoginForm`, `RegisterForm`
- Route guards in `app/router/guards.ts`

**Role Handling:**
- Backend: `role` column on users table (admin/user)
- Frontend: `authStore.userRole` computed
- UI: Conditional rendering (`v-if="isAdmin"`)
- Routes: `meta.roles: ['admin']`

**Critical Principle:**
> Frontend route guards and hidden buttons are **not security boundaries**. Laravel backend enforces authorization via Policies/Gates.

### Consequences

**Positive:**
- Clear auth ownership
- Separation of auth logic from business features
- Backend remains security authority

---

## ADR-008: When Simpler Structure Is Preferable

**Date:** 2024-01-15  
**Status:** Accepted

### Context

Not every file needs the full module structure.

### Decision

**Skip layers when:**
- Feature has no API (static content)
- Feature is a single component
- Feature has no business rules

**Examples:**

```
# Static page — no application/, no composables
modules/about/
├── domain/types.ts
├── data/repositories/about.repository.ts
├── ui/pages/AboutPage.vue
└── index.ts

# Simple component — no module needed
shared/components/ui/BaseButton.vue
```

### Consequences

**Positive:**
- Avoids ceremony for simple features
- Easier to understand and maintain
- Can evolve to full structure later

---

## ADR-009: Pinia Store Location

**Date:** 2024-01-15  
**Status:** Accepted

### Context

Where should Pinia stores live?

### Decision

| Store | Location | Reason |
|-------|----------|--------|
| `auth` | `modules/auth/application/stores/auth.store.ts` | Feature-specific, owns auth state |
| `ui` (toasts, sidebar) | `shared/stores/ui.store.ts` | Cross-cutting UI state |
| `app` (config, theme) | `shared/stores/app.store.ts` | Cross-cutting app state |
| `tasks` | `modules/tasks/application/stores/tasks.store.ts` | Only if genuinely shared across routes |

**Rule:** Feature state → feature module. Cross-cutting → shared.

---

## ADR-010: Co-located Tests

**Date:** 2024-01-15  
**Status:** Accepted

### Context

Where should tests live?

### Decision

**Co-located with source:**

```
modules/tasks/
├── ui/composables/
│   ├── useTasks.ts
│   └── useTasks.test.ts
├── ui/components/
│   ├── TasksTable.vue
│   └── TasksTable.test.ts
└── application/stores/
    ├── tasks.store.ts
    └── tasks.store.test.ts
```

**E2E tests:** `tests/e2e/` (Playwright)

**Benefits:**
- Easy to find tests for a feature
- Refactoring moves tests with code
- Clear ownership

---

## ADR-011: Co-located Types for Domain

**Date:** 2024-01-15  
**Status:** Accepted

### Context

Where should TypeScript types live?

### Decision

| Type | Location |
|------|----------|
| Domain types (Task, User) | `modules/*/domain/types.ts` |
| API DTOs | `modules/*/data/dtos/*.dto.ts` |
| Shared types (ApiError, PaginatedResponse) | `shared/types/api.ts` |
| Global env types | `shared/types/env.d.ts` |

**Rule:** Types travel with the feature that owns them. Only truly shared types go in `shared/types/`.

---

## ADR-012: Wrapper Components Threshold

**Date:** 2024-01-15  
**Status:** Accepted

### Context

When to wrap Vuetify components?

### Decision

**Only wrap when adding consistent behavior:**

| Wrap | Don't Wrap |
|------|------------|
| `BaseButton` — loading state, size variants, theme | `BaseCard` — no added behavior |
| `BaseInput` — validation integration, error display | `BaseSelect` — no added behavior |
| `BaseTable` — pagination, sorting, selection | `BaseDialog` — no added behavior |

**Rule:** If the wrapper only passes props through, use Vuetify directly.

---

## ADR-013: API Contract Documentation with Unverified Endpoints

**Date:** 2024-01-15  
**Status:** Accepted

### Context

Backend API endpoints don't exist yet.

### Decision

**Document frontend requirements with clear warnings:**

```markdown
| Endpoint | Status | Notes |
|----------|--------|-------|
| POST /api/login | ⚠️ Not implemented | Laravel Sanctum not installed |
| GET /api/tasks | ⚠️ Not implemented | No Task model/controller |
```

**Use MSW mocks** for frontend development. Backend team implements per documented contracts.

---

## ADR-014: Environment Variable Prefix

**Date:** 2024-01-15  
**Status:** Accepted

### Context

Vite only exposes `VITE_*` variables to client.

### Decision

```env
# .env.example
VITE_API_BASE_URL=http://localhost:8000/api
VITE_APP_TITLE=Team Task Manager
```

**Never** put secrets in `VITE_*`. Server-only secrets stay in Laravel `.env`.