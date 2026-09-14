# Password-reset feature review — 2026-09-14

## Scope

Reviewed commit `1fcd8a1` (`feature/password-reset`) against
[Task 36](../../36-password-reset.md) and `origin/main`.

## Initial verdict

**Request changes before merging.** The initial implementation did not meet
the password rule, exposed development links too broadly, and consumed reset
tokens with a race-prone read-then-save sequence.

## Must fix

1. Reject passwords shorter than six characters in `resetPassword`, and add
   an integration test for that response. Task 36 explicitly requires it.
2. Do not return `devOnlyResetLink` from a production-capable endpoint. Send
   it through an email provider, or make the response available only in an
   explicitly non-production environment. Its presence lets a caller identify
   registered email addresses.
3. Consume reset tokens atomically. Two simultaneous reset requests can both
   pass `findOne` before either request clears the token, so both can succeed
   and race to set the final password. Hash the new password, then use an
   atomic conditional update that includes the token hash and expiry.

## Should fix

- Validate `email`, `token`, and `newPassword` as strings before calling
  `.trim()`, `crypto.update()`, or `bcrypt.hash()`. Object-shaped JSON values
  currently reach those APIs and turn a client error into a `500` response.
- Add integration coverage for malformed values and the atomic/single-use
  behavior under concurrent submissions.

## Verified

- The raw token is generated cryptographically, only its SHA-256 hash is
  persisted, and the expiry is 30 minutes.
- Normalized lookup, generic response text, expired-token rejection, sequential
  one-time use, and old-password invalidation are tested.
- The router-level authentication limiter covers both reset endpoints outside
  `NODE_ENV=test`.
- `npm test` passed: 26 tests against an isolated local MongoDB database.
- `npm run build` passed for the client.

## Validation limitation

The client has no component-test setup. `npm run lint` still fails on the
pre-existing unused `scanError` value in `client/src/pages/ScannerPage.jsx`;
the password-reset files do not introduce a lint error.

## Remediation review

The reported must-fix items are resolved in the worktree:

- Reset passwords require at least six characters, with boundary tests.
- Development reset links are available only in explicit `development` or
  `test` environments; production and staging are tested to return the generic
  response only.
- Token consumption uses an atomic conditional update, with a concurrent-use
  test proving exactly one success.
- Malformed email, token, and password values return `400` rather than `500`.

Independent validation after remediation: 33 server integration tests passed,
the client production build passed, changed client files lint cleanly, and
syntax/diff checks passed.

**Final verdict: approve, with a non-blocking follow-up to make the
registration password policy match the reset-password minimum.**
