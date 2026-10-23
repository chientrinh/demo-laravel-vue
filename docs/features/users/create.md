# Tạo User (Create User)

## Mục tiêu
Trang admin tạo tài khoản thành viên mới: nhập thông tin đăng nhập và gán role ban đầu.

## Vai trò
- `admin` only. `user` truy cập trực tiếp bị chặn (FE redirect `/tasks`, BE `403`).

## Luồng người dùng
1. Từ `/users`, admin bấm "+ Add User" (hoặc sidebar "Create User") → `/users/create`.
2. Nhập Name, Email, Password, chọn Role.
3. Bấm "Create User".
4. Hệ thống validate; nếu hợp lệ gọi `POST /api/users`.
5. Thành công: toast "Đã tạo user", điều hướng `/users` (danh sách mới nhất).
6. Thất bại: hiển thị lỗi theo field, giữ nguyên dữ liệu đã nhập.
7. "Cancel" hoặc nút back → quay lại `/users`, không lưu.

## UI/UX Specs (Per `user-create.html`)

### Layout
- **Layout**: `FullLayout`.
- **Breadcrumb**: Dashboard → Users → Create New User.
- **Page header**: nút back (`arrow_back`), tiêu đề "Create New User", phụ đề "Provision team member credentials, assign initial role, and configure granular system permissions."
- **Card**: "User Details" (icon `person_add`), chứa form.
- **Form width**: tối đa ~720px, canh trái; card padding thoáng, field xếp dọc.
- **Actions**: "Cancel" (text) và "Create User" (primary, icon `person_add`, `:loading` khi submit), nằm cuối card, canh phải.

### Form Fields
| Field | Control | Required | Validation | Ghi chú |
| --- | --- | --- | --- | --- |
| Name | `v-text-field` | Có | `min 1`, `max 255` | Placeholder "e.g. Rachel Adams", icon `person` |
| Email | `v-text-field` | Có | email hợp lệ, `max 255`, unique trong `users` | Placeholder "e.g. rachel.adams@materio.io", icon `mail`, trim + lowercase trước khi gửi |
| Password | `v-text-field` type password | Có | `min 8` | Icon `lock`, toggle hiện/ẩn (`visibility`), không hiển thị lại sau submit |
| Role | Chọn 1 trong 2 card | Có | `admin` \| `user` | Mặc định `user` |

### Role selector
- Hai card chọn được, dạng radio (click cả card):
  - **Admin** — "Full access": quản lý user, xoá task, xem toàn bộ dữ liệu.
  - **User** — "Standard access": chỉ xem/sửa task được giao.
- Card đang chọn có viền primary + nền nhấn; có `role="radio"`, `aria-checked`, điều khiển được bằng bàn phím (Enter/Space).
- Không cho tự chọn role ngoài enum.

### Trạng thái
- Submit disabled khi form invalid hoặc đang gửi; Enter trong field submit form.
- Lỗi server (`422`) map vào đúng field; lỗi chung hiển thị alert đầu form.
- `403` → toast "Không có quyền truy cập" + điều hướng `/tasks`.
- Network error → alert + giữ dữ liệu, cho phép thử lại.

## API sử dụng
- **POST `/api/users`** — đã có (`auth:sanctum` + `role:admin`).
- Request:
  ```json
  {
    "name": "Rachel Adams",
    "email": "rachel.adams@materio.io",
    "password": "secret123",
    "role": "user"
  }
  ```
- Response (201):
  ```json
  {
    "data": {
      "id": 7,
      "name": "Rachel Adams",
      "email": "rachel.adams@materio.io",
      "role": "user",
      "created_at": "2026-10-23T09:00:00.000000Z",
      "updated_at": "2026-10-23T09:00:00.000000Z"
    }
  }
  ```
- Lỗi:
  - `422` — `{ "message": "...", "errors": { "email": ["The email has already been taken."] } }`
  - `403` — không phải admin
  - `429` — quá nhiều request (nếu áp throttle)

### Validation backend đề xuất
```php
'name' => ['required', 'string', 'max:255'],
'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
'password' => ['required', 'string', Password::min(8)],
'role' => ['required', Rule::in([User::ROLE_ADMIN, User::ROLE_USER])],
```

## Dữ liệu
- Bảng `users`: `id`, `name`, `email`, `password` (hashed tự động qua cast `hashed`), `role`, `email_verified_at` (null), `created_at`, `updated_at`.
- User tạo bởi admin không cần verify email; đăng nhập được ngay.

## Tiêu chí chấp nhận
- [ ] Chỉ admin truy cập được `/users/create`.
- [ ] Form có đủ 4 field đúng thứ tự, đúng placeholder/icon.
- [ ] Bắt buộc Name/Email/Password/Role; báo lỗi inline khi bỏ trống.
- [ ] Email sai định dạng hoặc trùng báo lỗi tại field Email.
- [ ] Password < 8 ký tự báo lỗi tại field Password; có toggle hiện/ẩn.
- [ ] Role mặc định `user`, chọn được `admin`; card có trạng thái selected rõ ràng.
- [ ] Submit thành công → toast + chuyển `/users`, user mới xuất hiện.
- [ ] Submit lỗi giữ nguyên input, không mất dữ liệu.
- [ ] Double-click không tạo 2 user (disable + loading).
- [ ] Cancel/back không tạo user.

## Trường hợp biên
- Email vừa bị người khác tạo → `422`, báo lỗi unique và focus field Email.
- Tạo admin đầu tiên khi hệ thống chỉ có user thường → cho phép (admin hiện tại thực hiện).
- Mất mạng giữa chừng → có thể đã tạo thành công; khi retry gặp `422` unique → thông báo user đã tồn tại.
- Token hết hạn → `401`, logout + điều hướng `/auth/login`.
- Dữ liệu chứa khoảng trắng đầu/cuối → trim trước khi validate.

## Kiểm thử
- Unit test: schema validate (name/email/password/role) và map payload.
- Component test: render field, lỗi inline, disabled/loading, emit submit đúng payload.
- API test: admin tạo được (201), trùng email (422), user thường (403), thiếu field (422).
- E2E: `/users` → Add User → điền form → Create → thấy user trong danh sách.

## Liên quan
- [`features/users/list.md`](./list.md)
- [`features/users/edit.md`](./edit.md)
- [`features/authentication/register.md`](../authentication/register.md)
- [`backend/api/endpoints/users.md`](../../backend/api/endpoints/users.md)
- [`frontend/forms-and-validation.md`](../../frontend/forms-and-validation.md)
