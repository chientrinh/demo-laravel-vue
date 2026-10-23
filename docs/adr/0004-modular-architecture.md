# 0004 — Frontend Module‑Driven: `src/modules/<feature>/`

- **Status:** Accepted
- **Date:** 2024‑10‑22
- **Decision‑maker:** Frontend Lead

## Context

Need to organise Vue 3 code so that:

- Easy to find the logic of a feature
- Easy to test, maintain
- Avoid feature coupling
- Easy onboarding of new developers

## Decision

We will organise **all business logic per module** inside `src/modules/<feature>/`.

```
src/modules/
├── auth/
│   ├── domain/             # Types, enums, schema, business rules
│   ├── data/               # api.ts (HTTP only), dtos (optional)
│   ├── application/        # services/*.service.ts (use‑case), store/
│   ├── ui/                 # components/, hooks/, views/, types.ts
│   └── index.ts            # Public barrel export
├── tasks/
│   ├── domain/
│   ├── data/
│   ├── application/
│   ├── ui/
│   └── index.ts
└── shared/                 # Shared business logic used by ≥2 modules (enums, labels, formats)
```

**Mandatory rules:**

1. `app/` only for composition (thin routes + pages)
2. Inter‑module imports **only** via the barrel `modules/<feature>/index.ts`
3. Dependency order: `ui → application → data → domain`
4. `domain/` must not depend on framework (Vue/axios)
5. `data/` only makes HTTP requests, contains no hooks or services
6. `ui/` must never call `data/` directly; flow: `ui/hooks → application/service → data/api`

## Considered Alternatives

| Alternative | Advantages | Disadvantages | Why rejected |
|-----------|------------|---------------|--------------|
| Flat `src/components/`, `src/views/`, `src/hooks/` | Simple initially | Becomes messy when scaling, hard to split feature | Does not scale |
| Group by type: `src/views/`, `src/components/`, `src/services/` | Easy to find by type | Feature logic scattered | Hard to split feature |
| Atomic Design (atoms/molecules/organisms) | Component reuse | Too abstract for business logic | Not suited for a business app |

## Consequences

**Positive:**

- Easy to locate code of a feature
- Easy to test (mock module), easy to remove feature
- Clear boundaries, reduced coupling
- Easy onboarding: read `modules/auth` and understand the auth flow

**Negative / Trade‑offs:**

- More directories initially (more boilerplate at start)
- Discipline needed for inter‑module imports (no cross‑module imports)
- Barrel `index.ts` needs maintenance

**Follow‑up work:**

- ESLint rule to prevent cross‑module imports
- Documentation of rules in `frontend/README.md`
- CI check for barrel export completeness

## Related

- [ADR‑001: Fullstack Laravel + Vue](./0001-fullstack-laravel-vue.md)
- [ADR‑005: Pinia State Management](./0005-pinia-state-management.md)
- [`frontend/README.md`](../frontend/README.md)

### Implementation note (2026‑10‑23)

The current codebase follows this module structure:

```
src/modules/auth/
src/modules/tasks/
src/modules/users/
src/modules/shared/
```

Each module contains `domain/`, `data/`, `application/`, `ui/`, and `index.ts` barrel export. Import cross‑module is enforced by an ESLint rule (`no-cross-module-imports`) that warns when a file under `src/modules/auth/` imports from `src/modules/tasks/`. The `shared/` folder contains enums such as `taskStatusOptions` and `priorityOptions` used by multiple modules. The `data/` sub‑folder holds the `HttpClient`‑based API calls; the `application/` sub‑folder holds Pinia stores and use‑case composables; the `ui/` sub‑folder holds Vue components and pages. The `index.ts` re‑exports the public API of the module, e.g.:

```ts
// src/modules/tasks/index.ts
export { useTaskStore } from '@/modules/tasks/store';
export { listTasks, createTask, updateTask, deleteTask } from '@/modules/tasks/data';
export { TaskStatusOptions, PriorityOptions } from '@/modules/shared';
```

The `app/` folder only contains the router, global plugins, and minimal page components that delegate to feature modules.