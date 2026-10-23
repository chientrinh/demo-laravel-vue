# Đặc tả tính năng — Team Task Manager

Mỗi thư mục con là một miền nghiệp vụ; mỗi file là một tính năng. Đây là tài liệu **agent đọc trước khi code**.

| Miền | Tính năng | Route | File |
| --- | --- | --- | --- |
| Xác thực | Đăng nhập | `/auth/login` | [`authentication/login.md`](./authentication/login.md) |
| Xác thực | Đăng ký | `/auth/register` | [`authentication/register.md`](./authentication/register.md) |
| Task | Danh sách task | `/tasks` | [`tasks/list.md`](./tasks/list.md) |
| Task | Chi tiết task | `/tasks/:id` | [`tasks/detail.md`](./tasks/detail.md) |
| Task | Tạo/Sửa task | `/tasks` (dialog) | [`tasks/form.md`](./tasks/form.md) |
| User | Danh sách user | `/users` | [`users/list.md`](./users/list.md) |
| User | Tạo user | `/users/create` | [`users/create.md`](./users/create.md) |
| User | Sửa/Xoá user | `/users/:id/edit` | [`users/edit.md`](./users/edit.md) |

## Khuôn mẫu một đặc tả

Mọi file tính năng theo cấu trúc:

1. **Mục tiêu** — tính năng giải quyết việc gì.
2. **Vai trò** — ai được dùng.
3. **Luồng người dùng** — các bước.
4. **API sử dụng** — endpoint + payload.
5. **Dữ liệu** — bảng/field liên quan.
6. **Tiêu chí chấp nhận** — checklist kiểm chứng được.
7. **Trường hợp biên** — hành vi với dữ liệu bất thường.
8. **Kiểm thử** — test bắt buộc.
9. **Liên quan** — trỏ tới tài liệu khác.

## Từ vựng nghiệp vụ

- **Task** — công việc: `id`, `title`, `description`, `status`, `assigned_to`, `due_date`, `created_at`, `updated_at`
- **Task Status** — `todo`, `in_progress`, `done`
- **Assignee** — user được giao task
- **User** — tài khoản: `id`, `name`, `email`, `role`, `created_at`, `updated_at`
- **User Role** — `admin` (quản lý user, xoá task, xem toàn bộ) hoặc `user` (chỉ task được giao)
- **Pagination** — `page`, `per_page`, `total`, `total_pages`

## Quy ước chung mọi tính năng

- Mọi trang cần đăng nhập (trừ `/auth/login`, `/auth/register`)
- Vai trò `admin` quản lý tất cả; `user` chỉ xem/sửa task được giao
- Sau thao tác ghi: toast xác nhận + invalidate query liên quan
- Trạng thái tải/rỗng/lỗi theo [`frontend/state-management.md`](../frontend/state-management.md) và [`frontend/forms-and-validation.md`](../frontend/forms-and-validation.md)