# Using VerifyGate

A walkthrough of the app as each role actually experiences it. For architecture/API
details see the [project overview](../architecture/overview.md) and
[API reference](../reference/api.md).

## Setup

```bash
cd server && npm install
cd client && npm install
```

Create `server/.env` (not committed — see the root `README.md`) with:

```
PORT=5000
MONGO_URI=<your MongoDB connection string>
JWT_SECRET=<any long random string>
```

Run both halves, each in its own terminal:

```bash
cd server && npm run dev
```
```bash
cd client && npm run dev
```

Client runs at `http://localhost:5173`, server at `http://localhost:5000`.

## As a Student

1. Go to `/register`, create an account with role **Student**.
2. Log in at `/login`.
3. `/devices/mine` lists your registered devices and their current status.
4. **Generating a QR code is not available in the app yet** — [tracked in #22](https://github.com/Portgaz-19/device-checkin-system/issues/22). The backend endpoint (`GET /api/qr/generate`) works, but there's no button for it yet.

## As a Hostel Supervisor

1. Register with role **Hostel Supervisor**, log in.
2. Go to `/devices/register` and fill in the device name, serial number, and the student's email (the student account must already exist).

## As Security

No account needed — go straight to `/scan`. It opens your camera; point it at a student's QR. On a successful read, every device that student owns flips status (checked-in ↔ checked-out) and the location you select is recorded.

## As an Admin

1. Register with role **Admin**, log in.
2. `/admin` shows two tabs: every registered device (with owner and current status), and the full scan history.

## Known gaps

See [known gaps](../planning/known-gaps.md) for the full list. The one that
affects actually using the app today: no UI to generate a student's QR code
([#22](https://github.com/Portgaz-19/device-checkin-system/issues/22)).
