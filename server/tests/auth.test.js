import bcrypt from "bcrypt";
import crypto from "crypto";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import app from "../app.js";
import User from "../models/User.js";

dotenv.config();

const TEST_MONGO_URI = process.env.TEST_MONGO_URI;

function assertSafeTestDatabase() {
  if (!TEST_MONGO_URI) {
    throw new Error(
      "TEST_MONGO_URI is required to run the auth tests. " +
        "Refusing to run against the application database."
    );
  }
  if (process.env.MONGO_URI && TEST_MONGO_URI === process.env.MONGO_URI) {
    throw new Error(
      "TEST_MONGO_URI must point at an isolated test database, not the " +
        "application MONGO_URI. Refusing to run destructive tests."
    );
  }
}

// Fail fast at import time, before any hooks run, so a missing TEST_MONGO_URI
// produces one clear error instead of a misleading hook timeout.
assertSafeTestDatabase();

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || "auth-test-secret";
  // Bound server selection so an unreachable TEST_MONGO_URI reports the real
  // Mongo error instead of hitting Vitest's default 10s hook timeout.
  await mongoose.connect(TEST_MONGO_URI, { serverSelectionTimeoutMS: 15000 });
}, 30000);

beforeEach(async () => {
  await User.deleteMany({});
});

afterAll(async () => {
  // Only touch the database if this suite actually connected to it.
  if (mongoose.connection.readyState === 1) {
    await User.deleteMany({});
    await mongoose.disconnect();
  }
});

describe("POST /api/auth/register", () => {
  const validUser = {
    name: "Ada Student",
    email: "ada@test.example",
    password: "hunter2-secret",
    role: "student",
  };

  it("registers a valid user and never exposes the password hash", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send(validUser)
      .expect(201);

    expect(res.body).toEqual({
      id: expect.any(String),
      email: validUser.email,
      role: "student",
    });
    expect(res.body).not.toHaveProperty("passwordHash");
    expect(res.body).not.toHaveProperty("password");
    expect(JSON.stringify(res.body)).not.toContain(validUser.password);

    const saved = await User.findById(res.body.id);
    expect(saved).not.toBeNull();
    expect(saved.passwordHash).not.toBe(validUser.password);
    expect(saved.passwordHash).toMatch(/^\$2[aby]\$/);
  });

  it("normalizes the email to lowercase", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...validUser, email: "Ada@TEST.Example" })
      .expect(201);

    expect(res.body.email).toBe("ada@test.example");
  });

  it("rejects a duplicate email with 409", async () => {
    await request(app).post("/api/auth/register").send(validUser).expect(201);

    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...validUser, name: "Another Student" })
      .expect(409);

    expect(res.body.error).toBe("Email already registered");
  });

  it.each([
    ["name"],
    ["email"],
    ["password"],
    ["role"],
  ])("rejects a missing %s field with 400", async (missing) => {
    const { [missing]: _omitted, ...rest } = validUser;

    const res = await request(app)
      .post("/api/auth/register")
      .send(rest)
      .expect(400);

    expect(res.body.error).toBe("Missing required fields");
  });

  it("rejects an invalid role without creating a user", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...validUser, role: "superadmin" });

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(await User.countDocuments({})).toBe(0);
  });

  it("does not create a user when registration is rejected", async () => {
    await request(app)
      .post("/api/auth/register")
      .send({ ...validUser, password: undefined });

    expect(await User.countDocuments({})).toBe(0);
  });
});

describe("POST /api/auth/login", () => {
  const validUser = {
    name: "Ada Student",
    email: "ada@test.example",
    password: "hunter2-secret",
    role: "student",
  };

  it("returns a valid JWT and role for correct credentials", async () => {
    await request(app).post("/api/auth/register").send(validUser).expect(201);

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: validUser.email, password: validUser.password })
      .expect(200);

    expect(res.body.role).toBe("student");
    expect(typeof res.body.token).toBe("string");

    const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET);
    expect(decoded.role).toBe("student");
    expect(decoded.id).toEqual(expect.any(String));
  });

  it("rejects an invalid password with 401", async () => {
    await request(app).post("/api/auth/register").send(validUser).expect(201);

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: validUser.email, password: "wrong-password" })
      .expect(401);

    expect(res.body.error).toBe("Invalid credentials");
  });

  it("rejects an unknown email with 401", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "nobody@test.example", password: "whatever" })
      .expect(401);

    expect(res.body.error).toBe("Invalid credentials");
  });
});

describe("GET /api/auth/me", () => {
  it("returns the current user for a valid token", async () => {
    const register = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Ada Student",
        email: "ada@test.example",
        password: "hunter2-secret",
        role: "student",
      })
      .expect(201);

    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: "ada@test.example", password: "hunter2-secret" })
      .expect(200);

    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${login.body.token}`)
      .expect(200);

    expect(res.body.id).toBe(register.body.id);
    expect(res.body.role).toBe("student");
  });

  it("rejects a request without a token with 401", async () => {
    const res = await request(app).get("/api/auth/me").expect(401);

    expect(res.body.error).toBe("No token provided");
  });
});

describe("POST /api/auth/forgot-password", () => {
  const validUser = {
    name: "Ada Student",
    email: "ada@test.example",
    password: "hunter2-secret",
    role: "student",
  };

  const genericMessage =
    "If an account exists for this email, a reset link has been generated.";

  it("returns the generic message and a dev-only reset link for an existing account", async () => {
    await request(app).post("/api/auth/register").send(validUser).expect(201);

    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: validUser.email })
      .expect(200);

    expect(res.body.message).toBe(genericMessage);
    expect(res.body.devOnlyResetLink).toMatch(/\/reset-password\?token=/);
  });

  it("normalizes the email before looking up the account", async () => {
    await request(app).post("/api/auth/register").send(validUser).expect(201);

    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "ADA@TEST.EXAMPLE" })
      .expect(200);

    expect(res.body.devOnlyResetLink).toBeTruthy();
  });

  it("returns the same generic message, with no link, for an unknown email", async () => {
    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "nobody@test.example" })
      .expect(200);

    expect(res.body).toEqual({ message: genericMessage });
  });

  it("returns the generic message when no email is provided", async () => {
    await request(app).post("/api/auth/register").send(validUser).expect(201);

    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({})
      .expect(200);

    expect(res.body).toEqual({ message: genericMessage });
  });

  it("does not return the dev-only reset link when NODE_ENV is production or staging", async () => {
    await request(app).post("/api/auth/register").send(validUser).expect(201);

    const originalNodeEnv = process.env.NODE_ENV;
    try {
      for (const env of ["production", "staging"]) {
        process.env.NODE_ENV = env;
        const res = await request(app)
          .post("/api/auth/forgot-password")
          .send({ email: validUser.email })
          .expect(200);

        expect(res.body).toEqual({ message: genericMessage });
        expect(res.body.devOnlyResetLink).toBeUndefined();
      }
    } finally {
      process.env.NODE_ENV = originalNodeEnv;
    }
  });

  it("rejects a non-string email with 400 instead of a 500", async () => {
    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: { nested: true } })
      .expect(400);

    expect(res.body.error).toBe("email must be a string");
  });

  it("stores only a hash of the reset token, never the raw token", async () => {
    await request(app).post("/api/auth/register").send(validUser).expect(201);

    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: validUser.email })
      .expect(200);

    const rawToken = new URL(res.body.devOnlyResetLink).searchParams.get("token");
    const saved = await User.findOne({ email: validUser.email });

    expect(rawToken).toBeTruthy();
    expect(saved.resetPasswordTokenHash).toBeTruthy();
    expect(saved.resetPasswordTokenHash).not.toBe(rawToken);
    expect(saved.resetPasswordTokenHash).toBe(
      crypto.createHash("sha256").update(rawToken).digest("hex"),
    );
    expect(saved.resetPasswordExpires).toBeInstanceOf(Date);
  });
});

describe("POST /api/auth/reset-password", () => {
  const validUser = {
    name: "Ada Student",
    email: "ada@test.example",
    password: "hunter2-secret",
    role: "student",
  };

  async function registerAndRequestReset() {
    await request(app).post("/api/auth/register").send(validUser).expect(201);

    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: validUser.email })
      .expect(200);

    return new URL(res.body.devOnlyResetLink).searchParams.get("token");
  }

  it("resets the password with a valid token and clears the token fields", async () => {
    const token = await registerAndRequestReset();

    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ token, newPassword: "brand-new-password" })
      .expect(200);

    expect(res.body.message).toBe(
      "Password reset successfully. You can now log in.",
    );

    const saved = await User.findOne({ email: validUser.email });
    expect(saved.passwordHash).toBeTruthy();
    expect(saved.resetPasswordTokenHash).toBeFalsy();
    expect(saved.resetPasswordExpires).toBeFalsy();
  });

  it("allows login with the new password and rejects the old one", async () => {
    const token = await registerAndRequestReset();

    await request(app)
      .post("/api/auth/reset-password")
      .send({ token, newPassword: "brand-new-password" })
      .expect(200);

    await request(app)
      .post("/api/auth/login")
      .send({ email: validUser.email, password: "brand-new-password" })
      .expect(200);

    await request(app)
      .post("/api/auth/login")
      .send({ email: validUser.email, password: validUser.password })
      .expect(401);
  });

  it("rejects a reused token after a successful reset", async () => {
    const token = await registerAndRequestReset();

    await request(app)
      .post("/api/auth/reset-password")
      .send({ token, newPassword: "brand-new-password" })
      .expect(200);

    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ token, newPassword: "another-new-password" })
      .expect(400);

    expect(res.body.error).toBe("Reset link is invalid or has expired");
  });

  it("rejects an expired token and leaves the password unchanged", async () => {
    const token = await registerAndRequestReset();
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    await User.updateOne(
      { email: validUser.email },
      { $set: { resetPasswordTokenHash: tokenHash, resetPasswordExpires: Date.now() - 1000 } },
    );

    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ token, newPassword: "brand-new-password" })
      .expect(400);

    expect(res.body.error).toBe("Reset link is invalid or has expired");

    const saved = await User.findOne({ email: validUser.email });
    expect(await bcrypt.compare(validUser.password, saved.passwordHash)).toBe(
      true,
    );
  });

  it("rejects an invalid token", async () => {
    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: "not-a-real-token", newPassword: "brand-new-password" })
      .expect(400);

    expect(res.body.error).toBe("Reset link is invalid or has expired");
  });

  it("rejects a missing token with 400", async () => {
    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ newPassword: "brand-new-password" })
      .expect(400);

    expect(res.body.error).toBe("Missing token or new password");
  });

  it("rejects a missing new password with 400", async () => {
    const token = await registerAndRequestReset();

    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ token })
      .expect(400);

    expect(res.body.error).toBe("Missing token or new password");
  });

  it("rejects a non-string token with 400 instead of 500", async () => {
    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: { nested: true }, newPassword: "brand-new-password" })
      .expect(400);

    expect(res.body.error).toBe("Missing token or new password");
  });

  it("rejects a non-string newPassword with 400 instead of 500", async () => {
    const token = await registerAndRequestReset();

    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ token, newPassword: { nested: true } })
      .expect(400);

    expect(res.body.error).toBe("Missing token or new password");
  });

  it("rejects a new password shorter than six characters", async () => {
    const token = await registerAndRequestReset();

    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ token, newPassword: "short" })
      .expect(400);

    expect(res.body.error).toBe("Password must be at least 6 characters");

    const saved = await User.findOne({ email: validUser.email });
    expect(await bcrypt.compare(validUser.password, saved.passwordHash)).toBe(true);
  });

  it("accepts a new password of exactly six characters", async () => {
    const token = await registerAndRequestReset();

    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ token, newPassword: "abc123" })
      .expect(200);

    expect(res.body.message).toBe("Password reset successfully. You can now log in.");
  });

  it("consumes the token atomically so concurrent resets cannot both succeed", async () => {
    const token = await registerAndRequestReset();

    const [first, second] = await Promise.all([
      request(app)
        .post("/api/auth/reset-password")
        .send({ token, newPassword: "concurrent-pass-1" }),
      request(app)
        .post("/api/auth/reset-password")
        .send({ token, newPassword: "concurrent-pass-2" }),
    ]);

    const statuses = [first.status, second.status].sort((a, b) => a - b);
    expect(statuses).toEqual([200, 400]);

    const winner = first.status === 200 ? first : second;
    expect(winner.body.message).toBe("Password reset successfully. You can now log in.");

    const saved = await User.findOne({ email: validUser.email });
    expect(saved.resetPasswordTokenHash).toBeFalsy();
    expect(saved.resetPasswordExpires).toBeFalsy();
  });
  async function registerAndRequestReset() {
  console.log("1. Starting register");

  const registerRes = await request(app)
    .post("/api/auth/register")
    .send(validUser);

  console.log("2. Register finished:", registerRes.status);

  const res = await request(app)
    .post("/api/auth/forgot-password")
    .send({ email: validUser.email });

  console.log("3. Forgot-password finished:", res.status);

  console.log("4. Response body:", res.body);

  const token = new URL(res.body.devOnlyResetLink)
    .searchParams
    .get("token");

  console.log("5. Token extracted:", !!token);

  return token;
}
});