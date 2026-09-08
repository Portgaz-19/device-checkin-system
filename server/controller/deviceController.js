import Device from "../models/Device.js";
import ScanLog from "../models/ScanLog.js";
import User from "../models/User.js";

export async function registerDevice(req, res) {
  try {
    const { deviceName, serialNumber, studentEmail } = req.body;
    if (!deviceName || !serialNumber || !studentEmail) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const student = await User.findOne({
      email: studentEmail,
      role: "student",
    });
    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    const existing = await Device.findOne({ serialNumber });
    if (existing) {
      return res
        .status(409)
        .json({ error: "Device with this serial number already exists" });
    }

    const device = await Device.create({
      deviceName,
      serialNumber,
      owner: student._id,
      registeredBy: req.user.id,
    });

    res.status(201).json(device);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getMyDevices(req, res) {
  try {
    const devices = await Device.find({ owner: req.user.id });
    res.json(devices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getAllDevices(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [devices, total] = await Promise.all([
      Device.find()
        .populate("owner", "name email")
        .populate("registeredBy", "name email")
        .skip(skip)
        .limit(limit),
      Device.countDocuments(),
    ]);
    res.json({ devices, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getAllScanLogs(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      ScanLog.find()
        .populate({
          path: "device",
          populate: { path: "owner", select: "name email" },
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      ScanLog.countDocuments(),
    ]);
    res.json({ logs, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getDeviceScanHistory(req, res) {
  try {
    const logs = await ScanLog.find({ device: req.params.deviceId }).sort({
      createdAt: -1,
    });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function updateDevice(req, res) {
  try {
    const { deviceName, lastLocation, status } = req.body;
    const device = await Device.findById(req.params.deviceId);
    if (!device) return res.status(404).json({ error: "Device not found" });

    // Students can only update their own device; supervisors/admins can update any
    const isOwner = device.owner.toString() === req.user.id;
    const isPrivileged = ["hostelSupervisor", "admin"].includes(req.user.role);
    if (!isOwner && !isPrivileged) {
      return res
        .status(403)
        .json({ error: "Not authorized to update this device" });
    }

    if (deviceName) device.deviceName = deviceName;
    if (lastLocation) device.lastLocation = lastLocation;
    if (status) device.status = status;
    await device.save();
    res.json(device);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function deleteDevice(req, res) {
  try {
    const device = await Device.findByIdAndDelete(req.params.deviceId);
    if (!device) {
      return res.status(404).json({ error: "Device not found" });
    }

    res.json({ message: "Device deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
