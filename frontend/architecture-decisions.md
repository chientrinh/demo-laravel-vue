# Frontend Architecture Decisions — Vue 3 SPA

This document records the key architectural decisions for the TaskFlow Vue 3 single‑page application. All decisions remain the historical record of why the codebase is structured as it is; where the implementation has evolved, an **Implementation note (2026‑10‑23)** explains the current state.

---

## ADR‑001: Vue 3 + Pinia state management

**Date:** 2024‑01‑15  
**Status:** Accepted

### Context

Need a reactive, testable client‑side state management solution for a SPA that consumes a JSON API.

### Decision

Adopt **Pinia** as the sole state manager, replacing any earlier store pattern (e.g., Vuex).

### Consequences

**Positive**

- Tree‑shakable, composition‑API friendly.
- Fine‑grained modules per feature (`auth`, `tasks`, `users`).
- DevTools integration out of the box.

**Negative**

- Requires build‑step to register stores (auto‑done via `defineStore`).
- Slight learning curve for developers coming from Vuex 3.

### Implementation note (2026‑10‑23)

Pinia is fully in place. Each feature module (`auth`, `tasks`, `users`) has its own store (`useUserStore`, `useTaskStore`). Stores are defined with `defineStore` and are namespaced automatically. The `auth` store holds the token and `isAuthenticated` flag; the `tasks` store holds the task list, filters, and CRUD actions. All stores are reactive and integrate with Vue 3’s `<script setup>`. Mock mode (`VITE_USE_MOCK`) is handled inside the stores and the `HttpClient` – when mock mode is on, actions delegate to `mockDb.*` rather than the real API.

---

## ADR‑002: HTTP client & mock mode

**Date:** 2024‑01‑15  
**Status:** Accepted

### Context

Need a consistent way to call the Laravel JSON API from the Vue front‑end, with the ability to fall back to a localStorage‑backed mock database for development and testing.

### Decision

Create a custom **HttpClient** (`src/adaptors/infrastructures/clients/HttpClient.ts`) that wraps Axios and provides:

- Bearer‑token injection from the Pinia `auth` store.
- Snake‑case → camelCase DTO mapping (mappers).
- A global response interceptor that normalises the Laravel error envelope (`status_code`, `code`, `message`, `errors`, `details`, `path`, `timestamp`).
- **Mock mode** – a utility `isMockMode()` checks `import.meta.env.VITE_USE_MOCK`. When it is not exactly `"false"`, all HttpClient functions forward to `mockDb.ts` (localStorage key `ttm.mock.db.v1`) instead of making real HTTP calls.

### Consequences

**Positive**

- Single source of API calls; mock mode is a one‑line check.
- Error handling is centralised; the UI always reads `statusCode` from the envelope.
- mappers keep the domain model camelCase while the API stays snake_case.

**Negative**

- Slightly more boilerplate for new developers (check `isMockMode()` before each call).

### Implementation note (2026‑10‑23)

HttpClient is fully functional. Mock mode is the default (`VITE_USE_MOCK` not set to `"false"`). The mock DB stores accounts and tasks under `localStorage` key `ttm.mock.db.v1`; IDs are strings. All feature stores (`useTaskStore`, `useAuthStore`) delegate to `HttpClient`, which transparently switches to the mock when the env flag is set. The mappers (`src/modules/tasks/mappers.ts`, etc.) are called inside each HttpClient function so the Pinia store always receives camelCase data.

---

## ADR‑003: Component organisation under feature modules

**Date:** 2024‑01‑15  
**Status:** Accepted

### Context

Decide where Vue components live – a flat `src/components/` folder or a per‑feature folder structure.

### Decision

Store components **inside each feature module**: `src/modules/<feature>/ui/`. This keeps related templates, scripts, styles, and tests co‑located.

### Consequences

**Positive**

- Easier to find what belongs to a feature.
- No need for a global `components/` folder that quickly becomes unwieldy.

**Negative**

- Slightly duplicated component names across features (e.g., both `tasks/` and `users/` may have a `TaskStatusBadge.vue`); the project accepts this as the cost of modularity.

### Implementation note (2026‑10‑23)

The current layout follows this decision:

```
src/modules/tasks/ui/TaskList.vue
src/modules/tasks/ui/TaskDetail.vue
src/modules/tasks/ui/CreateTaskForm.vue
src/modules/tasks/ui/UpdateTaskForm.vue

src/modules/users/ui/UserList.vue
src/modules/users/ui/UserCreate.vue
src/modules/users/ui/UserDetail.vue
```

Each folder also contains a `styles/` sub‑folder for component‑scoped CSS if needed.

---

## ADR‑04: Tailwind 4 + Vuetify 3 theming

**Date:** 2024‑01‑15  
**Status:** Accepted

### Context

Choose a styling approach that gives both rapid UI development (Vuetify) and fine‑grained control (Tailwind) without conflicts.

### Decision

Use **Vuetify 3** as the primary UI component library, with **Tailwind 4** utilities for supplemental spacing, colours, and responsive layouts that Vuetify does not cover. The Vuetify theme declares the primary colour `#6C31DE`; Tailwind utilities are prefixed with `bg-`, `text-`, etc., and are applied directly in `.vue` files.

### Consequences

**Positive**

- Vuetify provides out‑of‑the‑box accessible components (buttons, inputs, dialogs).
- Tailwind fills the gaps for custom layouts, dark‑mode tweaks, and rapid prototyping.
- The combined approach is already used throughout the codebase and is well‑understood by the team.

**Negative**

- Developers must remember which library provides which styling tool; a small mental overhead.

### Implementation note (2026‑10‑23)

The project’s `src/app/plugins/vuetify.ts` declares the Vuetify theme (primary `#6C31DE`, light background `#F8F5FC`). Tailwind classes (`mt-4`, `bg-primary`, `hover:text‑secondary`, etc.) are used freely in component templates. The design‑system doc (`design-system.md`) captures the colour palette and common patterns.

---

## ADR‑05: Routing & guard strategy

**Date:** 2024‑01‑15  
**Status:** Accepted

### Context

Decide how the app navigates and authorises routes – Vue Router with guards, or a more heavy‑handed approach.

### Decision

Use **Vue Router** with two guard types:

- `authenticated` – checks that the user has a valid Sanctum token; redirects to `/auth/login` if not.
- `role:admin` – a UX‑only guard that reads `store.user.role`; the **server** enforces authorisation via `TaskPolicy` / `UserPolicy`. The front‑end guard hides buttons/links but does not prevent API calls.

### Consequences

**Positive**

- Clear, declarative route definitions in `src/app/router/routes.ts`.
- Separation of “UX gate” (front‑end) and “authorisation gate” (back‑end), matching the overall architecture where server policies are authoritative.

**Negative**

- A determined user could bypass the front‑end guard (e.g., by directly POSTing to API endpoints). This is intentional – security lives on the server.

### Implementation note (2026‑10‑23)

The route tree includes public routes (`/auth/login`, `/auth/register`), authenticated routes (`/tasks`, `/tasks/:id`, `/auth/logout`), and admin‑only routes (`/users`, `/users/create`). The `authenticated` guard is imported from `src/app/router/guards/auth.ts`; the `roleAdmin` guard from `src/app/router/guards/role.ts`. Both guards read from the Pinia `auth` store.

---

## ADR‑06: Form validation strategy

**Date:** 2024‑01‑15  
**Status:** Accepted

### Context

Decide where validation lives – client‑side only, server‑side only, or both.

### Decision

**Client‑side** Vue form validation (HTML5 attributes + VeeValidate optional) **plus** **server‑side** Laravel Form Requests. The frontend must display the error envelope returned by the API (status 422, `errors` array). The backend is the definitive source of truth.

### Consequences

**Positive**

- Immediate feedback to the user without a round‑trip.
- Server validation prevents bypasses and keeps the contract consistent.

**Negative**

- Slight duplication of rule definitions (HTML attributes vs. Form Request rules).

### Implementation note (2026‑10‑23)

Form components follow the patterns in `forms-and-validation.md`. HTML5 `required`, `maxLength`, and custom VeeValidate rules provide instant feedback; on submit, the `HttpClient` call catches 422 responses and stores the `errors` array in the Pinia store, which the UI renders.

---

## ADR‑07: Design system stability

**Date:** 2024‑01‑15  
**Status:** Accepted

### Context

Ensure the visual design system (colours, components, theming) does not rot over time.

### Decision

Treat the design system as **stable** – any change (new colour, new component, theme switch) must be accompanied by an updated ADR and a coordinated pull request that updates all referencing docs (`design-system.md`, `coding-conventions.md`, component files).

### Consequences

**Positive**

- Predictable visual language across the app.
- Changes are intentional and traceable.

**Negative**

- Minor overhead to update docs for every visual tweak.

### Implementation note (2026‑10‑23)

The design system is currently stable; the colour palette (`primary: #6C31DE`, etc.) and component library (Vuetify 3 + Tailwind 4) have not changed since the last ADR cycle. If a new colour or component is added, the team will create a new ADR (e.g., ADR‑08) and update `design-system.md` and the relevant component files.

---

*All ADRs above preserve the original decision, context, and consequences. Implementation notes (2026‑10‑23) highlight where the code has evolved from the original proposal.*