import dotenv from "dotenv";
   import mongoose from "mongoose";
   import request from "supertest";
   import { afterAll, beforeAll, describe, expect, it } from "vitest";
   import app from "../app.js";

   dotenv.config();

   const TEST_MONGO_URI = process.env.TEST_MONGO_URI;

   function assertSafeTestDatabase() {
     if (!TEST_MONGO_URI) {
       throw new Error(
         "TEST_MONGO_URI is required to run the device tests. " +
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
   assertSafeTestDatabase();

   let studentToken, supervisorToken, adminToken, studentId, deviceId;

   beforeAll(async () => {
     process.env.JWT_SECRET = process.env.JWT_SECRET || "auth-test-secret";
     await mongoose.connect(TEST_MONGO_URI, { serverSelectionTimeoutMS: 15000 });

     const student = await request(app).post("/api/auth/register").send({
       name: "Device Test Student",
       email: "devicetest-student@example.com",
       password: "testpass123",
       role: "student",
     });
     studentId = student.body.id;

     await request(app).post("/api/auth/register").send({
       name: "Device Test Supervisor",
       email: "devicetest-supervisor@example.com",
       password: "testpass123",
       role: "hostelSupervisor",
     });
     await request(app).post("/api/auth/register").send({
       name: "Device Test Admin",
       email: "devicetest-admin@example.com",
       password: "testpass123",
       role: "admin",
     });

     studentToken = (
       await request(app).post("/api/auth/login").send({
         email: "devicetest-student@example.com",
         password: "testpass123",
       })
       
     ).body.token;
     supervisorToken = (
       await request(app).post("/api/auth/login").send({
         email: "devicetest-supervisor@example.com",
         password: "testpass123",
       })
     ).body.token;
     adminToken = (
       await request(app).post("/api/auth/login").send({
         email: "devicetest-admin@example.com",
         password: "testpass123",
       })
     ).body.token;
   }, 30000);

   afterAll(async () => {
     await mongoose.connection.dropDatabase();
     await mongoose.connection.close();
   });

   describe("POST /api/devices", () => {
     it("allows a supervisor to register a device", async () => {
       const res = await request(app)
         .post("/api/devices")
         .set("Authorization", `Bearer ${supervisorToken}`)
         .send({
           deviceName: "Test Laptop",
           serialNumber: "SN-TEST-001",
           studentEmail: "devicetest-student@example.com",
         });
       expect(res.status).toBe(201);
       deviceId = res.body._id;
     });

     it("rejects a student trying to register a device (role check)", async () => {
       const res = await request(app)
         .post("/api/devices")
         .set("Authorization", `Bearer ${studentToken}`)
         .send({
           deviceName: "Sneaky Laptop",
           serialNumber: "SN-TEST-002",
           studentEmail: "devicetest-student@example.com",
         });
       expect(res.status).toBe(403);
     });

     it("rejects a duplicate serial number", async () => {
       const res = await request(app)
         .post("/api/devices")
         .set("Authorization", `Bearer ${supervisorToken}`)
         .send({
           deviceName: "Duplicate",
           serialNumber: "SN-TEST-001",
           studentEmail: "devicetest-student@example.com",
         });
       expect(res.status).toBe(409);
     });

     it("rejects registration for a non-existent student email", async () => {
       const res = await request(app)
         .post("/api/devices")
         .set("Authorization", `Bearer ${supervisorToken}`)
         .send({
           deviceName: "Orphan Laptop",
           serialNumber: "SN-TEST-003",
           studentEmail: "no-such-student@example.com",
         });
       expect(res.status).toBe(404);
     });

     it("rejects missing fields", async () => {
       const res = await request(app)
         .post("/api/devices")
         .set("Authorization", `Bearer ${supervisorToken}`)
         .send({ deviceName: "Incomplete" });
       expect(res.status).toBe(400);
     });
   });

   describe("GET /api/devices/mine", () => {
     it("returns only the logged-in student's own devices", async () => {
       const res = await request(app)
         .get("/api/devices/mine")
         .set("Authorization", `Bearer ${studentToken}`);
       expect(res.status).toBe(200);
       expect(
         res.body.every((d) => d.owner === studentId || d.owner?._id === studentId)
       ).toBe(true);
       expect(res.body.length).toBeGreaterThan(0);
     });
   });

   describe("GET /api/devices (admin list)", () => {
     it("returns a paginated shape for admin", async () => {
       const res = await request(app)
         .get("/api/devices")
         .set("Authorization", `Bearer ${adminToken}`);
       expect(res.status).toBe(200);
       expect(res.body).toHaveProperty("devices");
       expect(res.body).toHaveProperty("total");
       expect(res.body).toHaveProperty("page");
       expect(res.body).toHaveProperty("pages");
     });

     it("rejects a non-admin (student and supervisor both)", async () => {
       const studentRes = await request(app)
         .get("/api/devices")
         .set("Authorization", `Bearer ${studentToken}`);
       expect(studentRes.status).toBe(403);

       const supervisorRes = await request(app)
         .get("/api/devices")
         .set("Authorization", `Bearer ${supervisorToken}`);
       expect(supervisorRes.status).toBe(403);
     });
   });

   describe("PATCH /api/devices/:deviceId", () => {
     it("allows the owning student to update their own device", async () => {
       const res = await request(app)
         .patch(`/api/devices/${deviceId}`)
         .set("Authorization", `Bearer ${studentToken}`)
         .send({ deviceName: "Renamed Laptop" });
       expect(res.status).toBe(200);
       expect(res.body.deviceName).toBe("Renamed Laptop");
     });

     it("rejects a different student updating a device they don't own", async () => {
       const other = await request(app).post("/api/auth/register").send({
         name: "Other Student",
         email: "devicetest-other@example.com",
         password: "testpass123",
         role: "student",
       });
       const otherLogin = await request(app).post("/api/auth/login").send({
         email: "devicetest-other@example.com",
         password: "testpass123",
       });
       const res = await request(app)
         .patch(`/api/devices/${deviceId}`)
         .set("Authorization", `Bearer ${otherLogin.body.token}`)
         .send({ deviceName: "Hijacked" });
       expect(res.status).toBe(403);
     });
   });

   describe("DELETE /api/devices/:deviceId", () => {
     it("rejects a non-admin", async () => {
       const res = await request(app)
         .delete(`/api/devices/${deviceId}`)
         .set("Authorization", `Bearer ${studentToken}`);
       expect(res.status).toBe(403);
     });

     it("allows an admin to delete a device", async () => {
       const res = await request(app)
         .delete(`/api/devices/${deviceId}`)
         .set("Authorization", `Bearer ${adminToken}`);
       expect(res.status).toBe(200);
     });

     it("returns 404 deleting an already-deleted device", async () => {
       const res = await request(app)
         .delete(`/api/devices/${deviceId}`)
         .set("Authorization", `Bearer ${adminToken}`);
       expect(res.status).toBe(404);
     });
   });

