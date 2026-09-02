import { useState, useRef, useEffect } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import api from "../api/axiosInstance";

function ScannerPage() {
    const [result, setResult] = useState(null);
    const [location, setLocation] = useState('Main Gate');
    const scannerRef = useRef(null);

    useEffect(() => {
        const scanner = new Html5QrcodeScanner('qr-reader', {fps: 10, qrbox: 250});
        scannerRef.current = scanner;

        scanner.render(
            async (decodedText) => {
                //Stop scanning immediately after a successful read — prevents the same QR firing this callback repeatedly while still in camera view.
                await scanner.clear();
                try {
                    const res = await api.post('/qr/scan', { token: decodedText, location });
                    setResult({ success: true, devices: res.data.devices });
                }
                catch(err) {
                    setResult({ success: false, error: err.response?.data?.error || 'Scan failed' });
                }
            },
            (scanError) => {
                //Fires continuously while no QR is in view — this is normal, not an error to show
            }
        );

        return () => {
            scannerRef.current?.clear().catch(() => {});
        };
    }, [location]);

    return (
        <div className="p-8 max-w-md mx-auto">
            <h1 className="text-xl mb-4">Security Scanner</h1>

            <select className="border p-2 w-full mb-4" value={location} onChange={(e) => setLocation(e.target.value)}>
                <option value="Main Gate">Main Gate</option>
                <option value="Hostel Entrance">Hostel Entrance</option>
                <option value="Library">Library</option>
            </select>

            <div id="qr-reader" className="mb-4" />
            {result?.success && (
                <div className="border p-2 bg-green-50">
                    <p className="font-bold mb-2">Scan successful:</p>
                    {result.devices.map((d) => (
                        <p key={d._id} className="text-sm">{d.deviceName} — now {d.status}</p>
                    ))}
                </div>
            )}
            {result?.success === false && (
                <p className="text-red-600 text-sm">{result.error}</p>
            )}
        </div>
    );
}

export default ScannerPage;