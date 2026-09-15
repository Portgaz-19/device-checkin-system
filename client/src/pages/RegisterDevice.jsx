import { useState } from "react";
import { registerDevice } from "../api/deviceApi";

function RegisterDevice() {
  const [form, setForm] = useState({
    deviceName: "",
    serialNumber: "",
    studentEmail: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      setMessage("Submitting...");
      try {
        await registerDevice(form);
        setMessage("Device registered successfully.");
        setForm({ deviceName: "", serialNumber: "", studentEmail: "" });
      } catch (err) {
        setMessage(err.response?.data?.error || "Registration failed");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-sm mx-auto">
      <h1 className="text-xl mb-4">Register a Device</h1>
      <input
        className="border p-2 w-full mb-2"
        name="deviceName"
        placeholder="Device name (e.g. Dell Laptop)"
        value={form.deviceName}
        onChange={handleChange}
      />
      <input
        className="border p-2 w-full mb-2"
        name="serialNumber"
        placeholder="Serial number"
        value={form.serialNumber}
        onChange={handleChange}
      />
      <input
        className="border p-2 w-full mb-2"
        name="studentEmail"
        placeholder="Student's email"
        value={form.studentEmail}
        onChange={handleChange}
      />
      <button className="bg-black text-white p-2 w-full disabled:opacity-50" disabled={isSubmitting} onClick={handleSubmit}>
        {isSubmitting ? "Submitting..." : "Register Device"}
      </button>
      <p className="mt-2 text-sm">{message}</p>
    </div>
  );
}

export default RegisterDevice;
