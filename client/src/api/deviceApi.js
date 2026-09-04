import api from "./axiosInstance";

export async function registerDevice(deviceData) {
  const res = await api.post("/devices", deviceData);
  return res.data;
}

export async function getMyDevices() {
  const res = await api.get("/devices/mine");
  return res.data;
}

export async function getAllDevices() {
  const res = await api.get("/devices");
  return res.data;
}
   export async function getAllScanLogs() {
     const res = await api.get('/devices/scanlogs');
     return res.data;
   }
