# API Reference

Base URL: `VITE_API_URL`, falling back to `http://localhost:5000/api` in local
development. See [known gaps](../planning/known-gaps.md) for deployment work
that remains.

All bodies are JSON. Protected routes require `Authorization: Bearer <token>`.

## Auth — `/api/auth` (rate-limited: 20 req/15min)

### `POST /api/auth/register`
Body: `{ name, email, password, role, studentId? }` — `role` is one of `student`, `hostelSupervisor`, `admin`.
- `201` → `{ id, email, role }`
- `400` missing required field
- `409` email already registered

### `POST /api/auth/login`
Body: `{ email, password }`
- `200` → `{ token, role }` — JWT payload is `{ id, role }`, expires in 2h
- `401` invalid credentials

### `POST /api/auth/forgot-password`
Body: `{ email }`
- `200` → `{ message }` for every request, so the message itself does not
  disclose whether an account exists.
- The temporary `devOnlyResetLink` is returned for an existing account only
  when `NODE_ENV` is explicitly `development` or `test`. It is suppressed in
  production, staging, and unset environments. Replace it with email delivery
  before release.
- `400` → `{ error: "email must be a string" }` for malformed email values.

### `POST /api/auth/reset-password`
Body: `{ token, newPassword }`
- `200` → `{ message: "Password reset successfully. You can now log in." }`
- `400` → `{ error: "Missing token or new password" }` when either field is
  absent.
- `400` → `{ error: "Password must be at least 6 characters" }` when the
  new password is too short.
- `400` → `{ error: "Reset link is invalid or has expired" }` for invalid,
  expired, or already-used tokens.
- Tokens expire after 30 minutes and are atomically single-use. `token` and
  `newPassword` must be strings.

### `GET /api/auth/me` — requires token
- `200` → `{ id, role }` decoded from the token

## Devices — `/api/devices`

### `POST /api/devices` — requires token, role `hostelSupervisor` or `admin`
Body: `{ deviceName, serialNumber, studentEmail }`
- `201` → created `Device`
- `400` missing required field
- `404` no student with that email
- `409` serial number already registered

### `GET /api/devices/mine` — requires token (any role)
- `200` → array of `Device` owned by the caller

### `GET /api/devices` — requires token, role `admin`
- `200` → array of every `Device`, `owner` and `registeredBy` populated with `{ name, email }`

## QR — `/api/qr`

### `GET /api/qr/generate` — requires token (student)
- `200` → `{ qrImage, expiresIn: 300 }` — `qrImage` is a data-URL PNG encoding a second JWT `{ studentId }`, 5-minute expiry (separate from the login token)

### `POST /api/qr/scan` — no auth (Security has no account; security comes from the short-lived token itself)
Body: `{ token, location }`
- `200` → `{ devices }` — every device owned by the token's student, all flipped `checked-in` ↔ `checked-out`, `lastLocation` updated, one `ScanLog` row written per device
- `400` missing token or location
- `401` token invalid or expired
- `404` student has no devices

## Misc

### `GET /api/health`
- `200` → `{ status: "ok" }`

## Error shape

Every error response is `{ error: "<message>" }`. Most controllers pass
`err.message` straight through — see [known gaps](../planning/known-gaps.md)
for why that is flagged, not fixed.
