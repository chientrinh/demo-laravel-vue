# Docker — Backend (Laravel) Service

This document describes the **current** Docker configuration for the Laravel 11 backend service of TaskFlow. The **Dockerfile** and **compose definitions** are the single source of truth; this page exists to help contributors build, run, and debug the backend inside Docker.

## 1. Dockerfile (`backend/Dockerfile`)

```dockerfile
FROM php:8.3-fpm-alpine

# Install system dependencies
RUN apk add --no-cache \
    git \
    bash \
    curl \
    libpng \
    libjpeg-turbo \
    freetype \
    onigurui \
    libxml2 \
    zip \
    unzip \
    nodejs \
    npm

# Get latest Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Set working directory
WORKDIR /var/www/html

# Install PHP extensions required by Laravel
RUN docker-php-ext-install pdo_mysql bcmath mbstring exif pcntl sockets

# Copy composer.json and install dependencies
COPY composer.json ./
RUN composer install --no-interaction --prefer-dist

# Copy the application code
COPY . .

# Expose port 80 (FPM) – Docker Compose maps it to 8080 on the host
EXPOSE 80
```

**Notes**

- The image is based on `php:8.3-fpm-alpine`; Alpine’s package manager (`apk`) is used for system deps.
- `nodejs` and `npm` are included because the CI pipeline may need them; the backend rarely runs node locally.
- `docker-php-ext-install` installs `pdo_mysql`, `bcmath`, `mbstring`, `exif`, `pcntl`, `sockets`. If you add new PHP extensions, add them here or build a custom extension layer.
- The code directory (`/var/www/html`) is **bind‑mounted** from the host (`./backend`) in the Docker Compose file, so code changes apply without rebuilding.

## 2. Build & run

### 2.1 From the repository root

```bash
docker compose -f docker/docker-compose.yml up -d --build backend
```

This builds the backend image (if not cached) and starts the container named `taskflow-backend` (service name in compose). The container’s internal port 80 is exposed as 8080 on the host (see compose file).

### 2.2 Inside the container

You can exec into the container for maintenance:

```bash
docker exec -u root -it taskflow-backend sh
# or for a non‑root user
docker exec -it taskflow-backend su -s /bin/sh www-data
```

Common commands inside the container:

```bash
# Generate application key (run once after a fresh pull)
php artisan key:generate

# Run migrations & seeders (SQLite for tests, MySQL for dev)
docker exec -e DB_CONNECTION=sqlite -e DB_DATABASE=:memory: taskflow-backend php artisan test
# or for MySQL
docker exec taskflow-backend php artisan migrate --seed

# Run the linter (Pint only)
docker exec taskflow-backend ./vendor/bin/pint

# Debug: run a single test filter
docker exec -e DB_CONNECTION=sqlite -e DB_DATABASE=:memory: taskflow-backend php artisan test --filter=UserTest
```

### 2.3 Rebuilding after code changes

Because the `./backend` directory is **bind‑mounted**, merely editing a PHP file inside the host directory is sufficient – no `docker compose up --build` needed for source changes. Only dependency changes (composer.json, package.json) require a rebuild:

```bash
docker compose -f docker/docker-compose.yml up -d --build backend
```

## 3. PHP configuration (optional)

If you need to adjust `php.ini` settings (e.g., `memory_limit`, `post_max_size`), create a `php-overrides.ini` file in `backend/` and reference it in the Dockerfile:

```dockerfile
COPY php-overrides.ini /usr/local/etc/php/conf.d/php-overrides.ini
```

Then add `optionally` / `pcre` as needed. This is rarely required for the default TaskFlow setup.

## 4. Health check (optional)

The Docker Compose file does not define a health check for the backend by default, but you can add one in the compose file if desired:

```yaml
healthcheck:
  test: ["CMD", "php", "-r", "exit(exec('ping -c 1 localhost') ? 0 : 1)"]; # simplified
  interval: 30s
  timeout: 10s
  retries: 3
```

## 5. Links

- [Docker compose overview](operations/docker-backend.md) – higher‑level view of services.  
- [Frontend Docker](operations/docker-frontend.md) – the companion service.  
- [Backend coding conventions](backend/coding-conventions.md) – PHP standards.  
- [Configuration](operations/configuration.md) – environment variables.

---

*If the Dockerfile or compose definition is modified, update this document and the relevant `.env.example` entries in the same pull request.*