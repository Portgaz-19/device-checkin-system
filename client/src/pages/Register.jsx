import { useState } from "react";
import { registerUser } from "../api/authApi";

function Register() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "student",
  });
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.password) {
      setMessage("All fields are required");
      return;
    }
    if (form.password.length < 6) {
      setMessage("Password must be at least 6 characters");
      return;
    }
    if (form.password !== confirmPassword) {
      setMessage("Passwords do not match");
      return;
    }
    setIsSubmitting(true);
    try {
      if (form.password !== confirmPassword) {
        setMessage("Passwords do not match");
        return;
      }
      setMessage("Submitting...");
      try {
        await registerUser(form);
        setMessage("Registered! You can log in now.");
      } catch (err) {
        setMessage(err.response?.data?.error || "Registration failed");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-sm mx-auto">
      <h1 className="text-xl mb-4">Register</h1>
      <input
        className="border p-2 w-full mb-2"
        name="name"
        placeholder="Name"
        onChange={handleChange}
      />
      <input
        className="border p-2 w-full mb-2"
        name="email"
        placeholder="Email"
        onChange={handleChange}
      />
      <input
        className="border p-2 w-full mb-2"
        name="password"
        type="password"
        placeholder="Password"
        onChange={handleChange}
      />
      <input
        className="border p-2 w-full mb-2"
        name="confirmPassword"
        type="password"
        placeholder="Confirm Password"
        onChange={(e) => setConfirmPassword(e.target.value)}
      />

      <select
        className="border p-2 w-full mb-2"
        name="role"
        onChange={handleChange}
      >
        <option value="student">Student</option>
        <option value="hostelSupervisor">Hostel Supervisor</option>
        <option value="admin">Admin</option>
      </select>

      <button className="bg-black text-white p-2 w-full disabled:opacity-50" disabled={isSubmitting} onClick={handleSubmit}>
        {isSubmitting ? "Submitting..." : "Register"}
      </button>
      <p className="mt-2 text-sm">{message}</p>
    </div>
  );
}

export default Register;
