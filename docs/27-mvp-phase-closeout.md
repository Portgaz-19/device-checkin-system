# Task 27: Close-Out — Core Loop Complete
**Owner: Person A**
**Repo:** https://github.com/Portgaz-19/device-checkin-system

## Before you start — sync check
Wait for Tasks 24, 25, and 26 to all merge.

## Why this task exists
Once this merges, every role in the original design has a working, real path through the
app: Student registers/generates QR, Hostel Supervisor registers devices, Security scans
with a real camera, Admin sees the dashboard. This is the actual MVP checkpoint — worth
verifying properly, not just assuming it holds together.

## Steps

1. Pull latest `main`, run the full stack.

2. Walk through the **entire loop by hand, as four different people would**:
   - Register a Hostel Supervisor account, log in, register a device to a real student
   - Register that student, log in, generate a QR (visually confirm it renders)
   - Open `/scan` in a separate browser/device, scan that QR with a real camera, confirm
     the device status flips
   - Register an Admin account, log in, check `/admin` shows both the device and the scan
     that just happened

3. Confirm no leftover debug code anywhere (this exact class of bug has happened twice
   already — the empty test route, and the `_debugToken` field during Task 22's testing):
   ```bash
   grep -rn "_debug\|console.log" server/ client/src --include="*.js" --include="*.jsx" | grep -v node_modules
   ```
   Review each hit — some `console.log` in error handlers might be intentional, use
   judgment, but anything clearly left over from testing should be removed via a quick PR.

4. Clean up merged branches, confirm no new secrets in history (same pattern as every prior
   close-out).

5. Update the Projects board — mark the core loop complete, add cards for what's left
   before a real deployable MVP: actual tests, actual deployment, any UX polish the team
   wants before showing this to someone outside the team.

## Handoff — what you tell the team when done
Post: "Core loop confirmed working end-to-end, all four roles have a real working path
through the app. What's left before a shippable MVP: real tests, live deployment, polish."

## Done when
- [ ] Full four-role walkthrough completed by hand, not assumed from code review
- [ ] No leftover debug code found, or found and fixed
- [ ] Stale branches cleaned, no new secrets
- [ ] Projects board reflects reality
- [ ] Greenlight posted
