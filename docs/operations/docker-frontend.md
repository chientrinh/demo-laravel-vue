# Docker — Frontend (Vue 3 SPA) Service

This document describes the **current** Docker configuration for the Vue 3 single‑page application of TaskFlow. The **Dockerfile** and **compose definitions** are the single source of truth; this page exists to help contributors build, run, and debug the frontend inside Docker.

## 1. Dockerfile (`frontend/Dockerfile`)

```dockerfile
FROM node:22-alpine AS builder

# Set working directory
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code
COPY . .

# Build for production (Vite)
RUN npm run build

# ----- Mini‑runtime stage -----
FROM nginx:alpine

# Copy the built output from the builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx config (if any)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
```

**Notes**

- The builder stage uses `node:22-alpine` – this matches the `engines.node` field in `package.json` (`^22.18.0 || >=24.12.0`).  
- `npm ci` installs exact versions from `package-lock.json`; this is preferred over `npm install` for CI/CD and reproducible builds.  
- The production build (`npm run build`) outputs a static SPA into `dist/`.  
- The runtime stage uses a minimal `nginx:alpine` image that serves the `dist/` folder on port 80.  
- If you need to serve the SPA on a different port, modify the `EXPOSE 80` and the corresponding `ports` entry in the Docker Compose file; the Nginx config may also need adjustments.

## 2. Build & run

### 2.1 From the repository root (root stack)

The frontend service is defined in the **root** `docker-compose.yml`; it builds from the `frontend/` sub‑directory:

```bash
docker compose -f docker/docker-compose.yml up -d --build frontend
```

This builds the image (or uses cache) and starts the container named `taskflow-frontend` (service name). The container maps port 3000 (Vite dev) or port 80 (static) depending on the compose configuration; see the compose file for details.

### 2.2 Running Vite in development mode

The root compose file includes a **dev** service that runs Vite:

```bash
docker compose -f docker/docker-compose.yml up -d frontend
# Inside the container, the Vite dev server is reachable at http://localhost:3000
# The dev server proxies /api to http://backend:8000 (or the host proxy target)
```

To customise the proxy target on the host, set the environment variable `VITE_API_PROXY_TARGET=http://localhost:8080` **before** starting the container, or override it in `frontend/.env`:

```env
VITE_API_PROXY_TARGET=http://localhost:8080
```

When this variable is set, the Vite dev server (inside the container) will proxy calls to `http://localhost:8080` instead of the default `http://backend:8000`.

### 2.3 Stopping and removing

```bash
docker compose -f docker/docker-compose.yml down
# or, to keep volumes (e.g. node_modules cache):
docker compose -f docker/docker-compose.yml down -v
```

### 2.4 Rebuilding after source changes

Because the `frontend/` directory is **bind‑mounted** in the compose file (`./frontend` → `/app`), editing source files on the host is immediately reflected inside the container **without** a rebuild, **except** for changes to `package.json`, `package-lock.json`, or the `vite.config.ts`. Those require a rebuild:

```bash
docker compose -f docker/docker-compose.yml up -d --build frontend
```

## 3. Nginx configuration (optional)

If you need a custom Nginx setup (e.g., SSL, custom headers), place a `nginx.conf` file in `frontend/` and it will be copied into the image during the build (see `Dockerfile` `COPY nginx.conf /etc/nginx/conf.d/default.conf`). The default config simply serves the static `dist/` folder.

A minimal `nginx.conf` example:

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;
    try_files $uri $uri/ /index.html;
}
```

## 5. Environment variables

The frontend Docker image reads the same `.env` variables as the host‑side Vite dev server:

```env
VITE_USE_MOCK="true"          # default – mock mode on inside Docker
VITE_API_BASE_URL="http://backend:8000"
VITE_API_PROXY_TARGET="http://localhost:8080"   # only used when developing on the host
```

These can be overridden in `frontend/.env`; the Docker Compose file passes them through the `environment` key.

## 6. Known considerations

- **Node version** – the Dockerfile uses `node:22-alpine`, which matches the `engines.node` field in `package.json`. If you need a different Node version for local development, use `nvm` or the host’s Node, but the Docker image will always be based on 22.
- **Build cache** – `npm ci` clears the cache each time; this ensures a clean build but makes the build slightly slower on every run. For faster iteration, you can `npm install` and rely on `node_modules` being bind‑mounted, but then you must ensure `package-lock.json` stays in sync.
- **Static vs dev** – the compose file can switch between serving the built `dist/` (production) and running Vite in development mode (see the `frontend` service definition). The choice is controlled by the `command` field or by running `docker compose up` with the appropriate service name.

## 6. Links

- [Frontend coding conventions](frontend/coding-conventions.md) – Vue/TS conventions.  
- [Design system](design-system.md) – colours, components.  
- [Operations index](operations/) – other Docker / infrastructure docs.  
- [Vite configuration](vite.config.ts) – proxy and env‑var setup.

---

*If the Dockerfile, compose definition, or Nginx config is modified, update this document and the relevant environment‑variable documentation in the same pull request.*