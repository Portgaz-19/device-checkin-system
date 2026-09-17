# Task 41: Error-Message Hygiene, .env.example, Repo Cleanup
**Owner: unassigned**
**Repo:** https://github.com/Portgaz-19/device-checkin-system

## Before you start — sync check
No dependency on Tasks 37-40. Small, self-contained, safe to run in parallel with any of
them.

## Why this task exists
Three small but real items, verified directly against `main`, not from stale docs:

1. **Every controller's `catch` block returns raw `err.message` to the client**
   (`res.status(500).json({ error: err.message })`, repeated across `authController.js`
   and `deviceController.js`; `errorHandler.js` does the same as the last-resort handler).
   In practice this can leak internal detail — a Mongoose validation message, a stray
   stack detail, whatever the underlying error object happens to say — straight to the
   HTTP response. Every other error path in this codebase (bad login, missing fields,
   expired tokens) already returns a deliberately-written, generic message; the 500 path
   is the one place that doesn't.
2. **No `.env.example` exists anywhere in the repo.** Anyone cloning it has to reverse-
   engineer required env vars (`MONGO_URI`, `JWT_SECRET`, `FRONTEND_URL`,
   `TEST_MONGO_URI`, `VITE_API_URL`) from reading the source. `README.md` already lists
   these in prose but there's no copy-pasteable file.
3. **`.gitignore` still has the duplicated negation line** — `!client/src/assets/*.png`
   appears twice. Harmless but sloppy; was flagged once already in an earlier review pass
   that never actually landed a fix for it.

## Part 1 — stop leaking raw error messages

1. Pull latest `main`, branch:
   ```bash
   git checkout main
   git pull origin main
   git checkout -b chore/error-hygiene-env-example
   ```

2. Update `server/middleware/errorHandler.js` to only send `err.message` to the client
   when the error explicitly opted in (has a `status` set below 500, i.e. it's a deliberate
   client-facing error, not an unexpected server fault), and log the full detail server-side
   either way:
   ```js
   export function errorHandler(err, req, res, next) {
     console.error(err.stack);
     const status = err.status || 500;
     const message =
       status < 500 && err.message ? err.message : "Internal server error";
     res.status(status).json({ error: message });
   }
   ```

3. In `server/controller/authController.js` and `server/controller/deviceController.js`,
   change every `catch (err) { res.status(500).json({ error: err.message }); }` to log the
   real error and return a generic message instead:
   ```js
   } catch (err) {
     console.error(err);
     res.status(500).json({ error: "Something went wrong. Please try again." });
   }
   ```
   Do this consistently across every occurrence in both files — there are several in each
   (register, login, forgotPassword, resetPassword in `authController.js`; registerDevice,
   getMyDevices, getAllDevices, getAllScanLogs, getDeviceScanHistory, updateDevice,
   deleteDevice in `deviceController.js`). Leave every other status code's message
   untouched — the 400/401/403/404/409 responses in these files are already deliberately
   written and client-safe; this task only touches the 500 paths.

4. Check `server/controller/qrController.js` for the same pattern and apply the same fix
   if present.

## Part 2 — add `.env.example`

5. Create `.env.example` at the repo root (or `server/.env.example` if that's where the
   real `.env` actually lives — check `server/index.js`'s `dotenv.config()` call and the
   existing `.gitignore` entries to confirm which location the app actually reads from
   before deciding):
   ```
   MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<dbname>
   JWT_SECRET=replace-with-a-long-random-string
   FRONTEND_URL=http://localhost:5173
   NODE_ENV=development
   TEST_MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<dbname>-test
   ```
   And for the client, `client/.env.example`:
   ```
   VITE_API_URL=http://localhost:5000/api
   ```
   Confirm both lists against what the code actually reads (`process.env.X` in `server/`,
   `import.meta.env.VITE_X` in `client/`) rather than copying this list blind — add or
   remove entries to match reality.

6. Add a line to `README.md`'s setup section pointing to `.env.example` as the starting
   point for local setup.

## Part 3 — .gitignore dedup

7. Remove the duplicate `!client/src/assets/*.png` line from `.gitignore` — it currently
   appears twice with an identical adjacent copy; keep one.

## Steps to finish

8. Run the full test suite to confirm the error-handling change didn't break any existing
   test that asserts on a specific `err.message` string passed through a 500 path:
   ```bash
   cd server
   npm test
   ```
   If any test currently asserts on a raw internal error message from a 500 response,
   that assertion needs updating to match the new generic message — that's expected, not
   a sign this task went wrong.

9. Commit, push, PR, get reviewed:
   ```bash
   git add .
   git commit -m "chore: stop leaking raw error messages, add .env.example, dedupe .gitignore"
   git push origin chore/error-hygiene-env-example
   ```

## Handoff — what you tell the team when done
Post: "500 responses across auth and device routes no longer leak raw internal error
messages to the client — they log server-side and return a generic message instead.
Deliberate 4xx messages are untouched. Added `.env.example` for both `server/` and
`client/` so new setups don't have to reverse-engineer required env vars from source.
Also cleaned up the duplicate `.gitignore` line."

## Done when
- [ ] `errorHandler.js` only passes through `err.message` for sub-500 status codes
- [ ] Every 500-path `catch` block in `authController.js` and `deviceController.js`
      (and `qrController.js` if applicable) logs the real error and returns a generic
      client-facing message
- [ ] No existing 4xx error message changed
- [ ] `.env.example` (server) and `client/.env.example` created, matching actual env vars
      read by the code
- [ ] `README.md` points to `.env.example`
- [ ] `.gitignore` duplicate line removed
- [ ] Full test suite still passes
- [ ] PR opened, reviewed, passes CI, merged into `main`
