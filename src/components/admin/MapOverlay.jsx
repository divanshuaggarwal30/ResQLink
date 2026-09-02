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
  const high = incidents.filter(
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

  const activeMissions =
    incidents.filter(
      (incident) =>
        [
          "accepted",
          "arrived",
          "in_progress",
        ].includes(
          String(
            incident.status
          ).toLowerCase()
        )
    ).length;

  return (
    <div className="absolute left-4 top-4 z-[1000] flex max-w-[calc(100%-2rem)] flex-wrap gap-2">
      <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/90 px-3 py-2 shadow-xl backdrop-blur">
        <Radio className="h-4 w-4 text-emerald-400" />

        <span className="text-xs font-semibold text-white">
          {incidents.length} ACTIVE
        </span>
      </div>

      {high > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-slate-950/90 px-3 py-2 shadow-xl backdrop-blur">
          <AlertTriangle className="h-4 w-4 text-red-400" />

          <span className="text-xs font-semibold text-red-300">
            {high} HIGH
          </span>
        </div>
      )}

      <div className="flex items-center gap-2 rounded-xl border border-blue-500/20 bg-slate-950/90 px-3 py-2 shadow-xl backdrop-blur">
        <Users className="h-4 w-4 text-blue-400" />

        <span className="text-xs font-semibold text-blue-300">
          {available} AVAILABLE
        </span>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-purple-500/20 bg-slate-950/90 px-3 py-2 shadow-xl backdrop-blur">
        <Shield className="h-4 w-4 text-purple-400" />

        <span className="text-xs font-semibold text-purple-300">
          {activeMissions} MISSIONS
        </span>
      </div>
    </div>
  );
}