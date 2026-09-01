import express from "express";
import { generateQr, resolveScan } from "../controller/qrController.js";
import { verifyToken } from "../middleware/verifyToken.js";

const qrRoutes = express.Router();

// Student must be logged in to generate their own QR
qrRoutes.get("/generate", verifyToken, generateQr);

// No verifyToken here on purpose — Security has no account, per the original design.
// The security of this endpoint comes entirely from the short-lived signed token itself,
// not from a login check.
qrRoutes.post("/scan", resolveScan);

export default qrRoutes;
