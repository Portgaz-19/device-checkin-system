# Task 43 — CI-flaky server tests: run Vitest files sequentially

## Background

CI (GitHub Actions) intermittently failed `server/tests/auth.test.js` even though
the file is byte-identical to `main`, while `device.test.js`/`qr.test.js` had
already been given their own derived DBs (`_device`/`_qr`) to stop cross-file
races. Failures only reproduced in CI against the remote `TEST_MONGO_URI`,
never locally against localhost MongoDB — the signature of Vitest's default
file-level parallelism (test files run concurrently in separate workers) racing
against real network latency. Symptoms: wrong user counts, documents vanishing
mid-test, `TypeError: Invalid URL` from an undefined `devOnlyResetLink`.

## Change

Added `server/vitest.config.js`:

```js
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    fileParallelism: false,
  },
});
```

`fileParallelism: false` makes Vitest run the three test files sequentially,
removing the entire class of cross-file races by construction. No test file
content, `authController.js`, or any other server code was touched.

## Validation

- `TEST_MONGO_URI=mongodb://127.0.0.1:27017/device_checkin_test npm test` in
  `server/` → **Test Files 3 passed, Tests 53 passed (53)**.

## Notes / differences from spec

- None. Spec asked only for the config file; exactly that was added.
- Cost: suite takes ~6s locally; sequential file execution is negligible for
  a 3-file suite. If the suite grows large enough to need parallelism again,
  re-enable and fix the isolation mechanism instead (e.g., unique derived DB
  per file for auth.test.js like the others).