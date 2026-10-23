# 0002 — Sanctum Token Auth (Bearer token)

- **Status:** Accepted
- **Date:** 2024‑10‑22
- **Decision‑maker:** Team Lead

## Context

Need authentication for the SPA calling the Laravel API. Requirements:

- Stateless, scalable
- Token revocation
- CSRF protection for form submit
- Optional refresh token support

## Decision

We will use **Laravel Sanctum** with **Personal Access Token (Bearer token)**.

- Login/register returns a `token` (plain‑text Sanctum token)
- Frontend stores the token in `localStorage` (or `sessionStorage`)
- Every API request includes the header `Authorization: Bearer <token>`
- Logout revokes the token on the server
- `auth:sanctum` middleware protects API routes

## Considered Alternatives

| Alternative | Advantages | Disadvantages | Why rejected |
|-----------|------------|---------------|--------------|
| Session + Cookie (Sanctum SPA) | HttpOnly, CSRF automatic | Complex CORS, cross‑domain cookies | Frontend/Backend on different domain/port |
| JWT (custom/tuya) | Stateless, custom payload | Need to handle refresh, revoke manually | Sanctum is built‑in, less code |
| Laravel Passport (OAuth2) | Standard OAuth2, scopes, grant types | Overkill for a simple internal app | Overkill for an internal app |

## Consequences

**Positive:**

- Native Laravel Sanctum, minimal config
- Token revocation simple (`$user->tokens()->delete()`)
- `auth:sanctum` middleware built‑in
- No extra packages required

**Negative / Trade‑offs:**

- Token does not auto‑expire (need to implement expiry manually)
- No automatic refresh token (need to implement manually if required)
- Token in `localStorage` is vulnerable to XSS (need CSP, or use HttpOnly cookie for refresh if required)

**Follow‑up work:**

- Configure `sanctum.php`: `expiration`, `token_prefix`
- CORS config for frontend origin
- Frontend HttpClient automatically attaches token
- Logout revokes token + clears `localStorage`

## Related

- [ADR‑001: Fullstack Laravel + Vue](./0001-fullstack-laravel-vue.md)
- [`backend/api/authentication.md`](../backend/api/authentication.md)
- [`frontend/data-fetching.md`](../frontend/data-fetching.md)

### Implementation note (2026‑10‑23)

Sanctum is fully configured. The default token expires after the value set in `config/sanctum.php` (`expiration` option, default 30 days). The frontend `HttpClient` (see `src/adaptors/infrastructures/clients/HttpClient.ts`) extracts the token from the Pinia `auth` store and adds it as `Authorization: Bearer <token>` on every request. Logout calls `$user->currentAccessToken()->delete()` and clears the token from `localStorage`. CORS is set in `config/cors.php` with `allowed_origins` from `env('FRONTEND_URL', 'http://localhost:5173')`. The error envelope (see `api/error-handling.md`) includes `status_code`, `code`, `message`, `errors`, `details`, `path`, `timestamp`.