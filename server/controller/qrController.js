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
    console.error(err);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
}

export async function resolveScan(req, res) {
  try {
    const { token, location, serialNumbers } = req.body;

    if (!token || !location) {
      return res.status(400).json({ error: "Missing token or location" });
    }

    if (serialNumbers !== undefined && !Array.isArray(serialNumbers)) {
      return res.status(400).json({ error: "serialNumbers must be an array" });
    }

    let decoded;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res
        .status(401)
        .json({ error: "QR code is invalid or has expired" });
    }

    const deviceQuery = {
      owner: decoded.studentId,
    };

    if (serialNumbers && serialNumbers.length > 0) {
      deviceQuery.serialNumber = { $in: serialNumbers };
    }

    const devices = await Device.find(deviceQuery);

    if (devices.length === 0) {
      return res
        .status(404)
        .json({ error: "No devices found for this student" });
    }

    // Flip each selected device's status and log the scan.
    const updated = [];

    for (const device of devices) {
      const newStatus =
        device.status === "checked-in" ? "checked-out" : "checked-in";

      device.status = newStatus;
      device.lastLocation = location;

      await device.save();

      await ScanLog.create({
        device: device._id,
        location,
        action: newStatus,
      });

      updated.push(device);
    }

    res.json({ devices: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
}
