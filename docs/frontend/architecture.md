# Frontend Architecture

The frontend is organized as a **feature-module architecture** with strict layering inside each module. Application composition lives in `app/`, technical infrastructure in `adapters/`, business features in `modules/`, and reusable non-business code in `shared/`.

---

## 1. Target Structure

```
frontend/src/
├── app/                    # Application composition (router, plugins, config)
│   ├── router/
│   ├── plugins/
│   ├── providers/
│   └── config.ts
├── adapters/               # Infrastructure adapters (HTTP client)
│   └── infrastructures/
├── modules/                # Business features (domain-driven)
│   ├── auth/
│   │   ├── domain/
│   │   ├── application/
│   │   ├── data/
│   │   ├── ui/
│   │   └── index.ts
│   ├── tasks/
│   │   ├── domain/
│   │   ├── application/
│   │   ├── data/
│   │   ├── ui/
│   │   └── index.ts
│   └── users/ (future)
├── shared/                 # Reusable non-business code
│   ├── components/
│   ├── layouts/
│   ├── composables/
│   ├── constants/
│   ├── types/
│   ├── utils/
│   └── styles/             # Global SCSS (Vuetify/Matdash theme)
├── assets/
├── App.vue
└── main.ts
```

### Module Internal Structure

```
modules/auth/
├── domain/
│   └── types.ts
├── application/
│   ├── stores/
│   │   └── auth.store.ts
│   └── services/
│       └── auth.service.ts
├── data/
│   ├── dtos/
│   │   └── login.dto.ts
│   ├── mappers/
│   │   └── login.mapper.ts
│   └── repositories/
│       └── auth.repository.ts
├── ui/
│   ├── pages/
│   │   └── LoginPage.vue
│   ├── components/
│   │   └── LoginForm.vue
│   └── composables/
│       └── useAuth.ts
└── index.ts
```

---

## 2. Dependency Direction

```
app/ (composition)
  │
  ▼
modules/*/ui/ (pages, components, composables)
  │
  ▼
modules/*/application/ (stores + services)
  │
  ├──────────────► modules/*/domain/ (types, pure rules)
  │
  ▼
modules/*/data/ (repositories, DTOs, mappers)
  │
  ▼
adapters/infrastructures/ (HTTP client, storage, ...)

shared/ (components, composables, utils, types)  ← imported by any layer above
```

**Rules:**
- `domain/` is innermost and imports nothing from `application/`, `data/`, or `ui/`
- `shared/` **never** depends on `modules/`
- `modules/*/ui/` depends on `shared/components/` but not vice versa
- `modules/*/data/` depends on `adapters/` for HTTP transport
- `modules/*/application/services/` depends on repositories, not on HTTP directly
- Cross-module imports only via `index.ts` public APIs

---

## 3. Layer Responsibilities

### 3.1 `app/` — Application Composition

| File | Responsibility |
|------|----------------|
| `app/router/` | Central Vue Router config, route registration, guards |
| `app/plugins/` | Vuetify, Pinia, other plugin initialization |
| `app/providers/` | Optional app-level providers (e.g., global error handler) |
| `app/config.ts` | Runtime configuration (API base URL, feature flags) |

Feature routes are **not** defined inside modules. They are registered in `app/router/` and point at `modules/*/ui/pages/`.

### 3.2 `adapters/infrastructures/` — Technical Adapters

| File | Responsibility |
|------|----------------|
| `clients/HttpClient.ts` | Shared Axios instance, interceptors, error normalization |
| `interfaces/IHttpClient.ts` | Optional HTTP abstraction for testing |

### 3.3 `modules/*/domain/` — Business Core

| Content | Examples |
|---------|----------|
| TypeScript interfaces | `Task`, `TaskStatus`, `User`, `UserRole` |
| Business enums | `TaskStatus = 'todo' \| 'in_progress' \| 'done'` |
| Pure validation rules | `isValidTaskStatus()`, `canUserEditTask()` |
| Domain events (if needed) | `TaskCreated`, `TaskAssigned` |

**Principles:**
- Zero dependencies on Vue, Vuetify, Axios, Pinia
- Pure TypeScript — testable in isolation
- Distinct from API DTOs and UI form state

### 3.4 `modules/*/application/` — Stores and Services

```
application/
├── stores/       # Pinia state containers
└── services/     # Use-case orchestration
```

| Content | Examples |
|---------|----------|
| Stores | `auth.store.ts`, `tasks.store.ts` — state, getters, actions |
| Services | `auth.service.ts`, `tasks.service.ts` — login, list, create |
| Business rule coordination | Check permissions, validate cross-entity rules |
| Transaction management | (If multiple writes needed) |

**Principles:**
- Stores hold Pinia state only; no direct HTTP calls
- Services orchestrate use cases and depend on repository contracts
- Services do not depend on Vue or Pinia
- Called by UI composables, not directly by page components

### 3.5 `modules/*/data/` — Data Access

| Path | Responsibility |
|------|----------------|
| `repositories/*.repository.ts` | API calls (`login()`, `findAll()`, `create()`) |
| `dtos/*.dto.ts` | Request/Response DTOs matching the API contract |
| `mappers/*.mapper.ts` | `toDomain()`, `toDto()` transformations |

**Rule:** Repositories are the only place that calls the HTTP client.

### 3.6 `modules/*/ui/` — Presentation

```
ui/
├── pages/              # Route-level page components
├── components/         # Feature-specific reusable components
└── composables/        # Reactive feature logic (useTasks, useTaskForm)
```

### 3.7 `modules/*/index.ts` — Public API

```typescript
// modules/tasks/index.ts
export { Task, TaskStatus } from './domain/types';
export { useTasks } from './ui/composables/useTasks';
export { TaskForm } from './ui/components/TaskForm';
// Do NOT export internals: dtos, mappers, repositories, services
```

### 3.8 `shared/` — Cross-Cutting Concerns

| Folder | Content |
|--------|---------|
| `components/common/` | Loader, EmptyState, ErrorState, ConfirmDialog |
| `components/ui/` | Button, Input, Select, Card, Table wrappers |
| `components/form/` | Reusable form controls with validation |
| `layouts/` | Shared application layouts |
| `composables/` | `useDebounce`, `useLocalStorage`, `useToast` |
| `constants/` | App-wide constants |
| `types/` | `ApiError`, `PaginatedResponse`, shared enums |
| `utils/` | Date formatting, currency, string helpers |
| `styles/` | Global SCSS entry, variables, mixins, reset, utilities |

---

## 4. Business Module Boundaries

### `auth` Module

**Owns:**
- Login/logout flows
- Token storage and refresh
- Current user session state
- Route guards for protected routes

**Public API:**
```typescript
export { useAuthStore } from './application/stores/auth.store';
export { useAuth } from './ui/composables/useAuth';
export { LoginForm } from './ui/components/LoginForm';
```

### `tasks` Module (Primary)

**Owns:**
- Task list, create, read, update, delete
- Filtering, search, pagination
- Task form (dialog)
- Task status transitions

**Public API:**
```typescript
export { Task, TaskStatus, TaskFilters } from './domain/types';
export { useTasks } from './ui/composables/useTasks';
export { useTaskForm } from './ui/composables/useTaskForm';
export { TasksTable, TaskForm, TaskStatusChip } from './ui/components';
```

### `users` Module (Future)

**Owns:**
- User list for assignee dropdown
- User profile (if needed)
- User management (admin only)

---

## 5. Shared Code Rules

1. **Genuine reuse only** — Don't move to `shared/` unless used by ≥2 modules
2. **No business dependencies** — `shared/` cannot import from `modules/`
3. **Vuetify infrastructure reuse** — Keep `shared/layouts/full/`, `theme/`, `app/plugins/vuetify.ts` as-is
4. **Wrapper threshold** — Only wrap Vuetify when adding consistent behavior (e.g., `BaseButton` with loading state)
5. **Composables over hooks** — Use `useXxx` naming, not `hookXxx`

---

## 6. Infrastructure Boundaries

| Layer | Allowed Imports |
|-------|-----------------|
| `domain/` | `shared/types/`, `shared/constants/`, TypeScript stdlib |
| `application/` | `domain/`, `data/repositories/`, `shared/utils/`, `shared/types/` |
| `data/` | `domain/`, `adapters/`, `shared/types/` |
| `ui/` | `application/`, `domain/`, `shared/components/`, `shared/composables/` |
| `adapters/` | `shared/types/`, `shared/utils/`, external libs (Axios) |
| `shared/` | Only external libs, no `modules/`, no `adapters/` |

---

## 7. Implementation Roadmap

### Phase 1: Foundation
- [ ] Install Pinia, Axios
- [ ] Create `app/`, `adapters/`, `shared/` structure
- [ ] Implement `HttpClient.ts` with interceptors
- [ ] Create `auth` module structure
- [ ] Implement auth repository, service, store, and login flow

### Phase 2: Task Module
- [ ] Create `tasks` module structure
- [ ] Implement task domain types
- [ ] Implement task DTOs, mappers, repository, and service
- [ ] Build `TasksListPage`, `TasksTable`, `TaskForm`
- [ ] Register task routes in `app/router/`

### Phase 3: Hardening
- [ ] Add testing setup
- [ ] Document unresolved API contracts
- [ ] Performance optimization
- [ ] Verify build, lint, typecheck pass
