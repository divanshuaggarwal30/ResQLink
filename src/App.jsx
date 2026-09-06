import { Navigate, Route, Routes } from "react-router-dom";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import CivilianDashboard from "./pages/CivilianDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import ResponderDashboard from "./pages/ResponderDashboard";

import ProtectedRoute from "./components/common/ProtectedRoute";
import { useAuth } from "./contexts/AuthContext";

function HomeRedirect() {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!role) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={`/${role}`} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />

      <Route path="/login" element={<Login />} />

      <Route path="/signup" element={<Signup />} />

      <Route
        path="/civilian"
        element={
          <ProtectedRoute allowedRoles={["civilian"]}>
            <CivilianDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/responder"
        element={
          <ProtectedRoute allowedRoles={["responder"]}>
            <ResponderDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="*"
        element={<Navigate to="/" replace />}
      />
    </Routes>
  );
}