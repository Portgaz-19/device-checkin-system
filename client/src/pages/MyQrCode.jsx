import { useState, useEffect, useCallback } from "react";
import api from "../api/axiosInstance";

function MyQrCode() {
  const [qrImage, setQrImage] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [error, setError] = useState("");

  const generate = useCallback(async () => {
    setError("");

    try {
      const res = await api.get("/qr/generate");
      setQrImage(res.data.qrImage);
      setSecondsLeft(res.data.expiresIn);
    } catch (err) {
      setError(err.response?.data?.error || "Could not generate QR code");
    }
  }, []);

  useEffect(() => {
    generate();
  }, [generate]);

  useEffect(() => {
    if (secondsLeft <= 0) return;

    const timer = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsLeft]);

  return (
    <div className="p-8 max-w-sm mx-auto text-center">
      <h1 className="text-xl mb-4">My QR Code</h1>

      {error && <p className="text-red-600 text-sm mb-2">{error}</p>}

      {qrImage && (
        <img src={qrImage} alt="Your QR code" className="mx-auto mb-4" />
      )}

      <p className="text-sm mb-4">
        {secondsLeft > 0 ? `Expires in ${secondsLeft}s` : "Expired"}
      </p>

      <button onClick={generate} className="bg-black text-white p-2 w-full">
        Generate New Code
      </button>
    </div>
  );
}

export default MyQrCode;
