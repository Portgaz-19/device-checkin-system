# Task 28 — Test Suite and CI

## Status

Complete.

## Objective

Make the Express application testable without opening a listener, add real
authentication integration tests, and run them in pull-request CI.

## What changed

- `server/app.js` owns Express middleware and routes, while `server/index.js`
  owns environment loading, MongoDB connection, and `listen()`.
- Vitest and Supertest power `server/tests/auth.test.js`.
- Tests require `TEST_MONGO_URI`, reject a value equal to `MONGO_URI`, and
  clean only the isolated test database.
- `.github/workflows/test.yml` runs the server suite on pull requests to
  `main` using `TEST_MONGO_URI` and `JWT_SECRET` repository secrets.

## Durable notes

- Import `server/app.js` for HTTP tests; never import `server/index.js` from a
  test because it starts runtime infrastructure.
- `npm test` is `vitest run` and needs an isolated MongoDB database.
- Auth tests cover registration, login, and `/api/auth/me`; later task records
  list additional auth coverage.

## Follow-up work

Device, QR, and frontend tests remain separate work.
