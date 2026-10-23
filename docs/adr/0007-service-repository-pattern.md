# 0007 — Backend: Service & Repository Pattern

- **Status:** Accepted
- **Date:** 2024‑10‑22
- **Decision‑maker:** Backend Lead

## Context

Need to organise backend code with clear separation of concerns for the Laravel 11 API.

## Decision

Adopt **Controller → Service → Repository → Model** pattern:

| Layer | Responsibility |
|-------|----------------|
| Controller | HTTP: validation, authorisation, response |
| Service | Business logic, transactions, orchestration |
| Repository | Data access, queries, pagination |
| Model | Eloquent relationships, casts, scopes |

## Consequences

**Positive:**

- Clear separation of concerns
- Testable (mock Repository in Service tests)
- Swappable data layer
- Single responsibility per class

**Negative:**

- More classes initially
- More indirection for simple CRUD

**Mitigation:** Only add Service/Repository when complexity justifies it.

## Implementation note (2026‑10‑23)

The pattern is fully in place. Controllers delegate to Services, which use Repository interfaces bound via `RepositoryServiceProvider`. Status‑transition validation lives in `TaskService` (see ADR‑007), not in the Controller. Pagination defaults to `per_page=20`, capped at `100` (see Repository `paginate` method). All API resources return snake_case JSON with integer IDs; the frontend normalises to camelCase via the `HttpClient` mappers.