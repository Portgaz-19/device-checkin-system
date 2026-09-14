# Known Gaps

This list is maintained against the current branch. It records gaps that a
production deployment or an outside reviewer would flag; historical task
snapshots are kept under `docs/archive/` instead.

## Security

- **No rate limit on `/api/qr/scan`.** `express-rate-limit` is only applied
  to `/api/auth` (`server/app.js`). The scan endpoint takes no token
  and is public by design (Security has no account) — that also makes it
  the easiest endpoint to hammer with junk requests or brute-force valid
  short-lived tokens, and nothing currently throttles it.
- **Error responses leak internals.** `errorHandler.js` and most controller
  catch blocks return `err.message` directly to the client
  (e.g. `deviceController.js:30`, `authController.js:41`). Fine for a class
  project, but a Mongoose validation error or driver error message can leak
  schema/field details an attacker shouldn't need.
- **No `.env.example`.** README says "DO NOT EVER COMMIT .ENV" but there's
  no template listing which vars are required (`MONGO_URI`, `JWT_SECRET`,
  `PORT`). Anyone cloning fresh has to reverse-engineer the list from
  `index.js`/controllers.
- **Password-reset delivery is not production ready.** The reset link is
  returned to the caller for development use. It must be sent through a real
  email provider, or be explicitly gated to a non-production environment,
  before release; otherwise the response reveals whether an email has an
  account.

## Input validation

- All request validation is manual `if (!field)` checks in controllers
  (e.g. `authController.js:8`, `deviceController.js:7`) — no schema
  validation library (`zod`/`joi`/`express-validator`). Works, but there's
  no format checking (e.g. `email` isn't validated as an email shape before
  hitting the DB — it relies on Mongoose's `unique` constraint to eventually
  reject garbage, with a generic `500` if something unexpected happens
  first).
- `role` on registration isn't checked against the allowed enum before
  `User.create` — Mongoose will reject an invalid role, but that surfaces as
  a raw `500` with a Mongoose error message rather than a clean `400`.
- Password reset checks only that its values are present. It needs string/type
  validation and the specified six-character minimum for `newPassword`.

## Data / API design

- **QR scan is all-or-nothing per student.** One scan flips *every* device
  that student owns; there's no way to check in/out a single device
  independently. Documented as a deliberate simplification in
  [project overview](../architecture/overview.md), listed here because it's also a real
  design constraint anyone extending the feature needs to know about.

## Frontend

- **`ProtectedRoute` doesn't check role**, only "is there a token"
  (`client/src/components/ProtectedRoute.jsx`). A logged-in student can
  navigate to `/devices/register` and see the hostel-supervisor form render
  before the API rejects the submit with `403`. Not a security hole (the
  backend enforces the real check), but a rough demo-visible UX edge.
- **API deployment configuration is required.** The client uses
  `VITE_API_URL` and falls back to localhost, so every deployed frontend must
  define the production API URL.

## Process / repo hygiene

- **Stray root-level `package-lock.json`.** An empty lockfile
  (`"packages": {}`, no matching root `package.json`) sits at the repo root,
  currently untracked. Looks like an accidental `npm install` run from the
  repo root instead of `client/` or `server/` — safe to delete, nothing
  depends on it.
- Device, QR, and frontend tests are still missing. Auth integration tests
  exist; see the [testing guide](../guides/testing.md) for their scope.
- **No live deployment.** `server/render.yaml` and `client/vercel.json` are
  drafted but nothing is actually deployed.

## Where this list comes from

Cross-referenced against the [project overview](../architecture/overview.md)
(architecture trace) and [project context](project-context.md) (task tracker). Update
both if a gap here gets closed.
