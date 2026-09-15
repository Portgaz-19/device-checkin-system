import { useState } from "react";
import { Link } from "react-router-dom";
import { loginUser } from "../api/authApi";

function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      setMessage("Logging in...");
      try {
        const data = await loginUser(form);
        localStorage.setItem("token", data.token);
        setMessage("Login successful!");
      } catch (err) {
        setMessage(err.response?.data?.message || err.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-sm mx-auto">
      <h1 className="text-xl mb-4">Login</h1>
      <input
        className="border p-2 w-full mb-2"
        name="email"
        placeholder="Email"
        onChange={handleChange}
      />
      <input
        className="border p-2 w-full mb-2"
        type="password"
        name="password"
        placeholder="Password"
        onChange={handleChange}
      />

      <button
        className="bg-black text-white p-2 w-full disabled:opacity-50"
        disabled={isSubmitting}
        onClick={handleSubmit}
      >
        {isSubmitting ? "Logging in..." : "Login"}
      </button>
      <p className="mt-2 text-sm">{message}</p>
      <p className="mt-2 text-sm">
        <Link to="/forgot-password" className="underline">
          Forgot password?
        </Link>
      </p>
    </div>
  );
}

export default Login;
