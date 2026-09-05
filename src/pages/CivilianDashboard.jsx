import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Crosshair,
  Loader2,
  LogOut,
  MapPin,
} from "lucide-react";

import { useAuth } from "../contexts/AuthContext";
import { createIncident } from "../services/incidentService";

const DISASTER_TYPES = [
  {
    value: "flood",
    label: "Flood",
  },
  {
    value: "fire",
    label: "Fire",
  },
  {
    value: "medical",
    label: "Medical",
  },
  {
    value: "structural",
    label: "Structural",
  },
];

const SEVERITIES = [
  {
    value: "low",
    label: "Low",
  },
  {
    value: "medium",
    label: "Medium",
  },
  {
    value: "high",
    label: "High",
  },
];

export default function CivilianDashboard() {
  const { user, signOut } = useAuth();

  const [type, setType] = useState("flood");
  const [severity, setSeverity] = useState("medium");

  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);

  const [locationLoading, setLocationLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const getLocation = () => {
    setError("");
    setSuccess("");

    if (!navigator.geolocation) {
      setError(
        "Geolocation is not supported by this browser."
      );
      return;
    }

    setLocationLoading(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);

        setLocationLoading(false);
      },
      (locationError) => {
        console.error(locationError);

        setError(
          "Unable to access your location. Please allow location permission and try again."
        );

        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (latitude === null || longitude === null) {
      setError(
        "Please capture your current location before reporting the emergency."
      );
      return;
    }

    setSubmitLoading(true);

    try {
      const incident = await createIncident({
        type,
        severity,
        latitude,
        longitude,
      });

      console.log("Created incident:", incident);

      setSuccess(
        "Emergency reported successfully. Help is being coordinated."
      );

      setType("flood");
      setSeverity("medium");
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          "Unable to submit the emergency report."
      );
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {}
      <header className="border-b border-slate-800 bg-slate-950/95">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4">
          <div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />

              <span className="text-lg font-bold">
                ResQLink
              </span>
            </div>

            <p className="text-xs text-slate-500">
              Emergency Reporting
            </p>
          </div>

          <button
            onClick={signOut}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
            title="Sign out"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      {}
      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-8">
          <p className="text-sm font-medium text-red-400">
            EMERGENCY RESPONSE
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            Report an Emergency
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-400">
            Provide the emergency details and your current
            location so response teams can be dispatched.
          </p>
        </div>

        {}
        {success && (
          <div className="mb-6 flex gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />

            <div>
              <p className="font-semibold text-emerald-300">
                Report submitted
              </p>

              <p className="mt-1 text-sm text-emerald-400/80">
                {success}
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-xl sm:p-7"
        >
          {}
          <div>
            <label
              htmlFor="type"
              className="mb-2 block text-sm font-medium text-slate-200"
            >
              Disaster Type
            </label>

            <select
              id="type"
              value={type}
              onChange={(event) =>
                setType(event.target.value)
              }
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-red-500"
            >
              {DISASTER_TYPES.map((item) => (
                <option
                  key={item.value}
                  value={item.value}
                >
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          {}
          <div>
            <label
              htmlFor="severity"
              className="mb-2 block text-sm font-medium text-slate-200"
            >
              Severity
            </label>

            <select
              id="severity"
              value={severity}
              onChange={(event) =>
                setSeverity(event.target.value)
              }
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-red-500"
            >
              {SEVERITIES.map((item) => (
                <option
                  key={item.value}
                  value={item.value}
                >
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          {}
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-red-400" />

              <div>
                <p className="font-medium">
                  Current Location
                </p>

                <p className="text-xs text-slate-500">
                  Required for emergency dispatch
                </p>
              </div>
            </div>

            {latitude !== null && longitude !== null ? (
              <div className="mt-4 rounded-lg bg-emerald-500/10 p-3 text-sm">
                <p className="text-emerald-300">
                  Location captured
                </p>

                <p className="mt-1 font-mono text-xs text-emerald-400/70">
                  {latitude.toFixed(6)},{" "}
                  {longitude.toFixed(6)}
                </p>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">
                Your coordinates have not been captured.
              </p>
            )}

            <button
              type="button"
              onClick={getLocation}
              disabled={locationLoading}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {locationLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Getting location...
                </>
              ) : (
                <>
                  <Crosshair className="h-4 w-4" />
                  {latitude !== null
                    ? "Update My Location"
                    : "Get My Location"}
                </>
              )}
            </button>
          </div>

          {}
          <button
            type="submit"
            disabled={submitLoading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-4 font-bold transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Reporting Emergency...
              </>
            ) : (
              <>
                <AlertTriangle className="h-5 w-5" />
                REPORT EMERGENCY
              </>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-600">
          Signed in as {user?.email}
        </p>
      </main>
    </div>
  );
}
