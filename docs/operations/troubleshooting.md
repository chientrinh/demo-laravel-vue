# Troubleshooting Guide

## Frontend Issues

### White Screen / App Not Loading

| Cause | Solution |
| --- | --- |
| JS error in console | Open DevTools → Console, fix error |
| Vite dev server not running | `npm run dev` in frontend dir |
| Wrong base URL in production | Check `base` in `vite.config.ts` |
| Missing env variable | Check `.env.local` has `VITE_API_BASE_URL` |
| Port conflict | Change port in `vite.config.ts` and docker-compose |

### HMR Not Working (Docker)

```typescript
// vite.config.ts
server: {
  host: '0.0.0.0',
  hmr: { host: 'localhost', port: 5173 },
  watch: { usePolling: true },  // Critical for Docker volumes
}
```

### Build Fails

| Error | Solution |
| --- | --- |
| `Module not found` | Check import paths, `resolve.alias` in vite.config |
| `Type error` | Run `npm run typecheck`, fix TypeScript errors |
| `Out of memory` | `NODE_OPTIONS="--max-old-space-size=4096" npm run build` |
| `Vuetify components not found` | Install `vite-plugin-vuetify`, add to plugins |

### API Calls Fail

| Error | Solution |
| --- | --- |
| `CORS error` | Check backend `config/cors.php` allowed origins |
| `401 Unauthorized` | Check token in localStorage, token expiry |
| `404 Not Found` | Check API base URL, route registration |
| `Network Error` | Check backend running, correct `VITE_API_BASE_URL` |

### Pinia Store Issues

| Issue | Solution |
| --- | --- |
| Store not reactive | Use `storeToRefs()` for destructuring |
| State lost on refresh | Persist to localStorage or re-init from API |
| `getter` not updating | Don't mutate state directly in getter |

---

## Backend Issues

### Migration Errors

| Error | Solution |
| --- | --- |
| `Foreign key constraint fails` | Check referenced table exists, column types match (both BIGINT UNSIGNED) |
| `Duplicate column name` | Check for duplicate `$table->id()` or column names |
| `Cannot drop table` | `Schema::disableForeignKeyConstraints()` before drop |
| `Migration order wrong` | Check timestamp prefix, `php artisan migrate:status` |

### Auth Issues

| Error | Solution |
| --- | --- |
| `401 Unauthorized` | Check token in Authorization header, token not expired |
| `Token mismatch` | Clear localStorage, re-login |
| `CSRF token mismatch` | Check `X-CSRF-TOKEN` header, `SESSION_DOMAIN` config |
| `Too many login attempts` | Wait for rate limit reset, check `throttle` middleware |

### Database Issues

| Error | Solution |
| --- | --- |
| `Connection refused` | Check DB host/port, container running, credentials |
| `Too many connections` | Increase DB `max_connections`, use connection pooling |
| `Deadlock` | Check transaction order, add indexes, reduce lock time |
| `Query slow` | Add indexes, use `EXPLAIN ANALYZE`, eager load relations |

### Queue Issues

| Error | Solution |
| --- | --- |
| `Queue not processing` | Check supervisor logs, `php artisan queue:work` |
| `Job failing` | Check `failed_jobs` table, `php artisan queue:retry` |
| `Job timeout` | Increase `--timeout`, optimize job logic |

### Performance Issues

| Symptom | Solution |
| --- | --- |
| Slow API response | Add indexes, eager load (`with()`), pagination |
| High memory | Chunk large queries (`chunkById`), stream large exports |
| N+1 queries | Eager load (`with()`), use `withCount()` |
| High CPU | Profile with Blackfire/Xdebug, optimize queries |

---

## Docker Issues

### Container Won't Start

```bash
# Check logs
docker-compose logs backend
docker-compose logs frontend

# Check container status
docker-compose ps

# Rebuild
docker-compose up -d --build --force-recreate
```

### Volume Issues

```bash
# Permission denied
docker-compose exec backend chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache

# Node modules conflict
docker-compose exec frontend rm -rf node_modules && docker-compose exec frontend npm install
```

### Network Issues

```bash
# Check network
docker network ls
docker network inspect task-manager-network

# Service not reachable
docker-compose exec frontend ping backend
docker-compose exec backend curl http://frontend:5173
```

---

## Database Issues

### MySQL

```bash
# Access MySQL
docker-compose exec db mysql -u root -p

# Check status
SHOW PROCESSLIST;
SHOW ENGINE INNODB STATUS;

# Analyze slow query
EXPLAIN ANALYZE SELECT * FROM tasks WHERE assigned_to = 1;

# Check indexes
SHOW INDEX FROM tasks;
```

### SQLite (Testing)

```bash
# File location
database/database.sqlite

# Reset
rm database/database.sqlite && php artisan migrate --seed
```

---

## Cache Issues

```bash
# Clear all caches
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear
php artisan optimize:clear

# Frontend
npm run dev -- --force  # Force Vite cache clear
```

---

## Testing Issues

```bash
# Frontend tests fail
npm run test -- --reporter=verbose

# Backend tests fail
php artisan test --filter=TaskTest

# Parallel tests hang
php artisan test --parallel --processes=2

# Coverage
npm run test:coverage
php artisan test --coverage
```

---

## CI/CD Issues

```bash
# GitHub Actions fail
# Check: Node/PHP version, cache key, secrets, permissions

# Docker build fails
# Check: Dockerfile syntax, base image, COPY paths, RUN commands
```

---

## Debugging Commands

```bash
# Laravel debug
php artisan tinker
php artisan route:list --path=api
php artisan event:list

# Database
php artisan db:show
php artisan db:table tasks

# Queue
php artisan queue:monitor
php artisan queue:work --verbose --tries=1

# Schedule
php artisan schedule:list
php artisan schedule:run --verbose

# Logs
tail -f storage/logs/laravel.log
docker-compose logs -f backend --tail=100

# Frontend
npm run dev -- --debug
```

---

## Emergency Procedures

### Site Down

1. Check `docker-compose ps` - all containers running?
2. Check logs: `docker-compose logs -f backend`
3. Check DB: `docker-compose exec db mysqladmin ping`
4. Restart: `docker-compose restart backend`

### Data Loss

1. Check backup: `ls -la backups/`
2. Restore: `docker-compose exec -T db mysql -u root -p db < backup.sql`
2. Verify: `php artisan migrate:status`

### Security Incident

1. Rotate all secrets: `APP_KEY`, DB passwords, tokens
2. Revoke all Sanctum tokens: `php artisan sanctum:prune-tokens --expired`
3. Check audit logs: `grep "security" storage/logs/laravel.log`
4. Notify team, document incident