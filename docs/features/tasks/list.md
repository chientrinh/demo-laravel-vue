# Danh sách Task (Task List)

## Mục tiêu
Hiển thị danh sách task với tìm kiếm, lọc trạng thái, phân trang.

## Vai trò
- `admin`: xem tất cả task
- `user`: chỉ xem task được giao (`assigned_to = me`)

## Luồng người dùng
1. User truy cập `/tasks` (sau login)
2. Hệ thống gọi `GET /api/tasks?page=1&per_page=20`
3. Hiển thị bảng task với cột: Title, Status, Assignee, Due Date, Actions
4. User có thể:
   - Tìm kiếm theo title (debounce 300ms)
   - Lọc theo status (dropdown: All, Todo, In Progress, Done)
   - Phân trang (prev/next, page size)
   - Click "Tạo task" → mở dialog form
   - Click "Edit" task → mở dialog form
   - Click "Delete" task → confirm → xóa

## UI/UX Specs (Per `task-list.html`)

### Layout
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

## API sử dụng
- **GET `/api/tasks`**
  - Query: `page`, `per_page`, `status`, `search`, `sort_by`, `sort_order`
  - Response: `{ data: TaskDto[], meta: { page, per_page, total, total_pages }, links }`

## Dữ liệu
- Bảng `tasks`: `id`, `title`, `description`, `status`, `assigned_to`, `due_date`, `created_at`, `updated_at`
- Relation: `assigned_to` → `users.id`

## Tiêu chí chấp nhận
- [ ] Load lần đầu: skeleton loader cho bảng
- [ ] Refresh: giữ dữ liệu cũ, spinner nhỏ
- [ ] Error: hiển thị ErrorState + nút Retry
- [ ] Empty: "Không có task nào" + nút "Tạo task"
- [ ] Tìm kiếm: debounce 300ms, reset page=1
- [ ] Lọc status: áp dụng ngay, reset page=1
- [ ] Phân trang: prev/next, page number, page size selector
- [ ] Admin: thấy tất cả task, user: chỉ task của mình
- [ ] Status badge: màu sắc (todo=gray, in_progress=blue, done=green)
- [ ] Due date quá hạn: highlight đỏ
- [ ] Quick Status Cards: Backlog, Active In Progress, Completed Sprint, Urgent Blockers
- [ ] Filter & Search Toolbar: Search, Status Filter, Assignee Filter, Priority Filter, Reset
- [ ] Quick Status Cards: Backlog (14), Active In Progress (22), Completed Sprint (12), Urgent Blockers (2)
- [ ] Priority Badges: Urgent (red/bolt), High (yellow), Medium (blue), Low (gray)
- [ ] Row Actions: View (visibility), Edit (edit), Delete (delete with confirmation dialog)

## Trường hợp biên
- Không có task → empty state
- Network error khi load → ErrorState + Retry
- Search rỗng → reset filter
- Page > total_pages → redirect page 1

## Kiểm thử
- Unit test: `useTasks` composable fetch/filter/pagination
- Component test: TasksTable render/sort/filter
- E2E test: List -> Filter -> Search -> Paginate -> Create -> Edit -> Delete

## Liên quan
- [`features/tasks/detail.md`](./detail.md)
- [`features/tasks/form.md`](./form.md)
- [`backend/api/endpoints/tasks.md`](../../backend/api/endpoints/tasks.md)
- [`frontend/data-fetching.md`](../frontend/data-fetching.md)