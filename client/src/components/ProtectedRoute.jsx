import { Navigate } from "react-router-dom";
import { decodeToken } from "../utils/decodeToken";

function ProtectedRoute({ children, allowedRoles }) {
  const token = localStorage.getItem("token");
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  if (allowedRoles) {
    const user = decodeToken(token);
    if (!user || !allowedRoles.includes(user.role)) {
      return <Navigate to="/login" replace />;
    }
  }
  return children;
}

export default ProtectedRoute;
