import {
  AlertTriangle,
  Radio,
  Shield,
  Users,
} from "lucide-react";

export default function MapOverlay({
  incidents = [],
  responders = [],
}) {
  const high =
    incidents.filter(
      (incident) =>
        String(
          incident.severity
        ).toLowerCase() === "high"
    ).length;

  const available =
    responders.filter(
      (responder) =>
        responder.availability ===
        "available"
    ).length;

  const busy =
    responders.filter(
      (responder) =>
        responder.availability ===
        "busy"
    ).length;

  const activeMissions =
    incidents.filter(
      (incident) =>
        [
          "pending",
          "accepted",
          "arrived",
        ].includes(
          String(
            incident.status
          ).toLowerCase()
        ) &&
        incident.responder_id
    ).length;

  return (
    <div className="absolute left-4 top-4 z-[1000] flex max-w-[calc(100%-2rem)] flex-wrap gap-2">
      <Metric
        icon={Radio}
        label="ACTIVE"
        value={incidents.length}
        iconClass="text-emerald-400"
      />

      {high > 0 && (
        <Metric
          icon={AlertTriangle}
          label="HIGH"
          value={high}
          danger
        />
      )}

      <Metric
        icon={Users}
        label="AVAILABLE"
        value={available}
        iconClass="text-blue-400"
      />

      <Metric
        icon={Shield}
        label="BUSY"
        value={busy}
        iconClass="text-amber-400"
      />

      <Metric
        icon={Shield}
        label="MISSIONS"
        value={activeMissions}
        iconClass="text-purple-400"
      />
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  danger = false,
  iconClass = "text-slate-400",
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-xl border bg-slate-950/90 px-3 py-2 shadow-xl backdrop-blur ${
        danger
          ? "border-red-500/30"
          : "border-slate-700"
      }`}
    >
      <Icon
        className={`h-4 w-4 ${
          danger
            ? "text-red-400"
            : iconClass
        }`}
      />

      <span
        className={`text-xs font-semibold ${
          danger
            ? "text-red-300"
            : "text-white"
        }`}
      >
        {value} {label}
      </span>
    </div>
  );
}
