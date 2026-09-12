# API Reference

## Auth (`/api/auth`)

| Method | Path      | Auth         | Description           |
| ------ | --------- | ------------ | --------------------- |
| POST   | /register | None         | Create an account     |
| POST   | /login    | None         | Get a JWT             |
| GET    | /me       | Bearer token | Get current user info |

## Devices (`/api/devices`)

| Method | Path                | Auth                            | Description                   |
| ------ | ------------------- | ------------------------------- | ----------------------------- |
| POST   | /                   | hostelSupervisor, admin         | Register a device             |
| GET    | /mine               | Any logged-in user              | Get your own devices          |
| GET    | /                   | admin                           | Get all devices (paginated)   |
| PATCH  | /:deviceId          | Owner or hostelSupervisor/admin | Update a device               |
| DELETE | /:deviceId          | admin                           | Delete a device               |
| GET    | /scanlogs           | admin                           | Get all scan logs (paginated) |
| GET    | /:deviceId/scanlogs | admin                           | Get one device's scan history |

## QR (`/api/qr`)

| Method | Path      | Auth                                        | Description               |
| ------ | --------- | ------------------------------------------- | ------------------------- |
| GET    | /generate | Bearer token (student)                      | Generate a short-lived QR |
| POST   | /scan     | None (matches Security's no-account design) | Resolve a scan            |
