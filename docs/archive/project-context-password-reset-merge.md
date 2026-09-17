# Project Context — Device Check-In System (VerifyGate)

**Repo:** https://github.com/Portgaz-19/device-checkin-system
**Snapshot:** `main` at `9253fd4`

## Project overview
A system to replace the school's manual paper-based device sign-in/sign-out process at checkpoints.

**Core idea:** Devices are registered to a student (at resumption, or by a hostel supervisor when a new device arrives mid-session). The student's app generates a QR code that, when scanned, shows security the full list of devices registered under that student's name — so security can physically verify serial numbers against a real list instead of a handwritten book. Scanning the QR also logs the device in/out, so the last known location (building/checkpoint) of every device is tracked.

**Roles in the system:**
- **Student** — views their registered devices, generates/regenerates QR code
- **Hostel Supervisor** — registers a device to a student
- **Security** — scans QR at checkpoints. No account needed
- **Admin** — views logs/history, searches devices, exports scan logs to CSV

## Tech stack
- Frontend: React 19 + Vite 8 + Tailwind CSS 4 + react-router-dom v7 + axios + html5-qrcode
- Backend: Node.js + Express 5 + Mongoose 9, ES modules throughout
- Database: MongoDB Atlas (dev)
- Auth: bcrypt, jsonwebtoken, custom `verifyToken`/`requireRole` middleware
- Security/ops middleware: helmet, morgan, express-rate-limit
- Testing: vitest, supertest, GitHub Actions CI (**auth coverage only**)
- Hosting: **not live** — `render.yaml` and `vercel.json` are correct and ready, but no Render/Vercel services have actually been created. Requires repo-owner dashboard access.

## Deployment status
- No live deployment exists. This is unchanged from the repo's own README, which lists deployment as "planned, not yet live."
- Configs are ready on both sides (`server/render.yaml`, `client/vercel.json`) — the remaining work (creating the services, setting real env vars) is owner-gated, not something fixable from the codebase.

## What's actually done (verified against code, not old task docs)
- `App.jsx` — root route, single `/scan` with `Suspense`, `Navbar` wired in. Fixed.
- Password reset (dev-only link, sha256-hashed single-use tokens, 30-min expiry, link suppressed outside `development`/`test` env to prevent email enumeration). Merged.
- QR regenerate UX with countdown (`MyQrCode.jsx`), admin device search, scan-log CSV export. Merged (went through a revert/reapply cycle — `PR #30` → reverted in `#32` → reapplied in `#34` — but is live on `main` now).
- Auth test suite: 33 tests in `server/tests/auth.test.js` (register, login, `/me`, forgot-password, reset-password — all paths and edge cases).
- CORS allowlisting, scan-endpoint rate limiting (`scanLimiter`, 5-min window/max 30, mounted on `POST /api/qr/scan`), auth-endpoint rate limiting (`authLimiter`, 15-min window/max 20, mounted at `/api/auth` — covers login/register/forgot/reset uniformly).
- Device pagination + ownership-based update/delete on `PATCH`/`DELETE /api/devices/:deviceId`.
- Error boundary + code-splitting (`ScannerPage` lazy-loaded).

## What's still genuinely open (not done, verified by reading the code)
- **No device or QR/scan test coverage** — `server/tests/` has only `auth.test.js`. `resolveScan`, device ownership rules, and role-gating on device routes are all untested.
- **`resolveScan` is still all-or-nothing** — a scan flips every device a student owns; no way to target a subset.
- **Navbar shows every logged-in link to every logged-in user regardless of role** — a student currently sees an "Admin" link that just 403s.
- **`ProtectedRoute` only checks token presence, not role** — a student can navigate straight to `/admin` or `/devices/register` and the page renders (and fails its own API calls) instead of being redirected up front.
- **`Register.jsx` has no confirm-password field, no client-side validation, no submit-disable.** Same submit-disable gap exists on `Login.jsx` and `RegisterDevice.jsx`.
- **Every controller's 500 path returns raw `err.message` to the client** (`authController.js`, `deviceController.js`, `errorHandler.js`'s fallback) — the only error path in the codebase that isn't a deliberately-written, client-safe message.
- **No `.env.example` anywhere** — required vars only documented in README prose.
- **`.gitignore` still has a duplicated `!client/src/assets/*.png` line.**
- Register's backend has no minimum password length (only reset-password enforces 6 chars) — a pre-existing, deferred inconsistency.
- `login` doesn't normalize email case before lookup — mixed-case login email won't match (pre-existing quirk).
- No email delivery service — reset link is dev-only, returned in the API response.
- Doc gap: `docs/agent-context.md`'s "Completed task index" table doesn't list the QR-refresh/admin-search work even though it's merged on `main` — worth fixing whenever that doc is next touched.

## Next batch: Tasks 37–41 (already written, not yet executed)
| # | Task | Depends on |
|---|---|---|
| 37 | Device + QR/scan test coverage | Nothing — start now |
| 38 | Selective per-device scan (`serialNumbers` field on `resolveScan`) | Task 37 (needs the test safety net first) |
| 39 | Role-aware Navbar + `ProtectedRoute` role gating | Nothing |
| 40 | Auth form hardening (confirm-password, validation, submit-disable) | Nothing |
| 41 | Error-message hygiene, `.env.example`, `.gitignore` dedupe | Nothing |

37 and 38 are sequential; 39, 40, 41 can all run in parallel with each other and with 37/38 — no shared files.

## What "done" looks like for this batch
- CI test coverage spans auth, devices, and QR/scan, not just auth
- Security can optionally target specific devices on a scan, not just all-or-nothing
- Non-admins no longer see admin-only nav links, and can't reach admin-only or supervisor-only routes by URL alone
- Registration has password confirmation and basic client-side validation; all three auth forms disable their submit button while pending
- 500 responses no longer leak raw internal error text
- `.env.example` exists for both `server/` and `client/`; `.gitignore` duplicate removed

## Known open items not covered by this batch
- Actually creating the Render/Vercel services (owner-only, not code)
- Frontend picker UI for choosing specific devices during a scan (Task 38 only adds backend support)
- Server-side search/export for the admin dashboard (currently scoped to the loaded page only)
- Real email delivery for password reset
- Unifying the password-length rule between register and reset
- Fixing `login`'s missing email-case normalization

## Immediate next step
Start Task 37 (device + QR/scan tests) — it's the one everything else in this batch either depends on (38) or benefits from as a safety net. 39, 40, 41 can be picked up in parallel by anyone else, any time.
