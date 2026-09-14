# Project Context — Device Check-In System

**Repo:** https://github.com/Portgaz-19/device-checkin-system
**Snapshot:** pulled fresh, `main` at `619e4ff` — full stack cloned, installed, and run
directly, not just read

## Project overview
A system to replace the school's manual paper-based device sign-in/sign-out process at checkpoints.

**Core idea:** Devices are registered to a student (at resumption, or by a hostel supervisor when a new device arrives mid-session). The student's app generates a QR code that, when scanned, shows security the full list of devices registered under that student's name — so security can physically verify serial numbers against a real list instead of a handwritten book. Scanning the QR also logs the device in/out, so the last known location (building/checkpoint) of every device is tracked.

**Roles in the system:**
- **Student** — views their registered devices, generates QR code
- **Hostel Supervisor** — registers a device to a student
- **Security** — scans QR at checkpoints. No account needed
- **Admin** — views logs/history

**Key design decision:** QR code encodes a short-lived signed token, not raw device data. Backend resolves the token to a live device list at scan time.

**Scale:** small, single-campus system. Learning goal is data integrity and clean architecture, not traffic handling.

## Tech stack
- Frontend: React 19 + Vite + Tailwind CSS 4 + `react-router-dom` + `axios` + `html5-qrcode`
- Backend: Node.js + Express 5 + Mongoose 9, ES modules throughout
- Database: MongoDB Atlas (free M0 tier)
- Auth: `bcrypt`, `jsonwebtoken`, custom `verifyToken`/`requireRole` middleware
- Security/ops middleware: `helmet`, `morgan`, `express-rate-limit`
- QR: `qrcode` (generation), `html5-qrcode` (scanning)
- Testing (being added, Task 28): `vitest`, `supertest`, GitHub Actions CI
- Hosting (being made real, Task 31): Render (backend), Vercel (frontend)

## Confirmed working right now — the full core loop, verified end to end
Verified directly by cloning fresh, installing, and running everything — not assumed:
- Accounts, roles, JWT auth, protected/role-guarded routes
- Device registration, student's-own-devices view, admin full list
- QR generation — genuinely produces a scannable image
- Camera-based scanner screen, `html5-qrcode`, tested against a real QR
- Scan resolution flips device status, updates location, logs a `ScanLog` record
- Admin dashboard shows devices and scan history
- All recent merges are genuine PRs (spot-checked through the more complex
  integration-branch merge history from this last batch) — the earlier direct-push
  problem has not recurred
- No merge conflict markers, no leftover debug code (`_debugToken`, stray `console.log`)
  anywhere in the codebase
- No new secrets in git history

## Two real findings from this audit, folded into the next batch
1. **`server/qr_test.png`** — an accidental commit, the test QR image from earlier manual
   debugging swept in by a `git add .`. Cosmetic, but real — being cleaned up in Task 31.
2. **Frontend bundle is 657kB** (202kB gzipped), tripping Vite's size warning — almost
   certainly `html5-qrcode`, only needed on one page. Being fixed via code-splitting in
   Task 30.

## Current phase: Going Live (Tasks 28–31)
The functional MVP is genuinely done. This batch is what turns it into something real:
actual tests with CI enforcement, backend hardening and CRUD completion, frontend polish,
and — for the first time — a real, live, publicly reachable deployment.

| # | Task | Owner | Depends on |
|---|---|---|---|
| 28 | Real test suite (vitest + supertest) + CI enforcement on `main` | Person A | Nothing — start now |
| 29 | Env validation, device update/delete, pagination, API docs | Person B | Nothing — start now (light file-overlap risk with Task 28 on `index.js`/`app.js`) |
| 30 | Navbar, logout, error boundary, bundle-size fix via code-splitting | Person C | Nothing to start; final step depends on Task 29's pagination shape if it lands first |
| 31 | Real deployment, CORS hardening, scan-endpoint rate limiting, cleanup | You | Nothing to start; actual go-live step best done last, once the rest has merged |

## Why this batch is different from every prior one
Every previous batch added a feature. This one is what makes those features *safe to leave
running unattended* — CI that blocks bad merges automatically instead of relying on someone
remembering to review, an endpoint that fails loudly instead of confusingly when
misconfigured, rate limiting on the one endpoint that's deliberately open to the public
internet, and an actual URL someone outside the team could visit.

## What "done" looks like for this batch
- `main` cannot be merged into without passing automated tests
- The confusing raw Mongoose error from missing env vars is gone, replaced with a clear
  fail-fast message
- Devices can be updated and deleted, not just created and read
- List endpoints are paginated, won't silently degrade as real data grows
- The frontend has real navigation, working logout, and a graceful error state instead of
  a blank screen on a crash
- The 657kB bundle-size warning is resolved
- CORS is locked to a real origin, not wide open
- `/api/qr/scan` — the one endpoint with no login requirement — is rate-limited
- The stray `qr_test.png` is gone, and `.gitignore` prevents that class of accident going
  forward
- The app is actually live on Render + Vercel, tested end-to-end against real URLs

## Task files in this set
- `28-test-suite-ci.md` — Person A
- `29-backend-hardening.md` — Person B
- `30-frontend-polish.md` — Person C
- `31-deploy-and-harden.md` — You

## Coordination notes worth flagging to the team
- Task 28 extracts `server/app.js` from `server/index.js` — whoever merges second between
  Tasks 28 and 29 should expect to rebase
- Task 29 changes the response shape of the paginated list endpoints — Task 30's
  `AdminDashboard.jsx` update depends on knowing whether that's landed yet
- Real production secrets (Task 31) must be different from the test-database secrets
  (Task 28) and from anyone's local dev `.env` — three separate credential sets by the end
  of this batch, worth a clear note in the team's password manager about which is which

## Immediate next step
All four of you can start your own task's early parts right now. The only real sequencing
that matters: Task 31's actual "go live" step (Part 1) is worth doing last, once the rest
of the batch has had a chance to merge in.
