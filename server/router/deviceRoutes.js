 import express from 'express';
   import { registerDevice, getMyDevices, getAllDevices } from '../controller/deviceController.js';
   import { verifyToken, requireRole } from '../middleware/verifyToken.js';

   const deviceRoutes = express.Router();

   deviceRoutes.post('/', verifyToken, requireRole('hostelSupervisor', 'admin'), registerDevice);
   deviceRoutes.get('/mine', verifyToken, getMyDevices);
   deviceRoutes.get('/', verifyToken, requireRole('admin'), getAllDevices);

   export default deviceRoutes;