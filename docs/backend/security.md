# Security — Backend (Laravel 11)

## Authentication

- [ ] Laravel Sanctum configured with token expiration
- [ ] Token revocation on logout
- [ ] Password hashing: Argon2 (default) or bcrypt
- [ ] Rate limiting on login/register endpoints
- [ ] CSRF protection for web routes
- [ ] Secure session cookies (HttpOnly, Secure, SameSite)
- [ ] Two-factor authentication (optional)

## Authorization

- [ ] Simple role column in users table (`admin` | `user`)
- [ ] User model has `isAdmin()` / `isUser()` methods
- [ ] Policies for all models (TaskPolicy, UserPolicy)
- [ ] Gates for non-model permissions
- [ ] Role-based access control (admin/user)
- [ ] Resource ownership checks in controllers
- [ ] Custom RoleMiddleware for route-level access control
- [ ] Authorization checks in controllers (`$this->authorize()`)

## Input Validation

- [ ] FormRequest for all mutating endpoints
- [ ] `class-validator` / Laravel validation rules
- [ ] `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`
- [ ] SQL injection prevention (Eloquent/Parameterized queries)
- [ ] XSS prevention (output escaping, CSP)

## API Security

- [ ] Rate limiting per endpoint
- [ ] CORS configured with explicit origins
- [ ] Security headers (CSP, HSTS, X-Frame-Options)
- [ ] API versioning strategy
- [ ] Request size limits

## Data Protection

- [ ] Encryption at rest (database encryption)
- [ ] Encryption in transit (TLS 1.2+)
- [ ] PII minimization
- [ ] Data retention policy
- [ ] Backup encryption

## Infrastructure

- [ ] Non-root containers
- [ ] Read-only filesystem where possible
- [ ] Resource limits (CPU, memory)
- [ ] Network segmentation
- [ ] Secrets management (no secrets in repo)
- [ ] Regular dependency updates (`composer audit`, `npm audit`)

## Monitoring & Logging

- [ ] Structured logging (JSON)
- [ ] Error tracking (Sentry)
- [ ] Audit logs for sensitive actions
- [ ] Alerting on errors/anomalies
- [ ] Log retention policy

## Compliance

- [ ] GDPR/PDPA compliance (if applicable)
- [ ] Data processing agreements
- [ ] Right to deletion implementation
- [ ] Data portability
- [ ] Cookie consent (if applicable)

## Incident Response

- [ ] Incident response plan documented
- [ ] Runbook for common incidents
- [ ] Escalation contacts
- [ ] Post-mortem process
- [ ] Regular drills

## Audit Commands

```bash
# Laravel security
composer audit
php artisan security:check  # if available

# Frontend security
npm audit
npm audit fix

# Dependency check
composer outdated --direct
npm outdated

# Static analysis
./vendor/bin/phpstan analyse
npm run lint

# Container scan
docker scan backend:latest
docker scan frontend:latest
```

## Penetration Testing

- Annual third-party pen test
- Automated SAST/DAST in CI
- Dependency scanning in CI
- Container image scanning

## Compliance Frameworks

| Framework | Applicable | Status |
|-----------|------------|--------|
| GDPR | If EU users | Review |
| PDPA | If SG/TH users | Review |
| SOC 2 | If enterprise | Plan |
| ISO 27001 | If enterprise | Plan |

## Security Headers (Nginx)

```nginx
add_header X-Frame-Options "SAMEORIGIN";
add_header X-Content-Type-Options "nosniff";
add_header X-XSS-Protection "1; mode=block";
add_header Referrer-Policy "strict-origin-when-cross-origin";
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.yourdomain.com;";
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload";
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()";
```

## Laravel Security Config

```php
// config/session.php
'secure' => env('SESSION_SECURE_COOKIE', false),
'http_only' => true,
'same_site' => 'lax',

// config/sanctum.php
'expiration' => 60, // minutes

// config/cors.php
'supports_credentials' => true,
'allowed_origins' => [env('FRONTEND_URL')],
```

## Role-based Authorization Security

```php
// User Model - Simple role check
class User extends Authenticatable
{
    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }
    
    public function isUser(): bool
    {
        return $this->role === 'user';
    }
}

// Role Middleware
class RoleMiddleware
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        if (! $request->user()) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }
        
        if (! in_array($request->user()->role, $roles)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }
        
        return $next($request);
    }
}

// Policy-based authorization
class TaskPolicy
{
    public function view(User $user, Task $task): bool
    {
        return $user->id === $task->assigned_to || $user->isAdmin();
    }
    
    public function update(User $user, Task $task): bool
    {
        return $user->id === $task->assigned_to || $user->isAdmin();
    }
    
    public function delete(User $user, Task $task): bool
    {
        return $user->isAdmin();
    }
}
```

## Security Headers (Nginx)

```typescript
// CSP meta tag (if not via header)
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.yourdomain.com;">

// DOMPurify for user HTML
import DOMPurify from 'dompurify'
const safeHtml = DOMPurify.sanitize(userInput)
```

## Dependency Security

```bash
# Backend
composer audit
composer audit --format=json

# Frontend
npm audit
npm audit fix

# Automated in CI
# GitHub Actions: dependabot.yml
```