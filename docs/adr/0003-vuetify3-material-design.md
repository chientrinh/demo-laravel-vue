# 0003 — UI Framework: Vuetify 3 + Material Design

- **Status:** Accepted
- **Date:** 2024‑10‑22
- **Decision‑maker:** Frontend Lead

## Context

Need a UI framework for the Vue 3 SPA with requirements:

- Material Design spec
- Rich component set (table, form, dialog, chart)
- Dark/Light theme
- Accessibility (a11y)
- TypeScript support
- Compatibility with Vue 3 Composition API

## Decision

We will use **Vuetify 3** (v3.7+) with **Material Design 3**.

- **Components:** `v-data-table`, `v-form`, `v-dialog`, `v-select`, `v-date-picker`, `v-chip`, `v-btn`, `v-card`, `v-sheet`, `v-toolbar`, `v-navigation-drawer`
- **Theme:** CSS Variables + Vuetify theme system (Light/Dark)
- **Icons:** `@iconify/vue` + `vue-tabler-icons`
- **Charts:** `vue3-apexcharts` (ApexCharts wrapper)
- **Scroll:** `vue3-perfect-scrollbar`

## Considered Alternatives

| Alternative | Advantages | Disadvantages | Why rejected |
|-----------|------------|---------------|--------------|
| PrimeVue | Many components, free | Theme less Material, poorer a11y | Requires Material Design |
| Quasar | Full-featured, PWA/Capacitor | Opinionated, larger bundle | Only need web SPA |
| Element Plus | Vue 3 native, popular | Different design language | Requires Material Design |
| TailwindCSS + Headless UI | Highly customizable, small | Must build components yourself | Need ready‑made components for rapid development |

## Consequences

**Positive:**

- Material Design 3 standard, good a11y
- Rich component set, little custom work needed
- Vue 3 Composition API first‑class support
- Strong theme system (CSS Variables + dark mode)

**Negative / Trade‑offs:**

- Bundle size larger (~200 KB gzipped)
- Learning curve for Vuetify‑specific props/slots
- CSS specificity may conflict with Tailwind (if used together)

**Follow‑up work:**

- Configure `vuetify.ts`: theme, defaults, icons, locale
- Set up `vite-plugin-vuetify` for treeshaking
- CSS Variables in `scss/variables.scss` map to Vuetify theme
- Dark/Light toggle via `v-theme-provider`

## Related

- [ADR‑001: Fullstack Laravel + Vue](./0001-fullstack-laravel-vue.md)
- [ADR‑004: Modular Architecture](./0004-modular-architecture.md)
- [`frontend/README.md`](../frontend/README.md)

### Implementation note (2026‑10‑23)

Vuetify 3 is currently at version 3.13.7. The theme is configured in `src/app/plugins/vuetify.ts` with primary colour `#6C31DE`, light mode background `#F8F5FC`, and dark mode support via `v-theme-provider`. Icons use `@iconify/vue` with the `vue-tabler-icons` set; the SVG set is included in the project's `src/shared/icons/` folder. The Vuetify theme CSS variables are mapped to Tailwind 4 utilities in `src/shared/styles/` for supplemental styling. The `vue3-perfect-scrollbar` directive is used on task‑list tables; its counterpart `vue3-apexcharts` is used for the burndown chart on the dashboard. The `v-date-picker` component supports both light and dark themes through the Vuetify theme configuration.