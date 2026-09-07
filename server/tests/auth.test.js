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