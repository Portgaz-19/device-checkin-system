import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { resetPassword } from "../api/authApi";

function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (newPassword !== confirmPassword) {
      setMessage("Passwords do not match");
      return;
    }
    setMessage("Submitting...");
    try {
      await resetPassword(token, newPassword);
      setMessage("Password reset! Redirecting to login...");
      setSuccess(true);
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setMessage(err.response?.data?.error || "Something went wrong");
    }
  };

  if (!token) {
    return <p className="p-8">No reset token found in the URL.</p>;
  }

  return (
    <div className="p-8 max-w-sm mx-auto">
      <h1 className="text-xl mb-4">Reset Password</h1>
      <input
        className="border p-2 w-full mb-2"
        type="password"
        placeholder="New password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
      />
      <input
        className="border p-2 w-full mb-2"
        type="password"
        placeholder="Confirm new password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
      />
      <button
        className="bg-black text-white p-2 w-full"
        onClick={handleSubmit}
        disabled={success}
      >
        Reset Password
      </button>
      <p className="mt-2 text-sm">{message}</p>
    </div>
  );
}

export default ResetPassword;