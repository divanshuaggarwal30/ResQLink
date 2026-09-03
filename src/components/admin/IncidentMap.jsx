import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";

import {
  useEffect,
  useMemo,
} from "react";

import MapOverlay from "./MapOverlay";


const severityConfig = {
  high: {
    color: "#ef4444",
    radius: 11,
  },

  medium: {
    color: "#f59e0b",
    radius: 9,
  },

  low: {
    color: "#10b981",
    radius: 8,
  },
};


const responderStatusConfig = {
  available: {
    color: "#22c55e",
    label: "Available",
  },

  busy: {
    color: "#f59e0b",
    label: "Busy",
  },

  offline: {
    color: "#64748b",
    label: "Offline",
  },
};


function isValidCoordinate(
  latitude,
  longitude
) {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}


/*
============================================================
MAP FOCUS
============================================================
*/

function MapFocus({
  incident,
}) {
  const map = useMap();

  useEffect(() => {
    if (!incident) {
      return;
    }

    const latitude =
      Number(incident.latitude);

    const longitude =
      Number(incident.longitude);

    if (
      !isValidCoordinate(
        latitude,
        longitude
      )
    ) {
      return;
    }

    map.flyTo(
      [
        latitude,
        longitude,
      ],
      14,
      {
        duration: 0.8,
      }
    );
  }, [
    incident,
    map,
  ]);

  return null;
}


/*
============================================================
INCIDENT MARKER
============================================================
*/

function IncidentMarker({
  incident,
  onSelect,
}) {
  const latitude =
    Number(incident.latitude);

  const longitude =
    Number(incident.longitude);

  if (
    !isValidCoordinate(
      latitude,
      longitude
    )
  ) {
    return null;
  }

  const severity =
    String(
      incident.severity ||
        "low"
    ).toLowerCase();

  const config =
    severityConfig[
      severity
    ] ||
    severityConfig.low;

  const status =
    String(
      incident.status ||
        "pending"
    );

  return (
    <CircleMarker
      center={[
        latitude,
        longitude,
      ]}
      radius={
        config.radius
      }
      pathOptions={{
        color:
          config.color,

        fillColor:
          config.color,

        fillOpacity:
          severity === "high"
            ? 0.9
            : 0.75,

        weight:
          severity === "high"
            ? 3
            : 2,
      }}
      eventHandlers={{
        click: () =>
          onSelect?.(
            incident
          ),
      }}
    >
      <Popup>
        <div className="min-w-[190px]">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="font-bold">
              {String(
                incident.type ||
                  "Emergency"
              ).toUpperCase()}
            </p>

            <span
              className="rounded-full px-2 py-1 text-[10px] font-bold uppercase"
              style={{
                backgroundColor:
                  `${config.color}22`,

                color:
                  config.color,
              }}
            >
              {severity}
            </span>
          </div>

          <p className="text-sm">
            Status:{" "}
            <strong>
              {status
                .replaceAll(
                  "_",
                  " "
                )
                .toUpperCase()}
            </strong>
          </p>

          <p className="mt-2 text-xs text-slate-500">
            Coordinates
          </p>

          <p className="font-mono text-xs">
            {latitude.toFixed(6)},{" "}
            {longitude.toFixed(6)}
          </p>

          {incident.responder_id && (
            <p className="mt-2 text-xs font-semibold text-blue-600">
              Responder assigned
            </p>
          )}
        </div>
      </Popup>
    </CircleMarker>
  );
}


/*
============================================================
RESPONDER MARKER
============================================================
*/

function ResponderMarker({
  responder,
}) {
  const latitude =
    Number(responder.latitude);

  const longitude =
    Number(responder.longitude);

  if (
    !isValidCoordinate(
      latitude,
      longitude
    )
  ) {
    return null;
  }

  const availability =
    String(
      responder.availability ||
        "offline"
    ).toLowerCase();

  const config =
    responderStatusConfig[
      availability
    ] ||
    responderStatusConfig.offline;

  return (
    <CircleMarker
      center={[
        latitude,
        longitude,
      ]}
      radius={8}
      pathOptions={{
        color:
          config.color,

        fillColor:
          config.color,

        fillOpacity: 0.95,

        weight: 3,
      }}
    >
      <Popup>
        <div className="min-w-[190px]">
          <div className="flex items-center gap-2">
            <span
              className="h-3 w-3 rounded-full"
              style={{
                backgroundColor:
                  config.color,
              }}
            />

            <p className="font-bold">
              {responder.full_name ||
                "Field Responder"}
            </p>
          </div>

          <p className="mt-2 text-sm">
            Status:{" "}
            <strong
              style={{
                color:
                  config.color,
              }}
            >
              {config.label}
            </strong>
          </p>

          <p className="mt-2 text-xs text-slate-500">
            Current Location
          </p>

          <p className="font-mono text-xs">
            {latitude.toFixed(6)},{" "}
            {longitude.toFixed(6)}
          </p>

          {responder.last_location_at && (
            <p className="mt-2 text-[11px] text-slate-500">
              Updated{" "}
              {new Date(
                responder.last_location_at
              ).toLocaleTimeString()}
            </p>
          )}
        </div>
      </Popup>
    </CircleMarker>
  );
}


/*
============================================================
MAIN MAP
============================================================
*/

export default function IncidentMap({
  incidents = [],
  responders = [],
  selectedIncident = null,
  onSelect,
}) {
  const defaultCenter =
    useMemo(
      () => [
        28.6139,
        77.209,
      ],
      []
    );

  return (
    <div className="relative h-full min-h-[500px] overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl">
      <MapContainer
        center={
          defaultCenter
        }
        zoom={11}
        scrollWheelZoom
        className="h-full min-h-[500px] w-full"
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapFocus
          incident={
            selectedIncident
          }
        />

        {incidents.map(
          (incident) => (
            <IncidentMarker
              key={incident.id}
              incident={
                incident
              }
              onSelect={
                onSelect
              }
            />
          )
        )}

        {responders.map(
          (responder) => (
            <ResponderMarker
              key={
                responder.id
              }
              responder={
                responder
              }
            />
          )
        )}
      </MapContainer>

      <MapOverlay
        incidents={
          incidents
        }
        responders={
          responders
        }
      />

      <div className="pointer-events-none absolute bottom-4 left-4 z-[1000] rounded-xl border border-slate-700 bg-slate-950/90 px-3 py-2 shadow-xl backdrop-blur">
        <div className="flex flex-wrap items-center gap-3 text-[10px] font-semibold uppercase tracking-wide text-slate-300">
          <Legend
            className="bg-red-500"
            label="High"
          />

          <Legend
            className="bg-amber-500"
            label="Medium"
          />

          <Legend
            className="bg-emerald-500"
            label="Low"
          />

          <Legend
            className="bg-blue-500"
            label="Responder"
          />
        </div>
      </div>
    </div>
  );
}


function Legend({
  className,
  label,
}) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className={`h-2.5 w-2.5 rounded-full ${className}`}
      />

      {label}
    </span>
  );
}