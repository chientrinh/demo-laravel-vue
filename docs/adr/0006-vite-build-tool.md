# 0006 — Build Tool: Vite (no Webpack)

- **Status:** Accepted
- **Date:** 2024‑10‑22
- **Decision‑maker:** Build Engineer

## Context

Need a fast, modern build tool for the Vue 3 SPA and Laravel 11 backend that:

- Provides instant dev‑server start‑up
- Supports hot module replacement (HMR)
- Treeshakes unused code
- Works with both Vue SFC and Laravel PHP
- Has a simple config model

## Decision

We will use **Vite** as the exclusive build tool.

- **Frontend:** Vite 5 handles dev server, HMR, and production build (`npm run build`). It resolves `@/` aliases to `src/`, `@modules/` to `src/modules/`, etc.
- **Backend:** Laravel Pint for CSS/JS asset linting; Vite is not used for PHP but the dev server may proxy API calls to the backend via `VITE_API_BASE_URL`.
- **Config:** `vite.config.ts` defines aliases, proxy for `/api` to the backend, and test alias settings.

## Considered Alternatives

| Alternative | Advantages | Disadvantages | Why rejected |
|-----------|------------|---------------|--------------|
| Webpack 5 | Mature, huge ecosystem | Slower dev server start, more config boilerplate | Vite gives faster HMR and simpler config |
| Vite + SWC compiler | Even faster TS/JS compilation | Needed SWC setup, not yet production‑ready for all plugins | Current stack does not need SWC |
| Vite 4 (older) | Stable, proven | Lacks some Vite 5 features (e.g., improved SSR) | Vite 5 is now stable and preferred |

## Consequences

**Positive:**

- Instant dev server start‑up (< 50 ms)
- Built‑in HMR for Vue SFC, TS, and CSS
- Excellent treeshaking; only used code is included in the production bundle
- Native ES module support, no bundler config overhead
- Proxy config for `/api` to the backend (`VITE_API_PROXY_TARGET`) out of the box

**Negative / Trade‑offs:**

- Smaller ecosystem of plugins compared with Webpack (but Vite’s native features cover most needs)
- Some Webpack‑only plugins (e.g., certain loaders) are not available

**Follow‑up work:**

- Set `VITE_API_PROXY_TARGET=http://localhost:8080` on the host for local development
- Configure `VITE_USE_MOCK` env var for mock‑mode fallback
- Add `vue-tsc --noEmit` to the CI pipeline for type checking
- Ensure `npm run type-check` runs `vue-tsc`

## Related

- [`frontend/vite.config.ts`](../frontend/vite.config.ts)
- [`frontend/package.json`](../frontend/package.json)
- [`docs/operations/environments.md`](../operations/environments.md)

### Implementation note (2026‑10‑23)

Vite 5.0.4 is the current version. The config in `frontend/vite.config.ts` provides:

- Aliases `@`, `@modules`, `@shared`, `@adaptors`
- Proxy `/api` → `http://backend:8000` (Docker) or `http://localhost:8080` (host, via `VITE_API_PROXY_TARGET`)
- Test alias `'@'` → `'/src'`
- `defineConfig` with `mode: 'development'` for HMR and `mode: 'production'` for `npm run build`
- Environment variables read via `import.meta.env.VITE_*`

The `npm run dev` command starts the Vite dev server, which by default proxies `/api` to `http://backend:8000`. When `VITE_API_PROXY_TARGET` is set, the proxy target changes to that URL. The `npm run build` command produces a production bundle in `frontend/dist/`.