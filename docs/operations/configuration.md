# Configuration — TaskFlow

This document summarises the **current** configuration files and environment variables for the TaskFlow project. The **source files** (`.env.example`, `docker-compose.yml`, `vite.config.ts`, `phpunit.xml`) are the single source of truth; this page exists to help contributors set up and modify the environment.

## 1. Backend environment (`backend/.env.example`)

The backend Laravel app reads its configuration from `backend/.env`. Copy `backend/.env.example` to `backend/.env` and set the following **required** variables:

```env
# Database
DB_CONNECTION=mysql
DB_HOST=mysql
DB_PORT=3306
DB_DATABASE=taskflow
DB_USERNAME=taskflow
DB_PASSWORD=taskflow_password

# App
APP_NAME="TaskFlow"
APP_ENV=local
APP_KEY=base64:...          # run `php artisan key:generate` to fill
APP_DEBUG=true
APP_URL=http://localhost:8000

# Sanctum
SANCTUM_STATEFUL_DOMAINS=localhost:5173,localhost:3000
SESSION_DOMAIN=localhost
```

**Optional** variables (with defaults shown) can be overridden if needed:

```env
# Rate limiting (per‑endpoint throttling is defined in routes/api.php)
# SANCTUM_TOKEN_EXPIRATION=30   # hours, default 30 in config/sanctum.php

# CORS
FRONTEND_URL=http://localhost:5173   # used by config/cors.php
```

## 2. Frontend environment (`frontend/.env.example`)

Copy `frontend/.env.example` to `frontend/.env`. The most important variable is `VITE_USE_MOCK`:

```env
# Mock mode – set to “false” to call the real Laravel API.
# Leave unset (or any value other than “false”) to use the localStorage mock.
VITE_USE_MOCK=

# Base API URL – proxied by Vite dev server.
# Inside Docker the default is “http://backend:8000”.
# On the host, set VITE_API_PROXY_TARGET=http://localhost:8080
# to reach the static API gateway on port 8080.
VITE_API_BASE_URL=http://backend:8000
```

**Additional variables** (all optional, with defaults shown):

```env
VITE_API_BASE_URL=http://backend:8000
VITE_API_PROXY_TARGET=http://localhost:8080   # only needed on host Vite dev
```

## 3. Docker Compose

### 3.1 Root stack (`docker/docker-compose.yml`)

```yaml
version: '3.8'

services:
  mysql:
    image: mysql:8
    environment:
      MYSQL_DATABASE: taskflow
      MYSQL_USER: taskflow
      MYSQL_PASSWORD: taskflow_password
    ports:
      - "3307:3306"   # exposed to the host for tools such as DataGearid
    volumes:
      - mysql_data:/var/lib/mysql

  backend:
    build: ./backend
    depends_on:
      - mysql
    environment:
      DB_CONNECTION: mysql
      DB_HOST: mysql
      DB_PORT: 3306
      DB_DATABASE: taskflow
      DB_USERNAME: taskflow
      DB_PASSWORD: taskflow_password
    volumes:
      - ./backend:/var/www/html   # bind‑mount for hot reload
    ports:
      - "8080:80"     # API gateway

  # Static SPA – served by Nginx; the `dist` folder must be built first
  frontend:
    build: ./frontend
    depends_on:
      - backend
    ports:
      - "3000:80"     # Vite dev server (ports 80 inside container)
    environment:
      VITE_USE_MOCK: "true"      # default – mock mode on
      VITE_API_BASE_URL: http://backend:8000
```

**Important**

- **Start the root stack first** so Docker Compose creates the shared network (`docker_default`).  
- **Never create `docker_default` manually**; a hand‑made network lacks the Compose labels the frontend stack expects.  
- The **frontend dev service** runs Vite on port 3000 inside the container and proxies `/api` to the backend.

### 3.2 Frontend dev stack (`docker/frontend/docker-compose.yml`)

```yaml
version: '3.8'

services:
  frontend:
    build: .
   ports:
      - "3000:80"
    environment:
      VITE_USE_MOCK: "true"      # default – mock mode on
      VITE_API_BASE_URL: http://backend:8000
```

This file is lightweight; the real development flow uses the **root** stack defined above.

## 4. Local development (without Docker)

If you need to run parts of the stack on the host (e.g. only the frontend Vite server), follow these steps:

1. **Install dependencies**

   ```bash
   cd backend  && composer install
   cd frontend && npm ci
   ```

2. **Set environment variables**

   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   # Edit the .env files as described in sections 1‑2.
   ```

3. **Start the backend**

   ```bash
   cd backend
   php artisan key:generate
   php artisan migrate --seed
   php artisan serve   # defaults to http://localhost:8000
   ```

3. **Start the frontend**

   ```bash
   cd frontend
   npm run dev         # Vite dev server, defaults to http://localhost:5173
   # To override the proxy target:
   VITE_API_PROXY_TARGET=http://localhost:8080 npm run dev
   ```

4. **Connect** – the frontend will try to reach `http://backend:8000` (or the proxy target you set). If you are outside Docker, you may need to point `VITE_API_BASE_URL` to `http://127.0.0.1:8000`.

## 5. Known version mismatch

- **CI** uses Node 20 while `frontend/package.json` requires `^22.18.0 || >=24.12.0`. This is a **known mismatch**, not a blocker for local development. Use a matching Node version if you wish, or ignore the warning.

## 6. Links

- [Backend README](README.md) – overall project overview.  
- [Docker compose files](docker/) – the definitive source for service definitions.  
- [Backend coding conventions](backend/coding-conventions.md) – PHP conventions.  
- [Frontend coding conventions](frontend/coding-conventions.md) – Vue/TS conventions.

---

*If any configuration value changes (new env var, port change, new service), update both the `.env.example` file and this documentation file in the same pull request.*