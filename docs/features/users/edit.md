# Sửa User (Edit User)

## Mục tiêu
Trang admin cập nhật thông tin tài khoản (name, email, password) và role của một user; đồng thời cho phép xoá user.

## Vai trò
- `admin` only. `user` truy cập trực tiếp bị chặn (FE redirect `/tasks`, BE `403`).

## Luồng người dùng
1. Từ `/users`, admin bấm icon Edit trên một dòng → `/users/:id/edit`.
2. Hệ thống gọi `GET /api/users/:id`; nếu `404` → toast "User không tồn tại" + về `/users`.
3. Form được điền sẵn Name, Email, Role; Password để trống.
4. Admin sửa thông tin rồi bấm "Save Changes".
5. Hệ thống validate; nếu hợp lệ gọi `PUT /api/users/:id`.
6. Thành công: toast "Đã cập nhật user", quay lại `/users`.
7. "Cancel" → về `/users` không lưu.
8. "Delete User" → mở dialog xác nhận → `DELETE /api/users/:id` → toast + về `/users`.

## UI/UX Specs (Per `user-edit.html`)

### Layout
- **Layout**: `FullLayout`.
- **Breadcrumb**: Dashboard → Users → Edit User.
- **Page header**:
  - Tiêu đề "Edit User" + chip `#204` (ID user).
  - Phụ đề "Update account credentials and user role privileges."
  - Nhóm action bên phải: "Cancel" (text), "Delete User" (error/outline, icon `delete`), "Save Changes" (primary, icon `save`, `:loading`).
- **Card**: "User Details" (icon `manage_accounts`), có chip "ID: #204".
- **Form width**: tối đa ~720px.
- **Metadata** cuối card: "Created: Oct 12, 2024" (icon `schedule`), "Updated: Oct 20, 2024" (icon `update`), chữ mờ.

### Form Fields
| Field | Control | Required | Validation | Ghi chú |
| --- | --- | --- | --- | --- |
| User ID | `v-text-field` readonly | — | — | Icon `tag`, chỉ đọc, không gửi lên server |
| Name | `v-text-field` | Có | `min 1`, `max 255` | Icon `person` |
| Email | `v-text-field` | Có | email hợp lệ, unique (trừ chính user) | Icon `mail` |
| Password | `v-text-field` type password | Không | nếu nhập: `min 8` | Icon `lock`, toggle hiện/ẩn, helper "Leave blank to keep current password" |
| Role | Chọn 1 trong 2 card | Có | `admin` \| `user` | Xem mô tả bên dưới |

### Role selector
- **Admin** — "Full workspace management".
- **User** — "Standard member access".
- Cùng hành vi card/radio như trang tạo user.
- Admin không được tự hạ role của chính mình (card `User` disabled + tooltip "Không thể tự hạ quyền") để tránh tự khoá khỏi hệ thống.

### Hành vi theo trạng thái
- Save disabled khi không có thay đổi hoặc form invalid; loading khi gửi.
- Không gửi `password` nếu để trống.
- Nếu không có thay đổi, Cancel/Save đều đưa về `/users`.
- `403` → toast "Không có quyền truy cập" + `/tasks`.
- `404` khi load hoặc save → toast "User không tồn tại" + `/users`.
- `409` (nếu backend chặn xoá admin cuối cùng) → alert trong dialog xác nhận.

### Dialog xoá user
- Tiêu đề: "Xoá user?"; nội dung nêu rõ tên/email.
- Cảnh báo: "Toàn bộ task được giao cho user này cũng sẽ bị xoá." (FK `assigned_to` dùng `cascadeOnDelete`).
- Nút "Cancel" và "Delete" (error); Delete có loading, không đóng dialog khi đang gửi.
- Không cho xoá chính mình: nút Delete disabled + tooltip.

## API sử dụng
- **GET `/api/users/{id}`** — đã có, admin only.
- **PUT `/api/users/{id}`** — đã có (`role:admin`).
  - Request (password bỏ trống thì không gửi hoặc gửi `null`):
    ```json
    {
      "name": "Rachel Adams",
      "email": "rachel.adams@materio.io",
      "password": "newsecret123",
      "role": "admin"
    }
    ```
  - Response (200): `{ "data": { ...UserResource } }`
  - Lỗi: `422` (email trùng/định dạng), `403`, `404`, `401`.
- **DELETE `/api/users/{id}`** — đã có (`role:admin`).
  - Response (204 hoặc 200).
  - Lỗi: `403` (tự xoá / không phải admin), `404`, `409` (admin cuối cùng).

### Validation backend đề xuất
```php
'name' => ['sometimes', 'required', 'string', 'max:255'],
'email' => ['sometimes', 'required', 'string', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
'password' => ['sometimes', 'nullable', 'string', Password::min(8)],
'role' => ['sometimes', 'required', Rule::in([User::ROLE_ADMIN, User::ROLE_USER])],
```
- Không cho `role` của chính admin hiện tại chuyển khỏi `admin`.
- Không cho xoá admin cuối cùng của hệ thống.

## Dữ liệu
- Bảng `users`: `id`, `name`, `email`, `password`, `role`, `email_verified_at`, `created_at`, `updated_at`.
- `created_at` / `updated_at` hiển thị dạng `MMM D, YYYY` (ví dụ "Oct 12, 2024").
- Đổi password không thu hồi token hiện tại của user (giữ nguyên hành vi Sanctum); có thể bổ sung thu hồi sau.

## Tiêu chí chấp nhận
- [ ] Chỉ admin truy cập được `/users/:id/edit`.
- [ ] Load đúng dữ liệu, ID hiển thị readonly và không gửi trong payload.
- [ ] Email được điền sẵn; sửa sang email của user khác báo lỗi tại field.
- [ ] Password để trống → giữ mật khẩu cũ; nhập < 8 ký tự báo lỗi.
- [ ] Có toggle hiện/ẩn password và helper text đúng.
- [ ] Role hiện tại được chọn sẵn; đổi role lưu đúng.
- [ ] Admin không thể tự hạ role chính mình.
- [ ] Save thành công → toast + về `/users`, dữ liệu mới hiển thị.
- [ ] Save lỗi giữ nguyên input và hiển thị lỗi theo field.
- [ ] Delete mở confirm, có cảnh báo cascade task, xoá xong toast + về `/users`.
- [ ] Không cho xoá chính mình.
- [ ] Created/Updated hiển thị đúng.
- [ ] `404` khi load → toast + `/users`.

## Trường hợp biên
- User bị xoá trong lúc đang sửa → Save trả `404` → toast + `/users`.
- Admin tự đổi role mình qua API (bypass UI) → backend trả `422`/`403`.
- Xoá admin cuối cùng → `409`, dialog hiển thị lý do, không xoá.
- Email không đổi → không báo lỗi unique.
- Mất mạng khi Save → giữ dữ liệu, cho phép thử lại; tránh gửi lặp bằng loading.
- Token hết hạn → `401`, logout + `/auth/login`.

## Kiểm thử
- Unit test: map dữ liệu form ↔ payload (bỏ `password` rỗng, bỏ `id`).
- Unit test: schema edit (email unique ignore self, password optional).
- Component test: prefill, dirty-state, disabled rules, delete dialog.
- API test: admin cập nhật (200), trùng email (422), user thường (403), tự hạ quyền (422/403), xoá admin cuối (409).
- E2E: `/users` → Edit → đổi name/role → Save → danh sách cập nhật; Delete → confirm → user biến mất.

## Liên quan
- [`features/users/list.md`](./list.md)
- [`features/users/create.md`](./create.md)
- [`backend/api/endpoints/users.md`](../../backend/api/endpoints/users.md)
- [`frontend/forms-and-validation.md`](../../frontend/forms-and-validation.md)
- [`backend/security.md`](../../backend/security.md)
