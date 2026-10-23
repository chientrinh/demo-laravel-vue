# TaskFlow

TaskFlow is a full-stack team task management demo: a Laravel 11 JSON API, a Vue 3 single-page application, and MySQL 8, orchestrated with Docker Compose.

<a href="https://www.youtube.com/watch?v=LsNcbQzMs8s" target="_blank">https://www.youtube.com/watch?v=LsNcbQzMs8s</a>

---

## 📦 Cài đặt demo bằng Docker

Toàn bộ demo chạy bằng **Docker Compose** — không cần cài Node/npm trên máy host. Mọi lệnh dưới đây chỉ cần **copy và dán** vào terminal, chạy từ thư mục gốc dự án (sau bước 1.2).

### 1.1 Yêu cầu hệ thống

- **Docker Engine + Docker Compose v2** (mới nhất).
- **Git**.

Kiểm tra Docker đã sẵn sàng:

```bash
docker --version
docker compose version
```

### 1.2 Clone mã nguồn

```bash
git clone git@github.com:chientrinh/demo-laravel-vue.git taskflow
cd taskflow
```

> Kho lưu trữ: `https://github.com/chientrinh/demo-laravel-vue.git` (Laravel 11 + Vue 3).
>
> Mọi khối lệnh bên dưới chạy từ thư mục gốc `taskflow/` vừa clone.

### 1.3 Dựng toàn bộ stack

```bash
docker compose -f docker/docker-compose.yml up -d --build
```

Lệnh này dựng cả MySQL, backend (Apache/PHP 8.3) và frontend tĩnh (Nginx, cổng 80). MySQL có healthcheck nên backend sẽ chỉ khởi động khi cơ sở dữ liệu đã sẵn sàng nhận kết nối.

### 1.4 Tạo bảng + nạp dữ liệu demo

```bash
docker exec taskflow-backend php artisan migrate --seed
```

Dependencies đã được cài đặt đầy đủ trong image lúc build, `APP_KEY` đã có sẵn trong `docker/docker-compose.yml`; `migrate --seed` tạo **6 tài khoản demo** và dữ liệu mẫu.

### 1.5 Dựng frontend

```bash
docker compose -f docker/frontend/docker-compose.yml up -d --build
```

Frontend dev chạy tại cổng **3000**. Mạng `docker_default` đã được tạo từ stack gốc ở mục 1.3.

### 1.6 Truy cập & tài khoản demo

| Thành phần | URL |
| --- | --- |
| Dashboard dev (Vite) | http://localhost:3000 |
| SPA tĩnh (Nginx) | http://localhost:80 |
| REST API (backend) | http://localhost:8080/api |
| Health check | http://localhost:8080/api/health |

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

### 1.7 Kiểm tra nhanh

```bash
curl http://localhost:8080/api/health            # backend + kết nối DB
docker exec taskflow-backend php artisan migrate:status
```

### 1.8 Xem log

```bash
docker compose -f docker/docker-compose.yml logs -f
docker compose -f docker/frontend/docker-compose.yml logs -f
```

### 1.9 Dừng / dọn dẹp

```bash
# Dừng frontend dev
docker compose -f docker/frontend/docker-compose.yml down

# Dừng stack gốc (mysql + backend + nginx tĩnh), giữ dữ liệu
docker compose -f docker/docker-compose.yml down

# Dừng và XÓA toàn bộ dữ liệu (cẩn thận)
docker compose -f docker/docker-compose.yml down -v
```

### 1.10 Khắc phục sự cố thường gặp

| Triệu chứng | Cách xử lý |
| --- | --- |
| `network docker_default not found` | Chạy `docker compose -f docker/docker-compose.yml up -d` trước để Compose tạo `docker_default` (không tạo thủ công) |
| Cổng 3000/8080/80 đã bị chiếm | `docker ps` tìm và dừng tiến trình cũ, hoặc đổi cổng trong compose |
| Backend báo lỗi kết nối DB | Kiểm tra `DB_HOST=mysql` trong `docker/docker-compose.yml` (service `backend`) |
| Frontend báo lỗi CORS | Đảm bảo `VITE_API_PROXY_TARGET` trỏ đúng backend container |
| Build lần đầu lâu | Bình thường — image đang cài dependencies; lần sau dùng cache |

---

## 👋 Giới thiệu dự án

### 1.1 Bài toán

TaskFlow là hệ thống quản lý nhiệm vụ cho đội ngũ phát triển, giúp trả lời ngay trên một màn hình:

- Đang làm việc ai, task đang ở trạng thái gì, tiến độ là bao nhiêu?
- Ai là người phụ trách mỗi task, và quyền hạn là gì?
- Báo cáo tiến độ sprint, tìm các task bị trễ.

Thay vì kiểm tra lướt màn hình vô tình, hệ thống ghi **mỗi nhiệm vụ**, **trạng thái**, **người phụ trách**, và **ưu tiên** theo thời gian thực — đảm bảo "một nguồn, một chỗ".

### 1.2 Các tính năng đã hoàn thiện

- **Đăng nhập / khôi phục phiên:** Sanctum dùng cookie HttpOnly + SameSite cho SPA (không lưu token trong JS); tải lại trang tự khôi phục phiên qua cookie; backend vẫn hỗ trợ Bearer token cho API client.
- **Phân quyền 2 vai trò:** `admin` quản lý toàn bộ task + người dùng; `user` chỉ xem và cập nhật task của chính mình (không thể gán cho người khác hay xóa task).
- **Home / Task List:** danh sách task có bộ lọc trạng thái (todo/in_progress/done/cancelled), lọc độ ưu tiên, tìm kiếm theo tiêu đề.
- **Tạo / Sửa / Xóa task:** frontend giới hạn title ≤ 120, description ≤ 2000; backend title ≤ 255, description ≤ 5000.
- **Gán / Bỏ gán nhiệm vụ:** admin có thể assign task cho bất kỳ user nào; user chỉ xem task của mình.
- **Xóa task / người dùng:** chỉ `admin` được xóa task; không thể tự xóa, tự hạ quyền, hoặc xóa admin cuối cùng.
- **Giao diện** Vuetify 3 (Material Design) + Tailwind CSS.
- **Tài liệu API** đầy đủ trong thư mục `docs/backend/api/`.
- **Health check** endpoint.

### 1.3 Kiến trúc

Monorepo 3 tầng, mỗi tầng một Docker image riêng:

```
taskflow/
├── frontend/        # Vue 3 — UI, kiến trúc module + ports & adapters
├── backend/         # Laravel 11 — REST API, controller → service → repository → Eloquent
├── docker/          # Dockerfile + docker-compose cho từng layer
└── docs/            # Đặc tả, ADR, thiết kế (nguồn sự thật của dự án)
```

**Frontend** tổ chức theo module (`src/modules/<feature>/`):

```
ui/<area> → application/services + stores (Pinia) → data/repositories → adapters/infrastructures (axios)
```

- `app/` chỉ composition; logic nằm trong `modules/`.
- App-shared (`src/shared/`): UI primitive, provider, util, constant.
- Hạ tầng HTTP tách riêng ở `src/adapters/` (ports & adapters) — module không phụ thuộc axios.

**Backend** theo quy tắc *controller mỏng, service dày, repository cô lập DB*:

```
Controller → Service → Repository → Eloquent → MySQL
```

- FormRequest cho mọi input validation.
- `auth:sanctum` → `role:admin` middleware; kiểm tra quyền sở hữu trong service/policy (`TaskPolicy`, `UserPolicy`).
- Mọi lỗi trả về **một envelope duy nhất**, client quyết định hành vi theo `code` (không so khớp `message`).

### 1.4 Các API chính

| Method | Endpoint | Ghi chú |
| --- | --- | --- |
| POST | `/api/login` | Công khai — trả cookie phiên + user |
| POST | `/api/register` | Công khai — tạo user + trả cookie phiên |
| POST | `/api/logout` | Thu hồi phiên (yêu cầu đăng nhập) |
| GET | `/api/me`, `/api/user` | Hồ sơ người dùng hiện tại |
| GET/POST | `/api/tasks`, GET/PUT/PATCH/DELETE `/api/tasks/{id}` | Quản lý nhiệm vụ |
| GET/POST | `/api/users`, GET/PUT/PATCH/DELETE `/api/users/{id}` | Quản lý người dùng (admin) |
| GET | `/api/health` | Health check (kèm kết nối DB) |

### 1.5 Những điểm kỹ thuật nổi bật

- **Sanctum SPA auth (cookie HttpOnly):** SPA xác thực bằng cookie phiên `HttpOnly` + `SameSite` (không lưu token trong JS) → giảm rủi ro XSS; backend vẫn hỗ trợ Bearer token cho API client.
- **Xử lý lỗi theo `code`:** envelope `{ status_code, code, message, errors, details, path, timestamp }` với `code` ổn định (`VALIDATION_ERROR`, `DUPLICATE_EMAIL`, `FORBIDDEN`…), client lập trình theo `code` thay vì so khớp chuỗi.
- **Repository cô lập DB:** `Repository` interface chỉ inject trong tầng repository; service thuần logic → dễ test, dễ thay hạ tầng.
- **Một nguồn xác thực:** Sanctum quản lý ở backend; SPA dùng cookie HttpOnly, API client dùng `Authorization: Bearer`.
- **Validate một nguồn:** giới hạn khác nhau giữa backend và frontend — task title 255 backend / 120 frontend; description 5000 / 2000; page size 20 / 10.
- **Giao diện:** Vuetify 3 + Tailwind CSS (chưa có i18n/dark mode).
- **Unit test:** backend 30 test, 152 assertions — dùng SQLite `:memory:` bên trong Docker.
- **Frontend test:** 14 Vitest tests, 2 Playwright e2e tests.

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