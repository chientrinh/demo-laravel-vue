# 0005 — State Management: Pinia + Composables

- **Status:** Accepted
- **Date:** 2024‑10‑22
- **Decision‑maker:** Frontend Lead

## Context

Need state management in a Vue 3 SPA. Requirements:

- Type‑safe
- DevTools support
- SSR‑friendly (future‑proof)
- Separation of global vs. feature state
- Not too much boilerplate

## Decision

We will use **Pinia** for global/shared state and **Composables** (`useXxx`) for feature‑local reactive state.

| State Type | Solution | Example |
|-----------|----------|---------|
| Global shared | Pinia store | `useAuthStore`, `useUIStore` (toast, sidebar) |
| Feature‑local reactive | Composables (`useTasks`, `useTaskForm`) | Task list, filters, form state |
| Component‑local ephemeral | `ref`/`reactive` inside component | Dialog open, input focus |

### Pinia store structure:

```
src/stores/
├── auth.ts          # useAuthStore: user, token, login, logout, init
├── ui.ts            # useUIStore: toasts, sidebar, globalLoading
└── app.ts           # useAppStore: config, theme (if needed)
```

### Composables structure:

```
src/modules/tasks/ui/composables/
├── useTasks.ts      # tasks, loading, error, filters, fetch/create/update/delete
├── useTaskForm.ts   # form state, validation, submit
```

## Considered Alternatives

| Alternative | Advantages | Disadvantages | Why rejected |
|-----------|------------|---------------|--------------|
| Vuex 4 | Mature, many plugins | Verbose, not type‑safe by default, complex module syntax | Pinia is lighter, native type‑safe |
| VueUse + Ref/Reactive only | Zero dependency | No DevTools, no time‑travel, hard to share state | Need DevTools for debugging |
| Redux/Vuex‑like pattern | Predictable | Large boilerplate, not Vue‑native | Pinia is the Vue 3 standard |

## Consequences

**Positive:**

- Pinia is natively type‑safe (generic `defineStore`)
- DevTools support (time‑travel, inspect)
- Module hot‑reload support
- Good tree‑shaking (only used stores are bundled)
- Native Composition API integration

**Negative / Trade‑offs:**

- Need clear rule: when to use Pinia vs. Composables
- Too many small stores can cause fragmentation
- Composables have no automatic DevTools

**Follow‑up work:**

- Rule: Global = Pinia, Feature = Composables
- `shared/stores/` for cross‑cutting (UI, app), `modules/*/stores/` for feature‑specific stores
- Naming: `useXxxStore` for Pinia, `useXxx` for composable
- `createTestingPinia` for unit testing

## Related

- [ADR‑004: Modular Architecture](./0004-modular-architecture.md)
- [`frontend/state-management.md`](../frontend/state-management.md)
- [`frontend/data-fetching.md`](../frontend/data-fetching.md)

### Implementation note (2026‑10‑23)

Pinia is fully in use. The stores are defined under `src/stores/` and auto‑registered by Pinia. The `useAuthStore` manages token, user profile, and login/logout; `useUIStore` handles toasts, sidebar visibility, and global loading state. Feature‑local composables live under `src/modules/tasks/ui/composables/` and are imported by `TaskList.vue` and `TaskForm.vue`. The `createTestingPinia` helper is used in Vitest tests to initialise the Pinia stores. The Pinia plugin `pinia` is registered in `src/main.ts` via `app.use(pinia)`. The `persist` plugin is not used; token persistence is handled by the `HttpClient` interceptor and `localStorage`.