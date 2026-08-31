import Device from '../models/Device.js';
   import User from '../models/User.js';

   export async function registerDevice(req, res) {
     try {
       const { deviceName, serialNumber, studentEmail } = req.body;
       if (!deviceName || !serialNumber || !studentEmail) {
         return res.status(400).json({ error: 'Missing required fields' });
       }

       const student = await User.findOne({ email: studentEmail, role: 'student' });
       if (!student) {
         return res.status(404).json({ error: 'Student not found' });
       }

       const existing = await Device.findOne({ serialNumber });
       if (existing) {
         return res.status(409).json({ error: 'Device with this serial number already exists' });
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
       const devices = await Device.find().populate('owner', 'name email').populate('registeredBy', 'name email');
       res.json(devices);
     } catch (err) {
       res.status(500).json({ error: err.message });
     }
   }