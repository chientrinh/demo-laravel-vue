# Đăng ký (Register)

## Mục tiêu
Cho phép user mới tạo tài khoản để sử dụng hệ thống.

## UI/UX Specs (Per `register.html`)

### Layout
- **Layout**: `BlankLayout` (no sidebar, centered card)
- **Card**: v-card elevation 10, max-width 500, centered
- **Header**: Logo + "Your Social Campaigns" text
- **Form Fields**: Name, Email, Password, Confirm Password
- **Submit**: v-btn full width, color primary, size large
- **Footer**: Link to Login page

### Form Fields
| Field | Type | Validation | Required |
|-------|------|------------|----------|
| Name | v-text-field (outlined, dense) | required, max 100 | Yes |
| Email | v-text-field (type=email) | email format, unique | Yes |
| Password | v-text-field (type=password) | min 8 chars | Yes |
| Confirm Password | v-text-field (type=password) | must match password | Yes |

## Vai trò
- Khách (chưa có tài khoản)

## Luồng người dùng
1. User truy cập `/auth/register` (hoặc click link từ Login)
2. Nhập name, email, password, confirm password
3. Bấm nút "Đăng ký"
4. Hệ thống gọi API `POST /api/register`
5. Thành công: tự động login, redirect `/tasks`
6. Thất bại: hiển thị lỗi inline

## API sử dụng
- **Endpoint:** `POST /api/register`
- **Request:**
```json
{
  "name": "John Doe",
  "email": "user@example.com",
  "password": "password123",
  "password_confirmation": "password123"
}
```
- **Response (201):**
```json
{
  "user": { "id": 2, "name": "John Doe", "email": "user@example.com", "role": "user" },
  "token": "2|abcdefghijklmnopqrstuvwxyz"
}
```
- **Error (422):** Validation errors

## Dữ liệu
- Bảng `users`: `id`, `name`, `email`, `password` (hashed), `role` (default: `user`)

## Tiêu chí chấp nhận
- [ ] Validate: name required, email format/unique, password min 8 chars, confirm match
- [ ] Email đã tồn tại → "Email đã được sử dụng"
- [ ] Password không khớp → "Mật khẩu xác nhận không khớp"
- [ ] Thành công → auto login, redirect `/tasks`
- [ ] Loading state khi submit

## Trường hợp biên
- Email đã đăng ký → 422
- Password quá yếu → 422
- Network error → toast error

## Kiểm thử
- Unit test: register success/validation error
- Component test: RegisterForm validation
- E2E test: Register flow

## Liên quan
- [`features/authentication/login.md`](./login.md)
- [`backend/api/endpoints/auth.md`](../../backend/api/endpoints/auth.md)