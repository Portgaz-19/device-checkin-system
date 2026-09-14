import { Routes, Route, Navigate } from "react-router-dom";
import RegisterPage from "./pages/Register.jsx";
import LoginPage from "./pages/Login.jsx";
import RegisterDevice from "./pages/RegisterDevice.jsx";
import MyQrCode from "./pages/MyQrCode.jsx";
import MyDevices from "./pages/MyDevices.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Navbar from "./components/Navbar.jsx";
import { lazy, Suspense } from "react";
const ScannerPage = lazy(() => import("./pages/ScannerPage.jsx"));

function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/devices/qr"
          element={
            <ProtectedRoute>
              <MyQrCode />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
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
        <Route
          path="/scan"
          element={
            <Suspense fallback={<p className="p-8">Loading scanner...</p>}>
              <ScannerPage />
            </Suspense>
          }
        />
      </Routes>
    </>
  );
}

export default App;
