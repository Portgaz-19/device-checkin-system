import { Link, useNavigate } from "react-router-dom";
import { decodeToken } from "../utils/decodeToken";

function Navbar() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const user = token ? decodeToken(token) : null;

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <nav className="p-4 border-b flex gap-4 items-center">
      <Link to="/">VerifyGate</Link>
      {!user && (
        <>
          <Link to="/login">Login</Link>
          <Link to="/register">Register</Link>
        </>
      )}
      {user?.role === 'student' && <Link to="/devices/mine">My Devices</Link>}
      {(user?.role === 'hostelSupervisor' || user?.role === 'admin') && (
        <Link to="/devices/register">Register Device</Link>
      )}
      {user?.role === 'admin' && <Link to="/admin">Admin</Link>}
      <Link to="/scan">Scan</Link>
      {user && (
        <button onClick={handleLogout} className="ml-auto text-red-600">Logout</button>
      )}
    </nav>
  );
}

export default Navbar;
