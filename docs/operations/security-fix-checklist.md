# Security Fix Checklist

## Docker & Infrastructure

### [x] Fix MySQL port exposure in docker-compose.yml
- **Current:** `ports: - "3307:3306"` exposes MySQL to all interfaces
- **Fix:** Changed to `ports: - "127.0.0.1:3307:3306"` in docker/docker-compose.yml to restrict to localhost only
- **Reference:** Local Docker & App Security Review Guidelines §1.1

### [ ] Add non-root user to Dockerfiles
- **Current:** Containers may run as root
- **Fix:** Add `USER node` or `USER app` in both backend and frontend Dockerfiles before the application starts
- **Reference:** §1.3

### [ ] Ensure .env is gitignored
- **Verify:** `.gitignore` contains `.env`, `.env.local`, `*.pem`, `*.key`
- **Fix:** Add if missing
- **Reference:** §1.2

## Authentication

### [ ] Ensure passwords are hashed with bcrypt/Argon2
- **Verified:** `Hash::make('password123')` used in seeder/factory (bcrypt)
- **Confirm:** All new password creation uses Laravel `Hash::make()` or `Hash::check()`
- **Note:** BCRYPT_ROUNDS=12 is configured

### [ ] Add rate limiting on all sensitive endpoints
- **Current:** Only login/register have `throttle:5,1`; task CRUD and auth endpoints lack rate limiting
- **Fix:** Add throttle middleware to `/me`, `/user`, `/logout`, task CRUD endpoints in `routes/api.php`
- **Reference:** §2.3

### [ ] Implement token revocation on logout
- **Verify:** Logout controller calls `$user->currentAccessToken()->delete()`
- **Fix:** Ensure logout invalidates the current Sanctum token
- **Reference:** §2.1

### [ ] Add 2FA (optional but recommended)
- **Status:** Not implemented
- **Plan:** Consider Google Authenticator / Laravel TOTP package

## Authorization

### [ ] Define UserPolicy
- **Current:** Only TaskPolicy exists
- **Fix:** Create `app/Policies/UserPolicy.php` with permissions for user management routes
- **Reference:** §2.1

### [ ] Register policies in AuthServiceProvider
- **Fix:** Add `$this->registerPolicies();` and map `Task::class => TaskPolicy::class` and `User::class => UserPolicy::class`
- **Reference:** Standard Laravel pattern

### [ ] Ensure role middleware checks are effective
- **Current:** `role:admin` middleware used on user-destroy route
- **Verify:** All admin-only routes have `role:admin` middleware
- **Fix:** Add middleware to any missing admin routes

## Input Validation & Sanitization

### [ ] Add Zod validation to all frontend API calls
- **Current:** Frontend sends data without explicit schema validation
- **Fix:** Create Zod schemas for task creation/updates, user form validations
- **Reference:** §2.2

### [ ] Ensure all backend FormRequests are used
- **Verify:** Check all mutating endpoints use FormRequest class
- **Fix:** Create FormRequests for task/store, task/update, user/store, user/update

### [ ] Prevent SQL injection (confirm ORM usage)
- **Verified:** No raw `DB::select("...")` with string concatenation found in grep search
- **Maintain:** Continue using Eloquent/Query Builder for all database operations

## XSS Prevention

### [ ] Avoid dangerous HTML rendering in frontend
- **Current:** Search for `dangerouslySetInnerHTML` or `v-html` in component files
- **Fix:** Replace with proper escaping or DOMPurify sanitization
- **Reference:** §3.2

### [ ] Add CSP headers via Nginx
- **Current:** No CSP header in nginx config
- **Fix:** Add `add_header Content-Security-Policy ...` to frontend nginx.conf
- **Reference:** Security Headers section of existing docs

## Data Protection

### [x] Ensure session cookies are Secure (production)
- **Current:** `SESSION_SECURE_COOKIE=true` added to backend/.env (now true when behind HTTPS)
- **Fix:** Added `SESSION_SECURE_COOKIE=true` to .env file
- **Reference:** §5.2 in existing security-audit.md

### [ ] Add encryption at rest for sensitive data
- **Status:** MySQL encryption not configured
- **Plan:** Enable MySQL `require_secure_transport` or use `AES_256_ENCRYPTION` at application level

## Frontend Security

### [ ] Move auth tokens from localStorage to HttpOnly cookie
- **Current:** Tokens stored in `localStorage.getItem(AUTH_TOKEN_KEY)` - XSS risk acknowledged
- **Fix:** Not implemented in this round due to app compatibility concerns. Documentation updated to note the risk and recommend cookie-based Sanctum auth for future refactor.
- **Risk:** XSS can steal tokens from localStorage. For production, recommend switching to Sanctum cookie-based auth where tokens are HttpOnly cookies inaccessible to JavaScript.

### [ ] Ensure VITE_* env vars only contain public data
- **Current:** `VITE_USE_MOCK`, `VITE_API_BASE_URL` are set
- **Confirm:** No secret keys or passwords under `VITE_` prefix

## Monitoring & Logging

### [ ] Add structured JSON logging
- **Current:** `LOG_CHANNEL=stack`, `LOG_STACK=single`
- **Fix:** Configure `LOG_CHANNEL=single`, `LOG_LEVEL=info` in production, integrate with Sentry

### [ ] Add audit logs for sensitive actions
- **Actions:** Task create/update/delete, user role changes
- **Fix:** Log to `storage/logs/` with user ID, action, timestamp, and IP

## Compliance

### [ ] Verify GDPR/PDPA data handling
- **Check:** Right to deletion implementation
- **Fix:** Ensure `php artisan Tinker` can permanently delete user data on request

## Dependency Security

### [ ] Run `composer audit` and `npm audit` in CI
- **Status:** Already documented in existing security-audit.md
- **Confirm:** CI pipeline includes these checks

## Penetration Testing

### [ ] Schedule annual third-party pen test
- **Status:** Not yet scheduled
- **Plan:** Add to roadmap

---