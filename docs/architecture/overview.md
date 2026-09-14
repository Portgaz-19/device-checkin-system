# VerifyGate — Detailed Breakdown

What the codebase actually does today, traced end to end. For task status and
who owns what, see the [agent context](../agent-context.md); for
the formal endpoint contract, see the [API reference](../reference/api.md).

## What it replaces

A school's paper sign-in book at checkpoints. A student's devices are
registered once; from then on, a QR code (not the paper book) is what
security checks against.

## Roles and what each can actually do right now

| Role | Account? | Can do today |
|---|---|---|
| Student | Yes | Register/login, view own devices (`/devices/mine`), generate a QR (`/qr/generate`) |
| Hostel Supervisor | Yes | Everything a student's login allows, plus register a device to any student (`POST /devices`) |
| Admin | Yes | Everything above, plus list every device with owner populated (`GET /devices`) |
| Security | **No account** | Scan a QR at `/scan` — hits `POST /qr/scan`, which needs no token |

Role is stored on the `User` document and embedded directly in the JWT at
login (`{ id, role }`), so every subsequent request carries it — no DB lookup
needed to check permissions, just `requireRole(...)` reading `req.user.role`.

## Backend architecture

Layering is enforced by convention, documented in
[the backend architecture guide](backend.md):

```
router/   → HTTP method + path → controller function, nothing else
controller/ → business logic, talks to models, shapes the response
models/   → Mongoose schemas only
middleware/ → verifyToken, requireRole, errorHandler
app.js    → middleware order and route mounting
index.js  → environment setup, DB connection, and listener
```

`app.js` middleware order matters here: `cors` → JSON parsing → `helmet` → `morgan` →
route mounting → `errorHandler` last. `express-rate-limit` (20 req/15min) is
applied only to `/api/auth`, since that's the brute-forceable surface
(login/register).

### Auth mechanics

- Passwords: `bcrypt`, 10 salt rounds, hashed at registration.
- Sessions: JWT, `expiresIn: '2h'`, signed with `JWT_SECRET`. No refresh
  flow — expiry just means log in again.
- `verifyToken` middleware: pulls `Authorization: Bearer <token>`, verifies,
  attaches decoded payload to `req.user`. No token → `401`. Bad/expired token
  → `401`.
- `requireRole(...roles)`: checks `req.user.role` is in the allowed list →
  `403` otherwise. Composed after `verifyToken` on protected routes.

### The QR flow, specifically

This is the part with real design decisions baked in, so it's worth tracing
fully:

1. **Generate** (`GET /qr/generate`, student logged in): server signs a
   *second*, unrelated JWT — payload `{ studentId }`, 5-minute expiry — and
   encodes it into a QR image (`qrcode` package → data URL). This token is
   short-lived specifically so an old QR image can't be replayed later; it's
   not the same token as the student's login session.
2. **Scan** (`POST /qr/scan`, no auth): Security's camera reads the QR,
   posts `{ token, location }`. Server verifies the token, decodes
   `studentId`, and pulls **every** `Device` that student owns.
3. **Flip**: every one of those devices flips status
   (`checked-in` ↔ `checked-out`) in the same call, `lastLocation` is
   updated, and one `ScanLog` row is written per device. This is a
   deliberate simplification — one QR represents "this student's whole
   device list," not one device — matching the paper-book replacement it's
   modeling (security checks the physical devices against the one list).
   There is currently no way to scan/flip a single device independently.
4. Response echoes back the post-flip device list, which is what
   `ScannerPage.jsx` renders as the "scan successful" confirmation.

### Data model relationships

```
User (role: student|hostelSupervisor|admin)
  └─ owns many → Device (owner: ObjectId ref User)
                    ↑ registeredBy: ObjectId ref User (who registered it)
  Device ── has many → ScanLog (device: ObjectId ref Device)
```

`ScanLog` is exposed to administrators through the scan-log route and the admin dashboard.
They remain an audit trail for each resolved scan.

## Frontend architecture

React 19 + Vite, Tailwind for styling, `react-router-dom` for routing. API
calls go through a thin service layer (`client/src/api/*Api.js`) built on a
shared `axiosInstance` that auto-attaches the JWT from `localStorage` via a
request interceptor — so individual pages never touch headers directly.

```
main.jsx → App.jsx (route table) → pages/*
```

| Route | Page | Guarded? |
|---|---|---|
| `/login` | `Login.jsx` | no |
| `/register` | `Register.jsx` | no |
| `/forgot-password` | `ForgotPassword.jsx` | no |
| `/reset-password` | `ResetPassword.jsx` | no |
| `/devices/register` | `RegisterDevice.jsx` | yes — `ProtectedRoute` |
| `/devices/mine` | `MyDevices.jsx` | yes — `ProtectedRoute` |
| `/scan` | `ScannerPage.jsx` | **no** — matches the backend; Security has no login |

`ProtectedRoute` only checks *whether a token exists* in `localStorage`, not
the role on it — it redirects to `/login` if there's no token at all, but
doesn't stop, say, a student from navigating to `/devices/register` in the
URL bar. That's not a real security hole (the backend's `requireRole` still
rejects the request with `403`), just a UX gap: the wrong-role user would see
the form before getting an error back from the API, instead of being routed
away up front.

`ScannerPage.jsx` uses `html5-qrcode`'s `Html5QrcodeScanner`, mounted in a
`useEffect` against a `div#qr-reader`. On a successful decode it immediately
calls `scanner.clear()` before posting to `/qr/scan` — without that, the same
QR would keep re-firing the decode callback for as long as it's in frame,
re-triggering the scan repeatedly.

## Known rough edges

Full list, with file/line references and severity, is in
[known gaps](../planning/known-gaps.md) — covers security (rate limiting,
error leakage, password-reset delivery), input validation, data/API design
constraints, frontend authorization gaps, and repo hygiene.

## Current task state

See the [agent context](../agent-context.md) for the live task table.
As of the last check: Task 25 (this scanner UI) is merged; Task 24 (scan
history endpoints) hasn't started yet, which is what everything past this
point (Task 26 admin dashboard, Task 27 closeout) is waiting on.
