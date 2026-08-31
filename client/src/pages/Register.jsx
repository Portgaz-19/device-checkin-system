import { useState } from "react";
import { registerUser } from "../api/authApi";

function Register() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "student",
  });
  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    setMessage("Submitting...");
    try {
      await registerUser(form);
      setMessage("Registered! You can log in now.");
    } catch (err) {
      setMessage(err.response?.data?.error || "Registration failed");
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

      <select
        className="border p-2 w-full mb-2"
        name="role"
        onChange={handleChange}
      >
        <option value="student">Student</option>
        <option value="hostelSupervisor">Hostel Supervisor</option>
        <option value="admin">Admin</option>
      </select>

      <button className="bg-black text-white p-2 w-full" onClick={handleSubmit}>
        Register
      </button>
      <p className="mt-2 text-sm">{message}</p>
    </div>
  );
}

export default Register;
