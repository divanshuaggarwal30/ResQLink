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


/**
 * ============================================================
 * CONSTANTS
 * ============================================================
 */

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


/**
 * ============================================================
 * HELPERS
 * ============================================================
 */

function formatTime(date) {
  if (!date) {
    return "Unknown";
  }

  return new Date(date).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}


function formatStatus(status) {
  if (!status) {
    return "Unknown";
  }

  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}


/**
 * ============================================================
 * MAIN COMPONENT
 * ============================================================
 */

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


  /**
   * ==========================================================
   * STATUS CHANGE
   * ==========================================================
   */

  const handleStatusChange = async (
    incidentId,
    status
  ) => {
    setActiveAction(
      `${incidentId}:${status}`
    );

    setActionError("");

    try {
      await updateIncidentStatus(
        incidentId,
        status
      );
    } catch (err) {
      console.error(
        "Status update failed:",
        err
      );

      setActionError(
        err.message ||
          "Unable to update mission status."
      );
    } finally {
      setActiveAction(null);
    }
  };


  /**
   * ==========================================================
   * RENDER
   * ==========================================================
   */

  return (
    <div className="min-h-screen bg-slate-950 text-white">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="border-b border-slate-800">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-4">

          {/* Logo */}
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


          {/* Logout */}
          <button
            type="button"
            onClick={signOut}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
            title="Sign out"
          >
            <LogOut className="h-5 w-5" />
          </button>

        </div>
      </header>


      {/* =====================================================
          MAIN
      ===================================================== */}

      <main className="mx-auto max-w-lg px-4 py-6">

        {/* ===================================================
            ONLINE STATUS
        =================================================== */}

        <div className="mb-6 flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 px-4 py-3">

          <div className="flex items-center gap-2">

            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-400" />

            <span className="text-sm text-slate-300">
              Field Unit Online
            </span>

          </div>

          <Radio className="h-4 w-4 text-emerald-400" />

        </div>


        {/* ===================================================
            TITLE
        =================================================== */}

        <div className="mb-8">

          <p className="text-xs font-semibold uppercase tracking-widest text-red-400">
            Responder Portal
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Your Missions
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Active emergency assignments from the Command Center.
          </p>

        </div>


        {/* ===================================================
            LOAD ERROR
        =================================================== */}

        {error && (
          <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}


        {/* ===================================================
            ACTION ERROR
        =================================================== */}

        {actionError && (
          <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            {actionError}
          </div>
        )}


        {/* ===================================================
            LOADING
        =================================================== */}

        {loading ? (

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">

            <Radio className="mx-auto h-8 w-8 animate-pulse text-slate-600" />

            <p className="mt-4 text-sm text-slate-500">
              Loading missions...
            </p>

          </div>

        ) : incidents.length === 0 ? (

          /* =================================================
             EMPTY STATE
          ================================================= */

          <EmptyState />

        ) : (

          /* =================================================
             MISSION LIST
          ================================================= */

          <div className="space-y-5">

            {incidents.map((incident) => {

              const style =
                severityStyles[
                  incident.severity
                ] ||
                severityStyles.low;


              const accepting =
                activeAction ===
                `${incident.id}:accepted`;


              const arriving =
                activeAction ===
                `${incident.id}:arrived`;


              const resolving =
                activeAction ===
                `${incident.id}:resolved`;


              return (

                <article
                  key={incident.id}
                  className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-xl"
                >

                  {/* ========================================
                      SEVERITY HEADER
                  ======================================== */}

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


                      <span className="text-xs font-semibold uppercase text-slate-400">
                        {formatStatus(
                          incident.status
                        )}
                      </span>

                    </div>

                  </div>


                  {/* ========================================
                      INCIDENT DETAILS
                  ======================================== */}

                  <div className="p-5">

                    <div className="flex items-start justify-between gap-4">

                      <div>

                        <p className="text-xs uppercase tracking-wider text-slate-600">
                          Emergency Type
                        </p>

                        <h2 className="mt-1 text-2xl font-bold">
                          {typeLabels[
                            incident.type
                          ] ||
                            incident.type}
                        </h2>

                      </div>

                      <div className="rounded-xl bg-slate-950 p-3">
                        <AlertTriangle
                          className={`h-6 w-6 ${style.icon}`}
                        />
                      </div>

                    </div>


                    {/* ======================================
                        LOCATION
                    ====================================== */}

                    <div className="mt-5 space-y-3">

                      <div className="flex items-start gap-3 rounded-xl bg-slate-950 p-4">

                        <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />

                        <div className="min-w-0">

                          <p className="text-xs text-slate-500">
                            Emergency Location
                          </p>

                          <p className="mt-1 break-all font-mono text-sm text-slate-200">
                            {Number(
                              incident.latitude
                            ).toFixed(6)}
                            ,{" "}
                            {Number(
                              incident.longitude
                            ).toFixed(6)}
                          </p>

                        </div>

                      </div>


                      {/* ====================================
                          REPORTED TIME
                      ==================================== */}

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


                      {/* ====================================
                          ASSIGNED TIME
                      ==================================== */}

                      {incident.assigned_at && (
                        <div className="flex items-start gap-3 rounded-xl bg-slate-950 p-4">

                          <Navigation className="mt-0.5 h-5 w-5 shrink-0 text-blue-400" />

                          <div>

                            <p className="text-xs text-slate-500">
                              Dispatched
                            </p>

                            <p className="mt-1 text-sm text-slate-200">
                              {formatTime(
                                incident.assigned_at
                              )}
                            </p>

                          </div>

                        </div>
                      )}

                    </div>


                    {/* ======================================
                        MISSION PROGRESS
                    ====================================== */}

                    <MissionProgress
                      status={incident.status}
                    />


                    {/* ======================================
                        ACTIONS
                    ====================================== */}

                    <div className="mt-6">

                      {/* ====================================
                          PENDING → ACCEPTED
                      ==================================== */}

                      {incident.status ===
                        "pending" && (

                        <button
                          type="button"
                          onClick={() =>
                            handleStatusChange(
                              incident.id,
                              "accepted"
                            )
                          }
                          disabled={accepting}
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-4 font-bold transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >

                          <Navigation className="h-5 w-5" />

                          {accepting
                            ? "ACCEPTING..."
                            : "ACCEPT MISSION"}

                        </button>

                      )}


                      {/* ====================================
                          ACCEPTED → ARRIVED
                      ==================================== */}

                      {incident.status ===
                        "accepted" && (

                        <button
                          type="button"
                          onClick={() =>
                            handleStatusChange(
                              incident.id,
                              "arrived"
                            )
                          }
                          disabled={arriving}
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-4 font-bold transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >

                          <MapPin className="h-5 w-5" />

                          {arriving
                            ? "UPDATING..."
                            : "ARRIVED AT LOCATION"}

                        </button>

                      )}


                      {/* ====================================
                          ARRIVED → RESOLVED
                      ==================================== */}

                      {incident.status ===
                        "arrived" && (

                        <button
                          type="button"
                          onClick={() =>
                            handleStatusChange(
                              incident.id,
                              "resolved"
                            )
                          }
                          disabled={resolving}
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-4 font-bold transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >

                          <CheckCircle2 className="h-5 w-5" />

                          {resolving
                            ? "RESOLVING..."
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


        {/* ===================================================
            ACCOUNT
        =================================================== */}

        <p className="mt-8 break-all text-center text-xs text-slate-600">
          {user?.email}
        </p>

      </main>

    </div>
  );
}


/**
 * ============================================================
 * MISSION PROGRESS
 * ============================================================
 */

function MissionProgress({ status }) {
  const steps = [
    {
      key: "pending",
      label: "Dispatched",
    },
    {
      key: "accepted",
      label: "Accepted",
    },
    {
      key: "arrived",
      label: "Arrived",
    },
    {
      key: "resolved",
      label: "Resolved",
    },
  ];


  const currentIndex =
    steps.findIndex(
      (step) => step.key === status
    );


  return (
    <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950 p-4">

      <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
        Mission Progress
      </p>


      <div className="flex items-start">

        {steps.map((step, index) => {

          const completed =
            currentIndex >= index;

          const active =
            currentIndex === index;


          return (
            <div
              key={step.key}
              className="flex min-w-0 flex-1 items-start"
            >

              <div className="flex min-w-0 flex-1 flex-col items-center">

                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-bold ${
                    completed
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                      : "border-slate-700 bg-slate-900 text-slate-600"
                  } ${
                    active
                      ? "ring-2 ring-emerald-500/20"
                      : ""
                  }`}
                >
                  {completed ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    index + 1
                  )}
                </div>

                <span
                  className={`mt-2 text-center text-[10px] ${
                    completed
                      ? "text-slate-300"
                      : "text-slate-600"
                  }`}
                >
                  {step.label}
                </span>

              </div>


              {index < steps.length - 1 && (
                <div
                  className={`mt-3 h-px flex-1 ${
                    currentIndex > index
                      ? "bg-emerald-500/50"
                      : "bg-slate-800"
                  }`}
                />
              )}

            </div>
          );
        })}

      </div>

    </div>
  );
}


/**
 * ============================================================
 * EMPTY STATE
 * ============================================================
 */

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-10 text-center">

      <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500/50" />

      <h2 className="mt-4 font-semibold text-slate-300">
        No active missions
      </h2>

      <p className="mt-2 text-sm leading-6 text-slate-600">
        New assignments from the Command Center will appear here automatically.
      </p>

    </div>
  );
}