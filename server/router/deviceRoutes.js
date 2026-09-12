import express from 'express';
import { registerDevice, getMyDevices, getAllDevices, getAllScanLogs, getDeviceScanHistory, updateDevice, deleteDevice } from '../controller/deviceController.js';
import { verifyToken, requireRole } from '../middleware/verifyToken.js';

const deviceRoutes = express.Router();

deviceRoutes.post('/', verifyToken, requireRole('hostelSupervisor', 'admin'), registerDevice);
deviceRoutes.get('/mine', verifyToken, getMyDevices);
deviceRoutes.get('/', verifyToken, requireRole('admin'), getAllDevices);
deviceRoutes.get('/scanlogs', verifyToken, requireRole('admin'), getAllScanLogs);
deviceRoutes.get('/:deviceId/scanlogs', verifyToken, requireRole('admin'), getDeviceScanHistory);
deviceRoutes.patch('/:deviceId', verifyToken, updateDevice);
deviceRoutes.delete('/:deviceId', verifyToken, requireRole('admin'), deleteDevice);

export default deviceRoutes;