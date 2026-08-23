import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  LogOut,
  MapPin,
  Navigation,
  Radio,
  ShieldCheck,
} from "lucide-react";

import { useAuth } from "../contexts/AuthContext";

import {
  updateIncidentStatus,
} from "../services/incidentService";

import {
  useResponderIncidents,
} from "../hooks/useResponderIncidents";

const typeLabels = {
  flood: "Flood",
  fire: "Fire",
  medical: "Medical",
  structural: "Structural",
};

const severityStyles = {
  high: {
    badge:
      "border-red-500/30 bg-red-500/10 text-red-300",
    icon: "text-red-400",
  },

  medium: {
    badge:
      "border-amber-500/30 bg-amber-500/10 text-amber-300",
    icon: "text-amber-400",
  },

  low: {
    badge:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    icon: "text-emerald-400",
  },
};

function formatTime(date) {
  return new Date(date).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ResponderDashboard() {
  const { user, signOut } = useAuth();

  const {
    incidents,
    loading,
    error,
  } = useResponderIncidents();

  const [activeAction, setActiveAction] =
    useState(null);

  const [actionError, setActionError] =
    useState("");

  const handleStatusChange = async (
    incidentId,
    status
  ) => {
    setActiveAction(`${incidentId}:${status}`);
    setActionError("");

    try {
      await updateIncidentStatus(
        incidentId,
        status
      );
    } catch (err) {
      console.error(err);

      setActionError(
        err.message ||
          "Unable to update mission status."
      );
    } finally {
      setActiveAction(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-slate-800">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-red-500/10 p-2">
              <ShieldCheck className="h-5 w-5 text-red-400" />
            </div>

            <div>
              <p className="font-bold">
                ResQLink
              </p>

              <p className="text-xs text-slate-500">
                Field Operations
              </p>
            </div>
          </div>

          <button
            onClick={signOut}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-6">
        {/* Status */}
        <div className="mb-6 flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-400" />

            <span className="text-sm text-slate-300">
              Field Unit Online
            </span>
          </div>

          <Radio className="h-4 w-4 text-emerald-400" />
        </div>

        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-red-400">
            Responder Portal
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Your Missions
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Active emergency assignments from Command Center.
          </p>
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {actionError && (
          <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            {actionError}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center text-sm text-slate-500">
            Loading missions...
          </div>
        ) : incidents.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-5">
            {incidents.map((incident) => {
              const style =
                severityStyles[
                  incident.severity
                ] || severityStyles.low;

              const accepting =
                activeAction ===
                `${incident.id}:in_progress`;

              const resolving =
                activeAction ===
                `${incident.id}:resolved`;

              return (
                <article
                  key={incident.id}
                  className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-xl"
                >
                  {/* Severity */}
                  <div
                    className={`border-b border-slate-800 px-5 py-3 ${style.badge}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle
                          className={`h-4 w-4 ${style.icon}`}
                        />

                        <span className="text-xs font-bold uppercase">
                          {incident.severity} priority
                        </span>
                      </div>

                      <span className="text-xs uppercase text-slate-500">
                        {incident.status.replace(
                          "_",
                          " "
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Main */}
                  <div className="p-5">
                    <h2 className="text-2xl font-bold">
                      {typeLabels[
                        incident.type
                      ] || incident.type}
                    </h2>

                    <div className="mt-5 space-y-3">
                      <div className="flex items-start gap-3 rounded-xl bg-slate-950 p-4">
                        <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />

                        <div>
                          <p className="text-xs text-slate-500">
                            Emergency Location
                          </p>

                          <p className="mt-1 font-mono text-sm text-slate-200">
                            {incident.latitude.toFixed(
                              6
                            )}
                            ,{" "}
                            {incident.longitude.toFixed(
                              6
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 rounded-xl bg-slate-950 p-4">
                        <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />

                        <div>
                          <p className="text-xs text-slate-500">
                            Reported
                          </p>

                          <p className="mt-1 text-sm text-slate-200">
                            {formatTime(
                              incident.created_at
                            )}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Workflow */}
                    <div className="mt-6">
                      {incident.status ===
                        "pending" && (
                        <button
                          onClick={() =>
                            handleStatusChange(
                              incident.id,
                              "in_progress"
                            )
                          }
                          disabled={accepting}
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-4 font-bold transition hover:bg-red-500 disabled:opacity-50"
                        >
                          <Navigation className="h-5 w-5" />

                          {accepting
                            ? "Accepting..."
                            : "ACCEPT MISSION"}
                        </button>
                      )}

                      {incident.status ===
                        "in_progress" && (
                        <button
                          onClick={() =>
                            handleStatusChange(
                              incident.id,
                              "resolved"
                            )
                          }
                          disabled={resolving}
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-4 font-bold transition hover:bg-emerald-500 disabled:opacity-50"
                        >
                          <CheckCircle2 className="h-5 w-5" />

                          {resolving
                            ? "Resolving..."
                            : "ISSUE RESOLVED"}
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <p className="mt-8 text-center text-xs text-slate-600">
          {user?.email}
        </p>
      </main>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-10 text-center">
      <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500/50" />

      <h2 className="mt-4 font-semibold text-slate-300">
        No active missions
      </h2>

      <p className="mt-2 text-sm text-slate-600">
        New assignments from the Command Center will appear here automatically.
      </p>
    </div>
  );
}