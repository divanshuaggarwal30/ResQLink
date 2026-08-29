import {
  AlertTriangle,
  Radio,
  ShieldAlert,
  Users,
} from "lucide-react";

export default function MapOverlay({
  incidents = [],
  responders = [],
}) {
  const high = incidents.filter(
    (incident) => incident.severity === "high"
  ).length;

  const medium = incidents.filter(
    (incident) => incident.severity === "medium"
  ).length;

  const pending = incidents.filter(
    (incident) => incident.status === "pending"
  ).length;

  return (
    <div className="pointer-events-none absolute left-4 top-4 z-[1000] flex max-w-[calc(100%-2rem)] flex-wrap gap-2">
      {/* Active */}
      <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/95 px-3 py-2 shadow-xl backdrop-blur">
        <Radio className="h-4 w-4 text-emerald-400" />

        <div>
          <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">
            Active
          </p>

          <p className="text-xs font-bold text-white">
            {incidents.length}
          </p>
        </div>
      </div>

      {/* High */}
      {high > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/40 bg-slate-950/95 px-3 py-2 shadow-xl backdrop-blur">
          <AlertTriangle className="h-4 w-4 animate-pulse text-red-400" />

          <div>
            <p className="text-[9px] font-semibold uppercase tracking-wider text-red-400">
              Critical
            </p>

            <p className="text-xs font-bold text-red-300">
              {high}
            </p>
          </div>
        </div>
      )}

      {/* Medium */}
      {medium > 0 && (
        <div className="hidden items-center gap-2 rounded-xl border border-amber-500/30 bg-slate-950/95 px-3 py-2 shadow-xl backdrop-blur sm:flex">
          <ShieldAlert className="h-4 w-4 text-amber-400" />

          <div>
            <p className="text-[9px] font-semibold uppercase tracking-wider text-amber-400">
              Medium
            </p>

            <p className="text-xs font-bold text-amber-300">
              {medium}
            </p>
          </div>
        </div>
      )}

      {/* Pending */}
      {pending > 0 && (
        <div className="hidden items-center gap-2 rounded-xl border border-blue-500/30 bg-slate-950/95 px-3 py-2 shadow-xl backdrop-blur md:flex">
          <Radio className="h-4 w-4 text-blue-400" />

          <div>
            <p className="text-[9px] font-semibold uppercase tracking-wider text-blue-400">
              Pending
            </p>

            <p className="text-xs font-bold text-blue-300">
              {pending}
            </p>
          </div>
        </div>
      )}

      {/* Responders */}
      {responders.length > 0 && (
        <div className="hidden items-center gap-2 rounded-xl border border-emerald-500/30 bg-slate-950/95 px-3 py-2 shadow-xl backdrop-blur lg:flex">
          <Users className="h-4 w-4 text-emerald-400" />

          <div>
            <p className="text-[9px] font-semibold uppercase tracking-wider text-emerald-400">
              Units
            </p>

            <p className="text-xs font-bold text-emerald-300">
              {responders.length}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}