import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export default function Signup() {
  const navigate = useNavigate();
  const { signUp } = useAuth();

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setMessage("");

    const fullName = form.fullName.trim();
    const email = form.email.trim().toLowerCase();

    if (!fullName) {
      setError("Please enter your full name.");
      return;
    }

    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const { data, error: signUpError } = await signUp(
        email,
        form.password,
        fullName
      );

      if (signUpError) {
        throw signUpError;
      }

      if (data?.session) {
        navigate("/", { replace: true });
        return;
      }

      setMessage(
        "Account created successfully. Please check your email to confirm your account before signing in."
      );

      setForm({
        fullName: "",
        email: "",
        password: "",
        confirmPassword: "",
      });
    } catch (signupError) {
      setError(
        signupError?.message ||
          "Unable to create your account. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10">
            <ShieldCheck className="h-7 w-7 text-red-400" />
          </div>

          <h1 className="text-3xl font-bold tracking-tight">
            Create your ResQLink account
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            Join the emergency response network.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
          {error && (
            <div className="mb-5 flex gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {message && (
            <div className="mb-5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-300">
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="fullName"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Full name
              </label>

              <input
                id="fullName"
                name="fullName"
                type="text"
                required
                value={form.fullName}
                onChange={handleChange}
                autoComplete="name"
                placeholder="Enter your full name"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-red-500"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Email address
              </label>

              <input
                id="email"
                name="email"
                type="email"
                required
                value={form.email}
                onChange={handleChange}
                autoComplete="email"
                placeholder="you@example.com"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-red-500"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Password
              </label>

              <input
                id="password"
                name="password"
                type="password"
                required
                value={form.password}
                onChange={handleChange}
                autoComplete="new-password"
                placeholder="At least 6 characters"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-red-500"
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Confirm password
              </label>

              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={form.confirmPassword}
                onChange={handleChange}
                autoComplete="new-password"
                placeholder="Re-enter your password"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-red-500"
              />
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-xs leading-5 text-slate-400">
              New public accounts are created as{" "}
              <strong className="text-slate-200">
                Civilian
              </strong>{" "}
              accounts. Administrator and responder access is
              provisioned separately for security.
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Creating account..." : "Create account"}

              {!loading && (
                <ArrowRight className="h-4 w-4" />
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-400">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-semibold text-red-400 hover:text-red-300"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}