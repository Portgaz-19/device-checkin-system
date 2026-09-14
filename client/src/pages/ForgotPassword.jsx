import { useState } from "react";
import { Link } from "react-router-dom";
import { forgotPassword } from "../api/authApi";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [devLink, setDevLink] = useState("");

  const handleSubmit = async () => {
    setMessage("Submitting...");
    try {
      const data = await forgotPassword(email);
      setMessage(data.message);
      setDevLink(data.devOnlyResetLink || "");
    } catch (err) {
      setMessage(err.response?.data?.error || "Something went wrong");
    }
  };

  return (
    <div className="p-8 max-w-sm mx-auto">
      <h1 className="text-xl mb-4">Forgot Password</h1>
      <input
        className="border p-2 w-full mb-2"
        placeholder="Your email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button className="bg-black text-white p-2 w-full" onClick={handleSubmit}>
        Send Reset Link
      </button>
      <p className="mt-2 text-sm">{message}</p>
      {devLink && (
        <p className="mt-2 text-xs text-gray-500 break-all">
          Dev only (no email service yet):{" "}
          <a href={devLink} className="underline">
            {devLink}
          </a>
        </p>
      )}
      <p className="mt-4 text-sm">
        <Link to="/login" className="underline">
          Back to login
        </Link>
      </p>
    </div>
  );
}

export default ForgotPassword;