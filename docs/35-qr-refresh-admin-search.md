# Task 35: QR Refresh UX + Admin Search/Filter/Export
**Owner: You**
**Repo:** https://github.com/Portgaz-19/device-checkin-system

## Before you start — sync check
Wait for Task 32's Part 1 (`App.jsx` fix) to merge — this touches `ScannerPage`-adjacent
frontend code and the Admin dashboard, both cleaner to build on the fixed base.

## Why this task exists
A generated QR expires in 5 minutes with no way to get a new one without re-navigating away
and back. Separately, the Admin dashboard currently shows a flat paginated list with no way
to search for a specific student/device or export data — fine for a handful of records,
not for real ongoing use.

## Part 1 — QR regenerate button, with a visible countdown

1. Pull latest `main` (after Task 32 merges), branch:
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/qr-refresh-admin-search
   ```

2. Find wherever the frontend currently displays the generated QR (if this doesn't exist
   yet as a dedicated page, create `client/src/pages/MyQrCode.jsx` — check first whether
   students currently have any UI for this at all, since `/api/qr/generate` was built in
   Task 22 but may not have a frontend page wired to it yet):
   ```jsx
   import { useState, useEffect, useCallback } from 'react';
   import api from '../api/axiosInstance';

   function MyQrCode() {
     const [qrImage, setQrImage] = useState(null);
     const [secondsLeft, setSecondsLeft] = useState(0);
     const [error, setError] = useState('');

     const generate = useCallback(async () => {
       setError('');
       try {
         const res = await api.get('/qr/generate');
         setQrImage(res.data.qrImage);
         setSecondsLeft(res.data.expiresIn);
       } catch (err) {
         setError(err.response?.data?.error || 'Could not generate QR code');
       }
     }, []);

     useEffect(() => { generate(); }, [generate]);

     useEffect(() => {
       if (secondsLeft <= 0) return;
       const timer = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
       return () => clearInterval(timer);
     }, [secondsLeft]);

     return (
       <div className="p-8 max-w-sm mx-auto text-center">
         <h1 className="text-xl mb-4">My QR Code</h1>
         {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
         {qrImage && <img src={qrImage} alt="Your QR code" className="mx-auto mb-4" />}
         <p className="text-sm mb-4">
           {secondsLeft > 0 ? `Expires in ${secondsLeft}s` : 'Expired'}
         </p>
         <button onClick={generate} className="bg-black text-white p-2 w-full">
           Generate New Code
         </button>
       </div>
     );
   }

   export default MyQrCode;
   ```

3. Wire it into `App.jsx` behind `ProtectedRoute`, e.g. `/devices/qr`, and add a link to it
   in the `Navbar` for the student role (coordinate with whoever's on Task 34 if it's
   landed by the time you get here, to avoid two people editing `Navbar.jsx` at once).

## Part 2 — search on the admin dashboard

4. Add a search input to `AdminDashboard.jsx` that filters the currently-loaded page of
   devices by name, serial number, or owner name/email (client-side filtering of the
   current page is fine for now — a real server-side search endpoint is a larger change,
   worth a separate task if the team wants it later):
   ```jsx
   const [search, setSearch] = useState('');

   const filteredDevices = devices.filter((d) => {
     const q = search.toLowerCase();
     return (
       d.deviceName?.toLowerCase().includes(q) ||
       d.serialNumber?.toLowerCase().includes(q) ||
       d.owner?.name?.toLowerCase().includes(q) ||
       d.owner?.email?.toLowerCase().includes(q)
     );
   });
   ```
   Add the input above the device list:
   ```jsx
   <input
     className="border p-2 w-full mb-4"
     placeholder="Search by name, serial, or owner..."
     value={search}
     onChange={(e) => setSearch(e.target.value)}
   />
   ```
   Render `filteredDevices` instead of `devices` in the list below.

## Part 3 — CSV export of scan logs

5. Add an export button that turns the currently-loaded scan logs into a downloadable CSV
   — no new library needed, this is small enough to do by hand:
   ```jsx
   function exportLogsToCSV(logs) {
     const header = 'Device,Action,Location,Owner,Timestamp\n';
     const rows = logs.map((log) =>
       [
         log.device?.deviceName || '',
         log.action,
         log.location,
         log.device?.owner?.name || '',
         new Date(log.createdAt).toISOString(),
       ].join(',')
     ).join('\n');

     const blob = new Blob([header + rows], { type: 'text/csv' });
     const url = URL.createObjectURL(blob);
     const a = document.createElement('a');
     a.href = url;
     a.download = 'scan-logs.csv';
     a.click();
     URL.revokeObjectURL(url);
   }
   ```
   Add a button in the scan-history tab: `<button onClick={() => exportLogsToCSV(logs)}>Export CSV</button>`.
   Note this only exports the currently-loaded page, same limitation as the search above —
   worth flagging in your PR as a known scope limit, not silently presenting it as a full
   export.

## Steps to finish

6. Test all three: generate a QR and confirm the countdown/regenerate button work; search
   the admin device list and confirm filtering works with partial matches; export scan logs
   and confirm the downloaded CSV opens correctly in a spreadsheet app with real data in it.

7. Commit, push, PR, get reviewed:
   ```bash
   git add .
   git commit -m "feat: QR regenerate UX with countdown, admin search, scan log CSV export"
   git push origin feature/qr-refresh-admin-search
   ```

## Handoff — what you tell the team when done
Post: "Students can now see a countdown and regenerate their QR without navigating away.
Admin dashboard has search and CSV export for scan logs — both currently scoped to the
loaded page, server-side search/export across all data is a good next task if the team
wants it."

## Done when
- [ ] QR page shows a live countdown and a working regenerate button
- [ ] Admin device search filters correctly by name, serial, or owner
- [ ] CSV export produces a valid, openable file with real data
- [ ] Known scope limits (current-page-only) flagged in the PR, not silently shipped as if
      complete
- [ ] PR opened, reviewed, passes CI, and merged into `main`
