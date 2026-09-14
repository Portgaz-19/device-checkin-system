# Repository workflow for coding agents

Task specifications live at the repository root as `<number>-<topic>.md`.
Persistent repository knowledge lives in `docs/agent-context.md`; completed
task records live in `docs/agent-task-history/`.

## Before making changes

1. Read `docs/agent-context.md` completely.
2. Read the current task specification completely.
3. Inspect `git status`, the active branch, and relevant recent commits.
4. Inspect only the files directly affected by the task, plus files needed to
   verify that the context is still accurate. Search for exact symbols before
   widening the inspection.

The context is a map, not a substitute for verification. When documentation
and code disagree, trust the code, correct the context, and record the
discrepancy in the task history.

## While implementing

- Preserve established response contracts, module boundaries, and security
  conventions unless the task explicitly requires a compatible change.
- Do not scan generated files, dependency directories, build output, or `.git`
  without a concrete reason.
- Do not overwrite unrelated changes, reset/clean the worktree, use production
  data for destructive tests, or commit secrets.
- Use the existing isolated test database mechanism for tests that modify data.

## Before handing off a task

1. Run proportionate tests, lint, build, and startup checks; investigate real
   failures rather than changing expectations to silence them.
2. Update `docs/agent-context.md` with durable architecture or contract
   knowledge. Replace stale statements instead of appending contradictions.
3. Create or update `docs/agent-task-history/<number>-<topic>.md` with what
   changed, validation results, decisions, limitations, and any differences
   from the specification.
4. Report only actions actually completed; clearly identify external or manual
   work still required.
