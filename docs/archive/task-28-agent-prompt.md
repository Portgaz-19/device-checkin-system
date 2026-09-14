You are working inside an existing codebase. Your job is to first understand the project deeply enough to make safe, architecture-consistent changes, then fully execute the task described in:

`28-test-suite-ci (1).md`

Also read this project context document before changing anything:

`docs/project-context (9).md`

Treat the task file as the implementation objective, but do NOT blindly copy snippets from it if the actual repository structure, API response shapes, authentication implementation, environment setup, or existing conventions differ.

## Phase 1 — Gain context before editing

Inspect the repository thoroughly enough to understand the parts affected by this task.

At minimum, inspect:

- repository root structure
- `server/`
- `server/package.json`
- `server/index.js`
- Express app/bootstrap configuration
- auth routes
- auth controllers/services
- user model/schema
- authentication middleware
- validation middleware/schemas
- database connection/configuration
- environment-variable handling
- error handling
- existing test-related files
- `TESTING.md`
- `.github/`
- `.gitignore`
- `docs/project-context (9).md`
- any other files directly involved in registration/login

Determine the actual:

- auth endpoint paths
- request payload shapes
- response body shapes
- expected HTTP status codes
- JWT/token behavior
- user roles
- MongoDB connection lifecycle
- application startup lifecycle
- module system in use
- Node version expectations
- existing architectural conventions

Do not modify code until you understand these.

## Phase 2 — Compare the task specification with reality

Read `28-test-suite-ci (1).md` completely.

Then compare every requested change against the current codebase.

Explicitly identify internally:

### Assumptions
Things the task file assumes about the repository.

### Inferences
Things you determine from inspecting the actual implementation.

### Conflicts
Anything where the task document's sample code does not match the current application.

Examples could include:

- response is `{ success, data: ... }` rather than a flat object
- registration returns `200` instead of `201`
- authentication uses cookies instead of `res.body.token`
- route prefixes differ
- database connection already happens in another module
- `index.js` imports configuration with side effects
- the app already exists in a separate file
- role names differ
- validation rules require additional fields

When the task specification and real code disagree, preserve the application's intended behavior unless the task explicitly requires changing it.

Tests should test the real API contract, not an outdated example.

## Phase 3 — Implement Task 28

Complete the task end-to-end.

### 1. Testing dependencies

Inside the server package, add:

- `vitest`
- `supertest`

as development dependencies.

Add or update the test script so:

`npm test`

runs the test suite non-interactively using Vitest.

Prefer the repository's existing package manager and lockfile. Do not switch package managers.

### 2. Make the Express application testable

Supertest must be able to import the Express application without binding a TCP port.

Refactor application startup cleanly.

The desired separation is conceptually:

`app.js`
- creates/configures Express
- installs middleware
- mounts routes
- installs error handlers
- exports the Express app
- does NOT call `listen()`

`index.js`
- performs runtime startup as appropriate
- starts the HTTP server

Do not blindly move everything from `index.js`.

Pay attention to:

- dotenv/config initialization
- database startup
- middleware ordering
- WebSocket/server initialization if present
- scheduled jobs
- startup side effects
- graceful shutdown
- anything that should happen only in production/runtime and not during tests

Preserve existing application behavior.

After the refactor, verify that the normal server can still boot.

### 3. Create real authentication tests

Create an auth integration/route test suite using:

- Vitest
- Supertest
- a separate MongoDB test database

Never run destructive test cleanup against the production/development database.

Use `TEST_MONGO_URI`.

Tests must adapt to the actual application contract discovered earlier.

At minimum cover:

Registration:
- valid registration succeeds
- duplicate email is rejected
- missing/invalid required fields are rejected
- sensitive fields such as password hashes are never exposed

Login:
- valid credentials succeed
- invalid password is rejected
- expected authentication material is returned/set according to the real implementation

If the application uses:

- access tokens
- refresh cookies
- wrapped response objects
- email normalization
- verification state
- role constraints
- token rotation

then assert against the real behavior rather than the simplified task example.

Make tests isolated and deterministic.

Use suitable setup/teardown.

Ensure tests clean up their own test database state.

Add safeguards so the test suite refuses to perform destructive database operations if `TEST_MONGO_URI` is missing or obviously points to the normal application database.

Do not weaken production security merely to make tests pass.

### 4. Database lifecycle

Inspect how MongoDB is currently initialized.

Avoid creating multiple conflicting Mongoose connections.

Make the minimum architectural adjustment necessary so:

- production/dev startup still connects normally
- tests can connect to `TEST_MONGO_URI`
- importing the Express app does not unexpectedly connect to production infrastructure
- test teardown can close cleanly

Prefer dependency/config separation over hacks.

### 5. GitHub Actions

Create:

`.github/workflows/test.yml`

The workflow should run for pull requests targeting `main`.

It should:

- check out the repository
- set up the correct Node version
- install dependencies reproducibly
- run the server test suite
- supply required secrets/environment variables

Prefer `npm ci` instead of `npm install` if a valid lockfile exists.

Use:

- `TEST_MONGO_URI`
- `JWT_SECRET`

and any additional environment variables genuinely required by the test environment.

Do not include real secret values in the repository.

### 6. Update TESTING.md

Update `TESTING.md` so it accurately describes what now exists.

Do not claim coverage that does not exist.

At minimum distinguish:

- auth route tests: implemented
- device route tests: not yet implemented unless you actually implement them
- QR/scan tests: not yet implemented unless already present
- frontend tests: current actual status

Preserve useful existing documentation rather than replacing the file unnecessarily.

### 7. Validate everything

Run the relevant checks yourself.

At minimum run:

- the test suite
- server startup/boot validation
- any existing lint/typecheck checks relevant to modified files, if available

Do not stop after writing code.

If tests fail:

1. investigate the failure,
2. determine whether the implementation or test assumption is wrong,
3. fix the correct thing,
4. rerun the tests.

Do not change expected values merely to silence legitimate failures.

## Phase 4 — Git/GitHub actions you can and cannot perform

Inspect current git status before making changes.

Do not overwrite unrelated user work.

Do not reset, clean, force checkout, or discard modifications you did not create.

If currently on `main` and the working tree permits it, create/use:

`feature/test-suite`

Do not merge into `main` yourself unless explicitly instructed and permitted.

If you have GitHub access and permissions, you may:

- push the feature branch
- create the PR

Branch protection configuration is a repository-level GitHub setting and may require permissions unavailable from the local codebase.

If you cannot configure:

“Require status checks to pass before merging”

do NOT pretend it is complete.

Instead report the exact manual step remaining:

GitHub → Settings → Branches / Rulesets → protection for `main` → require the new test workflow/status check before merge.

Similarly, if repository secrets cannot be configured programmatically, explicitly report that these must be added:

- `TEST_MONGO_URI`
- `JWT_SECRET`
- any other genuinely required test secret

Never print secret values.

## Constraints

- Do not invent APIs or response formats.
- Do not rewrite unrelated code.
- Do not perform broad refactors unrelated to Task 28.
- Do not change authentication behavior merely to match the task-file example.
- Do not use the normal production/development MongoDB for destructive tests.
- Do not commit secrets.
- Do not suppress failing tests without understanding them.
- Do not claim GitHub configuration is complete unless you actually performed it.
- Preserve existing architecture and conventions where reasonable.
- Prefer small, reviewable changes.

## Definition of done

The coding portion is complete when:

- Vitest and Supertest are installed/configured
- the Express app can be imported without starting a listening server
- normal server startup still works
- real auth integration tests exist
- auth tests pass locally
- tests use an isolated test database
- GitHub Actions runs the test suite on PRs to `main`
- `TESTING.md` reflects reality
- no production secrets are committed
- the diff contains no unrelated destructive changes

GitHub-side work is only complete if:

- required Actions secrets exist
- the workflow has successfully run
- branch protection/ruleset requires the test status check
- PR is opened/reviewed/merged if access permits those actions

## Final response

When finished, give me a concise engineering handoff containing:

1. **What you changed**
   - files added
   - files modified
   - architectural changes

2. **Tests**
   - exact test cases added
   - command used
   - pass/fail result

3. **Validation**
   - server boot result
   - other checks run

4. **Assumptions / Inferences**
   - especially differences between the task document and actual repository

5. **Concerns**
   - technical risks or follow-up work

6. **Manual GitHub steps remaining**
   - secrets
   - branch protection
   - PR/review/merge, only if not completed

7. **Git status**
   - branch
   - commits made, if any
   - whether pushed
   - PR URL, if created

Also show a short `git diff --stat`-style summary of the final changes.

Do not just tell me what should be done. Execute everything available to you in the repository/environment, validate it, and report only the genuinely unavailable external/manual steps.