# Backend Structure Convention

This document defines the standard structure for the backend. New backend features should follow this structure consistently.

## Folder Structure

```text
server/
├── models/
├── controller/
├── router/
├── middleware/
├── index.js
└── ARCHITECTURE.md
```

## `server/models/`

* Contains Mongoose schemas/models only.
* Use one file per model.
* Models should be default-exported.
* Models define the structure and database behavior of application data.

Example:

```js
const User = mongoose.model("User", userSchema);

export default User;
```

---

## `server/controller/`

* Contains request handlers and business logic.
* Use named exports.
* Keep one main function per route action, such as `register`, `login`, `getUser`, or `createDevice`.
* Controllers handle the application logic required to process requests.
* Controllers should not define Express routes or `Router()` instances.

Example:

```js
export async function login(req, res) {
  // Business logic
}
```

---

## `server/router/`

* Contains Express `Router()` instances.
* Maps HTTP methods and URL paths to controller functions.
* Contains routing/wiring only.
* No business logic should be placed here.

Example:

```js
import express from "express";
import { login, register } from "../controller/authController.js";

const authRoutes = express.Router();

authRoutes.post("/login", login);
authRoutes.post("/register", register);

export default authRoutes;
```

---

## `server/middleware/`

* Contains reusable Express middleware.
* Examples include authentication checks, error handling, and request logging.
* Middleware should be exported as named functions where appropriate.
* Middleware should be reusable across multiple routes when possible.

Examples:

```text
middleware/
├── verifyToken.js
└── errorHandler.js
```

---

## `server/index.js`

`index.js` is responsible for application setup only.

It should contain:

* Express application initialization.
* Environment/configuration setup.
* Global middleware registration.
* Security and request-logging middleware.
* Router mounting.
* Database connection.
* Server startup.

`index.js` should **not** contain:

* Business logic.
* Full controller implementations.
* Route handlers defined inline, except temporary development/testing routes that are removed before merging.

The centralized error handler must be registered after all application routes:

```js
app.use(errorHandler);
```

---

## Naming Convention

The project intentionally uses singular folder names:

```text
controller/
router/
middleware/
model/
```

Do not rename these folders to:

```text
controllers/
routers/
middlewares/
models/
```

unless the team explicitly agrees to change the project-wide convention.

The existing convention should be maintained to avoid inconsistent imports and merge conflicts.

---

## Adding a New Feature

New backend features should follow this general structure:

```text
1. Create a model if the feature requires new database data.
             ↓
2. Create a controller for the feature's business logic.
             ↓
3. Create a router for the feature's HTTP endpoints.
             ↓
4. Add reusable middleware if the feature requires it.
             ↓
5. Mount the router in index.js.
```

For example, a new device feature could look like:

```text
server/
├── models/
│   └── Device.js
├── controller/
│   └── deviceController.js
├── router/
│   └── deviceRoutes.js
├── middleware/
│   └── verifyToken.js
└── index.js
```

The router would connect HTTP requests to controller functions, while the controller would contain the business logic.

## Core Middleware

The backend uses the following core middleware:

* `helmet` — adds sensible security-related HTTP headers.
* `morgan` — logs HTTP requests during development/debugging.
* `express-rate-limit` — limits requests to authentication routes to reduce brute-force attempts.
* `errorHandler` — provides centralized handling for errors that reach the end of the middleware chain.

These middleware components should be registered consistently in `server/index.js`.

## General Rule

Keep responsibilities separated:

```text
Model       → Database structure
Controller  → Business logic
Router      → HTTP route wiring
Middleware  → Reusable request/response processing
index.js    → Application setup
```

When adding a new backend feature, follow this structure even for small features so that the codebase remains predictable and maintainable.
