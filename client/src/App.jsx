import { Routes, Route } from "react-router-dom";
import RegisterPage from "./pages/Register.jsx";
import LoginPage from "./pages/Login.jsx";
import RegisterDevice from "./pages/RegisterDevice.jsx";
import MyDevices from "./pages/MyDevices.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/devices/register"
        element={
          <ProtectedRoute>
            <RegisterDevice />
          </ProtectedRoute>
        }
      />
      <Route
        path="/devices/mine"
        element={
          <ProtectedRoute>
            <MyDevices />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
