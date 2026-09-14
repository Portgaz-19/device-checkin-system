# Project Context

## Repository overview

**VerifyGate / device-checkin-system** — campus device check-in/check-out. Students register
their devices; a QR code scanned by security logs devices in/out and flips their status.
Roles: `student`, `hostelSupervisor`, `security` (no account), `admin`.

Repo: https://github.com/Portgaz-19/device-checkin-system

Full-stack monorepo: Express 5 + Mongoose 9 backend (`server/`), React 19 + Vite + Tailwind 4
frontend (`client/`). ES modules throughout both.

## Repository map

- `server/` — backend (Express app, controllers, models, routers, middleware, tests)
  - `server/app.js` — Express app construction + middleware + route mounting (extracted from `index.js` for testability)
  - `server/index.js` — entry point: env load, Mongo connect, listen
  - `server/controller/authController.js` — register / login / forgotPassword / resetPassword
  - `server/controller/deviceController.js`, `server/controller/qrController.js`
  - `server/models/` — `User.js`, `Device.js`, `ScanLog.js`
  - `server/router/` — `authRoutes.js`, `deviceRoutes.js`, `qrRoutes.js`
  - `server/middleware/` — `verifyToken.js` (+ `requireRole`), `errorHandler.js`
  - `server/tests/auth.test.js` — Vitest + Supertest integration suite
  - `docs/architecture/backend.md`, `server/render.yaml`
- `client/` — React frontend
  - `client/src/App.jsx` — routes (login/register/forgot-password/reset-password are public; admin + device pages behind `ProtectedRoute`)
  - `client/src/pages/` — Login, Register, ForgotPassword, ResetPassword, RegisterDevice, MyDevices, AdminDashboard, ScannerPage (lazy-loaded)
  - `client/src/components/` — ProtectedRoute, Navbar (rendered on every page), ErrorBoundary
  - `client/src/api/` — `axiosInstance.js` (uses `VITE_API_URL`, falling back
    to `http://localhost:5000/api`; attaches the localStorage token), service
    modules `authApi.js`, `deviceApi.js`
  - `client/vercel.json`, `client/eslint.config.js`, `client/vite.config.js`
- `.github/workflows/test.yml` — CI: runs server tests on PRs to `main`
- `docs/` — tracked persistent agent context, task histories, references,
  reviews, and archive material
- root `<number>-<topic>.md` files — task specifications
- `AGENTS.md` — durable agent workflow

## Backend architecture

- Entry: `server/index.js` → connects Mongo, listens on `PORT || 5000`. Sets Google DNS servers for Atlas resolution.
- App: `server/app.js`. Middleware order: CORS (allowlist = `FRONTEND_URL` if set + `localhost:5173`), `express.json`, `helmet`, `morgan` (skipped when `NODE_ENV=test`), device routes, auth routes, qr routes, `/api/health`, `errorHandler`.
- Module system: ESM (`"type": "module"`).
- Route organization: routers mounted at `/api/auth`, `/api/devices`, `/api/qr`; controller functions are plain exported async handlers using `try/catch` returning `{ error }` or success JSON.
- Rate limiting: `authLimiter` (15-min window, max 20, `{ error: "Too many attempts..." }`) mounted at `/api/auth` level — **covers login, register, forgot-password, reset-password**. Deliberately skipped when `NODE_ENV=test` so the suite doesn't trip it.
- Error handling: `errorHandler` middleware logs stack, returns `{ error: err.message }` with `err.status || 500`.

## Authentication

- Registration: `POST /api/auth/register` (`name`, `email`, `password`, `role`, optional `studentId`). Returns 201 `{ id, email, role }`. Duplicate email → 409. Missing fields → 400. Email lowercased/trimmed by schema on save.
- Login: `POST /api/auth/login`. Returns `{ token, role }`. 401 "Invalid credentials" for unknown email or bad password (no enumeration via message).
- `/api/auth/me` — `GET`, requires `Bearer` JWT via `verifyToken`; returns `{ id, role }`.
- Access tokens: stateless JWT, `expiresIn: '2h'`, signed with `JWT_SECRET`, payload `{ id, role }`. No refresh-token/session store exists — a password reset does NOT invalidate already-issued JWTs (acceptable: 2h short-lived).
- Logout: none implemented (client clears `localStorage` token).
- Password hashing: bcrypt, cost 10.
- Auth middleware: `verifyToken` (401 if missing/invalid), `requireRole(...roles)`.
- Password validation: presence only at register. **Reset-password enforces a 6-character minimum** (`newPassword.length < 6` → 400 `'Password must be at least 6 characters'`), per Task 36 spec; register still accepts shorter passwords (pre-existing).

### Password reset (Task 36)

- **Forgot:** `POST /api/auth/forgot-password` (`{ email }`). Always returns 200 with generic `{ message: 'If an account exists...' }` regardless of whether the account exists. For an existing account it also generates a token and returns the reset link as `devOnlyResetLink` — **only when `NODE_ENV` is explicitly `'development'` or `'test'`**. Any other value (production, staging, or unset) suppresses the link to prevent email enumeration; run `NODE_ENV=development` locally to exercise the flow. Rate-limited via the auth limiter.
- **Reset:** `POST /api/auth/reset-password` (`{ token, newPassword }`). Missing fields → 400. Invalid/expired token → `400 { error: 'Reset link is invalid or has expired' }`. Success → 200 `{ message: 'Password reset successfully.' }` and token fields cleared.
- Reset-token design:
  - Raw token = `crypto.randomBytes(32).toString('hex')` (64 hex chars, cryptographically random).
  - Only `sha256(rawToken)` stored in `User.resetPasswordTokenHash` — raw token never persisted or logged.
  - `User.resetPasswordExpires` = 30 minutes from issuance; reset query requires `expires > now`.
  - Single-use: `findOneAndUpdate` matches token hash + expiry and atomically
    sets the password hash while unsetting both token fields.
  - Email normalized in `forgotPassword` via `email.trim().toLowerCase()` before lookup.

## API conventions

- Route prefix: `/api`. Auth routes under `/api/auth`.
- Success: JSON body of resource/object, e.g. `{ id, email, role }`, `{ token, role }`, `{ message }`.
- Error: always `{ error: 'message' }`. Status codes: 400 bad input/missing, 401 auth, 403 forbidden, 409 conflict, 500 unexpected.
- Pagination: backend-hardening (Task 29) added pagination to device list endpoints — check `deviceController` for its exact shape before relying on it.

## Database

- MongoDB Atlas (dev), connection in `server/index.js` via `MONGO_URI`.
- Models: `User` (name, email unique lowercased, passwordHash, role enum, studentId, + `resetPasswordTokenHash`, `resetPasswordExpires`), `Device`, `ScanLog`.
- Test database: isolated mechanism via `TEST_MONGO_URI` in `server/tests/auth.test.js`. The suite **refuses to run** unless `TEST_MONGO_URI` is set and differs from `MONGO_URI`. Destroys `User` documents (`deleteMany`) in beforeEach/afterAll — never point it at real data.
- Local test run on this machine: a MongoDB 8.3 **Windows service is installed and running** at `127.0.0.1:27017`; tests run fine against `mongodb://127.0.0.1:27017/device_checkin_test`. No local `mongod` binary needed in PATH (service). `mongosh` at `C:\Users\SODIQ\AppData\Local\Programs\mongosh\mongosh.exe`.

## Frontend architecture

- React 19 + Vite 8 + Tailwind 4 (`@tailwindcss/vite`). `react-router-dom` v7 `BrowserRouter`, routes in `src/App.jsx`.
- `Navbar` renders on all pages; `/` redirects to `/login`. Protected pages wrap children in `ProtectedRoute` (redirects to `/login` if no localStorage token). Public pages: `/login`, `/register`, `/forgot-password`, `/reset-password`, `/scan`.
- API client: `src/api/axiosInstance.js` (baseURL `http://localhost:5000/api`, auto-adds Bearer token). Service modules return `res.data`.
- Styling: Tailwind utility classes inline; auth pages use a simple `p-8 max-w-sm mx-auto` card with bordered inputs and a `bg-black text-white` button. Match that pattern for new pages.
- Auth state: localStorage `"token"`; no context store. Top-level `ErrorBoundary`; `ScannerPage` lazy-loaded.
- Bundle: ~291 kB main + ~370 kB lazy scanner chunk (html5-qrcode).

## Environment variables

Names only:
- `PORT` (server, default 5000)
- `MONGO_URI` (server, dev Atlas)
- `JWT_SECRET` (server, JWT signing)
- `FRONTEND_URL` (server, CORS allowlist + reset-link base URL; defaults `http://localhost:5173`)
- `TEST_MONGO_URI` (test-only, required for `npm test`; must be an isolated DB)
- `NODE_ENV` — `test` disables morgan + auth limiter; **`development` or `test` is required for `forgotPassword` to return the dev-only reset link** (any other value — production, staging, unset — suppresses the link)

Secrets live only in `server/.env` (git-ignored) and GitHub CI secrets.

## Testing

- Framework: Vitest 5 + Supertest, in `server/tests/auth.test.js`. Command: `cd server && $env:TEST_MONGO_URI="mongodb://127.0.0.1:27017/device_checkin_test"; npm test` (`vitest run`); requires `TEST_MONGO_URI` (+ `JWT_SECRET` fallback set in-test).
- Coverage: register (valid/dupe/missing fields/role/hash secrecy), login (valid/invalid/unknown), `/me` (valid token/missing token), forgot-password (generic response, email normalization, no enumeration, token hashed in DB, non-string email → 400, dev link suppressed when `NODE_ENV≠'development'/'test'`), reset-password (full reset, new login works, old password rejected, token reuse rejected, expired token, invalid token, missing/non-string fields, 6-char minimum, 6-char boundary accepted, concurrent single-use). 33 tests total.
- Not covered: device routes, QR logic, rate limiting (limiter disabled in test env by design), frontend (no framework).
- CI: `.github/workflows/test.yml` — PRs to `main` run `npm ci` + `npm test` in `server/` with secrets `TEST_MONGO_URI` and `JWT_SECRET`.

## CI/CD

- Only CI exists: GitHub Actions test workflow on PR to `main`. Render/Vercel configs exist but deployment is not live.

## Important architectural decisions

- `app.js` extracted from `index.js` so supertest can import the app without connecting/listening.
- Auth limiter mounted at router level (`/api/auth`) so every auth endpoint is covered uniformly; disabled in tests to avoid false failures.
- Reset tokens hashed (sha256) not stored raw — same principle as passwordHash. 30-min expiry, single use via atomic `findOneAndUpdate`.
- Dev-only reset-link exposed only when `NODE_ENV` is explicitly `'development'` or `'test'` — staging and production suppressed (prevents confirming registered email addresses). Replace with real email send when provider chosen.
- Password reset does not invalidate JWTs — the app is stateless-JWT only, no session/refresh store; a 2h token lifetime bounds exposure. Revisit only if refresh tokens are introduced.
- Reset-password enforces 6-char minimum; register does not (register remains presence-only, pre-existing behavior). Unified length rule deferred to a future password-strength task.
- Email normalization: schema lowercases/trims on save; `forgotPassword` lowercases/trims the lookup explicitly. Note: `login` does NOT normalize its input email before `findOne` (pre-existing quirk — mixed-case login emails won't match).

## Known concerns / technical debt

- **No email delivery** — reset link is returned in the API response (dev-only, `NODE_ENV=development`/`test` only). Replace with a real provider when chosen.
- **Lint error pre-exists on main**: `client/src/pages/ScannerPage.jsx:26` — `scanError` declared but never used. Not from this task; full `npm run lint` fails on it.
- No minimum password strength at register (presence-only; reset-password has a 6-char floor).
- Raw JWT session can't be revoked server-side (no denylist). 2h expiry bounds the risk.
- `login` fails for mixed-case email input (only affects login, not register/reset).
- Root repo has untracked `.claude/` and `package-lock.json`; `.gitignore` ignores `docs/` and all `.env*`.

## Completed task index

| Task | Description | Status | History |
|------|-------------|--------|---------|
| 27 | MVP four-role walkthrough close-out | Complete | (pre-agent era) |
| 28 | Vitest/supertest auth suite + CI | Complete | `docs/agent-task-history/28-test-suite-ci.md` |
| 29 | Env validation, device update/delete, pagination, API docs | Complete (merged) | — |
| 30 | Navbar, logout, error boundary, code-splitting | Complete (merged) | — |
| 31 | CORS hardening, scan rate limiting, cleanup, deploy config | Complete (merged) | — |
| 36 | Password reset (dev-only link, email pending) | Complete | `docs/agent-task-history/36-password-reset.md` |

## Context maintenance notes

- Last meaningful update: initial creation by the Task 36 agent (based on branch `feature/password-reset`, off `origin/main` at `6e7107e`).
- Future tasks: always branch from `origin/main` (local `main` ref is stale), check `server/app.js` for the mounted route/limiter layout, and remember tests need `TEST_MONGO_URI` pointing at the local running MongoDB service DB (`device_checkin_test`).
