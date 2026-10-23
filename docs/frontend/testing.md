# Testing — Frontend (Vue 3 + Vitest)

## Tools

| Tool | Purpose |
| --- | --- |
| **Vitest** | Unit/Component test runner |
| **@vue/test-utils** | Component mounting |
| **@testing-library/vue** | User-centric queries |
| **@pinia/testing** | `createTestingPinia`, `setActivePinia` |
| **MSW (Mock Service Worker)** | API mocking |
| **Playwright** | E2E testing |
| **Happy DOM** | DOM environment (Vitest default) |

---

## Project Structure

```
tests/
├── unit/
│   ├── composables/
│   │   ├── useTasks.test.ts
│   │   └── useTaskForm.test.ts
│   ├── stores/
│   │   └── auth.test.ts
│   └── components/
│       └── TaskStatusChip.test.ts
├── components/
│   ├── TasksTable.test.ts
│   └── TaskForm.test.ts
├── e2e/
│   ├── auth/login.spec.ts
│   └── tasks/crud.spec.ts
├── msw/
│   ├── handlers.ts
│   └── node.ts
└── setup.ts
```

---

## Setup

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'tests/', '*.config.ts', 'main.ts'],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
        statements: 70,
      },
    },
  },
})
```

```typescript
// tests/setup.ts
import { beforeAll, afterEach, afterAll } from 'vitest'
import { server } from '@/tests/msw/node'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

```typescript
// tests/msw/node.ts
import { setupServer } from 'msw/node'
import { handlers } from './handlers'

export const server = setupServer(...handlers)
```

---

## Unit Tests

### Composable Test

```typescript
// tests/unit/composables/useTasks.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useTasks } from '@/modules/tasks/ui/composables/useTasks'
import { tasksService } from '@/modules/tasks/application/services/tasks.service'
import { useUIStore } from '@/shared/stores/ui.store'

vi.mock('@/modules/tasks/application/services/tasks.service')
vi.mock('@/shared/stores/ui.store')

describe('useTasks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads tasks on init', async () => {
    const mockTasks = [{ id: '1', title: 'Test', status: 'todo', assignedTo: '1', dueDate: null, createdAt: new Date(), updatedAt: new Date() }]
    vi.mocked(tasksService.list).mockResolvedValue({ tasks: mockTasks, meta: { page: 1, per_page: 20, total: 1, total_pages: 1 } })
    vi.mocked(useUIStore).mockReturnValue({ toast: { error: vi.fn() } })

    const { tasks, loading, fetch } = useTasks()
    
    expect(loading.value).toBe(true)
    await fetch()
    
    expect(loading.value).toBe(false)
    expect(tasks.value).toHaveLength(1)
    expect(tasks.value[0].title).toBe('Test')
  })

  it('handles API error', async () => {
    vi.mocked(tasksService.list).mockRejectedValue(new Error('Network error'))
    vi.mocked(useUIStore).mockReturnValue({ toast: { error: vi.fn() } })

    const { tasks, loading, error, fetch } = useTasks()
    
    await fetch()
    
    expect(loading.value).toBe(false)
    expect(tasks.value).toHaveLength(0)
    expect(error.value).toBeInstanceOf(Error)
  })

  it('creates task optimistically', async () => {
    const newTask = { id: '2', title: 'New', status: 'todo', assignedTo: '1', dueDate: null, createdAt: new Date(), updatedAt: new Date() }
    vi.mocked(tasksService.create).mockResolvedValue(newTask)
    vi.mocked(useUIStore).mockReturnValue({ toast: { success: vi.fn() } })

    const { tasks, create } = useTasks()
    
    await create({ title: 'New', status: 'todo', assignedTo: '1' })
    
    expect(tasks.value).toHaveLength(1)
    expect(tasks.value[0].title).toBe('New')
  })
})
```

### Store Test

```typescript
// tests/unit/stores/auth.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createTestingPinia } from '@pinia/testing'
import { useAuthStore } from '@/modules/auth/application/stores/auth.store'
import { authService } from '@/modules/auth/application/services/auth.service'

vi.mock('@/modules/auth/application/services/auth.service')

describe('useAuthStore', () => {
  beforeEach(() => {
    setActivePinia(createTestingPinia())
    vi.clearAllMocks()
  })

  it('login sets user and token', async () => {
    const mockResponse = { user: { id: 1, name: 'Test', role: 'user' }, token: 'abc' }
    vi.mocked(authService.login).mockResolvedValue(mockResponse)

    const store = useAuthStore()
    await store.login({ email: 'test@test.com', password: 'pass' })

    expect(store.user).toEqual(mockResponse.user)
    expect(store.token).toBe('abc')
    expect(store.isAuthenticated).toBe(true)
  })

  it('logout clears user and token', async () => {
    const store = useAuthStore()
    store.user = { id: 1, name: 'Test', role: 'user', email: 'test@test.com' }
    store.token = 'abc'

    vi.mocked(authService.logout).mockResolvedValue(undefined)

    await store.logout()

    expect(store.user).toBeNull()
    expect(store.token).toBeNull()
    expect(store.isAuthenticated).toBe(false)
  })
})
```

### Component Test

```typescript
// tests/components/TaskForm.test.ts
import { render, screen, fireEvent } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import TaskForm from '@/modules/tasks/ui/components/TaskForm.vue'
import type { Task } from '@/modules/tasks/domain/types'

const mockTask: Task = {
  id: '1', title: 'Test', description: 'Desc', status: 'todo',
  assignedTo: '1', dueDate: null, createdAt: new Date(), updatedAt: new Date()
}

const mockAssignees = [{ id: '1', name: 'John' }, { id: '2', name: 'Jane' }]

describe('TaskForm', () => {
  it('renders form with initial values', () => {
    render(TaskForm, { 
      props: { modelValue: mockTask },
      global: { provide: { assignees: mockAssignees } }
    })
    
    expect(screen.getByDisplayValue('Test')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Desc')).toBeInTheDocument()
    expect(screen.getByDisplayValue('todo')).toBeInTheDocument()
  })

  it('shows validation errors', async () => {
    const user = userEvent.setup()
    render(TaskForm, { global: { provide: { assignees: mockAssignees } } })
    
    await user.click(screen.getByRole('button', { name: /save/i }))
    
    expect(screen.getByText('Title is required')).toBeInTheDocument()
    expect(screen.getByText('Assignee is required')).toBeInTheDocument()
  })

  it('submits valid form', async () => {
    const user = userEvent.setup()
    const { emitted } = render(TaskForm, { global: { provide: { assignees: mockAssignees } } })
    
    await user.type(screen.getByLabelText(/title/i), 'New Task')
    await user.selectOptions(screen.getByLabelText(/assignee/i), '1')
    await user.click(screen.getByRole('button', { name: /save/i }))
    
    expect(emitted().submit).toHaveLength(1)
    expect(emitted().submit[0]).toEqual([{ title: 'New Task', assignedTo: '1', ... }])
  })
})
```

---

## MSW Handlers

```typescript
// tests/msw/handlers.ts
import { http, HttpResponse } from 'msw'
import type { TaskDto, PaginatedTaskResponse } from '@/modules/tasks/data/dtos/task.dto'

let tasks: TaskDto[] = [
  { id: '1', title: 'Task 1', description: 'Desc', status: 'todo', assigned_to: '1', due_date: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
]

export const handlers = [
  http.get('/api/tasks', ({ request }) => {
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const perPage = parseInt(url.searchParams.get('per_page') || '20')
    const status = url.searchParams.get('status')
    
    let filtered = tasks
    if (status) filtered = filtered.filter(t => t.status === status)
    
    const start = (page - 1) * perPage
    const paginated = filtered.slice(start, start + perPage)
    
    return HttpResponse.json<PaginatedTaskResponse>({
      data: paginated,
      meta: { page, per_page: perPage, total: filtered.length, total_pages: Math.ceil(filtered.length / perPage) },
    })
  }),

  http.post('/api/tasks', async ({ request }) => {
    const body = await request.json()
    const newTask: TaskDto = { id: String(tasks.length + 1), ...body, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
    tasks.push(newTask)
    return HttpResponse.json(newTask, { status: 201 })
  }),

  http.put('/api/tasks/:id', async ({ params, request }) => {
    const body = await request.json()
    const idx = tasks.findIndex(t => t.id === params.id)
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    tasks[idx] = { ...tasks[idx], ...body, updated_at: new Date().toISOString() }
    return HttpResponse.json(tasks[idx])
  }),

  http.delete('/api/tasks/:id', ({ params }) => {
    tasks = tasks.filter(t => t.id !== params.id)
    return new HttpResponse(null, { status: 204 })
  }),

  http.post('/api/login', async ({ request }) => {
    const body = await request.json()
    if (body.email === 'admin@example.com' && body.password === 'password') {
      return HttpResponse.json({ user: { id: '1', name: 'Admin', email: 'admin@example.com', role: 'admin' }, token: 'mock-token' })
    }
    return HttpResponse.json({ message: 'Invalid credentials' }, { status: 401 })
  }),
]
```

---

## E2E Tests (Playwright)

```typescript
// tests/e2e/auth/login.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login')
  })

  test('successful login redirects to tasks', async ({ page }) => {
    await page.fill('[data-testid="email"]', 'admin@example.com')
    await page.fill('[data-testid="password"]', 'password123')
    await page.click('[data-testid="submit"]')
    
    await expect(page).toHaveURL('/tasks')
    await expect(page.locator('text=Welcome, Admin')).toBeVisible()
  })

  test('shows error on invalid credentials', async ({ page }) => {
    await page.fill('[data-testid="email"]', 'wrong@example.com')
    await page.fill('[data-testid="password"]', 'wrong')
    await page.click('[data-testid="submit"]')
    
    await expect(page.locator('[data-testid="error"]')).toContainText('Invalid credentials')
  })
})
```

```typescript
// tests/e2e/tasks/crud.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Task CRUD', () => {
  test.beforeEach(async ({ page }) => {
    // Login via API to avoid UI login in every test
    await page.request.post('/api/login', {
      data: { email: 'admin@example.com', password: 'password123' }
    })
    await page.goto('/tasks')
  })

  test('creates new task', async ({ page }) => {
    await page.click('[data-testid="create-task"]')
    await page.fill('[data-testid="title"]', 'New Task')
    await page.fill('[data-testid="description"]', 'Description')
    await page.selectOption('[data-testid="status"]', 'todo')
    await page.click('[data-testid="submit"]')
    
    await expect(page.locator('text=Task created')).toBeVisible()
    await expect(page.locator('text=New Task')).toBeVisible()
  })

  test('edits task', async ({ page }) => {
    await page.click('[data-testid="edit-task-1"]')
    await page.fill('[data-testid="title"]', 'Updated Task')
    await page.click('[data-testid="submit"]')
    
    await expect(page.locator('text=Task updated')).toBeVisible()
  })

  test('deletes task with confirmation', async ({ page }) => {
    page.on('dialog', dialog => dialog.accept())
    await page.click('[data-testid="delete-task-1"]')
    
    await expect(page.locator('text=Task deleted')).toBeVisible()
    await expect(page.locator('text=Task 1')).not.toBeVisible()
  })
})
```

---

## Running Tests

```bash
# Frontend
cd frontend
npm run test              # All unit/component tests
npm run test:watch        # Watch mode
npm run test:coverage     # With coverage report
npm run test:e2e          # E2E tests

# Backend
cd backend
php artisan test              # All tests
php artisan test --parallel   # Parallel
php artisan test --filter=TaskServiceTest
php artisan test --coverage

# CI
npm run test:coverage && php artisan test --parallel
```

---

## Coverage Thresholds

```typescript
// vitest.config.ts
coverage: {
  provider: 'v8',
  reporter: ['text', 'json', 'html'],
  thresholds: {
    lines: 70,
    functions: 70,
    branches: 60,
    statements: 70,
  },
}
```

```xml
<!-- phpunit.xml -->
<phpunit>
  <coverage>
    <include>
      <directory suffix=".php">./app</directory>
    </include>
    <exclude>
      <directory>./tests</directory>
    </exclude>
  </coverage>
</phpunit>
```

---

## Best Practices

1. **Test behavior, not implementation**
2. **One assertion per test** (or grouped related assertions)
3. **Test both happy path and edge cases**
3. **Use factories for test data**
4. **Mock at boundaries** (API, store, router)
5. **Keep tests fast** (< 100ms unit, < 5s e2e)
6. **Run in parallel** (`vitest --pool=forks`)
7. **CI runs all tests** on every PR