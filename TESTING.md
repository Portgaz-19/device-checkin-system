# Testing Strategy

No automated tests exist yet. This is a starting plan, not a completed setup — pick this up as a dedicated task once the Device/QR phase lands.

## Priorities, in order

1. Backend route tests for auth (register/login/me) and device endpoints — these protect the most security-sensitive code (password hashing, role checks, token verification) and are the highest-value tests to write first.
2. QR generation/scan resolution — the core feature, and the part most likely to have subtle bugs (token expiry edge cases, status-flip logic).
3. Frontend component tests — lowest priority for a project this size; manual testing through the UI has been catching real issues fine so far.

## Suggested tools

(not yet installed — decide as a team before adding)

- Backend: jest or vitest + supertest for HTTP-level route testing
- Consider a separate test MongoDB database/collection, never test against the real Atlas cluster's production-equivalent data

## What "done" looks like for a route test

At minimum: one success case, one validation-failure case (missing fields), and one auth-failure case (wrong role, missing/invalid token) per protected route.
