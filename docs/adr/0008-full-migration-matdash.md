# 0008 — Full Migration from Matdash Template to Module‑Driven

- **Status:** Accepted
- **Date:** 2024‑10‑22
- **Decision‑maker:** Team Lead

## Context

The original project scaffold was based on the “Matdash” template, which featured a flat directory layout (`src/components/`, `src/views/`, etc.) and a different folder structure. As the project grew, the team decided to migrate to a module‑driven layout (`src/modules/<feature>/`) for better maintainability.

## Decision

Migrate the entire codebase from the Matdash‑style layout to the module‑driven layout described in ADR‑004.

- **Backend:** Move relevant code into `app/Repositories/`, `app/Services/`, `app/Policies/`, and update `routes/api.php` accordingly.
- **Frontend:** Restructure `src/` into `src/modules/<feature>/` with `domain/`, `data/`, `application/`, `ui/` sub‑folders (see ADR‑004). Update all imports and barrel (`index.ts`) files.
- **Shared code:** Consolidate shared enums, constants, and utilities into `src/shared/` (e.g., `taskStatusOptions`, `priorityOptions`).
- **Documentation:** Update all ADRs, README files, and coding‑convention docs to reflect the new layout.

## Consequences

**Positive:**

- Single source of truth for module layout
- Easier onboarding: new developers read `modules/auth` to understand auth flow
- Clear boundaries reduce coupling; each feature can be removed without affecting others
- Barrel exports (`index.ts`) provide a stable public API for each module

**Negative / Trade‑offs:**

- Initial migration effort (re‑imports, updated barrel files, ESLint rule updates)
- Some legacy references may remain; a cleanup pass is required

**Follow‑up work:**

- Run `npm run lint` and fix any cross‑module import violations
- Update `docker-compose.yml` and environment files to reflect any path changes
- Verify that all unit and e2e tests still pass after the migration
- Document the new module structure in `frontend/README.md` and `docs/adr/README.md`

## Related

- [ADR‑001: Fullstack Laravel + Vue](./0001-fullstack-laravel-vue.md)
- [ADR‑004: Modular Architecture](./0004-modular-architecture.md)
- [ADR‑007: Service & Repository Pattern](./0007-service-repository-pattern.md)

### Implementation note (2026‑10‑23)

The migration is essentially complete. The current layout matches the module‑driven structure described in ADR‑004:

- **Backend:** `app/Repositories/`, `app/Services/`, `app/Policies/`, and `routes/api.php` are consistent with the pattern.
- **Frontend:** `src/modules/auth/`, `src/modules/tasks/`, `src/modules/users/`, and `src/shared/` contain the domain, data, application, and UI layers as specified. All barrel (`index.ts`) exports are in place and the ESLint rule `no-cross-module-imports` enforces the import discipline.
- **Shared:** `src/shared/` holds `taskStatusOptions`, `priorityOptions`, and other constants used across modules.
- **Migration status:** The original Matdash‑style flat layout has been fully replaced; no `src/components/` or `src/views/` directories remain at the top level. The only residual references are in the git history; the working tree now follows the module‑driven layout.