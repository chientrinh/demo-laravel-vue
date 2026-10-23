# Frontend Testing — Vitest + Playwright

This document summarises the **current** testing setup for the TaskFlow Vue 3 single‑page application. The **source code** in `frontend/` (Vitest config, test files, Playwright scripts) is the single source of truth; this page exists to help contributors run, write, and maintain tests.

## 1. Test suite composition

| Layer | Framework | Purpose | Baseline |
|---|---|---|---|
| **Unit / component** | **Vitest** + `@vue/test-utils` | Isolated unit tests for utilities, composables, and small component behaviour. | 14 tests (npm run test:unit) |
| **End‑to‑end** | **Playwright** | Full‑stack flow: mock mode off/on, login, task CRUD, logout, admin routes. | Playwright suite (npm run test:e2e) |

## 2. Vitest configuration (`vitest.config.ts`)

```ts
import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'jsdom',
    // alias ‘@’ to src folder (so imports like '@/…​’ work)
    alias: {
      '@': '/src',
    },
    // run in order of files matched (helps with shared state)
    order: 'deterministic',
  },
});
```

### Running unit tests

```bash
cd frontend
npx vitest run               # one‑shot run (baseline: 14 tests)
npm run test:unit            # watch mode (useful during development)
```

**Tips**

- Tests run in a `jsdom` environment that mimics a browser DOM.
- Import paths alias `@/…​` resolve to `src/…​` (configured above).
- If a test depends on Pinia, make sure the store is installed in `setup()` or the test file mounts the app (`mount` from `@vue/test-utils`).

## 3. Example unit test (utilities or composable)

```ts
// src/__tests__/utils/useTaskStore.test.ts
import { describe, it, expect } from 'vitest';
import { useTaskStore } from '@/modules/tasks/store';

describe('useTaskStore', () => {
  it('starts with empty task list', () => {
    const store = useTaskStore();
    expect(store.tasks).toHaveLength(0);
  });

  it('loads tasks from mock mode', async () => {
    // mock mode is on by default; just ensure the store can be created
    const store = useTaskStore();
    await store.load(); // calls mockDb.task.list under the hood
    expect(store.tasks).toHaveLength(6); // six demo tasks seeded in mockDb
  });
});
```

## 4. Playwright e2e tests (`frontend/e2e/`)

- **Location** – `frontend/e2e/vue.spec.ts` (or similar).  
- **Purpose** – exercise the full user flow in a real (headless) browser, including mock mode toggling.

### Sample e2e spec (vue.spec.ts – abbreviated)

```ts
import { test, expect } from '@playwright/test';

test('user can log in, create a task, and log out', async ({ page }) => {
  // 1. Visit login page
  await page.goto('/auth/login');

  // 2. Fill credentials (demo account)
  await page.fill('input[name="email"]', 'olivia@taskflow.dev');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');

  // 3. Verify we are redirected to the task list
  await expect(page).toHaveURL('/tasks');

  // 4. Click “Create task” and fill the form
  await page.click('text=Create task');
  await page.fill('input[name="title"]', 'New task from e2e');
  await page.selectOption('select[name="status"]', 'todo');
  await page.selectOption('select[name="priority"]', 'high');
  await page.fill('textarea[name="description"]', 'Description from e2e test');
  await page.click('button:has-text("Save")');

  // 5. Verify the new task appears in the list
  await expect(page.locator('text=New task from e2e')).toBeVisible();

  // 6. Log out
  await page.click('text=Logout');
  await expect(page).toHaveURL('/auth/login');
});
```

### Running e2e tests

```bash
cd frontend
npm run test:e2e
```

**Important**

- The e2e suite expects the Docker dev server to be running on `http://localhost:3000` (or the host proxy if `VITE_API_PROXY_TARGET` is set).  
- Mock mode is **on** by default (`VITE_USE_MOCK` not set to `"false"`); the tests verify both mock and real‑API paths.  
- If `VITE_USE_MOCK=false` is set in `frontend/.env`, the tests will hit the real Laravel backend (ensure the Docker stack is up).

## 4. Test environment considerations

- **Node version** – CI uses Node 20 while `package.json` requires `^22.18.0 || >=24.12.0`. Locally you may use any matching Node version; the mismatch is tracked but does not block test execution.
- **Mock mode flag** – `VITE_USE_MOCK` in `frontend/.env`. Set to `"false"` to run tests against the real backend (Docker container must be reachable). Leave unset (or any value other than `"false"`) to run against the localStorage mock.
- **CI step** – the GitHub Actions workflow references `phpcs`, but only Pint is installed on the backend; the style step is allowed to fail.

## 5. Best practices

- **One assert per test** when possible; use `describe`/`it` to group related behaviours.
- **Keep test data deterministic** – use the seeded demo accounts (`password123`) or mock data; avoid random strings that may break snapshot stability.
- **Tag tests** with labels (e.g., `@mock`, `@real`) if you need to filter runs.
- **Never commit test secrets** – credentials are in `.env.example` only; real `.env` files are git‑ignored.
- **Run both unit and e2e** before opening a PR; CI will also run `npm run lint` (oxlint + eslint) and `npm run type-check` (`vue-tsc --noEmit`).

## 6. Links

- [Vitest documentation](https Vitest dev guide) – for advanced config.
- [Playwright docs](https://playwright.dev/docs/test-authentication) – for authentication in e2e.
- [State management](state-management.md) – how stores are tested.
- [Data fetching](data-fetching.md) – mock vs real API in tests.
- [Coding conventions](coding-conventions.md) – test file naming and style.

---

*If you add a new feature, add corresponding unit tests (ideally) and update the Playwright suite to cover the new flow. All new tests should pass the existing baseline before the PR is merged.*