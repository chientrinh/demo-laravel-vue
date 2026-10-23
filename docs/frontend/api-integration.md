# API Integration — Laravel REST API

This document describes how the Vue 3 frontend communicates with the Laravel 11 REST API.

---

## 1. HTTP Client — `adapters/infrastructures/clients/HttpClient.ts`

### Responsibilities

- Create and configure the shared Axios instance
- Configure base URL from environment
- Attach authentication headers
- Normalize errors to `ApiError` type
- Handle 401 Unauthorized (logout + redirect)
- Request/response logging (dev only)

### Implementation

```typescript
// adapters/infrastructures/clients/HttpClient.ts
import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import type { ApiError } from '@/shared/types/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

export const httpClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30_000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  withCredentials: false, // Set true if using Sanctum cookies
});

// Request interceptor: attach auth token
httpClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('auth_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: normalize errors, handle 401
httpClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const apiError = normalizeError(error);
    
    // Handle 401: token expired or invalid
    if (error.response?.status === 401) {
      handleUnauthorized();
    }
    
    return Promise.reject(apiError);
  }
);

function normalizeError(error: AxiosError): ApiError {
  if (error.response) {
    const data = error.response.data as any;
    return {
      status: error.response.status,
      code: data?.code ?? 'UNKNOWN_ERROR',
      message: data?.message ?? error.message,
      details: data?.details,
      timestamp: new Date().toISOString(),
      path: error.config?.url ?? '',
    };
  }
  
  if (error.code === 'ECONNABORTED') {
    return { status: 0, code: 'TIMEOUT', message: 'Request timeout', timestamp: new Date().toISOString(), path: '' };
  }
  
  if (!navigator.onLine) {
    return { status: 0, code: 'NETWORK_ERROR', message: 'No internet connection', timestamp: new Date().toISOString(), path: '' };
  }
  
  return { status: 0, code: 'UNKNOWN_ERROR', message: error.message, timestamp: new Date().toISOString(), path: '' };
}

function handleUnauthorized(): void {
  localStorage.removeItem('auth_token');
  // Optionally: import auth store and call logout()
  // window.location.href = '/auth/login?redirect=' + encodeURIComponent(window.location.pathname);
}

// Optional: HTTP contract for testing
export interface IHttpClient {
  get<T>(url: string, config?: any): Promise<T>;
  post<T>(url: string, data?: any, config?: any): Promise<T>;
  put<T>(url: string, data?: any, config?: any): Promise<T>;
  patch<T>(url: string, data?: any, config?: any): Promise<T>;
  delete<T>(url: string, config?: any): Promise<T>;
}
```

---

## 2. Environment Configuration

### `.env.example`

```env
VITE_API_BASE_URL=http://localhost:8000/api
VITE_APP_TITLE=Team Task Manager
```

### Runtime Config (`app/config.ts`)

```typescript
// app/config.ts
export const appConfig = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? '/api',
  appTitle: import.meta.env.VITE_APP_TITLE ?? 'Team Task Manager',
  enableDevTools: import.meta.env.DEV,
} as const;
```

---

## 3. Task API — `modules/tasks/data/`

### DTOs (`dtos/task.dto.ts`)

```typescript
// modules/tasks/data/dtos/task.dto.ts
export interface TaskDto {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'done';
  assigned_to: string;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTaskDto {
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'done';
  assigned_to: string;
  due_date: string | null;
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  status?: 'todo' | 'in_progress' | 'done';
  assigned_to?: string;
  due_date?: string | null;
}

export interface TaskListParams {
  page?: number;
  per_page?: number;
  status?: 'todo' | 'in_progress' | 'done';
  assigned_to?: string;
  search?: string;
  sort_by?: 'created_at' | 'updated_at' | 'title' | 'due_date';
  sort_order?: 'asc' | 'desc';
}

export interface PaginatedTaskResponse {
  data: TaskDto[];
  meta: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}
```

### Mappers (`mappers/task.mapper.ts`)

```typescript
// modules/tasks/data/mappers/task.mapper.ts
import type { Task, TaskStatus } from '../../domain/types';
import type { TaskDto, CreateTaskDto, UpdateTaskDto } from '../dtos/task.dto';

export function toDomain(dto: TaskDto): Task {
  return {
    id: dto.id,
    title: dto.title,
    description: dto.description,
    status: dto.status as TaskStatus,
    assignedTo: dto.assigned_to,
    dueDate: dto.due_date ? new Date(dto.due_date) : null,
    createdAt: new Date(dto.created_at),
    updatedAt: new Date(dto.updated_at),
  };
}

export function toCreateDto(task: Pick<Task, 'title' | 'description' | 'status' | 'assignedTo' | 'dueDate'>): CreateTaskDto {
  return {
    title: task.title,
    description: task.description,
    status: task.status,
    assigned_to: task.assignedTo,
    due_date: task.dueDate?.toISOString().split('T')[0] ?? null,
  };
}

export function toUpdateDto(task: Partial<Pick<Task, 'title' | 'description' | 'status' | 'assignedTo' | 'dueDate'>>): UpdateTaskDto {
  const dto: UpdateTaskDto = {};
  if (task.title !== undefined) dto.title = task.title;
  if (task.description !== undefined) dto.description = task.description;
  if (task.status !== undefined) dto.status = task.status;
  if (task.assignedTo !== undefined) dto.assigned_to = task.assignedTo;
  if (task.dueDate !== undefined) dto.due_date = task.dueDate?.toISOString().split('T')[0] ?? null;
  return dto;
}
```

### Repository (`repositories/tasks.repository.ts`)

```typescript
// modules/tasks/data/repositories/tasks.repository.ts
import { httpClient } from '@/adapters/infrastructures/clients/HttpClient';
import type { TaskListParams, TaskDto, CreateTaskDto, UpdateTaskDto, PaginatedTaskResponse } from '../dtos/task.dto';

export const tasksRepository = {
  async findAll(params: TaskListParams = {}): Promise<PaginatedTaskResponse> {
    const response = await httpClient.get<PaginatedTaskResponse>('/tasks', { params });
    return response.data;
  },

  async findById(id: string): Promise<TaskDto> {
    const response = await httpClient.get<TaskDto>(`/tasks/${id}`);
    return response.data;
  },

  async create(data: CreateTaskDto): Promise<TaskDto> {
    const response = await httpClient.post<TaskDto>('/tasks', data);
    return response.data;
  },

  async update(id: string, data: UpdateTaskDto): Promise<TaskDto> {
    const response = await httpClient.put<TaskDto>(`/tasks/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await httpClient.delete(`/tasks/${id}`);
  },
};
```

---

## 4. Auth API — `modules/auth/data/`

### DTOs (`dtos/auth.dto.ts`)

```typescript
// modules/auth/data/dtos/auth.dto.ts
export interface LoginRequest {
  email: string;
  password: string;
  remember?: boolean;
}

export interface LoginResponse {
  user: UserDto;
  token: string;
}

export interface UserDto {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  email_verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}
```

### Repository (`repositories/auth.repository.ts`)

```typescript
// modules/auth/data/repositories/auth.repository.ts
import { httpClient } from '@/adapters/infrastructures/clients/HttpClient';
import type { LoginRequest, LoginResponse, RegisterRequest, UserDto } from '../dtos/auth.dto';

export const authRepository = {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await httpClient.post<LoginResponse>('/login', credentials);
    return response.data;
  },

  async register(data: RegisterRequest): Promise<LoginResponse> {
    const response = await httpClient.post<LoginResponse>('/register', data);
    return response.data;
  },

  async logout(): Promise<void> {
    await httpClient.post('/logout');
  },

  async me(): Promise<UserDto> {
    const response = await httpClient.get<UserDto>('/user');
    return response.data;
  },
};
```

---

## 5. Error Handling

### Error Types (`shared/types/api.ts`)

```typescript
// shared/types/api.ts
export interface ApiError {
  status: number;
  code: string;
  message: string;
  details?: Record<string, string[]>;
  timestamp: string;
  path: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}
```

### Error Handling Patterns

| Layer | Responsibility |
|-------|----------------|
| **HttpClient** | Network errors, timeout, 401, status normalization |
| **Feature Composables** | Business error handling, expose `error` ref, optional toast |
| **Components** | Display `ErrorState`, field-level validation errors, toast |

### Laravel Validation Errors (422)

```typescript
// Expected Laravel 422 response
{
  "message": "Validation failed",
  "errors": {
    "title": ["The title field is required."],
    "due_date": ["The due date must be a valid date."]
  }
}

// Frontend mapping (in mappers)
const fieldErrors = error.details ?? {};
// errors.title[0] → "The title field is required."
```

---

## 6. Authentication Integration

### Token Storage

```typescript
// In auth store
const TOKEN_KEY = 'auth_token';

function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
  httpClient.defaults.headers.common.Authorization = `Bearer ${token}`;
}

function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  delete httpClient.defaults.headers.common.Authorization;
}

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
```

### Session Initialization

```typescript
// Auth store init()
async function init(): Promise<void> {
  const token = getToken();
  if (!token) return;
  
  httpClient.defaults.headers.common.Authorization = `Bearer ${token}`;
  
  try {
    user.value = await authService.me();
  } catch {
    clearToken();
    throw new Error('Session expired');
  }
}
```

---

## 7. Filtering, Pagination, Search

### Task List Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | number | Page number (default: 1) |
| `per_page` | number | Items per page (default: 20, max: 100) |
| `status` | enum | `todo`, `in_progress`, `done` |
| `assigned_to` | string | User ID filter |
| `search` | string | Title search (backend-dependent) |
| `sort_by` | string | `created_at`, `updated_at`, `title`, `due_date` |
| `sort_order` | string | `asc`, `desc` |

### Frontend Implementation

```typescript
// useTasks.ts
const params = ref<TaskListParams>({
  page: 1,
  per_page: 20,
  status: undefined,
  search: '',
  sort_by: 'created_at',
  sort_order: 'desc',
});

async function fetchTasks(): Promise<void> {
  loading.value = true;
  try {
    const response = await tasksService.list(params.value);
    tasks.value = response.tasks;
    meta.value = response.meta;
  } catch (e) {
    error.value = normalizeError(e);
  } finally {
    loading.value = false;
  }
}

// Watch for param changes with debounce
watch(params, fetchTasks, { deep: true });
```

---

## 8. Mocking & Testing

### MSW Handlers (`tests/msw/handlers.ts`)

```typescript
// tests/msw/handlers.ts
import { http, HttpResponse } from 'msw';
import type { TaskDto, PaginatedTaskResponse } from '@/modules/tasks/data/dtos/task.dto';

let tasks: TaskDto[] = [
  { id: '1', title: 'Task 1', description: 'Desc', status: 'todo', assigned_to: '1', due_date: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  // ... more mock tasks
];

export const handlers = [
  http.get('/api/tasks', ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const perPage = parseInt(url.searchParams.get('per_page') || '20');
    const status = url.searchParams.get('status');
    
    let filtered = tasks;
    if (status) filtered = filtered.filter(t => t.status === status);
    
    const start = (page - 1) * perPage;
    const paginated = filtered.slice(start, start + perPage);
    
    return HttpResponse.json<PaginatedTaskResponse>({
      data: paginated,
      meta: { page, per_page: perPage, total: filtered.length, total_pages: Math.ceil(filtered.length / perPage) },
    });
  }),

  http.post('/api/tasks', async ({ request }) => {
    const body = await request.json();
    const newTask: TaskDto = { id: String(tasks.length + 1), ...body, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    tasks.push(newTask);
    return HttpResponse.json(newTask, { status: 201 });
  }),

  http.put('/api/tasks/:id', async ({ params, request }) => {
    const body = await request.json();
    const idx = tasks.findIndex(t => t.id === params.id);
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 });
    tasks[idx] = { ...tasks[idx], ...body, updated_at: new Date().toISOString() };
    return HttpResponse.json(tasks[idx]);
  }),

  http.delete('/api/tasks/:id', ({ params }) => {
    tasks = tasks.filter(t => t.id !== params.id);
    return new HttpResponse(null, { status: 204 });
  }),

  http.post('/api/login', async ({ request }) => {
    const body = await request.json();
    if (body.email === 'admin@example.com' && body.password === 'password') {
      return HttpResponse.json({ user: { id: '1', name: 'Admin', email: 'admin@example.com', role: 'admin' }, token: 'mock-token' });
    }
    return HttpResponse.json({ message: 'Invalid credentials' }, { status: 401 });
  }),
];
```

---

## 9. Unresolved Backend API Contracts

| Endpoint | Status | Notes |
|----------|--------|-------|
| `POST /api/login` | ⚠️ Not implemented | Laravel Sanctum not installed |
| `POST /api/register` | ⚠️ Not implemented | No register endpoint |
| `POST /api/logout` | ⚠️ Not implemented | Token revocation needed |
| `GET /api/user` | ⚠️ Not implemented | Current user endpoint |
| `GET /api/tasks` | ⚠️ Not implemented | No Task model/controller |
| `POST /api/tasks` | ⚠️ Not implemented | |
| `GET /api/tasks/{id}` | ⚠️ Not implemented | |
| `PUT /api/tasks/{id}` | ⚠️ Not implemented | |
| `DELETE /api/tasks/{id}` | ⚠️ Not implemented | |
| `GET /api/users` | ⚠️ Not implemented | Needed for assignee dropdown |
| `GET /api/users/{id}` | ⚠️ Not implemented | |

**Action Required:** Backend team must implement these endpoints per the documented contracts. Frontend development can proceed with MSW mocks.

---

## 10. Request Flow Diagram

```
TasksListPage.vue
       ↓
useTasks.ts (composable)
       ↓
tasksService.list() (application service)
       ↓
tasksRepository.findAll() (data repository)
       ↓
httpClient.get() (adapters/clients/HttpClient)
       ↓
Axios → Laravel REST API
       ↓
Response → mapper → domain Task[] → tasks.value (ref)
```