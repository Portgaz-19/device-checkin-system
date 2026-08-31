import { useState, useEffect } from "react";
import { getMyDevices } from "../api/deviceApi";

function MyDevices() {
  const [devices, setDevices] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    getMyDevices()
      .then(setDevices)
      .catch((err) =>
        setError(err.response?.data?.error || "Could not load devices"),
      );
  }, []);

  return (
    <div className="p-8 max-w-md mx-auto">
      <h1 className="text-xl mb-4">My Devices</h1>
      {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
      {devices.length === 0 && !error && (
        <p className="text-sm">No devices registered yet.</p>
      )}
      <ul>
        {devices.map((d) => (
          <li key={d._id} className="border p-2 mb-2">
            <p className="font-bold">{d.deviceName}</p>
            <p className="text-sm">Serial: {d.serialNumber}</p>
            <p className="text-sm">Status: {d.status}</p>
            <p className="text-sm">Last location: {d.lastLocation}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default MyDevices;
