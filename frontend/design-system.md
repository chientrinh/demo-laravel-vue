# Frontend Design System — Vuetify 3 + Tailwind 4

This document summarises the **current** design system used by the TaskFlow Vue 3 single‑page application. The **source code** (Vuetify theme configuration, Tailwind utilities, shared components) is the single source of truth; this page exists to help contributors understand the visual language and extend it consistently.

## 1. Colour palette (as coded)

| Token | Value | Usage |
|-------|-------|-------|
| `primary` | `#6C31DE` | Primary actions, navigation bars, Vuetify `primary` colour. |
| `secondary` | `#42b983` | Secondary buttons, status “success” hints. |
| `accent` | `#f2d400` | Highlights, active states. |
| `error` | `#b71c1c` | Form validation errors, danger buttons. |
| `info` | `#2196f3` | Informational links, disabled states. |
| `success` | `#4caf50` | Success badges, completed‑task colour. |
| `warning` | `#fb8c00` | Warnings (e.g. overdue tasks). |

These tokens are declared in `src/app/plugins/vuetify.ts` and are the values the Vuetify theme uses out‑of‑the‑box.

## 2. Light / dark mode

- **Light** is the default; the body background is `#F8F5FC`.
- **Dark mode** can be toggled via the UI but is not yet persisted across sessions. The Vite config (`vite.config.ts`) has `mode: 'light'` by default; switching sets `theme.dark: true` in the Vuetify config.

```ts
// src/app/plugins/vuetify.ts (excerpt)
export default defineVuetifyApp({
  theme: {
    dark: false, // set true to enable dark mode
    themes: {
      light: {
        colors: {
          primary: '#6C31DE',
          secondary: '#42b983',
          accent: '#f2d400',
          error: '#b71c1c',
          info: '#2196f3',
          success: '#4caf50',
          warning: '#fb8c00',
        },
      },
      dark: {
        colors: {
          primary: '#6C31DE',
          // … other colours adapted for dark contrast
        },
      },
    },
  },
});
```

## 3. Typography

- **Font family** – the project uses the Vuetify default (Roboto) with Tailwind‑generated utilities for spacing; no custom font‑face declarations are required beyond the Vuetify import.
- **Heading scale** – Vuetify’s `VCardTitle`, `VAlertTitle`, etc., follow the default `fontSize`/`fontWeight` scales; Tailwind’s `text-` utilities can supplement when needed.

## 4. Component library

- **Vuetify 3** components are the primary UI building blocks:
  - `VBtn` – primary/secondary/outlined variants.
  - `VTextField` – text input with label, rules, and `prepend`/`append` slots.
  - `VSelect` – single‑ and multi‑select with lazy loading.
  - `VDialog`, `VMenu`, `VSheet` – modals and dropdowns.
  - `VTable` – task‑list tables with column sorting.
  - `VAlert`, `VToast` – error/success messages.
- **Tailwind 4 utility classes** are used for supplemental styling that Vuetify does not cover (e.g., custom `div` layouts, responsive grids). Tailwind classes are applied directly in `.vue` files or in the `src/shared/components/` folder.

### Example: TaskStatusBadge.vue

```vue
<template>
  <VChip
    :color="status === 'done' ? 'success' : status === 'cancelled' ? 'error' : 'warning'"
    :text="status"
  />
</template>

<script setup>
import { computed } from 'vue';
import { taskStatusOptions } from '@/shared/constants';

const props = defineProps({ status: String });
const normalized = computed(() => props.status?.toLowerCase() || 'todo');
</script>
```

## 5. Shared components

| Component | Purpose | Typical props |
|-----------|---------|--------------|
| `TaskStatusBadge` | Shows a coloured chip for a task’s status. | `status` (String) |
| `PriorityBadge` | Coloured badge for task priority. | `priority` (String) |
| `PaginationControls` | Navigation for paginated lists. | `page`, `perPage`, `totalPages`, `@page-change` |
| `ErrorBanner` | Displays validation errors from the API envelope. | `errors` (Array<String>) |
| `SuccessToast` | Brief success message after create/update. | `message` (String), `@auto-close` |

All shared components live in `src/shared/components/` and are imported across features.

## 6. Tailwind utilities (common patterns)

- **Spacing** – `mt-4`, `mb-2`, `px-3`, `py-1`.
- **Colours** – `bg-primary`, `text-error`, `hover:bg-secondary`.
- **Responsive grid** – `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3`.
- **Hidden** – `hidden`, `md:hidden`, `lg:block`.

Example in a component template:

```vue
<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
  <TaskStatusBadge :status="task.status" />
  <PriorityBadge :priority="task.priority" />
</div>
```

## 7. Mock HTML assets

- The folder `docs/frontend/design/` contains reference HTML snapshots of the design system (colours, component layouts). These files **must remain unchanged**; they are used for visual regression and onboarding only.

## 8. Links

- [Coding conventions](coding-conventions.md) – component and TypeScript conventions.  
- [Folder structure](folder-structure.md) – where design‑related files live.  
- [Architecture decisions](architecture-decisions.md) – key visual choices and their status.  
- [Vuetify docs (internal reference)](https://next.vuetifyjs.com/) – for API surface of each component.

---

*If the design system evolves (new colour, new component, theme switch) update both the code and this document in the same pull request.*