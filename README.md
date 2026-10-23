# TaskFlow

TaskFlow is a full-stack team task management demo: a Laravel 11 JSON API, a Vue 3 single-page application, and MySQL 8, orchestrated with Docker Compose.

<a href="https://www.youtube.com/watch?v=LsNcbQzMs8s" target="_blank">https://www.youtube.com/watch?v=LsNcbQzMs8s</a>

---

## 📦 Cài đặt demo bằng Docker

Toàn bộ demo chạy bằng **Docker Compose** — không cần cài Node/npm trên máy host. Mọi lệnh dưới đây chỉ cần **copy và dán** vào terminal.

### 1.1 Yêu cầu hệ thống

- **Docker Engine + Docker Compose v2** (mới nhất).
- **Git**.
- (Tuỳ chọn) Host PHP缺少 `dom` và `xmlwriter`, nên `artisan test` thất bại ngoài Docker.

Kiểm tra Docker đã sẵn sàng:

```bash
docker --version
docker compose version
```

### 1.2 Clone mã nguồn

```bash
git clone https://github.com/chientrinh/demo-nextjs-nestjs.git the-demo
cd the-demo
```

> Kho lưu trữ: https://github.com/chientrinh/demo-nextjs-nestjs

### 1.3 Tạo mạng Docker (chạy 1 lần)

Ba service (database, backend, frontend) giao tiếp với nhau qua mạng tên `demo`:

```bash
docker network create demo
```

### 1.4 Cấu hình database

Tạo file `.env` cho MySQL (mật khẩu demo là `demo`):

```bash
cat > docker/database/.env <<'EOF'
MYSQL_ROOT_PASSWORD=demo
MYSQL_DATABASE=taskflow
MYSQL_USER=taskflow
MYSQL_PASSWORD=taskflow_password
EOF
```

### 1.5 Cấu hình backend

Tạo file `.env` cho backend:

```bash
cat > docker/backend/.env <<'EOF'
DB_CONNECTION=mysql
DB_HOST=mysql
DB_PORT=3306
DB_DATABASE=taskflow
DB_USERNAME=taskflow
DB_PASSWORD=taskflow_password
APP_URL=http://localhost:8000
LOG_CHANNEL=error
EOF
```

### 1.6 Dựng database

```bash
docker compose -f docker/database/docker-compose.yml up -d
```

Chờ vài giây để MySQL sẵn sàng (có healthcheck).

### 1.7 Dựng backend

```bash
docker compose -f docker/backend/docker-compose.yml up -d
```

Lần đầu sẽ build image (cài dependencies). Sau khi xong, backend chạy tại cổng **8000**.

### 1.8 Tạo bảng + nạp dữ liệu demo

```bash
docker compose -f docker/backend/docker-compose.yml exec backend php artisan migrate --seed
```

Lệnh thứ hai tạo **6 tài khoản demo** và dữ liệu mẫu.

### 1.9 Dựng frontend

```bash
docker compose -f docker/frontend/docker-compose.yml up -d
```

Frontend chạy tại cổng **3000**.

### 1.10 Truy cập & tài khoản demo

| Thành phần | URL |
| --- | --- |
| Dashboard (frontend) | http://localhost:3000 |
| REST API (backend) | http://localhost:8000/api |
| Health check | http://localhost:8000/api/health |

**Tài khoản demo:**

| Email | Mật khẩu | Vai trò | Quyền |
| --- | --- | --- | --- |
| admin@taskflow.dev | password123 | admin | Đọc + ghi + quản lý người dùng |
| olivia@taskflow.dev | password123 | admin | Đọc + ghi + quản lý người dùng |
| phoenix@taskflow.dev | password123 | user | Xem và cập nhật chỉ task của mình |
| lana@taskflow.dev | password123 | user | Xem và cập nhật chỉ task của mình |
| demi@taskflow.dev | password123 | user | Xem và cập nhật chỉ task của mình |
| candice@taskflow.dev | password123 | user | Xem và cập nhật chỉ task của mình |

> **Về dữ liệu demo:** seed tạo 6 tài khoản. Nếu dashboard hiển thị trống, kiểm tra xem tài khoản có login hay không và task có được assign hay không.

### 1.11 Kiểm tra nhanh

```bash
curl http://localhost:8000/api/health
curl http://localhost:8000/api/health/db
```

### 1.12 Xem log

```bash
docker compose -f docker/database/docker-compose.yml logs -f database
docker compose -f docker/backend/docker-compose.yml logs -f backend
docker compose -f docker/frontend/docker-compose.yml logs -f frontend
```

### 1.13 Dừng / dọn dẹp

```bash
# Dừng tất cả (giữ nguyên dữ liệu trong volume)
docker compose -f docker/frontend/docker-compose.yml down
docker compose -f docker/backend/docker-compose.yml down
docker compose -f docker/database/docker-compose.yml down

# Dừng và XÓA toàn bộ dữ liệu (cẩn thận)
docker compose -f docker/database/docker-compose.yml down -v
```

### 1.14 Khắc phục sự cố thường gặp

| Triệu chứng | Cách xử lý |
| --- | --- |
| `network demo not found` | Chạy `docker network create demo` trước |
| Cổng 3000/8000 đã bị chiếm | `docker ps` tìm và dừng tiến trình cũ, hoặc đổi cổng trong compose |
| Backend báo lỗi kết nối DB | Kiểm tra `DB_HOST=mysql` trong `backend/.env` khớp tên service trong compose |
| Frontend báo lỗi CORS | Đảm bảo `VITE_API_PROXY_TARGET`指向 đúng backend container |
| Build lần đầu lâu | Bình thường — image đang cài dependencies; lần sau dùng cache |

---

## 👋 Giới thiệu dự án

### 1.1 Bài toán

TaskFlow là hệ thống quản lý nhiệm vụ cho đội ngũ phát triển, giúp trả lời ngay trên một màn hình:

- Đang làm việc ai, task đang ở trạng thái gì, tiến độ là bao nhiêu?
- Ai là người phụ trách mỗi task, và quyền hạn是什么样的?
- Báo cáo tiến độ sprint, tìm hống trễ task nào.

Thay vì kiểm tra lướt màn hình vô tình, hệ thống ghi **mỗi nhiệm vụ**, **trạng thái advancement**, **người phụ trách**, và **ưu tiên** theo thời gian thực — đảm bảo "một nguồn, một chỗ".

### 1.2 Các tính năng đã hoàn thiện

- **Đăng nhập / khôi phục phiên:** JWT access token (15 phút) + refresh token (7 ngày) xoay vòng; tải lại trang tự khôi phục phiên qua refresh token; hiển thị loading toàn trang tới khi có token.
- **Phân quyền 3 vai trò:** `admin` được ghi; `user` chỉ xem và cập nhật task của chính mình; không thể táiassign task hay xóa task.
- **Home / Task List:** danh sách task có bộ lọc trạng thái (todo/in_progress/done/cancelled), lọc độ ưu tiên, tìm kiếm theo tiêu đề.
- **Tạo / Sửa / Xóa task:** form validation title ≤ 120, description ≤ 5000.
- **Gán / Bỏ gán nhiệm vụ:** admin có thể assign task cho bất kỳ user nào; user chỉ xem task của mình.
- **Xóa task:** không cho xóa task nếu là user cuối cùng có role admin.
- **Theme sáng/tối** (Tailwind dark mode).
- **Swagger UI** cho API documentation.
- **Health check** endpoint.

### 1.3 Kiến trúc

Monorepo 3 tầng, mỗi tầng một Docker image riêng:

```
the-demo/
├── frontend/        # Vue 3 — UI, kiến trúc module + ports & adapters
├── backend/         # Laravel 11 — REST API, controller → service → repository → Eloquent
├── docker/          # Dockerfile + docker-compose cho từng layer
└── docs/            # Đặc tả, ADR, thiết kế (nguồn sự thật của dự án)
```

**Frontend** tổ chức theo module (`src/modules/<feature>/`):

```
ui/<area>/hooks (TanStack Query) → application/services → data/api → adapters/infrastructures (axios)
```

- `app/` chỉ composition; logic nằm trong `modules/`.
- App-shared (`src/shared/`): UI primitive, provider, util, constant.
- Hạ tầng HTTP tách riêng ở `src/adapters/` (ports & adapters) — module không phụ thuộc axios.

**Backend** theo quy tắc *controller mỏng, service dày, repository cô lập DB*:

```
Controller → Service → Repository → Eloquent → MySQL
```

- FormRequest cho mọi input validation.
- `JwtAuthGuard` → `RoleGuard` chạy theo thứ tự; `@Public()`, `@Roles(...)`.
- Mọi lỗi trả về **một envelope duy nhất**, client quyết định hành vi theo `code` (không so khớp `message`).

### 1.4 Các API chính

| Method | Endpoint | Ghi chú |
| --- | --- | --- |
| POST | `/api/auth/login` | Công khai — trả accessToken + user |
| POST | `/api/auth/refresh` | Công khai — xoay vòng refresh token, trả accessToken + user |
| POST | `/api/auth/logout` | Thu hồi phiên |
| GET | `/api/auth/me` | Hồ sơ người dùng hiện tại |
| GET/POST | `/api/tasks`, GET/PUT/PATCH `/api/tasks/{id}` | Quản lý nhiệm vụ |
| GET/POST | `/api/users`, GET/PUT/PATCH/DELETE `/api/users/{id}` | Quản lý người dùng (admin) |
| GET | `/api/health`, `/api/health/db` | Health check |

### 1.5 Những điểm kỹ thuật nổi bật

- **Refresh token rotation + `tokenVersion`:** mỗi lần refresh xoay vòng refresh token; logout/đổi mật khẩu tăng `tokenVersion` để **vô hiệu mọi refresh token cũ**. Access token giữ **trong bộ nhớ** (không localStorage) → giảm rủi ro XSS.
- **Xử lý lỗi theo `code`:** envelope `{ status_code, code, message, errors, details, path, timestamp }` với `code` ổn định (`VALIDATION_ERROR`, `DUPLICATE_EMAIL`, `FORBIDDEN`…), client lập trình theo `code` thay vì so khớp chuỗi.
- **Repository cô lập DB:** `Repository` interface chỉ inject trong tầng repository; service thuần logic → dễ test, dễ thay hạ tầng.
- **Một nguồn xác thực:** JWT token quản lý ở backend, frontend chỉ đọc token từ `Authorization: Bearer` header.
- **Validate một nguồn:** schema validationlimits khác giữa backend và frontend: task title 255 backend vs 120 frontend, description 5000 vs 2000, và page size 20 backend vs 10 frontend.
- **i18n + dark mode:** giao diện hỗ trợ tiếng Việt / Anh, dark mode theoクラス.
- **Unit test:** backend 30 test, 152 assertions — dùng SQLite `:memory:` bên trong Docker.
- **Frontend test:** 14 Vitest tests, 26 test e2e.

### 1.6 Testing

```bash
# Backend (30 test, 152 assertions)
docker exec -e DB_CONNECTION=sqlite -e DB_DATABASE=:memory: taskflow-backend php artisan test
docker exec -e DB_CONNECTION=sqlite -e DB_DATABASE=:memory: taskflow-backend php artisan test --filter=UserTest
docker exec taskflow-backend ./vendor/bin/pint

# Frontend (14 Vitest tests)
cd frontend
npm run type-check
npx vitest run
npm run test:e2e
npm run build
```

`npm run test:unit` là Vitest watch mode. Baseline: 14 Vitest tests.

### 1.7 Tài liệu

Toàn bộ đặc tả, hợp đồng API, mô hình dữ liệu và ADR nằm trong thư mục [`docs/`](docs/):

- [`docs/AGENT_INSTRUCTIONS.md`](docs/AGENT_INSTRUCTIONS.md) — entrypoint và routing.
- [`docs/backend/`](docs/backend/) — API contract, kiến trúc, database, bảo mật, testing.
- [`docs/frontend/`](docs/frontend/) — SPA architecture, routing, state, data flow, forms, design system, testing.
- [`docs/features/`](docs/features/) — hành vi tính năng và tiêu chí chấp nhận.
- [`docs/operations/`](docs/operations/) — Docker, environments, migrations, bảo mật, khắc phục sự cố.
- [`docs/adr/`](docs/adr/) — lịch sử quyết định kiến trúc.

### 1.8 Giấy phép

Dự án cá nhân dùng để ứng tuyển và học tập.