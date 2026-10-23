# Architecture Decisions Record (ADR)

This file records key architectural decisions for the TaskFlow project. All decisions remain the historical record of why the codebase is structured as it is; where the implementation has evolved, an **Implementation note (2026‑10‑23)** explains the current state.

## ADR List

| ADR | Title | Status |
|-----|-------|--------|
| [0001](./0001-fullstack-laravel-vue.md) | Fullstack: Laravel 11 API + Vue 3 SPA | Accepted |
| [0002](./0002-sanctum-token-auth.md) | Sanctum Token Auth (Bearer token) | Accepted |
| [0003](./0003-vuetify3-material-design.md) | UI Framework: Vuetify 3 + Material Design | Accepted |
| [0004](./0004-modular-architecture.md) | Frontend Module‑Driven: `src/modules/<feature>/` | Accepted |
| [0005](./0005-pinia-state-management.md) | State Management: Pinia + Composables | Accepted |
| [0006](./0006-vite-build-tool.md) | Build Tool: Vite (no Webpack) | Accepted |
| [0007](./0007-service-repository-pattern.md) | Backend: Service & Repository Pattern | Accepted |
| [0008](./0008-full-migration-matdash.md) | Full Migration from Matdash Template to Module‑Driven | Accepted |

## When to Write an ADR

Write an ADR when a decision is:

- Hard to reverse,
- Affects many modules,
- Has multiple reasonable alternatives.

**Do not** write ADRs for: variable names, UI details, small refactors.

## Process

1. Copy `template.md` into `NNNN‑short‑title.md` (incremental four‑digit number).
2. Fill in Context / Decision / Consequences (including considered Alternatives).
3. Set status to `Proposed`, discuss, then change to `Accepted`.
4. **Never edit an Accepted ADR’s content**. If a change is needed, create a new ADR and mark the old one `Superseded by NNNN`.
5. Update the list above.

## Status

`Proposed` → `Accepted` → (`Deprecated` \| `Superseded by NNNN`).