# Task 36 — Password Reset

## Status

Complete (backend + frontend implemented and tested; email delivery remains follow-up).

## Objective

Add a secure forgot-password / reset-password flow: User model reset-token fields,
`/api/auth/forgot-password` and `/api/auth/reset-password` endpoints, and public
`/forgot-password` + `/reset-password` frontend pages wired to Login. Since no email
provider exists, the reset link is returned in the API response, explicitly marked
dev-only.

## Files changed

- `server/models/User.js` — added `resetPasswordTokenHash` (String) and `resetPasswordExpires` (Date).
- `server/controller/authController.js` — added `forgotPassword` and `resetPassword`; imported `crypto`.
- `server/router/authRoutes.js` — mounted both new POST routes.
- `server/tests/auth.test.js` — added 19 tests (forgot-password + reset-password suites) → 33 total.
- `client/src/pages/ForgotPassword.jsx` — new page (email → POST forgot-password, shows generic message + dev link).
- `client/src/pages/ResetPassword.jsx` — new page (reads `?token=`, password + confirm, redirects to `/login` after success).
- `client/src/api/authApi.js` — added `forgotPassword(email)` and `resetPassword(token, newPassword)`.
- `client/src/App.jsx` — public routes `/forgot-password` and `/reset-password` (outside `ProtectedRoute`).
- `client/src/pages/Login.jsx` — added "Forgot password?" link to `/forgot-password`.

The persistent architecture map is `docs/agent-context.md`; this implementation
record belongs in `docs/agent-task-history/` for future task work.

## Actual implementation

- **forgotPassword** — validates presence of email (returns generic response if absent,
  guarding against a `findOne({ email: undefined })` match of the first user); normalizes
  `email.trim().toLowerCase()`; if no user, returns the generic 200 message. If the user
  exists: `crypto.randomBytes(32).toString('hex')` raw token, store `sha256(rawToken)`,
  expiry = `Date.now() + 30min`, then respond 200 with `{ message, devOnlyResetLink }`
  where `devOnlyResetLink` = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=<raw>`.
  It is included only when `NODE_ENV` is explicitly `development` or `test`; production,
  staging, and unset environments return the generic response only.
- **resetPassword** — requires string `token` + `newPassword` (400 `'Missing token or new password'`)
  and rejects passwords shorter than six characters. It hashes the presented token, hashes
  the new password, then atomically consumes the matching unexpired token with
  `findOneAndUpdate` (`$set` password hash, `$unset` token fields). A concurrent request
  cannot match after the first update. Invalid/expired tokens return 400.
- **Rate limiting** — no new limiter needed: `authLimiter` (20/15min) is mounted at the
  `/api/auth` router level in `app.js`, so both new routes inherit it, exactly like
  login/register. Deliberately disabled under `NODE_ENV=test`.
- **Sessions** — no session/refresh mechanism exists (stateless 2h JWT only), so password
  reset does not invalidate already-issued JWTs; this matches the existing architecture and
  was not invented for this task.

## API contract

- `POST /api/auth/forgot-password`
  - body: `{ email: string }`
  - 200 always: `{ message: "If an account exists for this email, a reset link has been generated." }`
    plus `devOnlyResetLink` **only** for an existing account in explicit `development` or
    `test` environments (temporary dev-only behavior).
  - malformed `email` → 400.
  - rate limited (auth limiter) outside test env.
- `POST /api/auth/reset-password`
  - body: `{ token: string, newPassword: string }`
  - 200: `{ message: "Password reset successfully. You can now log in." }`
  - 400: `{ error: "Missing token or new password" }`, `{ error: "Password must be at least 6 characters" }`,
    or `{ error: "Reset link is invalid or has expired" }`.
  - 500: `{ error: <message> }` on unexpected errors (matches existing controller pattern).

## Security behavior

- Token generation: `crypto.randomBytes(32).toString('hex')` — cryptographically random.
- Token hashing: only the sha256 hex digest is stored (`resetPasswordTokenHash`); the raw
  token exists only in the response/link. Never logged.
- Expiration: 30 minutes, enforced via `$gt: Date.now()` on `resetPasswordExpires`.
- One-time use: the update atomically unsets hash + expiry on success; concurrent and
  sequential reuse are rejected.
- Enumeration protection: same generic 200 message for existing, unknown, and missing email;
  the temporary link is available only in explicit local/test environments.
- Password hashing: bcrypt cost 10 (same as register).
- Validation: token and new password must be strings; reset password has a six-character
  minimum. Registration still has its pre-existing presence-only password rule.
- Rate limiting: inherited from the `/api/auth`-level `authLimiter`.
- No reset URL leak beyond the temporary dev response.

## Frontend behavior

- `/forgot-password` — public; email input; POST via `authApi.forgotPassword`; shows generic
  message, and if `devOnlyResetLink` present renders it as "Dev only (no email service yet):"
  with an anchor; link back to `/login`.
- `/reset-password` — public; reads `token` from `?token=` query param (via `useSearchParams`); if
  absent shows "No reset token found in the URL."; client-side newPassword === confirmPassword
  check before submitting; on success shows "Password reset! Redirecting to login..." and
  `navigate('/login')` after 2s; submission disabled after success.
- `/login` — added "Forgot password?" `Link` to `/forgot-password`.
- Both pages use the existing Tailwind auth-page styling (`p-8 max-w-sm mx-auto`, bordered
  inputs, `bg-black text-white` button).

## Tests added

19 new tests in `server/tests/auth.test.js` (plus 14 pre-existing = 33 passing):

- forgot-password: generic message + dev link for existing account; email normalization;
  identical generic message (no link) for unknown email; generic message for missing email;
  only sha256 hash stored in DB (raw token ≠ stored value, stored == sha256(raw)).
- reset-password: full reset clears token fields; new password logs in and old password is
  rejected (401); reused token rejected after success; expired token rejected and password
  unchanged (`bcrypt.compare`); invalid token rejected; missing token → 400; missing new
  password → 400; non-string token/password → 400; passwords shorter than six characters
  rejected; exactly six characters accepted; concurrent reset attempts yield one 200 and one 400.
- forgot-password: production and staging never return the development reset link; non-string
  email returns 400.

Rate limiting is NOT covered by an automated test — the suite runs with `NODE_ENV=test`,
which disables `authLimiter` by design. The limiter applies in production because it is
mounted at the router level. Manual/production verification remains.

## Validation performed

- `server`: `npm test` with `TEST_MONGO_URI=mongodb://127.0.0.1:27017/device_checkin_test`
  (local MongoDB 8.3 Windows service) → **33 passed**.
- `node --check` on the four changed `server/*.js` files → OK.
- `client`: `npm run build` → **passes** (291 kB main + 370 kB lazy scanner chunk).
- `client`: `npm run lint` → **fails on ONE pre-existing error** in `ScannerPage.jsx:26`
  (`scanError` unused). It exists on `origin/main` unchanged; none of this task's files
  produce lint errors (`npx eslint` on the 6 changed/new client files is clean).
- End-to-end backend flow (register → forgot-password → reset → new login + old login 401)
  is covered by the integration tests above.

## Differences from original task specification

- Task file assumed `server/tests/auth.test.js` may not exist; it does (Task 28), so tests
  were extended rather than created from scratch.
- Task 36 specifies `newPassword.length < 6`; the reset endpoint now enforces that rule.
  Registration still has its older presence-only rule, so aligning a single application-wide
  password policy remains follow-up work.
- Sample used `{ ...res.body }` spread and no email normalization; implemented email
  normalization explicitly and guarded the no-email case (a bare `findOne({ email })` with
  undefined email would match the first user — a real edge case worth protecting).
- Task file referenced `client/src/pages/ForgotPassword.jsx`/`ResetPassword.jsx` importing
  `api` directly; the codebase has an API service layer (`authApi.js`), so the pages use
  that abstraction instead.
- `FRONTEND_URL` already exists in the codebase (CORS allowlist in `app.js`); reused the
  same env var for the reset-link base instead of inventing a new one.

## Decisions

- Reset consumption uses one conditional `findOneAndUpdate` with `$unset` so token use is
  atomic instead of relying on a read-then-save sequence.
- Reused generic message and `400` error text from the task sample to match its contract.
- Did not add a session/refresh invalidation mechanism because none exists in the codebase
  (stateless JWT). Any such work belongs to a future auth-refactor task.
- Did not fix the pre-existing `ScannerPage.jsx` lint error or the `login` email-case quirk
  — both out of scope for Task 36.

## Follow-up review fixes (2026-09-14, after review `docs/reviews/password-reset-review-2026-09-14.md`)

- **6-char minimum enforced** in `resetPassword`: `newPassword.length < 6` → 400
  `'Password must be at least 6 characters'`. Register remains presence-only
  (pre-existing, unchanged).
- **`devOnlyResetLink` allowlisted**: exposed only when `NODE_ENV` is explicitly
  `'development'` or `'test'`. Production, staging, or any other/unset value gets
  the generic response with no link. This replaces the earlier "anything but
  production" gate that leaked the registered-email oracle on staging-like envs.
  Run `NODE_ENV=development` locally to exercise the dev link.
- **Atomic single-use consumption**: `resetPassword` hashes the presented token
  and calls `User.findOneAndUpdate` with `{ resetPasswordTokenHash: tokenHash,
  resetPasswordExpires: { $gt: Date.now() } }` in the filter and
  `$set: { passwordHash }` + `$unset` of both token fields, so a concurrent
  reset on the same token cannot both succeed (only the first match consumes it).
- **Input type validation**: non-string `email` → 400 `'email must be a string'`;
  non-string or missing `token`/`newPassword` → 400 `'Missing token or new password'`.
  Prevents object-shaped JSON from reaching `.trim()`/`crypto.update()`/`bcrypt.hash()`
  (which previously turned client errors into 500s).
- New/updated tests (suite now 33): dev link suppressed for `production` AND
  `staging` + other envs; non-string email/token/newPassword → 400; short password
  (and exactly-6 boundary) behavior; concurrent resets via `Promise.all` must
  yield exactly one 200 and one 400.
- Validation: `npm test` → 33 passed; `node --check` clean; client `npm run build`
  passes. No commit; worktree untouched beyond `server/controller/authController.js`,
  `server/tests/auth.test.js`, and these docs.

## Follow-up work

- **Real email delivery is pending.** The team must pick a provider (SendGrid, Resend,
  etc.). When that lands: remove the `// TEMPORARY dev-only exposure` block in
  `forgotPassword`, stop returning `devOnlyResetLink`, and send the link by email instead.
  The rest of the flow is provider-agnostic.
- Consider whether password reset should also offer a minimum-strength password rule (align
  register + reset together if decided).
- Manual QA of the two new frontend pages in a browser (supertest covers the API; the client
  has no test framework).

## Git information

- Branch: `feature/password-reset` (created from `origin/main` at `6e7107e`).
- Pre-existing workspace: local `main` was stale (at `619e4ff`); branched from the
  up-to-date `origin/main` instead. Left untracked `.claude/` and root `package-lock.json`
  alone.
- Commit: `1fcd8a1` "feat: add password reset flow (dev-only link, email delivery pending)" (9 files).
- Pushed: `origin/feature/password-reset`.
- PR: https://github.com/Portgaz-19/device-checkin-system/pull/29 — OPEN, mergeable,
  CI (`server-tests`) **passing**. Not merged (requires human merge to `main`).
