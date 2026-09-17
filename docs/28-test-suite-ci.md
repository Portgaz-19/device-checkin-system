# Task 28: Real Test Suite + CI Enforcement
**Owner: Person A**
**Repo:** https://github.com/Portgaz-19/device-checkin-system

**Chat** opencode -s ses_f84821e29ffeoNbxEO8vhxRofD

## Before you start — sync check
No dependency — start immediately, alongside every other task in this batch.

## Why this task exists
`TESTING.md` has been a plan with zero actual tests behind it for a while now. Separately,
the direct-push-to-`main` problem has happened twice — a written rule and even branch
protection still rely on someone remembering to click the right button. This task fixes
both, and they reinforce each other: once real tests exist, CI can require them to pass
before any merge, which is a structural fix, not another reminder.

## Part 1 — install and configure a real test framework

1. Pull latest `main`, branch:
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/test-suite
   ```

2. Install `vitest` (works cleanly with ES modules, unlike older Jest setups which need
   extra config for this) and `supertest` for HTTP-level route testing:
   ```bash
   cd server
   npm install -D vitest supertest
   ```

3. Add a test script to `server/package.json`:
   ```json
   "scripts": {
     "dev": "nodemon index.js",
     "test": "vitest run"
   }
   ```

## Part 2 — a real, working auth test file

4. Create `server/tests/auth.test.js`. This needs a live test database connection — use a
   **separate test database**, never the real Atlas cluster your team actually uses day to
   day (a stray `deleteMany()` in a bad test could wipe real data otherwise):
   ```js
   import { describe, it, expect, beforeAll, afterAll } from 'vitest';
   import request from 'supertest';
   import mongoose from 'mongoose';
   import app from '../app.js'; // see Part 3 — you'll need to extract this first

   beforeAll(async () => {
     await mongoose.connect(process.env.TEST_MONGO_URI);
   });

   afterAll(async () => {
     await mongoose.connection.dropDatabase();
     await mongoose.connection.close();
   });

   describe('POST /api/auth/register', () => {
     it('creates a new user with valid data', async () => {
       const res = await request(app).post('/api/auth/register').send({
         name: 'Test User',
         email: 'testuser@example.com',
         password: 'testpass123',
         role: 'student',
       });
       expect(res.status).toBe(201);
       expect(res.body.email).toBe('testuser@example.com');
       expect(res.body.passwordHash).toBeUndefined(); // never leak the hash
     });

     it('rejects a duplicate email', async () => {
       const res = await request(app).post('/api/auth/register').send({
         name: 'Test User',
         email: 'testuser@example.com',
         password: 'testpass123',
         role: 'student',
       });
       expect(res.status).toBe(409);
     });

     it('rejects missing fields', async () => {
       const res = await request(app).post('/api/auth/register').send({ email: 'bad@example.com' });
       expect(res.status).toBe(400);
     });
   });

   describe('POST /api/auth/login', () => {
     it('logs in with correct credentials and returns a token', async () => {
       const res = await request(app).post('/api/auth/login').send({
         email: 'testuser@example.com',
         password: 'testpass123',
       });
       expect(res.status).toBe(200);
       expect(res.body.token).toBeDefined();
     });

     it('rejects wrong password', async () => {
       const res = await request(app).post('/api/auth/login').send({
         email: 'testuser@example.com',
         password: 'wrongpassword',
       });
       expect(res.status).toBe(401);
     });
   });
   ```

## Part 3 — extract `app` so it's testable without actually binding a port

5. `supertest` needs the Express `app` object directly, not a running server — right now
   `server/index.js` does both setup and `app.listen()` in one file. Split it:
   - Move everything up to (but not including) `app.listen(...)` into a new `server/app.js`,
     ending with `export default app;`
   - `server/index.js` becomes just:
     ```js
     import app from './app.js';
     const PORT = process.env.PORT || 5000;
     app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
     ```
   This is a real structural change — test it still boots correctly with `npm run dev`
   before moving on, don't just assume the split worked.

## Part 4 — GitHub Actions CI, so this can't be skipped by accident

6. Create `.github/workflows/test.yml` at the repo root:
   ```yaml
   name: Run Tests

   on:
     pull_request:
       branches: [main]

   jobs:
     test:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-node@v4
           with:
             node-version: 20
         - run: cd server && npm install
         - run: cd server && npm test
           env:
             TEST_MONGO_URI: ${{ secrets.TEST_MONGO_URI }}
             JWT_SECRET: ${{ secrets.JWT_SECRET }}
   ```
   You'll need to add `TEST_MONGO_URI` and `JWT_SECRET` as repo secrets on GitHub (Settings
   → Secrets and variables → Actions) — use a **separate test cluster or database**, not
   your team's real one.

7. Go to GitHub → Settings → Branches → edit the branch protection rule on `main` (or
   create one if it still doesn't exist) → enable "Require status checks to pass before
   merging" → select the new test workflow. This is what makes the direct-push problem
   structurally harder to repeat, not just against the rules.

## Part 5 — write up what's next, honestly

8. Update `TESTING.md` to reflect what's actually done vs. still a plan:
   ```markdown
   ## Status
   - Auth route tests: done (register, login — success + failure cases)
   - Device route tests: not yet written — next priority
   - QR/scan tests: not yet written
   - Frontend tests: still deprioritized, per original plan
   ```

9. Commit, push, PR, get reviewed (ironically, this PR itself can't use the new CI check
   yet, since it's the PR that creates it — that's expected, not a bug):
   ```bash
   git add .
   git commit -m "test: add vitest + supertest, real auth tests, CI enforcement on main"
   git push origin feature/test-suite
   ```

## Handoff — what you tell the team when done
Post: "Real tests exist now (auth route coverage), CI runs them on every PR, and `main` is
now blocked from merging anything that fails them. `server/app.js` was extracted from
`index.js` — heads up if you're mid-branch on something touching that file, you'll want to
rebase."

## Done when
- [ ] `vitest` + `supertest` installed and configured
- [ ] `app.js` extracted, `index.js` confirmed still boots correctly
- [ ] Real auth tests written and passing locally (`npm test`)
- [ ] GitHub Actions workflow runs tests on every PR
- [ ] Branch protection requires the test check to pass before merge
- [ ] `TESTING.md` updated to reflect real status, not just a plan
- [ ] PR opened, reviewed, and merged into `main`
