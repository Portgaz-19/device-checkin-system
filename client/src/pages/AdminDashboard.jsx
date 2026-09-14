import { useState, useEffect } from "react";
import { getAllDevices, getAllScanLogs } from "../api/deviceApi";

function AdminDashboard() {
  const [devices, setDevices] = useState([]);
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("devices");
  const [search, setSearch] = useState("");

  useEffect(() => {
    Promise.all([getAllDevices(), getAllScanLogs()])
      .then(([deviceData, logData]) => {
        setDevices(deviceData);
        setLogs(logData);
      })
      .catch((err) =>
        setError(err.response?.data?.error || "Could not load dashboard data"),
      );
  }, []);

  const filteredDevices = devices.filter((d) => {
    const q = search.toLowerCase();

    return (
      d.deviceName?.toLowerCase().includes(q) ||
      d.serialNumber?.toLowerCase().includes(q) ||
      d.owner?.name?.toLowerCase().includes(q) ||
      d.owner?.email?.toLowerCase().includes(q)
    );
  });

  function exportLogsToCSV(logs) {
    const header = "Device,Action,Location,Owner,Timestamp\n";

    const rows = logs
      .map((log) =>
        [
          log.device?.deviceName || "",
          log.action || "",
          log.location || "",
          log.device?.owner?.name || "",
          log.createdAt ? new Date(log.createdAt).toISOString() : "",
        ]
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(","),
      )
      .join("\n");

    const blob = new Blob([header + rows], {
      type: "text/csv",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = "scan-logs.csv";
    a.click();

    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-xl mb-4">Admin Dashboard</h1>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      <div className="mb-4">
        <button
          className={`p-2 mr-2 ${
            tab === "devices" ? "bg-black text-white" : "border"
          }`}
          onClick={() => setTab("devices")}
        >
          Devices ({devices.length})
        </button>

        <button
          className={`p-2 ${tab === "logs" ? "bg-black text-white" : "border"}`}
          onClick={() => setTab("logs")}
        >
          Scan History ({logs.length})
        </button>
      </div>

      {tab === "devices" && (
        <>
          <input
            className="border p-2 w-full mb-4"
            placeholder="Search by name, serial, or owner..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <ul>
            {filteredDevices.map((d) => (
              <li key={d._id} className="border p-2 mb-2 text-sm">
                <p className="font-bold">
                  {d.deviceName} — {d.serialNumber}
                </p>

                <p>
                  Owner: {d.owner?.name} ({d.owner?.email})
                </p>

                <p>
                  Status: {d.status} · Last seen: {d.lastLocation}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}

      {tab === "logs" && (
        <>
          <button
            onClick={() => exportLogsToCSV(logs)}
            className="border p-2 mb-4"
          >
            Export CSV
          </button>

          <ul>
            {logs.map((log) => (
              <li key={log._id} className="border p-2 mb-2 text-sm">
                <p>
                  {log.device?.deviceName} — {log.action} at {log.location}
                </p>

                <p className="text-xs">
                  {log.device?.owner?.name} ·{" "}
                  {new Date(log.createdAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export default AdminDashboard;
