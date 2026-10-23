# Chi tiết Task (Task Detail)

## Mục tiêu
Xem chi tiết đầy đủ một task, có thể edit/delete.

## Vai trò
- `admin`: xem/sửa/xóa mọi task
- `user`: xem/sửa task được giao, không xóa

## Luồng người dùng
1. User click task trong danh sách → `/tasks/:id`
2. Hệ thống gọi `GET /api/tasks/:id`
3. Hiển thị chi tiết: Title, Description, Status badge, Assignee, Due Date, Created/Updated
3. User có thể:
   - Click "Chỉnh sửa" → mở dialog form (pre-filled)
   - Click "Xóa" (admin only) → confirm modal → xóa

## API sử dụng
- **GET `/api/tasks/:id`** → TaskDto
- **PUT `/api/tasks/:id`** → Update
- **DELETE `/api/tasks/:id`** → Delete (admin only)

## Dữ liệu
- TaskDto: `id`, `title`, `description`, `status`, `assigned_to`, `due_date`, `created_at`, `updated_at`, `assignee` (UserDto)

## Tiêu chí chấp nhận
- [ ] Load: skeleton cho card detail
- [ ] Error 404: redirect `/tasks` + toast "Task không tồn tại"
- [ ] Forbidden 403: toast "Không có quyền truy cập"
- [ ] Status badge màu sắc đúng
- [ ] Due date quá hạn: highlight đỏ
- [ ] Assignee hiển thị tên + email
- [ ] Nút Edit/Delete đúng quyền
- [ ] Delete: confirm modal → success toast → redirect `/tasks`

## Trường hợp biên
- Task bị xóa khi đang xem → 404 redirect
- Network error → ErrorState + Retry
- User không phải assignee/admin → 403

## Kiểm thử
- Unit test: `useTask` composable fetch
- Component test: TaskDetailView render/edit/delete
- E2E test: View -> Edit -> Save -> Delete

## Liên quan
- [`features/tasks/list.md`](./list.md)
- [`features/tasks/form.md`](./form.md)
- [`backend/api/endpoints/tasks.md`](../../backend/api/endpoints/tasks.md)