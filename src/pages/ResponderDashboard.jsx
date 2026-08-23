import { useAuth } from "../contexts/AuthContext";

export default function ResponderDashboard() {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-white">
      <div className="mx-auto max-w-lg">
        <h1 className="text-3xl font-bold">
          Field Responder
        </h1>

        <p className="mt-2 text-slate-400">
          {user?.email}
        </p>

        <button
          onClick={signOut}
          className="mt-6 rounded-lg bg-red-600 px-5 py-3 font-semibold"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}