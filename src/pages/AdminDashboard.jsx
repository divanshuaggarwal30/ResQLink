import {
  useMemo,
  useState,
} from "react";
import {
  AlertTriangle,
  Clock3,
  Flame,
  LogOut,
  MapPin,
  Radio,
  RefreshCw,
  ShieldCheck,
  UserRound,
  Users,
  Wifi,
} from "lucide-react";
import IncidentMap from "../components/admin/IncidentMap";
import { useAuth } from "../contexts/AuthContext";
import {
  dispatchIncident,
} from "../services/incidentService";
import {
  useIncidents,
} from "../hooks/useIncidents";
import {
  useResponders,
} from "../hooks/useResponders";

const severityStyles = {
  high: {
    badge:
      "border-red-500/30 bg-red-500/10 text-red-300",
    icon:
      "text-red-400",
    border:
      "border-red-500/40",
  },
  medium: {
    badge:
      "border-amber-500/30 bg-amber-500/10 text-amber-300",
    icon:
      "text-amber-400",
    border:
      "border-amber-500/30",
  },
  low: {
    badge:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    icon:
      "text-emerald-400",
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
  return new Date(
    date
  ).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
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

function IncidentCard({
  incident,
  selected,
  onSelect,
}) {
  const style =
    severityStyles[
      incident.severity
    ] ||
    severityStyles.low;
  const isHigh =
    incident.severity ===
    "high";

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
          className={`mt-1 rounded-lg border p-2 ${
            style.badge
          } ${
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

          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">
              {formatStatus(
                incident.status
              )}
            </span>

            {incident.responder_id && (
              <span className="text-[10px] font-semibold text-blue-400">
                ASSIGNED
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

export default function AdminDashboard() {
  const { user, signOut } =
    useAuth();

  const {
    incidents,
    loading,
    error,
    reload,
  } = useIncidents();

  const {
    responders,
    loading:
      respondersLoading,
    error:
      respondersError,
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

  const currentSelectedIncident =
    useMemo(() => {
      if (!selectedIncident) {
        return null;
      }

      return (
        incidents.find(
          (incident) =>
            incident.id ===
            selectedIncident.id
        ) || null
      );
    }, [
      incidents,
      selectedIncident,
    ]);

  const stats =
    useMemo(() => {
      const active =
        incidents.filter(
          (incident) =>
            incident.status !==
            "resolved"
        );

      const high =
        active.filter(
          (incident) =>
            incident.severity ===
            "high"
        );

      const pending =
        active.filter(
          (incident) =>
            incident.status ===
              "pending" &&
            !incident.responder_id
        );

      const missions =
        active.filter(
          (incident) =>
            Boolean(
              incident.responder_id
            )
        );

      const available =
        responders.filter(
          (responder) =>
            responder.availability ===
            "available"
        );

      const busy =
        responders.filter(
          (responder) =>
            responder.availability ===
            "busy"
        );

      return {
        active:
          active.length,
        high:
          high.length,
        pending:
          pending.length,
        missions:
          missions.length,
        available:
          available.length,
        busy:
          busy.length,
      };
    }, [
      incidents,
      responders,
    ]);

  const availableResponders =
    useMemo(() => {
      return responders
        .filter(
          (responder) =>
            responder.role ===
              "responder" &&
            responder.availability ===
              "available"
        )
        .sort(
          (a, b) =>
            (
              a.full_name ||
              ""
            ).localeCompare(
              b.full_name ||
                ""
            )
        );
    }, [
      responders,
    ]);

  const handleDispatch =
    async () => {
      if (!currentSelectedIncident) {
        setActionError(
          "Select an incident first."
        );
        return;
      }

      if (
        currentSelectedIncident.status !==
          "pending" ||
        currentSelectedIncident.responder_id
      ) {
        setActionError(
          "This incident is no longer available for dispatch."
        );
        return;
      }

      if (!selectedResponder) {
        setActionError(
          "Select an available responder first."
        );
        return;
      }

      const responder =
        responders.find(
          (item) =>
            item.id ===
            selectedResponder
        );

      if (
        !responder ||
        responder.availability !==
          "available"
      ) {
        setActionError(
          "That responder is no longer available."
        );
        return;
      }

      setDispatching(true);
      setActionError("");

      try {
        await dispatchIncident(
          currentSelectedIncident.id,
          selectedResponder
        );

        setSelectedIncident(
          null
        );
        setSelectedResponder("");
      } catch (err) {
        console.error(
          "Dispatch failed:",
          err
        );

        setActionError(
          err?.message ||
            "Unable to dispatch responder."
        );
      } finally {
        setDispatching(false);
      }
    };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
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

            <div className="hidden items-center gap-2 text-xs text-slate-500 lg:flex">
              <Wifi className="h-3.5 w-3.5 text-emerald-400" />
              REALTIME
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

      <section className="border-b border-slate-800 bg-slate-900/50 px-4 py-4 lg:px-6">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Stat
            label="Active Incidents"
            value={stats.active}
            icon={Radio}
          />
          <Stat
            label="High Severity"
            value={stats.high}
            icon={AlertTriangle}
            danger
          />
          <Stat
            label="Awaiting Dispatch"
            value={stats.pending}
            icon={Clock3}
          />
          <Stat
            label="Active Missions"
            value={stats.missions}
            icon={ShieldCheck}
          />
          <Stat
            label="Available Units"
            value={stats.available}
            icon={Users}
          />
          <Stat
            label="Busy Units"
            value={stats.busy}
            icon={UserRound}
          />
        </div>
      </section>

      <main className="grid min-h-[calc(100vh-137px)] lg:grid-cols-[380px_1fr]">
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
                      currentSelectedIncident?.id ===
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

        <section className="min-w-0 p-5 lg:p-8">
          <div className="mx-auto max-w-7xl">
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
                    Monitor incidents, track field units, and coordinate response in real time.
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

            <div className="mb-6">
              <IncidentMap
                incidents={incidents}
                responders={responders}
                selectedIncident={
                  currentSelectedIncident
                }
                onSelect={
                  setSelectedIncident
                }
              />
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 lg:p-6">
              <div className="mb-6">
                <p className="text-xs font-semibold uppercase tracking-widest text-red-400">
                  Incident Control
                </p>

                <h3 className="mt-2 text-xl font-bold">
                  Dispatch Center
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Dispatch is validated and executed by the database.
                </p>
              </div>

              {!currentSelectedIncident ? (
                <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/50">
                  <div className="px-6 text-center">
                    <AlertTriangle className="mx-auto h-10 w-10 text-slate-700" />
                    <p className="mt-4 font-medium text-slate-400">
                      No incident selected
                    </p>
                    <p className="mt-2 max-w-sm text-sm text-slate-600">
                      Select an incident from the feed or click a map marker.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-3">
                          <div
                            className={`rounded-xl border p-3 ${
                              severityStyles[
                                currentSelectedIncident.severity
                              ]?.badge ||
                              severityStyles.low
                                .badge
                            }`}
                          >
                            <AlertTriangle
                              className={`h-6 w-6 ${
                                severityStyles[
                                  currentSelectedIncident.severity
                                ]?.icon ||
                                severityStyles.low
                                  .icon
                              }`}
                            />
                          </div>

                          <div>
                            <h3 className="text-xl font-bold">
                              {typeLabels[
                                currentSelectedIncident
                                  .type
                              ] ||
                                currentSelectedIncident
                                  .type}
                            </h3>

                            <span
                              className={`mt-1 inline-flex rounded-full border px-2 py-1 text-xs font-bold uppercase ${
                                severityStyles[
                                  currentSelectedIncident
                                    .severity
                                ]?.badge ||
                                severityStyles.low
                                  .badge
                              }`}
                            >
                              {
                                currentSelectedIncident.severity
                              }{" "}
                              severity
                            </span>
                          </div>
                        </div>
                      </div>

                      <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-semibold uppercase text-slate-300">
                        {formatStatus(
                          currentSelectedIncident.status
                        )}
                      </span>
                    </div>

                    <div className="mt-8 grid gap-4 sm:grid-cols-2">
                      <InfoRow
                        icon={MapPin}
                        label="Latitude"
                        value={Number(
                          currentSelectedIncident.latitude
                        ).toFixed(6)}
                      />
                      <InfoRow
                        icon={MapPin}
                        label="Longitude"
                        value={Number(
                          currentSelectedIncident.longitude
                        ).toFixed(6)}
                      />
                      <InfoRow
                        icon={Clock3}
                        label="Reported"
                        value={formatTime(
                          currentSelectedIncident.created_at
                        )}
                      />
                      <InfoRow
                        icon={UserRound}
                        label="Incident ID"
                        value={String(
                          currentSelectedIncident.id
                        ).slice(0, 8)}
                      />
                    </div>
                  </div>

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
                          Only currently available units can be dispatched.
                        </p>
                      </div>
                    </div>

                    <div className="mt-6">
                      <label
                        htmlFor="responder"
                        className="mb-2 block text-sm font-medium text-slate-300"
                      >
                        Available Responder
                      </label>

                      <select
                        id="responder"
                        value={
                          selectedResponder
                        }
                        onChange={(event) =>
                          setSelectedResponder(
                            event.target.value
                          )
                        }
                        disabled={
                          currentSelectedIncident.status !==
                            "pending" ||
                          Boolean(
                            currentSelectedIncident.responder_id
                          ) ||
                          respondersLoading
                        }
                        className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="">
                          {respondersLoading
                            ? "Loading responders..."
                            : "Select available responder..."}
                        </option>

                        {availableResponders.map(
                          (responder) => (
                            <option
                              key={
                                responder.id
                              }
                              value={
                                responder.id
                              }
                            >
                              🟢{" "}
                              {responder.full_name ||
                                "Unnamed Responder"}
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    {respondersError && (
                      <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                        {respondersError}
                      </div>
                    )}

                    {!respondersLoading &&
                      availableResponders.length ===
                        0 && (
                        <div className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-300">
                          No responders are currently available.
                        </div>
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
                        currentSelectedIncident.status !==
                          "pending" ||
                        Boolean(
                          currentSelectedIncident.responder_id
                        )
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
                          {currentSelectedIncident.responder_id
                            ? "ALREADY DISPATCHED"
                            : "DISPATCH TEAM"}
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