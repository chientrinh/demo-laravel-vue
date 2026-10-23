# Pull Request Process — TaskFlow

This document describes the **current** pull request (PR) workflow for the TaskFlow monorepo. The **code**, **tests**, and **documentation** are the source of truth; this page exists to standardise contributions and keep the review process smooth.

## 1. Branch & Commit Conventions

### Branch naming

- Use a short, descriptive name from `main`:

```text
feat/task-status-filtering
fix/login-validation-error
docs/api-contract-sync
chore/update-dependencies
```

- Prefix the name with the type of change (`feat:`, `fix:`, `docs:`, `chore:`) – this enables Conventional Commits tooling.

### Commit messages

Follow **Conventional Commits** format:

```text
<type>: <short description>

[optional body]

[optional footer(s)]
```

** recognised types**

| Type | Meaning |
|------|---------|
| `feat` | New feature (or feature toggle). |
| `fix` | Bug fix (also patch version bump). |
| `docs` | Documentation only (no code change). |
| `style` | Formatting, missing semi‑colons, missing spaces (cosmetic). |
| `refactor` | Code restructuring that neither fixes a bug nor adds a feature. |
| `test` | Adding missing tests or improving test suites. |
| `chore` | Updating build tasks, dependency versions, linter configs, etc. |

**Example commit messages**

```text
feat: add task status filtering endpoint

The new `GET /api/tasks?status=in_progress` query parameter allows
filtering the task list by status. The backend Service layer validates
the status value against the allowed enum and returns a 422 if an
invalid status is supplied.

Co-authored-by: Alice <alice@example.com>
```

```text
fix: correct priority enum values in StoreTaskRequest

The `priority` field was accepted as `high` but the backend enum only
recognises `high` (no change needed). The Form Request rules were
updated to reflect the allowed values exactly.

Co-authored-by: Bob <bob@example.com>
```

```text
docs: update API error‑envelope section in README

The `status_code` field now always reflects the HTTP status sent to the
client; the example JSON was updated to match the current envelope
shape in `bootstrap/app.php`.

Co-authored-by: Charlie <charlie@example.com>
```

```text
chore: bump Node engine version in package.json

The `engines.node` field was updated from `^20` to `^22.18.0 || >=24.12.0`
to match the actual runtime available on the CI runners.

Co-authored-by: Dora <dora@example.com>
```

## 2. Pull Request lifecycle

1. **Create a feature branch** from `main` using the conventions above.
2. **Make the change** – implement the feature, add or update tests, and update documentation in the same PR.
3. **Run the local checks**

   ```bash
   # Backend (inside Docker)
   docker exec -e DB_CONNECTION=sqlite -e DB_DATABASE=:memory: taskflow-backend php artisan test
   docker exec taskflow-backend ./vendor/bin/pint

   # Frontend (host)
   cd frontend
   npx vitest run
   npm run lint          # oxlint + eslint
   npm run build         # optional, to verify the build succeeds
   ```

4. **Commit & push** – push the branch to your fork or a personal branch on the main repo.
5. **Open a PR** against `main` with a clear title, a description of what changed, why it matters, and any known limitations.
6. **Address reviewer feedback** – make additional commits on the same branch; the PR will automatically update.
7. **Squash‑merge** – once all checks pass and the maintainers approve, a squash‑merge into `main` is performed. This keeps the `main` history clean (single commit per PR).

## 3. Documentation requirements

A PR that changes behaviour or contracts **must** also update the relevant documentation files. The checklist:

- [ ] API endpoints updated in `docs/backend/api/overview.md` and/or endpoint files.
- [ ] New or changed Form Requests / Resources documented (or existing docs updated).
- [ ] Pinia store changes reflected in `frontend/state-management.md` if applicable.
- [ ] Frontend UI changes reflected in `frontend/routing.md`, `forms-and-validation.md`, or `design-system.md`.
- [ ] ADRs updated if an architectural decision is altered (see `docs/adr/`).
- [ ] Root docs (`README.md`, `AGENTS.md`, `CONTEXT.md`) updated if the domain glossary or commands change.
- [ ] `CONTRIBRIBUTING.md` itself may need a small update if the PR changes the workflow.

If a PR only fixes a typo or renames a variable without changing behaviour, documentation updates are **optional** but appreciated.

## 4. Checklist before requesting a review

- [ ] All **backend** tests pass inside Docker (`docker exec -e DB_CONNECTION=sqlite -e DB_DATABASE=:memory: taskflow-backend php artisan test`).
- [ ] **Pint** passes (`docker exec taskflow-backend ./vendor/bin/pint`).
- [ ] All **frontend** unit tests pass (`npx vitest run`).
- [ ] **Frontend lint** passes (`npm run lint` → `oxlint . && eslint .`).
- [ ] **Frontend build** succeeds (`npm run build`).
- [ ] Documentation files mentioned above have been updated (or a justification for omitting them is provided).
- [ ] No `phpcs` or `phpstan` errors (these tools are not installed; the style step is allowed to fail in CI, but local Pint should pass).
- [ ] Conventional Commit format used for the first commit on the branch.
- [ ] Branch name follows the `type/description` pattern.

## 5. Code review expectations

- Reviewers will check that the **code** matches the project’s architecture (Service & Repository pattern, Policies, API Resources).
- They will verify that **tests** cover the new behaviour and that existing tests still pass.
- They will confirm that **documentation** is consistent and that no stale claims remain (e.g., no UUIDs, no camelCase API fields, no MSW references).
- They may request small refinements (naming, error messages, edge‑case handling) but will not accept PRs that introduce new stale claims or break the existing test baseline.

## 6. Rolling back a PR

If a PR is merged and later found to cause regressions:

1. **Revert** the squash‑merge commit on `main` (GitHub UI → “Revert”).
2. **Create a new issue** tracking the fix.
3. **Submit a new PR** with the corrected implementation, following the same process.

## 7. Links

- [Conventional Commits guide](https://conventionalcommits.org/) – external spec.
- [CODEOWNERS] (if present) – lists who must approve changes to particular paths.
- [GitHub Docs: About pull requests](https://docs.github.com/en/pull-requests/collaborating-on-pull-requests/proposing-changes-to-your-work-with-pull-requests) – general PR concepts.
- [TaskFlow CONTRIBUTING.md] – overall contributing guide (this file’s parent).
- [TaskFlow AGENTS.md] – entry point and documentation routing.

---

*If you are unsure about any part of this process, open a draft PR and ask for feedback; maintainers will help guide you through the steps.*