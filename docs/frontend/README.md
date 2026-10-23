# Frontend Documentation — Team Task Manager

## Project Overview

This document set describes the frontend architecture for the **Team Task Manager** application.

- **Frontend**: Vue 3 SPA with TypeScript, Vuetify 3, Vite, Vue Router, Pinia, Axios
- **Backend**: Laravel 11 REST API (separate repository/folder)
- **UI Approach**: Vuetify 3 with Matdash application layouts (target; not yet installed)

## Target Technology Stack

> The current scaffold only includes Vue, Pinia, Vue Router, Vite, Vitest, and Playwright. Vuetify, Axios, and the Matdash layouts are planned dependencies.

| Technology | Version | Purpose |
|------------|---------|---------|
| Vue | 3.5.x | Reactive UI framework |
| TypeScript | 5.8.x | Type-safe development |
| Vuetify | 3.7.x | Material Design component library |
| Vite | 6.2.x | Build tool & dev server |
| Vue Router | 4.5.x | Client-side routing |
| Pinia | 2.x | State management |
| Axios | 1.x | HTTP client |
| Vue Tabler Icons | 2.21.x | Icon set |
| Vue ApexCharts | 1.5.x | Charts |
| Perfect Scrollbar | 1.6.x | Custom scrollbars |

## Documentation Index

| Document | Description |
|----------|-------------|
| [architecture.md](architecture.md) | Target module architecture, boundaries, and layer responsibilities |
| [folder-structure.md](folder-structure.md) | Target directory structure with folder responsibilities |
| [api-integration.md](api-integration.md) | Laravel REST API integration, repositories, DTOs, error handling |
| [data-fetching.md](data-fetching.md) | Repository/service data flow and loading patterns |
| [routing.md](routing.md) | Vue Router setup, routes, guards, lazy loading |
| [state-management.md](state-management.md) | Pinia stores, composables, component-local state |
| [coding-conventions.md](coding-conventions.md) | Vue SFC conventions, TypeScript rules, naming, imports |
| [feature-development-guide.md](feature-development-guide.md) | Step-by-step guide for implementing new features |
| [design-system.md](design-system.md) | Vuetify 3 + Material Design 3 component specifications |
| [forms-and-validation.md](forms-and-validation.md) | Form patterns, validation, vee-validate + Zod |
| [testing.md](testing.md) | Unit, component, and end-to-end testing strategy |
| [architecture-decisions.md](architecture-decisions.md) | Recorded architectural decisions and trade-offs |

## Design Specifications (from Design Files)

### Task Management UI

#### Task List Page (`/tasks`)
- **Sidebar Navigation**: Dashboard, All Tasks, Create Task, My Tasks, Users, Create User, Edit User, My Profile, Logout
- **Header**: Search (⌘K), Notifications, User Profile (avatar, name, role, expand_more)
- **Breadcrumb**: Dashboard → Tasks → All Tasks
- **Page Header**: Title "Task Management", Total count badge, "+ Create Task" button
- **Quick Status Cards**: Backlog (14), Active In Progress (22), Completed Sprint (12), Urgent Blockers (2)
- **Filter & Search Toolbar**: 
  - Search input (placeholder: "Search by task title or keyword...")
  - Status Filter Dropdown (All Statuses, Todo, In Progress, Done)
  - Assignee Filter Multiselect (avatars with +N)
  - Priority Filter Dropdown (All, Urgent, High, Medium, Low)
  - Reset Filters button
- **Data Table** (v-data-table):
  - Columns: Select (checkbox), Task ID & Title, Assignee (avatar + name + role), Status (colored chips), Priority (colored badges), Due Date, Created, Actions
  - Status Chips: Todo (yellow), In Progress (blue), Done (green)
  - Priority Badges: Urgent (red/bolt), High (yellow), Medium (blue), Low (gray)
  - Row Actions: View (visibility), Edit (edit), Delete (delete with confirmation dialog)

#### Task Create Page (`/tasks/create`)
- **Dialog/Page Layout**: Max-width 1440px, 2-column grid (8 cols form + 4 cols sidebar)
- **Left Column (8 cols)**:
  - **Task Information Card**: Title (120 char limit, char counter), Issue Type select (Feature/Bug/Refactor/Research), Rich Text Description (markdown toolbar + textarea)
  - **Acceptance Criteria & Subtasks Card**: Checklist with progress bar, add/remove items
  - **Attachments & References Card**: File upload, links
- **Right Sidebar (4 cols)**:
  - **Task Properties Card**: Assignee dropdown (avatar + name + role), Status dropdown (To Do/In Progress/Code Review/Done), Priority segmented buttons (Low/Medium/High/Urgent with colored indicators), Due Date picker, Estimate (hrs), Sprint & Tags multi-select

#### Task Edit Page (`/tasks/:id/edit`)
- Same layout as Create but pre-filled with existing data
- Shows Task ID badge, Created/Updated timestamps
- Status shows "In Progress (Active Sprint 44)" with context
- Priority selector with active state

### User Management UI

#### User List Page (`/users`)
- **Sidebar**: Active "Users" with "ADMIN" badge
- **Header**: Search, Role filter dropdown (All Roles/Admin/User), Export CSV, + Add User button
- **Data Table**: #, Name, Email, Role (Admin/User badges), Created At, Actions (Edit/Delete)
- Pagination with items per page selector

#### User Create Page (`/users/create`)
- **Form Fields**: Name*, Email*, Password*, Role* (radio: Admin/User with descriptions)
- Password visibility toggle
- Submit with loading state + toast notification

#### User Edit Page (`/users/:id/edit`)
- **Read-only**: User ID (#204)
- **Editable**: Name, Email, Password (optional, leave blank to keep current), Role (Admin/User radio buttons)
- Timestamps: Created/Updated timestamps

## Local Development

### Prerequisites

- Node.js 20+
- npm 10+
- Backend API running (see [Backend README](../backend/README.md))

### Setup

```bash
cd frontend
npm install
cp .env.example .env
# Edit .env with your API base URL
npm run dev
```

### Available Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build (typecheck + Vite build) |
| `npm run preview` | Preview production build |
| `npm run type-check` | Run `vue-tsc` type checking |
| `npm run lint` | Run oxlint and ESLint with auto-fix |
| `npm run test:unit` | Run Vitest unit tests |
| `npm run test:e2e` | Run Playwright end-to-end tests |

### Environment Variables

Create `.env` from `.env.example`:

```env
VITE_API_BASE_URL=http://localhost:8000/api
VITE_APP_TITLE=Team Task Manager
```

## Current Implementation Status

### ✅ Implemented

- Vue 3 + TypeScript + Vite scaffold
- Pinia installed and registered
- Vue Router installed with an empty route table
- Vitest and Playwright test tooling configured
- oxlint, ESLint, and Prettier configured

### 🚧 Planned

- Vuetify 3 installation and theme setup
- Matdash application layouts (full and blank) in `src/shared/layouts/`
- Axios HttpClient with interceptors
- Authentication integration (Sanctum tokens)
- `modules/auth/` and `modules/tasks/` feature modules
- Role-based UI (admin/user)
- Repository/service data layer
- Form validation with backend error mapping

### ❌ Not Started

- Task CRUD UI (per design specs above)
- User management UI
- End-to-end feature tests

## Quick Start for Contributors

1. Read [Architecture Overview](architecture.md)
2. Understand [Folder Structure](folder-structure.md)
3. Follow [Feature Development Guide](feature-development-guide.md)
4. Run `npm run dev` and verify the app loads
5. Run `npm run test:unit` before opening a PR
6. Check [Contributing Guide](../../CONTRIBUTING.md) for the PR process

## Links

- [Backend Documentation](../backend/README.md)
- [Contributing Guide](../../CONTRIBUTING.md)