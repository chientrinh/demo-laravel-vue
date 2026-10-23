# TaskFlow Glossary

This is the canonical vocabulary for TaskFlow. Use these terms consistently in code, tests, documentation, and UI copy. Code and migrations remain the source of truth for behavior and contracts.

## Recent Grilling Session (2026-10-23)

A domain-modeling grilling session was conducted to stress-test terminology consistency across the codebase. All canonical terms were challenged against implementation:

- **Q1-Q16** covered: domain term consistency, role terminology, pagination access token, demo account, mock mode, API field casing, admin/user distinction, task status flow, pagination property names, service layer separation, policy cross-record rules, resource transformation, repository HTTP ownership, domain model casing, and user ID integer normalization.

- **Outcome**: All 16 questions received user agreement (`đồng ý`). No immediate contradictions were found that require glossary changes, but the session identified areas for ongoing vigilance:
  - Keep auth service business logic separate from repository data access
  - Maintain strict snake_case → camelCase conversion boundary (API vs frontend)
  - Ensure only the four canonical task statuses (`todo`/`in_progress`/`done`/`cancelled`) are used
  - Preserve `Authorization: Bearer` token scheme per the Access Token definition
  - Use `password123` only for all seeded demo accounts
  - Refer to frontend demo data as "mock mode", never "MSW"
  - Continue using `assigned to`/`assignee` (not "owner") for task ownership
  - Keep `TaskPolicy` as the sole policy enforcing cross-record rules (self-delete, self-demotion, last-admin protection)

For full question/answer detail, see the grilling session transcript. Terms remain as defined in the original glossary above.

## Domain Terms

| Term | Meaning | Canonical values / notes |
| --- | --- | --- |
| **Task** | A unit of work assigned to a user. | `id`, `title`, `description`, `status`, `priority`, `assigned_to`, `due_date`, timestamps. |
| **Task Status** | The lifecycle state of a task. | `todo`, `in_progress`, `done`, `cancelled`. |
| **Task Priority** | The urgency of a task. | `low`, `medium`, `high`, `urgent`. |
| **Assignee** | The user responsible for a task. | Stored as `assigned_to` (integer user ID); exposed as an `assignee` object when loaded. |
| **User** | An authenticated account. | `id`, `name`, `email`, `role`, `email_verified_at`, timestamps. |
| **Role** | The authorization level of a user. | `admin`, `user`. |
| **Admin** | A user with role `admin`. | Can manage users, see all tasks, assign tasks to anyone, and delete tasks. |
| **User (role)** | A non-admin account with role `user`. | Sees and updates only tasks assigned to them; cannot reassign tasks or delete tasks. |
| **Pagination** | Server-side page metadata. | `current_page`, `last_page`, `per_page`, `total`, `page`, `total_pages`, plus `links`. |
| **Access Token** | A Laravel Sanctum personal access token. | Sent as `Authorization: Bearer <token>`; revoked on logout. |
| **Demo Account** | A seeded account for local evaluation. | All seeded accounts use password `password123`. |
| **Mock Mode** | Frontend mode backed by `localStorage` demo data instead of Laravel. | Enabled unless `VITE_USE_MOCK` is exactly `false`. |

## Technical Terms

| Term | Meaning |
| --- | --- |
| **API** | The Laravel JSON API under `/api`. |
| **SPA** | The Vue single-page application in `frontend/`. |
| **DTO** | The snake_case JSON shape received from the API. |
| **Domain Model** | The camelCase, typed frontend representation produced by mappers. |
| **Repository** | Backend data-access abstraction; frontend `data/` class that owns HTTP calls. |
| **Service** | Backend business-logic layer, or frontend application-level use case. |
| **Policy** | Laravel authorization class, currently `TaskPolicy`. |
| **Resource** | Laravel API response transformer, currently `TaskResource` and `UserResource`. |

## Language Rules

- Write documentation in English.
- Use **user with role `user`**, not "member", when referring to the non-admin role.
- Say **assigned to** or **assignee**; avoid "owner" for tasks.
- Say **task status** and **task priority**; avoid generic "state".
- Use **mock mode** for the built-in frontend demo data; do not call it MSW.
- Use **demo account** for seeded users.
- Use `id` (integer) for API identifiers. Frontend domain models currently normalize IDs to strings.
- Use snake_case for API fields and camelCase for frontend domain fields.
