# Frontend Folder Structure

This document describes the target directory structure for the Team Task Manager frontend. Each folder's responsibility, ownership, and current status are documented.

> **Current scaffold:** only `src/App.vue`, `src/main.ts`, `src/router/index.ts`, `src/stores/counter.ts`, and `src/__tests__/App.spec.ts` exist. Everything below is the target structure; Vuetify, Matdash layouts, Axios, and the feature modules are not installed yet.

---

## Root Structure

```
frontend/
├── public/                 # Static assets served directly
├── src/
│   ├── app/                # Application composition
│   ├── adapters/           # Infrastructure adapters
│   ├── modules/            # Business features (domain-driven)
│   ├── shared/             # Reusable non-business code
│   ├── assets/             # Images, fonts, global assets
│   ├── App.vue
│   └── main.ts
├── .env.example            # Environment variable template
├── .env                    # Local environment (gitignored)
├── package.json
├── tsconfig.json
├── vite.config.ts
├── eslint.config.js
├── .prettierrc
└── README.md
```

---

## `src/app/` — Application Composition

**Owner:** Architecture team  
**Status:** New (to be created)  
**Mandatory:** Yes

```
app/
├── router/
│   ├── index.ts            # Root router, guards, registration
│   ├── routes.ts           # Route registration helper
│   └── guards.ts           # Auth/role route guards
├── plugins/
│   ├── vuetify.ts          # Vuetify init
│   ├── pinia.ts            # Pinia init
│   └── axios.ts            # Axios plugin (optional)
├── providers/
│   └── errorHandler.ts     # Global error handler (optional)
└── config.ts               # Runtime config (API URL, feature flags)
```

**What belongs here:**
- Vue Router instance and configuration
- Plugin initialization (Vuetify, Pinia, etc.)
- Global providers
- Application-level configuration

**What must NOT be here:**
- Business logic
- Feature-specific routes (those are registered in `app/router/`)
- Components or composables

---

## `src/adapters/` — Infrastructure Adapters

**Owner:** Architecture team  
**Status:** New (to be created)  
**Mandatory:** Yes

```
adapters/
└── infrastructures/
    ├── clients/
    │   └── HttpClient.ts       # Shared Axios instance
    └── interfaces/
        └── IHttpClient.ts      # Optional HTTP abstraction
```

**What belongs here:**
- HTTP client implementation
- External service adapters (e.g., analytics, Sentry)
- Technical interfaces for testing

**What must NOT be here:**
- Business API calls (those live in `modules/*/data/repositories/*.repository.ts`)
- Feature-specific logic

---

## `src/modules/` — Business Features

**Owner:** Feature teams  
**Status:** New (to be created)  
**Mandatory:** Yes (for each business feature)

### Standard Module Structure

```
modules/
├── auth/
│   ├── domain/
│   │   └── types.ts              # User, UserRole, AuthTokens
│   ├── application/
│   │   ├── stores/
│   │   │   └── auth.store.ts     # Pinia store: user, token, login, logout
│   │   └── services/
│   │       └── auth.service.ts   # Auth use cases (login, logout, session)
│   ├── data/
│   │   ├── dtos/
│   │   │   └── login.dto.ts      # LoginRequest, LoginResponse
│   │   ├── mappers/
│   │   │   └── login.mapper.ts   # toDomain(), toDto()
│   │   └── repositories/
│   │       └── auth.repository.ts # API calls (login, logout, me)
│   ├── ui/
│   │   ├── pages/
│   │   │   └── LoginPage.vue
│   │   ├── components/
│   │   │   ├── LoginForm.vue
│   │   │   └── RegisterForm.vue
│   │   └── composables/
│   │       └── useAuth.ts        # Reactive auth state/actions
│   └── index.ts                  # Public API exports
│
├── tasks/
│   ├── domain/
│   │   └── types.ts              # Task, TaskStatus, TaskFilters
│   ├── application/
│   │   ├── stores/
│   │   │   └── tasks.store.ts    # (Optional) Pinia for shared task state
│   │   └── services/
│   │       └── tasks.service.ts  # Task use cases (list, get, create, update, delete)
│   ├── data/
│   │   ├── dtos/
│   │   │   ├── create-task.dto.ts
│   │   │   └── update-task.dto.ts
│   │   ├── mappers/
│   │   │   └── task.mapper.ts
│   │   └── repositories/
│   │       └── tasks.repository.ts
│   ├── ui/
│   │   ├── pages/
│   │   │   ├── TasksListPage.vue
│   │   │   └── TaskDetailPage.vue
│   │   ├── components/
│   │   │   ├── TasksTable.vue
│   │   │   ├── TaskForm.vue
│   │   │   ├── TaskStatusChip.vue
│   │   │   └── TaskFilters.vue
│   │   └── composables/
│   │       ├── useTasks.ts
│   │       └── useTaskForm.ts
│   └── index.ts
│
└── users/ (future)
    ├── domain/
    │   └── types.ts
    ├── application/
    │   ├── stores/
    │   └── services/
    ├── data/
    │   ├── dtos/
    │   ├── mappers/
    │   └── repositories/
    ├── ui/
    │   ├── pages/
    │   ├── components/
    │   └── composables/
    └── index.ts
```

**Per-Module Rules:**
- Each module is self-contained
- Public API only via `index.ts`
- No cross-module imports except via public APIs
- `domain/` has zero external dependencies
- `application/services/` orchestrates use cases and depends on repository contracts, not HTTP
- `application/stores/` holds Pinia state only (no direct API calls)
- `data/repositories/` is the only place that calls the HTTP client
- `data/dtos/` and `data/mappers/` translate between API payloads and domain models
- `ui/` contains all Vue-specific code (`pages/`, `components/`, `composables/`)
- Module routes are not defined inside the module; they are registered in `app/router/`

---

## `src/shared/` — Reusable Non-Business Code

**Owner:** Architecture/UI team  
**Status:** Planned (to be created)  
**Mandatory:** Yes

```
shared/
├── components/
│   ├── common/               # Generic UI states
│   │   ├── Loader.vue
│   │   ├── EmptyState.vue
│   │   ├── ErrorState.vue
│   │   └── ConfirmDialog.vue
│   ├── ui/                   # Vuetify wrappers
│   │   ├── BaseButton.vue
│   │   ├── BaseInput.vue
│   │   ├── BaseSelect.vue
│   │   ├── BaseCard.vue
│   │   └── BaseTable.vue
│   └── form/                 # Form-specific
│       ├── FormField.vue
│       ├── FormError.vue
│       └── FormActions.vue
├── layouts/
│   ├── blank/
│   │   └── BlankLayout.vue   # Auth pages layout
│   └── full/
│       ├── FullLayout.vue    # Main app shell
│       ├── Topbar.vue
│       ├── Main.vue
│       ├── logo/
│       │   └── Logo.vue
│       ├── vertical-sidebar/
│       │   ├── NavItem/
│       │   ├── NavGroup/
│       │   ├── NavCollapse/
│       │   ├── UpgradeBox/
│       │   └── sidebarItem.ts
│       └── vertical-header/
│           ├── NotificationDD.vue
│           └── ProfileDD.vue
├── composables/
│   ├── useDebounce.ts
│   ├── useLocalStorage.ts
│   ├── useToast.ts
│   ├── useConfirm.ts
│   └── useMediaQuery.ts
├── constants/
│   ├── app.ts
│   ├── routes.ts
│   └── validation.ts
├── types/
│   ├── api.ts                # ApiError, PaginatedResponse
│   ├── common.ts             # Shared enums, Branded types
│   └── utils.ts              # Utility types
├── utils/
│   ├── date.ts               # formatDate, parseDate
│   ├── string.ts             # truncate, slugify
│   ├── currency.ts           # formatCurrency
│   └── validation.ts         # Validators
└── styles/
    ├── style.scss            # Main entry (imported in main.ts)
    ├── variables.scss        # Colors, spacing, breakpoints
    ├── mixins.scss
    ├── reset.scss
    ├── typography.scss
    ├── utilities.scss
    └── components/           # Shared component styles
```

**Placement Notes:**
- Generic building blocks → `shared/components/ui/`
- Cross-feature states and dialogs → `shared/components/common/`
- Design system primitives → `shared/components/ui/`
- Global layouts → `shared/layouts/` (no root `src/layouts/`)
- Global styles → `shared/styles/` (no root `src/scss/` or `src/styles/`)
- Global declarations → `shared/types/` (no root `src/types/`)

---

## `src/assets/` — Static Assets

**Owner:** UI team  
**Status:** Planned (to be created)  
**Mandatory:** Yes

```
assets/
├── images/
│   ├── logos/
│   ├── illustrations/
│   └── placeholders/
├── fonts/
└── icons/
```

---

## File/Folder Status Summary

| Path | Status | Action |
|------|--------|--------|
| `src/App.vue` | Existing | Keep |
| `src/main.ts` | Existing | Keep; wire plugins when added |
| `src/router/` | Legacy scaffold | Replace with `src/app/router/` |
| `src/stores/counter.ts` | Demo | Remove |
| `src/__tests__/App.spec.ts` | Existing | Keep; move under `tests/` if desired |
| `src/app/` | Planned | Create |
| `src/adapters/` | Planned | Create |
| `src/modules/` | Planned | Create per feature |
| `src/shared/` | Planned | Create as code is reused; owns layouts, styles, and global types |
| `src/assets/` | Planned | Create when assets are added |

---

## Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Directories | kebab-case | `modules/tasks/data/repositories/` |
| Vue Pages | PascalCase + `Page` suffix | `TasksListPage.vue` |
| Vue Components | PascalCase | `TasksTable.vue` |
| Composables | camelCase + `use` | `useTasks.ts` |
| Pinia Stores (files) | kebab-case + `.store.ts` | `auth.store.ts` (exports `useAuthStore`) |
| Services (files) | kebab-case + `.service.ts` | `auth.service.ts` |
| Repositories (files) | kebab-case + `.repository.ts` | `auth.repository.ts` |
| DTOs (files) | kebab-case + `.dto.ts` | `login.dto.ts` (type `LoginDto`) |
| Mappers (files) | kebab-case + `.mapper.ts` | `login.mapper.ts` |
| Types/Interfaces | PascalCase | `Task`, `TaskStatus` |
| DTOs | PascalCase + `Dto` suffix | `LoginDto`, `CreateTaskDto` |
| Repository Methods | camelCase | `findAll()`, `create()` |
| Utils | camelCase | `formatDate.ts` |
| Constants | UPPER_SNAKE_CASE | `MAX_FILE_SIZE` |