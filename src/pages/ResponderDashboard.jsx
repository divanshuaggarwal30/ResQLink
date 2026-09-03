import {
  useEffect,
  useMemo,
  useState,
} from "react";

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
  updateResponderAvailability,
  updateResponderLocation,
} from "../services/responderService";

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

    icon:
      "text-red-400",

    button:
      "bg-red-600 hover:bg-red-500",
  },

  medium: {
    badge:
      "border-amber-500/30 bg-amber-500/10 text-amber-300",

    icon:
      "text-amber-400",

    button:
      "bg-amber-600 hover:bg-amber-500",
  },

  low: {
    badge:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",

    icon:
      "text-emerald-400",

    button:
      "bg-emerald-600 hover:bg-emerald-500",
  },
};


function formatTime(date) {
  if (!date) {
    return "Unknown";
  }

  return new Date(
    date
  ).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}


function formatStatus(status) {
  if (!status) {
    return "Unknown";
  }

  return String(status)
    .replaceAll("_", " ")
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
}


/*
============================================================
MAIN
============================================================
*/

export default function ResponderDashboard() {
  const {
    user,
    signOut,
  } = useAuth();

  const {
    incidents,
    loading,
    error,
  } =
    useResponderIncidents();

  const [
    activeAction,
    setActiveAction,
  ] = useState(null);

  const [
    actionError,
    setActionError,
  ] = useState("");

  const [
    locationState,
    setLocationState,
  ] = useState(
    "starting"
  );


  /*
  ==========================================================
  GPS TRACKING
  ==========================================================
  */

  useEffect(() => {
    if (
      !navigator.geolocation
    ) {
      setLocationState(
        "unsupported"
      );

      return;
    }

    setLocationState(
      "requesting"
    );

    const watchId =
      navigator.geolocation.watchPosition(
        async (position) => {
          const latitude =
            position.coords
              .latitude;

          const longitude =
            position.coords
              .longitude;

          try {
            await updateResponderLocation(
              latitude,
              longitude
            );

            setLocationState(
              "active"
            );
          } catch (err) {
            console.error(
              "Location update failed:",
              err
            );

            setLocationState(
              "error"
            );
          }
        },
        (geoError) => {
          console.warn(
            "Geolocation error:",
            geoError.message
          );

          setLocationState(
            "denied"
          );
        },
        {
          enableHighAccuracy: true,

          maximumAge: 10000,

          timeout: 10000,
        }
      );

    return () => {
      navigator.geolocation.clearWatch(
        watchId
      );
    };
  }, []);


  /*
  ==========================================================
  ACTIVE MISSIONS
  ==========================================================
  */

  const activeMissions =
    useMemo(() => {
      return incidents.filter(
        (incident) =>
          incident.status !==
          "resolved"
      );
    }, [
      incidents,
    ]);


  /*
  ==========================================================
  STATUS CHANGE
  ==========================================================
  */

  const handleStatusChange =
    async (
      incidentId,
      status
    ) => {
      const actionKey =
        `${incidentId}:${status}`;

      setActiveAction(
        actionKey
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
          err?.message ||
            "Unable to update mission status."
        );
      } finally {
        setActiveAction(
          null
        );
      }
    };


  /*
  ==========================================================
  AVAILABILITY
  ==========================================================
  */

  const handleOffline =
    async () => {
      try {
        await updateResponderAvailability(
          "offline"
        );
      } catch (err) {
        console.error(err);

        setActionError(
          err?.message ||
            "Unable to change availability."
        );
      }
    };


  return (
    <div className="min-h-screen bg-slate-950 text-white">

      {/* ====================================================
          HEADER
      ==================================================== */}

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
            type="button"
            onClick={signOut}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
            title="Sign out"
          >
            <LogOut className="h-5 w-5" />
          </button>

        </div>

      </header>


      <main className="mx-auto max-w-lg px-4 py-6">

        {/* ==================================================
            FIELD STATUS
        ================================================== */}

        <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-4">

          <div className="flex items-center justify-between">

            <div className="flex items-center gap-3">

              <span
                className={`h-3 w-3 rounded-full ${
                  locationState ===
                  "active"
                    ? "animate-pulse bg-emerald-400"
                    : "bg-amber-400"
                }`}
              />

              <div>

                <p className="text-sm font-semibold">
                  Field Unit
                </p>

                <p className="text-xs text-slate-500">
                  {locationState ===
                  "active"
                    ? "Live location active"
                    : locationState ===
                      "denied"
                    ? "Location permission required"
                    : locationState ===
                      "unsupported"
                    ? "GPS unavailable"
                    : "Connecting to GPS..."}
                </p>

              </div>

            </div>

            <Radio
              className={`h-4 w-4 ${
                locationState ===
                "active"
                  ? "text-emerald-400"
                  : "text-slate-600"
              }`}
            />

          </div>

        </div>


        {/* ==================================================
            TITLE
        ================================================== */}

        <div className="mb-8">

          <p className="text-xs font-semibold uppercase tracking-widest text-red-400">
            Responder Portal
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Your Missions
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Live emergency assignments from the Command Center.
          </p>

        </div>


        {/* ==================================================
            ERRORS
        ================================================== */}

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


        {/* ==================================================
            LOADING
        ================================================== */}

        {loading ? (

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">

            <Radio className="mx-auto h-8 w-8 animate-pulse text-slate-600" />

            <p className="mt-4 text-sm text-slate-500">
              Loading missions...
            </p>

          </div>

        ) : activeMissions.length ===
          0 ? (

          <EmptyState />

        ) : (

          <div className="space-y-5">

            {activeMissions.map(
              (incident) => {

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
                    key={
                      incident.id
                    }
                    className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-xl"
                  >

                    {/* SEVERITY */}

                    <div
                      className={`border-b border-slate-800 px-5 py-3 ${style.badge}`}
                    >

                      <div className="flex items-center justify-between">

                        <div className="flex items-center gap-2">

                          <AlertTriangle
                            className={`h-4 w-4 ${style.icon}`}
                          />

                          <span className="text-xs font-bold uppercase">
                            {
                              incident.severity
                            }{" "}
                            priority
                          </span>

                        </div>

                        <span className="text-xs font-semibold uppercase text-slate-400">
                          {formatStatus(
                            incident.status
                          )}
                        </span>

                      </div>

                    </div>


                    {/* DETAILS */}

                    <div className="p-5">

                      <div className="flex items-start justify-between gap-4">

                        <div>

                          <p className="text-xs uppercase tracking-wider text-slate-600">
                            Emergency Type
                          </p>

                          <h2 className="mt-1 text-2xl font-bold">
                            {
                              typeLabels[
                                incident.type
                              ] ||
                              incident.type
                            }
                          </h2>

                        </div>

                        <div
                          className={`rounded-xl border p-3 ${style.badge}`}
                        >
                          <AlertTriangle
                            className={`h-6 w-6 ${style.icon}`}
                          />
                        </div>

                      </div>


                      {/* LOCATION */}

                      <div className="mt-5">

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

                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${incident.latitude},${incident.longitude}`}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-blue-400 hover:text-blue-300"
                            >
                              <Navigation className="h-3.5 w-3.5" />

                              OPEN MAP
                            </a>

                          </div>

                        </div>

                      </div>


                      {/* MISSION TIMELINE */}

                      <MissionTimeline
                        incident={
                          incident
                        }
                      />


                      {/* ACTION */}

                      <div className="mt-6">

                        {incident.status ===
                          "pending" && (
                          <MissionButton
                            loading={
                              accepting
                            }
                            onClick={() =>
                              handleStatusChange(
                                incident.id,
                                "accepted"
                              )
                            }
                            className="bg-red-600 hover:bg-red-500"
                            icon={
                              Navigation
                            }
                            text="ACCEPT MISSION"
                            loadingText="ACCEPTING..."
                          />
                        )}


                        {incident.status ===
                          "accepted" && (
                          <MissionButton
                            loading={
                              arriving
                            }
                            onClick={() =>
                              handleStatusChange(
                                incident.id,
                                "arrived"
                              )
                            }
                            className="bg-blue-600 hover:bg-blue-500"
                            icon={
                              MapPin
                            }
                            text="ARRIVED AT LOCATION"
                            loadingText="UPDATING..."
                          />
                        )}


                        {incident.status ===
                          "arrived" && (
                          <MissionButton
                            loading={
                              resolving
                            }
                            onClick={() =>
                              handleStatusChange(
                                incident.id,
                                "resolved"
                              )
                            }
                            className="bg-emerald-600 hover:bg-emerald-500"
                            icon={
                              CheckCircle2
                            }
                            text="ISSUE RESOLVED"
                            loadingText="RESOLVING..."
                          />
                        )}

                      </div>

                    </div>

                  </article>
                );
              }
            )}

          </div>

        )}


        <p className="mt-8 break-all text-center text-xs text-slate-600">
          {user?.email}
        </p>

        <button
          type="button"
          onClick={
            handleOffline
          }
          className="mx-auto mt-4 block text-xs text-slate-600 underline decoration-slate-700 underline-offset-4 hover:text-slate-400"
        >
          Set unit offline
        </button>

      </main>

    </div>
  );
}


/*
============================================================
MISSION BUTTON
============================================================
*/

function MissionButton({
  loading,
  onClick,
  className,
  icon: Icon,
  text,
  loadingText,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={`flex w-full items-center justify-center gap-2 rounded-xl px-5 py-4 font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      <Icon
        className={`h-5 w-5 ${
          loading
            ? "animate-pulse"
            : ""
        }`}
      />

      {loading
        ? loadingText
        : text}
    </button>
  );
}


/*
============================================================
MISSION TIMELINE
============================================================
*/

function MissionTimeline({
  incident,
}) {
  const steps = [
    {
      label: "Reported",
      timestamp:
        incident.created_at,
    },

    {
      label: "Dispatched",
      timestamp:
        incident.assigned_at,
    },

    {
      label: "Accepted",
      timestamp:
        incident.accepted_at,
    },

    {
      label: "Arrived",
      timestamp:
        incident.arrived_at,
    },

    {
      label: "Resolved",
      timestamp:
        incident.resolved_at,
    },
  ];

  return (
    <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950 p-4">

      <div className="mb-4 flex items-center gap-2">

        <Clock3 className="h-4 w-4 text-slate-500" />

        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Mission Timeline
        </p>

      </div>


      <div className="space-y-4">

        {steps.map(
          (
            step,
            index
          ) => {

            const complete =
              Boolean(
                step.timestamp
              );

            return (
              <div
                key={
                  step.label
                }
                className="flex items-start gap-3"
              >

                <div className="flex flex-col items-center">

                  <span
                    className={`mt-0.5 h-2.5 w-2.5 rounded-full ${
                      complete
                        ? "bg-emerald-400"
                        : "bg-slate-700"
                    }`}
                  />

                  {index <
                    steps.length -
                      1 && (
                    <span className="mt-1 h-5 w-px bg-slate-800" />
                  )}

                </div>

                <div className="flex min-w-0 flex-1 justify-between gap-3">

                  <span
                    className={`text-xs ${
                      complete
                        ? "text-slate-300"
                        : "text-slate-600"
                    }`}
                  >
                    {step.label}
                  </span>

                  <span className="font-mono text-[10px] text-slate-600">
                    {step.timestamp
                      ? formatTime(
                          step.timestamp
                        )
                      : "—"}
                  </span>

                </div>

              </div>
            );
          }
        )}

      </div>

    </div>
  );
}


/*
============================================================
EMPTY STATE
============================================================
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