# Testing Strategy

## What exists right now

Backend auth integration tests are implemented (Vitest + Supertest). They run against an
isolated MongoDB test database and are enforced in CI on pull requests to `main`.

### Running the tests

```sh
cd server
TEST_MONGO_URI="mongodb://127.0.0.1:27017/device_checkin_test" npm test
```

`npm test` runs Vitest once, non-interactively (`vitest run`). Use `npx vitest` for watch mode.

### Test database safety

The auth tests are destructive (`User.deleteMany`), so they **refuse to run** unless:

- `TEST_MONGO_URI` is set, and
- `TEST_MONGO_URI` does not equal the application `MONGO_URI` (from `server/.env` or the
  environment).

Never point `TEST_MONGO_URI` at the real application/development database. The suite fails
fast with a clear error instead of touching it.

### What is covered

Auth route tests (`server/tests/auth.test.js`):

- registration: valid user registers (201), email is lowercased, duplicate email rejected
  (409), missing required fields rejected (400), invalid role rejected without creating a
  user, password hash is never exposed in responses
- login: correct credentials return a JWT and role (200), invalid password rejected (401),
  unknown email rejected (401)
- `/api/auth/me`: valid token returns the current user, missing token rejected (401)

### What is NOT covered yet

- Device route tests — not implemented (next highest priority: register/list/role guards)
- QR generation / scan-resolution tests — not implemented
- Frontend tests — none exist; the client has no test framework set up. Manual UI testing
  only, as before.

## Future priorities

1. Backend device route tests (register device, student "mine" view, admin full list, role
   guards) — these protect the second-most security-sensitive surface.
2. QR generation/scan-resolution tests (token expiry, status-flip + scan-log logic).
3. Frontend component tests — lowest priority at this size; only add once a framework
   decision is made.

## CI

`.github/workflows/test.yml` runs `npm ci` + `npm test` on every PR to `main`. It requires
two repository secrets:

- `TEST_MONGO_URI` — a dedicated test database, never the dev/prod database
- `JWT_SECRET` — any value; never expose a real secret in the repository