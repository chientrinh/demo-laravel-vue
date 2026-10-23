# Đăng nhập (Login)

## Mục tiêu
Cho phép user đăng nhập vào hệ thống bằng email/password, nhận access token để truy cập các tính năng bảo vệ.

## UI/UX Specs (Per `login.html` and `register.html`)

### Layout
- **Layout**: `BlankLayout` (no sidebar, centered card)
- **Card**: v-card elevation 10, max-width 500, centered
- **Header**: Logo + "Your Social Campaigns" text
- **Form Fields**: Username (email), Password, Remember me checkbox, Forgot Password link
- **Submit**: v-btn full width, color primary, size large
- **Footer**: Link to Register page

### Form Fields
| Field | Type | Validation | Required |
|-------|------|------------|----------|
| Username/Email | v-text-field (outlined, dense) | email format | Yes |
| Password | v-text-field (type=password) | min 8 chars | Yes |
| Remember me | v-checkbox | - | No |

## Vai trò
- Tất cả user (admin, user)

## Luồng người dùng
1. User truy cập `/auth/login`
2. Nhập email và password
3. Bấm nút "Đăng nhập"
4. Hệ thống gọi API `POST /api/login`
5. Thành công: lưu token, redirect về `/tasks`
6. Thất bại: hiển thị lỗi inline

## API sử dụng
- **Endpoint:** `POST /api/login`
- **Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```
- **Response (200):**
```json
{
  "user": { "id": 1, "name": "John", "email": "user@example.com", "role": "user" },
  "token": "1|abcdefghijklmnopqrstuvwxyz"
}
```
- **Error (401/422):** `{ "message": "Invalid credentials", "errors": { "email": [...] } }`

## Dữ liệu
- Bảng `users`: `id`, `name`, `email`, `password` (hashed), `role`, `email_verified_at`

## Tiêu chí chấp nhận
- [ ] Form validate email format, password required
- [ ] Sai email/password → hiển thị "Thông tin đăng nhập không đúng"
- [ ] Đúng thông tin → redirect `/tasks`, token lưu `localStorage`
- [ ] Đã login truy cập `/auth/login` → redirect `/tasks`
- [ ] Loading state khi submit
- [ ] Enter key submit form

## Trường hợp biên
- Email không tồn tại → 401
- Password sai → 401
- User chưa verify email → vẫn cho login (tuỳ config)
- Token hết hạn → logout, redirect login

## Kiểm thử
- Unit test: `useAuth` composable login success/error
- Component test: LoginForm submit success/error
- E2E test: Login flow success + invalid credentials

## Liên quan
- [`features/authentication/register.md`](./register.md)
- [`backend/api/endpoints/auth.md`](../../backend/api/endpoints/auth.md)
- [`frontend/data-fetching.md`](../frontend/data-fetching.md)