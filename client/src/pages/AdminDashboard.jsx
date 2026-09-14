import { useState, useEffect } from 'react';
   import { getAllDevices, getAllScanLogs } from '../api/deviceApi';

   function AdminDashboard() {
     const [devices, setDevices] = useState([]);
     const [logs, setLogs] = useState([]);
     const [error, setError] = useState('');
     const [tab, setTab] = useState('devices');

     useEffect(() => {
       Promise.all([getAllDevices(), getAllScanLogs()])
         .then(([deviceData, logData]) => {
           setDevices(deviceData);
           setLogs(logData);
         })
         .catch((err) => setError(err.response?.data?.error || 'Could not load dashboard data'));
     }, []);

     return (
       <div className="p-8 max-w-2xl mx-auto">
         <h1 className="text-xl mb-4">Admin Dashboard</h1>
         {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

         <div className="mb-4">
           <button className={`p-2 mr-2 ${tab === 'devices' ? 'bg-black text-white' : 'border'}`} onClick={() => setTab('devices')}>
             Devices ({devices.length})
           </button>
           <button className={`p-2 ${tab === 'logs' ? 'bg-black text-white' : 'border'}`} onClick={() => setTab('logs')}>
             Scan History ({logs.length})
           </button>
         </div>

         {tab === 'devices' && (
           <ul>
             {devices.map((d) => (
               <li key={d._id} className="border p-2 mb-2 text-sm">
                 <p className="font-bold">{d.deviceName} — {d.serialNumber}</p>
                 <p>Owner: {d.owner?.name} ({d.owner?.email})</p>
                 <p>Status: {d.status} · Last seen: {d.lastLocation}</p>
               </li>
             ))}
           </ul>
         )}

         {tab === 'logs' && (
           <ul>
             {logs.map((log) => (
               <li key={log._id} className="border p-2 mb-2 text-sm">
                 <p>{log.device?.deviceName} — {log.action} at {log.location}</p>
                 <p className="text-xs">{log.device?.owner?.name} · {new Date(log.createdAt).toLocaleString()}</p>
               </li>
             ))}
           </ul>
         )}
       </div>
     );
   }

   export default AdminDashboard;