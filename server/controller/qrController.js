import jwt from "jsonwebtoken";
import QRCode from "qrcode";
import Device from "../models/Device.js";
import ScanLog from "../models/ScanLog.js";

export async function generateQr(req, res) {
  try {
    // Short-lived on purpose — this is what stops an old QR from being replayed later.
    // 5 minutes is a starting point; revisit with the team if that's too tight in practice.
    const token = jwt.sign({ studentId: req.user.id }, process.env.JWT_SECRET, {
      expiresIn: "5m",
    });

    const qrImage = await QRCode.toDataURL(token);

    res.json({ qrImage, expiresIn: 300 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function resolveScan(req, res) {
  try {
    const { token, location } = req.body;
    if (!token || !location) {
      return res.status(400).json({ error: "Missing token or location" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res
        .status(401)
        .json({ error: "QR code is invalid or has expired" });
    }

    const devices = await Device.find({ owner: decoded.studentId });
    if (devices.length === 0) {
      return res
        .status(404)
        .json({ error: "No devices found for this student" });
    }

    // Flip each device's status and log the scan — this is deliberately simple: every
    // device tied to the student flips together on one scan, matching the original
    // design (one QR shows the whole list, security checks the physical devices
    // against it). If the team later wants per-device scanning instead of all-at-once,
    // this loop is the place to change.
    const updated = [];
    for (const device of devices) {
      const newStatus =
        device.status === "checked-in" ? "checked-out" : "checked-in";
      device.status = newStatus;
      device.lastLocation = location;
      await device.save();

      await ScanLog.create({ device: device._id, location, action: newStatus });
      updated.push(device);
    }

    res.json({ devices: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
