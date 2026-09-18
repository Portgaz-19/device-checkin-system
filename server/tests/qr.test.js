import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import app from "../app.js";
import Device from "../models/Device.js";

dotenv.config();

const TEST_MONGO_URI = process.env.TEST_MONGO_URI;

function assertSafeTestDatabase() {
  if (!TEST_MONGO_URI) {
    throw new Error("TEST_MONGO_URI is required to run the qr tests.");
  }

  if (process.env.MONGO_URI && TEST_MONGO_URI === process.env.MONGO_URI) {
    throw new Error("TEST_MONGO_URI must be isolated from MONGO_URI.");
  }
}

assertSafeTestDatabase();

const QR_TEST_MONGO_URI = TEST_MONGO_URI;

let studentToken;
let studentId;
let supervisorToken;

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || "auth-test-secret";

  await mongoose.connect(QR_TEST_MONGO_URI, {
    serverSelectionTimeoutMS: 15000,
  });

  const student = await request(app).post("/api/auth/register").send({
    name: "QR Test Student",
    email: "qrtest-student@example.com",
    password: "testpass123",
    role: "student",
  });

  studentId = student.body.id;

  studentToken = (
    await request(app).post("/api/auth/login").send({
      email: "qrtest-student@example.com",
      password: "testpass123",
    })
  ).body.token;

  await request(app).post("/api/auth/register").send({
    name: "QR Test Supervisor",
    email: "qrtest-supervisor@example.com",
    password: "testpass123",
    role: "hostelSupervisor",
  });

  supervisorToken = (
    await request(app).post("/api/auth/login").send({
      email: "qrtest-supervisor@example.com",
      password: "testpass123",
    })
  ).body.token;

  await request(app)
    .post("/api/devices")
    .set("Authorization", `Bearer ${supervisorToken}`)
    .send({
      deviceName: "QR Test Laptop",
      serialNumber: "SN-QR-001",
      studentEmail: "qrtest-student@example.com",
    });

  await request(app)
    .post("/api/devices")
    .set("Authorization", `Bearer ${supervisorToken}`)
    .send({
      deviceName: "QR Test Phone",
      serialNumber: "SN-QR-002",
      studentEmail: "qrtest-student@example.com",
    });

  await request(app)
    .post("/api/devices")
    .set("Authorization", `Bearer ${supervisorToken}`)
    .send({
      deviceName: "QR Test Tablet",
      serialNumber: "SN-QR-003",
      studentEmail: "qrtest-student@example.com",
    });
}, 30000);

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

describe("GET /api/qr/generate", () => {
  it("returns a QR image for a logged-in student", async () => {
    const res = await request(app)
      .get("/api/qr/generate")
      .set("Authorization", `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.qrImage).toMatch(/^data:image\/png;base64,/);
    expect(res.body.expiresIn).toBe(300);
  });

  it("rejects with no token", async () => {
    const res = await request(app).get("/api/qr/generate");

    expect(res.status).toBe(401);
  });
});

describe("POST /api/qr/scan", () => {
  it("resolves a valid token and flips all of the student's devices", async () => {
    const beforeDevices = await Device.find({ owner: studentId });

    const scanToken = jwt.sign({ studentId }, process.env.JWT_SECRET, {
      expiresIn: "5m",
    });

    const res = await request(app).post("/api/qr/scan").send({
      token: scanToken,
      location: "Main Gate",
    });

    expect(res.status).toBe(200);
    expect(res.body.devices).toHaveLength(3);

    for (const before of beforeDevices) {
      const updated = res.body.devices.find(
        (device) => device.serialNumber === before.serialNumber,
      );

      expect(updated).toBeDefined();
      expect(updated.status).not.toBe(before.status);
      expect(updated.lastLocation).toBe("Main Gate");
    }
  });

  it("checks in or out only the selected devices", async () => {
    const beforeSelected = await Device.findOne({
      serialNumber: "SN-QR-002",
    });

    const beforeUnselected = await Device.findOne({
      serialNumber: "SN-QR-003",
    });

    const scanToken = jwt.sign({ studentId }, process.env.JWT_SECRET, {
      expiresIn: "5m",
    });

    const res = await request(app)
      .post("/api/qr/scan")
      .send({
        token: scanToken,
        location: "Hostel Gate",
        serialNumbers: ["SN-QR-002"],
      });

    expect(res.status).toBe(200);
    expect(res.body.devices).toHaveLength(1);
    expect(res.body.devices[0].serialNumber).toBe("SN-QR-002");

    const selectedAfter = await Device.findOne({
      serialNumber: "SN-QR-002",
    });

    const unselectedAfter = await Device.findOne({
      serialNumber: "SN-QR-003",
    });

    expect(selectedAfter.status).not.toBe(beforeSelected.status);
    expect(selectedAfter.lastLocation).toBe("Hostel Gate");

    expect(unselectedAfter.status).toBe(beforeUnselected.status);
    expect(unselectedAfter.lastLocation).toBe(beforeUnselected.lastLocation);
  });

  it("rejects serialNumbers when it is not an array", async () => {
    const scanToken = jwt.sign({ studentId }, process.env.JWT_SECRET, {
      expiresIn: "5m",
    });

    const res = await request(app).post("/api/qr/scan").send({
      token: scanToken,
      location: "Main Gate",
      serialNumbers: "SN-QR-001",
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("serialNumbers must be an array");
  });

  it("rejects a garbage token cleanly", async () => {
    const res = await request(app).post("/api/qr/scan").send({
      token: "not-a-real-token",
      location: "Main Gate",
    });

    expect(res.status).toBe(401);
  });

  it("rejects an expired token", async () => {
    const expiredToken = jwt.sign({ studentId }, process.env.JWT_SECRET, {
      expiresIn: "-1s",
    });

    const res = await request(app).post("/api/qr/scan").send({
      token: expiredToken,
      location: "Main Gate",
    });

    expect(res.status).toBe(401);
  });

  it("rejects a missing location", async () => {
    const scanToken = jwt.sign({ studentId }, process.env.JWT_SECRET, {
      expiresIn: "5m",
    });

    const res = await request(app).post("/api/qr/scan").send({
      token: scanToken,
    });

    expect(res.status).toBe(400);
  });

  it("returns 404 for a student with no devices", async () => {
    const emptyStudent = await request(app).post("/api/auth/register").send({
      name: "No Devices Student",
      email: "qrtest-nodevices@example.com",
      password: "testpass123",
      role: "student",
    });

    const scanToken = jwt.sign(
      { studentId: emptyStudent.body.id },
      process.env.JWT_SECRET,
      { expiresIn: "5m" },
    );

    const res = await request(app).post("/api/qr/scan").send({
      token: scanToken,
      location: "Main Gate",
    });

    expect(res.status).toBe(404);
  });
});
