import {
  useEffect,
  useMemo,
  useState,
} from "react";

import IncidentMap from "../components/admin/IncidentMap";

import {
  AlertTriangle,
  Clock3,
  Flame,
  LogOut,
  MapPin,
  Navigation as NavigationIcon,
  Radio,
  RefreshCw,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";

import { useAuth } from "../contexts/AuthContext";

import { dispatchIncident } from "../services/incidentService";

import { useIncidents } from "../hooks/useIncidents";

import { useResponders } from "../hooks/useResponders";

const severityStyles = {
  high: {
    badge:
      "border-red-500/30 bg-red-500/10 text-red-300",

    icon: "text-red-400",

    border:
      "border-red-500/40",
  },

  medium: {
    badge:
      "border-amber-500/30 bg-amber-500/10 text-amber-300",

    icon: "text-amber-400",

    border:
      "border-amber-500/30",
  },

  low: {
    badge:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",

    icon: "text-emerald-400",

    border:
      "border-emerald-500/20",
  },
};

const typeLabels = {
  flood: "Flood",
  fire: "Fire",
  medical: "Medical",
  structural: "Structural",
};

function formatTime(date) {
  if (!date) {
    return "Unknown";
  }

  return new Date(date).toLocaleTimeString(
    [],
    {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }
  );
}

function formatStatus(status) {
  if (!status) {
    return "Unknown";
  }

  return String(status)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

/**
 * ============================================================
 * INCIDENT CARD
 * ============================================================
 */

function IncidentCard({
  incident,
  selected,
  onSelect,
}) {
  const style =
    severityStyles[
      incident.severity
    ] || severityStyles.low;

  const isHigh =
    incident.severity === "high";

  return (
    <button
      type="button"
      onClick={() =>
        onSelect(incident)
      }
      className={`w-full border-b border-slate-800 p-4 text-left transition ${
        selected
          ? "bg-slate-800"
          : "bg-transparent"
      } hover:bg-slate-800/70`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`mt-1 rounded-lg border p-2 ${style.badge} ${
            isHigh
              ? "animate-pulse"
              : ""
          }`}
        >
          <AlertTriangle
            className={`h-4 w-4 ${style.icon}`}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate font-semibold text-white">
              {typeLabels[
                incident.type
              ] || incident.type}
            </p>

            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${style.badge}`}
            >
              {incident.severity}
            </span>
          </div>

          <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
            <Clock3 className="h-3.5 w-3.5" />

            {formatTime(
              incident.created_at
            )}
          </div>

          <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
            <MapPin className="h-3.5 w-3.5" />

            {Number(
              incident.latitude
            ).toFixed(4)}
            ,{" "}
            {Number(
              incident.longitude
            ).toFixed(4)}
          </div>

          <div className="mt-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">
              {formatStatus(
                incident.status
              )}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

/**
 * ============================================================
 * MAIN
 * ============================================================
 */

export default function AdminDashboard() {
  const {
    user,
    signOut,
  } = useAuth();

  const {
    incidents,
    loading,
    error,
    reload,
  } = useIncidents();

  /**
   * ==========================================================
   * REALTIME RESPONDERS
   * ==========================================================
   *
   * useResponders() handles:
   *
   * 1. Initial responder fetch
   * 2. INSERT events
   * 3. UPDATE events
   * 4. DELETE events
   * 5. Realtime GPS updates
   *
   * This means the Admin map receives responder
   * location changes without a page refresh.
   */

  const {
    responders,
    loading: respondersLoading,
    error: respondersError,
  } = useResponders();

  const [
    selectedIncident,
    setSelectedIncident,
  ] = useState(null);

  const [
    selectedResponder,
    setSelectedResponder,
  ] = useState("");

  const [
    dispatching,
    setDispatching,
  ] = useState(false);

  const [
    actionError,
    setActionError,
  ] = useState("");

  /**
   * ==========================================================
   * KEEP SELECTED INCIDENT IN SYNC
   * ==========================================================
   */

  useEffect(() => {
    if (!selectedIncident) {
      return;
    }

    const updatedIncident =
      incidents.find(
        (incident) =>
          incident.id ===
          selectedIncident.id
      );

    if (updatedIncident) {
      setSelectedIncident(
        updatedIncident
      );
    } else {
      setSelectedIncident(null);
      setSelectedResponder("");
    }
  }, [
    incidents,
    selectedIncident,
  ]);

  /**
   * ==========================================================
   * KEEP RESPONDER SELECTION VALID
   * ==========================================================
   *
   * If a responder goes offline or disappears from the
   * realtime responder list, clear the selection.
   */

  useEffect(() => {
    if (!selectedResponder) {
      return;
    }

    const responderExists =
      responders.some(
        (responder) =>
          responder.id ===
          selectedResponder
      );

    if (!responderExists) {
      setSelectedResponder("");
    }
  }, [
    responders,
    selectedResponder,
  ]);

  /**
   * ==========================================================
   * STATS
   * ==========================================================
   */

  const stats = useMemo(() => {
    return {
      total:
        incidents.length,

      high:
        incidents.filter(
          (incident) =>
            incident.severity ===
            "high"
        ).length,

      medium:
        incidents.filter(
          (incident) =>
            incident.severity ===
            "medium"
        ).length,

      pending:
        incidents.filter(
          (incident) =>
            incident.status ===
            "pending"
        ).length,
    };
  }, [incidents]);

  /**
   * ==========================================================
   * AVAILABLE RESPONDERS
   * ==========================================================
   */

  const availableResponders =
    useMemo(() => {
      return responders.filter(
        (responder) =>
          responder.availability ===
            "available" ||
          !responder.availability
      );
    }, [responders]);

  /**
   * ==========================================================
   * DISPATCH
   * ==========================================================
   */

  const handleDispatch =
    async () => {
      if (!selectedIncident) {
        setActionError(
          "Select an incident first."
        );

        return;
      }

      if (!selectedResponder) {
        setActionError(
          "Select a responder first."
        );

        return;
      }

      setDispatching(true);
      setActionError("");

      try {
        await dispatchIncident(
          selectedIncident.id,
          selectedResponder
        );

        setSelectedIncident(null);
        setSelectedResponder("");
      } catch (err) {
        console.error(err);

        setActionError(
          err.message ||
            "Unable to dispatch responder."
        );
      } finally {
        setDispatching(false);
      }
    };

  /**
   * ==========================================================
   * RENDER
   * ==========================================================
   */

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* ====================================================
          HEADER
      ==================================================== */}

      <header className="border-b border-slate-800 bg-slate-950">
        <div className="flex h-16 items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-red-500/10 p-2">
              <ShieldCheck className="h-5 w-5 text-red-400" />
            </div>

            <div>
              <h1 className="font-bold">
                ResQLink
              </h1>

              <p className="text-xs text-slate-500">
                Command Center
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden items-center gap-2 text-xs text-emerald-400 sm:flex">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />

              SYSTEM ONLINE
            </div>

            <span className="hidden max-w-[240px] truncate text-sm text-slate-400 md:block">
              {user?.email}
            </span>

            <button
              type="button"
              onClick={signOut}
              className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
              title="Sign out"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* ====================================================
          STATS
      ==================================================== */}

      <section className="border-b border-slate-800 bg-slate-900/50 px-4 py-4 lg:px-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat
            label="Active Incidents"
            value={stats.total}
            icon={Radio}
          />

          <Stat
            label="High Severity"
            value={stats.high}
            icon={AlertTriangle}
            danger
          />

          <Stat
            label="Medium Severity"
            value={stats.medium}
            icon={Flame}
          />

          <Stat
            label="Pending Dispatch"
            value={stats.pending}
            icon={Users}
          />
        </div>
      </section>

      {/* ====================================================
          MAIN
      ==================================================== */}

      <main className="grid min-h-[calc(100vh-137px)] lg:grid-cols-[380px_1fr]">
        {/* ==================================================
            LIVE INCIDENT FEED
        ================================================== */}

        <aside className="border-r border-slate-800 bg-slate-900/30">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-4">
            <div>
              <h2 className="font-semibold">
                Live Incidents
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Realtime emergency feed
              </p>
            </div>

            <button
              type="button"
              onClick={reload}
              disabled={loading}
              className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
              title="Refresh"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  loading
                    ? "animate-spin"
                    : ""
                }`}
              />
            </button>
          </div>

          {error && (
            <div className="m-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <div className="max-h-[calc(100vh-220px)] overflow-y-auto">
            {loading &&
            incidents.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500">
                Loading incidents...
              </div>
            ) : incidents.length ===
              0 ? (
              <div className="p-8 text-center">
                <Radio className="mx-auto h-8 w-8 text-slate-700" />

                <p className="mt-3 font-medium text-slate-400">
                  No active incidents
                </p>

                <p className="mt-1 text-xs text-slate-600">
                  New emergency reports will appear here automatically.
                </p>
              </div>
            ) : (
              incidents.map(
                (incident) => (
                  <IncidentCard
                    key={incident.id}
                    incident={incident}
                    selected={
                      selectedIncident?.id ===
                      incident.id
                    }
                    onSelect={
                      setSelectedIncident
                    }
                  />
                )
              )
            )}
          </div>
        </aside>

        {/* ==================================================
            OPERATIONS
        ================================================== */}

        <section className="min-w-0 p-5 lg:p-8">
          <div className="mx-auto max-w-7xl">
            {/* Heading */}

            <div className="mb-6">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-red-400">
                    Operations
                  </p>

                  <h2 className="mt-2 text-2xl font-bold">
                    Emergency Operations
                  </h2>

                  <p className="mt-2 max-w-2xl text-sm text-slate-500">
                    Monitor live incidents, locate emergencies, and coordinate field response.
                  </p>
                </div>

                <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />

                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                    Live Operations
                  </span>
                </div>
              </div>
            </div>

            {/* =================================================
                RESPONDER STATUS
            ================================================= */}

            <div className="mb-6 grid gap-3 sm:grid-cols-3">
              <ResponderStat
                label="Total Responders"
                value={responders.length}
                icon={Users}
              />

              <ResponderStat
                label="Available"
                value={
                  availableResponders.length
                }
                icon={ShieldCheck}
              />

              <ResponderStat
                label="Live Tracking"
                value={
                  responders.filter(
                    (responder) =>
                      responder.latitude != null &&
                      responder.longitude != null
                  ).length
                }
                icon={NavigationIcon}
              />
            </div>

            {respondersError && (
              <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
                {respondersError}
              </div>
            )}

            {/* =================================================
                LIVE MAP
            ================================================= */}

            <div className="mb-6">
              <IncidentMap
                incidents={
                  incidents
                }
                responders={
                  responders
                }
                selectedIncident={
                  selectedIncident
                }
                onSelect={
                  setSelectedIncident
                }
              />
            </div>

            {/* =================================================
                INCIDENT CONTROL
            ================================================= */}

            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 lg:p-6">
              <div className="mb-6">
                <p className="text-xs font-semibold uppercase tracking-widest text-red-400">
                  Incident Control
                </p>

                <h3 className="mt-2 text-xl font-bold">
                  Dispatch Center
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Select an active emergency to coordinate a field response.
                </p>
              </div>

              {!selectedIncident ? (
                <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/50">
                  <div className="px-6 text-center">
                    <AlertTriangle className="mx-auto h-10 w-10 text-slate-700" />

                    <p className="mt-4 font-medium text-slate-400">
                      No incident selected
                    </p>

                    <p className="mt-2 max-w-sm text-sm text-slate-600">
                      Select an incident from the feed or click a map marker to view details.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
                  {/* Incident Details */}

                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-3">
                          <div
                            className={`rounded-xl border p-3 ${
                              severityStyles[
                                selectedIncident.severity
                              ]?.badge ||
                              severityStyles.low
                                .badge
                            }`}
                          >
                            <AlertTriangle
                              className={`h-6 w-6 ${
                                severityStyles[
                                  selectedIncident.severity
                                ]?.icon ||
                                severityStyles.low
                                  .icon
                              }`}
                            />
                          </div>

                          <div>
                            <h3 className="text-xl font-bold">
                              {typeLabels[
                                selectedIncident.type
                              ] ||
                                selectedIncident.type}
                            </h3>

                            <span
                              className={`mt-1 inline-flex rounded-full border px-2 py-1 text-xs font-bold uppercase ${
                                severityStyles[
                                  selectedIncident.severity
                                ]?.badge ||
                                severityStyles.low
                                  .badge
                              }`}
                            >
                              {
                                selectedIncident.severity
                              }{" "}
                              severity
                            </span>
                          </div>
                        </div>
                      </div>

                      <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase text-amber-300">
                        {formatStatus(
                          selectedIncident.status
                        )}
                      </span>
                    </div>

                    <div className="mt-8 grid gap-4 sm:grid-cols-2">
                      <InfoRow
                        icon={MapPin}
                        label="Latitude"
                        value={Number(
                          selectedIncident.latitude
                        ).toFixed(6)}
                      />

                      <InfoRow
                        icon={MapPin}
                        label="Longitude"
                        value={Number(
                          selectedIncident.longitude
                        ).toFixed(6)}
                      />

                      <InfoRow
                        icon={Clock3}
                        label="Reported"
                        value={formatTime(
                          selectedIncident.created_at
                        )}
                      />

                      <InfoRow
                        icon={UserRound}
                        label="Incident ID"
                        value={String(
                          selectedIncident.id
                        ).slice(0, 8)}
                      />
                    </div>
                  </div>

                  {/* Dispatch */}

                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-blue-500/10 p-2">
                        <Users className="h-5 w-5 text-blue-400" />
                      </div>

                      <div>
                        <h3 className="font-semibold">
                          Dispatch Field Responder
                        </h3>

                        <p className="text-xs text-slate-500">
                          Assign an available response team
                        </p>
                      </div>
                    </div>

                    <div className="mt-6">
                      <label
                        htmlFor="responder"
                        className="mb-2 block text-sm font-medium text-slate-300"
                      >
                        Responder
                      </label>

                      <select
                        id="responder"
                        value={
                          selectedResponder
                        }
                        onChange={(
                          event
                        ) =>
                          setSelectedResponder(
                            event.target.value
                          )
                        }
                        disabled={
                          selectedIncident.status !==
                          "pending"
                        }
                        className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="">
                          {respondersLoading
                            ? "Loading responders..."
                            : "Select a responder..."}
                        </option>

                        {availableResponders.map(
                          (
                            responder
                          ) => (
                            <option
                              key={
                                responder.id
                              }
                              value={
                                responder.id
                              }
                            >
                              {responder.full_name ||
                                "Unnamed Responder"}
                              {" "}
                              —{" "}
                              {responder.availability ||
                                "available"}
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    {availableResponders.length ===
                      0 &&
                      !respondersLoading && (
                        <p className="mt-3 text-xs text-amber-400">
                          No responders are currently available.
                        </p>
                      )}

                    {actionError && (
                      <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                        {actionError}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={
                        handleDispatch
                      }
                      disabled={
                        dispatching ||
                        !selectedResponder ||
                        selectedIncident.status !==
                          "pending"
                      }
                      className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-4 font-bold transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {dispatching ? (
                        <>
                          <RefreshCw className="h-5 w-5 animate-spin" />

                          DISPATCHING...
                        </>
                      ) : (
                        <>
                          <Radio className="h-5 w-5" />

                          {selectedIncident.status ===
                          "pending"
                            ? "DISPATCH TEAM"
                            : "ALREADY DISPATCHED"}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

/**
 * ============================================================
 * STAT
 * ============================================================
 */

function Stat({
  label,
  value,
  icon: Icon,
  danger = false,
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">
          {label}
        </span>

        <Icon
          className={`h-4 w-4 ${
            danger
              ? "text-red-400"
              : "text-slate-500"
          }`}
        />
      </div>

      <p className="mt-2 text-2xl font-bold">
        {value}
      </p>
    </div>
  );
}

/**
 * ============================================================
 * RESPONDER STAT
 * ============================================================
 */

function ResponderStat({
  label,
  value,
  icon: Icon,
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">
          {label}
        </span>

        <Icon className="h-4 w-4 text-blue-400" />
      </div>

      <p className="mt-2 text-2xl font-bold text-white">
        {value}
      </p>
    </div>
  );
}

/**
 * ============================================================
 * INFO ROW
 * ============================================================
 */

function InfoRow({
  icon: Icon,
  label,
  value,
}) {
  return (
    <div className="rounded-xl bg-slate-900 p-4">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Icon className="h-3.5 w-3.5" />

        {label}
      </div>

      <p className="mt-2 truncate font-mono text-sm text-slate-200">
        {value}
      </p>
    </div>
  );
}