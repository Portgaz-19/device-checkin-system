# Project Context — Device Check-In System

**Repo:** https://github.com/Portgaz-19/device-checkin-system
**Snapshot:** pulled fresh, `main` at `430c0d5` — full stack cloned, installed, and run
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
- Frontend: React 19 + Vite + Tailwind CSS 4 + `react-router-dom` + `axios` (service-layer pattern in `client/src/api/`) + `html5-qrcode` (being added, Task 25)
- Backend: Node.js + Express 5 + Mongoose 9, ES modules throughout
- Database: MongoDB Atlas (free M0 tier)
- Auth: `bcrypt`, `jsonwebtoken`, custom `verifyToken`/`requireRole` middleware
- Security/ops middleware: `helmet`, `morgan`, `express-rate-limit`
- QR: `qrcode` (generation, backend), `html5-qrcode` (scanning, frontend — being added)
- Hosting (drafted, not deployed): Render (`server/render.yaml`), Vercel (`client/vercel.json`)

## Confirmed working right now — the actual core loop
Verified directly by running the full stack and testing each piece, including a real
end-to-end walkthrough (register → login → generate QR → scan → status flip):
- Accounts, roles, JWT auth, protected/role-guarded routes
- `Device` model, registration (Hostel Supervisor/Admin only), student's-own-devices view,
  admin full list
- QR generation (`/api/qr/generate`) — genuinely produces a scannable image, tested visually
- Scan resolution (`/api/qr/scan`, no login required, matching Security's no-account design)
  — correctly flips device status, updates location, writes a `ScanLog` record
- All recent merges are genuine 2-parent PRs — the earlier direct-push problem has fully
  stopped holding

## Current phase: Completing the MVP (Tasks 24–27)
The functional core is done. What's left is making it *usable by a real person* in each
role, not just testable via curl/PowerShell.

| # | Task | Owner | Depends on |
|---|---|---|---|
| 24 | Admin scan history endpoints | Person B | Nothing — start now |
| 25 | Camera-based Security scanner screen | Person C | Nothing — start now |
| 26 | Admin dashboard (devices + scan history) | You | Task 24 |
| 27 | Full four-role walkthrough, close-out | Person A | Tasks 24, 25, 26 |

## Sync chain
```
Task 24 (Person B)          Task 26 (You)              Task 27 (Person A)
scan history endpoints  →   admin dashboard        →   full four-role
                                                          walkthrough + close-out
Task 25 (Person C) — independent, runs alongside Task 24
camera-based scanner screen
```

## Why this batch matters more than it might look
Every prior phase added a piece Security/Admin/whoever could only reach through a terminal.
This batch is the one that makes the app actually demoable to someone outside the team —
a real camera scan, a real dashboard, not a curl command. Once Task 27 closes, every one of
the four original roles has a genuine, walkable path through the app.

## What's honestly still needed after this batch, before a real shippable MVP
- Real automated tests (still just `TESTING.md`, a plan, not test code)
- Actual live deployment (Render/Vercel configs are drafted, nothing's live)
- Any UX/polish pass the team wants before showing this outside the group
- Person E still not allocated — could be a natural fit for either the test suite or
  deployment once this phase closes

## Task files in this set
- `24-scan-history-endpoints.md` — Person B
- `25-scanner-ui.md` — Person C
- `26-admin-dashboard.md` — You
- `27-mvp-phase-closeout.md` — Person A

## Immediate next step
Person B and Person C start Tasks 24 and 25 immediately, in parallel. You wait on Task 24's
merge before Task 26. Person A waits on all three before the final walkthrough.
