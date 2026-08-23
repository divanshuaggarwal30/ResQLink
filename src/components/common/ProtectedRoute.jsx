import { Navigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

export default function ProtectedRoute({
  children,
  allowedRoles,
}) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        Loading ResQLink...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!role) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        Unable to load your account profile.
      </div>
    );
  }

  if (
    allowedRoles &&
    !allowedRoles.includes(role)
  ) {
    return <Navigate to={`/${role}`} replace />;
  }

  return children;
}