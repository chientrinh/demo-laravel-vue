# Danh sách User (User List)

## Mục tiêu
Trang quản trị thành viên dành cho admin: xem, tìm kiếm, lọc theo role, phân trang, export CSV và điều hướng sang tạo/sửa/xoá user.

## Vai trò
- `admin`: xem toàn bộ user, tạo/sửa/xoá user, export CSV.
- `user`: không thấy mục "Users" trên sidebar; truy cập trực tiếp `/users` bị chặn (FE redirect `/tasks`, BE trả `403`).

## Luồng người dùng
1. Admin truy cập `/users`.
2. Hệ thống gọi `GET /api/users?page=1&per_page=10`.
3. Hiển thị tiêu đề "User Management", badge tổng số user và bảng danh sách.
4. Admin có thể:
   - Tìm kiếm theo tên hoặc email (debounce 300ms, reset `page=1`).
   - Lọc theo role (All Roles / Admin / User, reset `page=1`).
   - Đổi số dòng mỗi trang (10/25/50) và chuyển trang.
   - Bấm "Export CSV" để tải danh sách theo bộ lọc hiện tại.
   - Bấm "+ Add User" → `/users/create`.
   - Bấm icon Edit trên một dòng → `/users/:id/edit`.
   - Bấm icon Delete trên một dòng → mở dialog xác nhận → xoá.
5. Sau khi xoá: toast thành công, tải lại trang hiện tại; nếu trang trống thì lùi về trang trước.

## UI/UX Specs (Per `user-list.html`)

### Layout
- **Layout**: `FullLayout` (sidebar + header + nội dung).
- **Sidebar**: nhóm `USER MANAGEMENT` gồm "Users"; nhóm `ADMIN` gồm "Create User", "Edit User & Permissions"; các nhóm GENERAL/TASK MANAGEMENT/ACCOUNT giữ nguyên như các trang khác.
- **Header**: search "Search tasks, members..." (⌘K), badge "Admin Role" (icon `verified_user`), notifications, avatar + tên + chức danh.
- **Breadcrumb**: Dashboard → User Management → Users.
- **Page header**:
  - Tiêu đề "User Management".
  - Badge tổng số: "16 Total Users" (số lấy từ `meta.total`).
  - Badge "Admin Restricted" (icon `lock`) nhấn mạnh quyền truy cập.
  - Nút "Export CSV" (icon `file_download`).
  - Nút "+ Add User" (icon `person_add`, variant primary).

### Toolbar
- Ô search, placeholder "Search by name or email...", icon `search`.
- Select role: `All Roles` (mặc định), `Admin`, `User`.
- Nút "Reset" (icon `restart_alt`) xoá search + role, đưa `page` về 1.
- Toolbar wrap trên màn hình nhỏ; search chiếm toàn bộ chiều ngang ở breakpoint `xs`.

### Bảng (v-data-table)
| Cột | Nội dung | Ghi chú |
| --- | --- | --- |
| `#` | Số thứ tự toàn cục: `(page - 1) * per_page + index + 1` | Căn phải, chữ mờ |
| Name | Avatar chữ cái đầu + tên | Tên in đậm |
| Email | Email user | Chữ mờ |
| Role | Chip: `Admin` (icon `shield`) / `User` (icon `person`) | Admin dùng màu primary/tertiary, User màu neutral |
| Created At | `YYYY-MM-DD HH:mm` | Định dạng nhất quán toàn bảng |
| Actions | Icon button Edit (`edit`), Delete (`delete`) | Delete dùng màu error |

- Dòng hover đổi nền; không có cột chọn checkbox.
- Icon Delete bị disable (kèm tooltip) với dòng của chính admin đang đăng nhập.
- Bảng cuộn ngang trên màn hình nhỏ, không vỡ layout.

### Footer phân trang
- "Items per page:" + select `10` / `25` / `50` (mặc định 10).
- Nhãn "Showing 1-7 of 16 users" tính từ `meta`.
- Nút prev/next + số trang; prev disabled ở trang đầu, next disabled ở trang cuối.

### Trạng thái
- **Loading lần đầu**: skeleton 5-10 dòng đúng số cột.
- **Refreshing** (đổi trang/lọc): giữ bảng cũ, hiện progress bar mảnh.
- **Empty**: "Không có user nào" + nút "Add User" (ẩn khi đang có bộ lọc, thay bằng "Xoá bộ lọc").
- **Error**: `ErrorState` + nút Retry; lỗi 403 hiển thị toast "Không có quyền truy cập" và điều hướng `/tasks`.

## API sử dụng
- **GET `/api/users`** — đã có, admin only.
  - Query: `page`, `per_page`, `search`, `role`.
  - `sort` **chưa được backend hỗ trợ** (cần bổ sung nếu cần sắp xếp tuỳ chỉnh).
  - Response:
    ```json
    {
      "data": [
        { "id": 1, "name": "Alex Morgan", "email": "alex@company.io", "role": "admin", "created_at": "2023-01-12T09:30:00.000000Z" }
      ],
      "meta": { "page": 1, "per_page": 10, "total": 16, "total_pages": 2 },
      "links": { "first": "…", "last": "…", "prev": null, "next": "…" }
    }
    ```
- **DELETE `/api/users/{id}`** — đã có, admin only. Xoá user sẽ cascade xoá task được giao (FK `assigned_to` → `cascadeOnDelete`). Không cho tự xoá (`403`), chặn xoá admin cuối cùng (`409`).
- **GET `/api/users/export`** — **chưa có**; nút Export CSV hiện xuất dữ liệu phía client theo `search` + `role` đang lọc.

### Hiện trạng triển khai
- Đã có route `/users`, trang list, filter search/role, phân trang và export CSV phía client trong `frontend/src/modules/users`.
- Backend đã hỗ trợ `GET /api/users` với `search` + `role`, cùng CRUD user (`POST`/`PUT`/`DELETE`).

## Dữ liệu
- Bảng `users`: `id`, `name`, `email`, `password` (hashed), `role` (`admin` | `user`), `email_verified_at`, `created_at`, `updated_at`.
- `created_at` hiển thị theo timezone ứng dụng, format `YYYY-MM-DD HH:mm`.

## Tiêu chí chấp nhận
- [ ] Chỉ admin thấy menu "Users" và truy cập được `/users`.
- [ ] Badge tổng số khớp `meta.total`.
- [ ] Bảng hiển thị đúng 6 cột, đúng thứ tự và định dạng ngày.
- [ ] Search debounce 300ms, gọi API với `search`, reset `page=1`.
- [ ] Lọc role hoạt động và reset `page=1`.
- [ ] Reset xoá search + role và tải lại trang 1.
- [ ] Phân trang đúng, nhãn "Showing X-Y of N users" chính xác.
- [ ] Đổi `per_page` reset về trang 1.
- [ ] Edit điều hướng đúng `/users/:id/edit`.
- [ ] Delete mở confirm, xoá thành công có toast + refresh.
- [ ] Không cho xoá chính mình (nút disabled + tooltip).
- [ ] Loading/empty/error đúng đặc tả.
- [ ] Bảng không vỡ layout trên mobile.

## Trường hợp biên
- `page` > `total_pages` (sau khi xoá/lọc) → tự lùi về trang cuối; nếu không còn dữ liệu → trang 1.
- Search không có kết quả → empty state + nút xoá bộ lọc.
- Xoá user đã bị người khác xoá → `404`, toast "User không tồn tại" + refresh.
- Xoá user đang được giao task → cảnh báo trong confirm rằng task liên quan sẽ bị xoá.
- Admin bị hạ quyền ở tab khác → request kế tiếp trả `403`, điều hướng `/tasks`.
- Network error → giữ dữ liệu cũ (nếu có) + cho phép Retry.

## Kiểm thử
- Unit test: `userRepository.list(params)` truyền đúng query và map `meta`.
- Unit test: composable `useUserList` (search debounce, reset page, đổi per_page).
- Component test: bảng render cột/role chip/actions; delete confirm; empty/error.
- E2E: login admin → `/users` → search → lọc role → phân trang → edit → delete.

## Liên quan
- [`features/users/create.md`](./create.md)
- [`features/users/edit.md`](./edit.md)
- [`backend/api/endpoints/users.md`](../../backend/api/endpoints/users.md)
- [`frontend/data-fetching.md`](../../frontend/data-fetching.md)
- [`frontend/forms-and-validation.md`](../../frontend/forms-and-validation.md)
