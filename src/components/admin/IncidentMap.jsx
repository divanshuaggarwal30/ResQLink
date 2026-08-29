import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";

import { useEffect, useMemo } from "react";

import {
  AlertTriangle,
  Navigation,
} from "lucide-react";

import MapOverlay from "./MapOverlay";


const DEFAULT_CENTER = [
  28.6139,
  77.209,
];


const DEFAULT_ZOOM = 11;


const severityConfig = {
  high: {
    color: "#ef4444",
    radius: 12,
    fillOpacity: 0.9,
  },

  medium: {
    color: "#f59e0b",
    radius: 10,
    fillOpacity: 0.85,
  },

  low: {
    color: "#10b981",
    radius: 9,
    fillOpacity: 0.8,
  },
};


const typeLabels = {
  flood: "Flood",
  fire: "Fire",
  medical: "Medical",
  structural: "Structural",
};


function normalizeIncident(incident) {
  const latitude = Number(incident?.latitude);
  const longitude = Number(incident?.longitude);

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return null;
  }

  if (
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  return {
    ...incident,
    latitude,
    longitude,
  };
}


/**
 * ============================================================
 * MAP FOCUS
 * ============================================================
 */

function MapFocus({
  incident,
}) {
  const map = useMap();

  useEffect(() => {
    if (!incident) {
      return;
    }

    const latitude = Number(
      incident.latitude
    );

    const longitude = Number(
      incident.longitude
    );

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      return;
    }

    map.flyTo(
      [
        latitude,
        longitude,
      ],
      15,
      {
        duration: 0.8,
      }
    );
  }, [incident, map]);

  return null;
}


/**
 * ============================================================
 * AUTO FIT
 * ============================================================
 */

function MapAutoFit({
  incidents,
  selectedIncident,
}) {
  const map = useMap();

  useEffect(() => {
    if (
      selectedIncident ||
      incidents.length === 0
    ) {
      return;
    }

    const coordinates = incidents
      .map((incident) => [
        Number(incident.latitude),
        Number(incident.longitude),
      ])
      .filter(
        ([latitude, longitude]) =>
          Number.isFinite(latitude) &&
          Number.isFinite(longitude)
      );

    if (coordinates.length === 0) {
      return;
    }

    if (coordinates.length === 1) {
      map.flyTo(
        coordinates[0],
        14,
        {
          duration: 0.8,
        }
      );

      return;
    }

    const bounds = coordinates;

    map.fitBounds(
      bounds,
      {
        padding: [
          70,
          70,
        ],
        maxZoom: 14,
        animate: true,
        duration: 0.8,
      }
    );
  }, [
    incidents,
    selectedIncident,
    map,
  ]);

  return null;
}


/**
 * ============================================================
 * INCIDENT MARKER
 * ============================================================
 */

function IncidentMarker({
  incident,
  selected,
  onSelect,
}) {
  const config =
    severityConfig[
      incident.severity
    ] ||
    severityConfig.low;

  const type =
    typeLabels[
      incident.type
    ] ||
    incident.type ||
    "Unknown";

  return (
    <CircleMarker
      center={[
        incident.latitude,
        incident.longitude,
      ]}
      radius={
        selected
          ? config.radius + 4
          : config.radius
      }
      pathOptions={{
        color: selected
          ? "#ffffff"
          : config.color,

        fillColor:
          config.color,

        fillOpacity:
          selected
            ? 1
            : config.fillOpacity,

        weight:
          selected
            ? 3
            : 2,
      }}
      eventHandlers={{
        click: () =>
          onSelect(incident),
      }}
    >
      <Popup>
        <div className="min-w-[210px]">
          <div className="flex items-center gap-2">
            <AlertTriangle
              className="h-4 w-4"
              style={{
                color: config.color,
              }}
            />

            <p className="font-bold">
              {type}
            </p>
          </div>

          <div className="mt-3 rounded-lg bg-slate-100 p-2">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">
              Severity
            </p>

            <p className="mt-1 text-sm font-bold uppercase">
              {incident.severity}
            </p>
          </div>

          <div className="mt-2 rounded-lg bg-slate-100 p-2">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">
              Status
            </p>

            <p className="mt-1 text-sm font-semibold">
              {String(
                incident.status || "Unknown"
              ).replaceAll(
                "_",
                " "
              )}
            </p>
          </div>

          <div className="mt-2 flex items-start gap-2 rounded-lg bg-slate-100 p-2">
            <Navigation className="mt-0.5 h-3.5 w-3.5 shrink-0" />

            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">
                Coordinates
              </p>

              <p className="mt-1 font-mono text-xs">
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

          {incident.created_at && (
            <p className="mt-3 text-[10px] text-slate-500">
              Reported{" "}
              {new Date(
                incident.created_at
              ).toLocaleString()}
            </p>
          )}
        </div>
      </Popup>
    </CircleMarker>
  );
}


/**
 * ============================================================
 * MAIN MAP
 * ============================================================
 */

export default function IncidentMap({
  incidents = [],
  responders = [],
  selectedIncident,
  onSelect,
}) {
  const validIncidents = useMemo(
    () =>
      incidents
        .map(normalizeIncident)
        .filter(Boolean),
    [incidents]
  );

  return (
    <div className="relative h-full min-h-[460px] overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl lg:min-h-[540px]">
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom
        className="h-full min-h-[460px] w-full lg:min-h-[540px]"
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapFocus
          incident={selectedIncident}
        />

        <MapAutoFit
          incidents={validIncidents}
          selectedIncident={
            selectedIncident
          }
        />

        {validIncidents.map(
          (incident) => (
            <IncidentMarker
              key={incident.id}
              incident={incident}
              selected={
                selectedIncident?.id ===
                incident.id
              }
              onSelect={onSelect}
            />
          )
        )}

        <MapOverlay
          incidents={validIncidents}
          responders={responders}
        />
      </MapContainer>

      {/* No valid incidents */}
      {validIncidents.length === 0 && (
        <div className="pointer-events-none absolute inset-0 z-[900] flex items-center justify-center">
          <div className="rounded-2xl border border-slate-700 bg-slate-950/90 px-6 py-5 text-center shadow-2xl backdrop-blur">
            <Navigation className="mx-auto h-7 w-7 text-slate-600" />

            <p className="mt-3 text-sm font-semibold text-slate-300">
              Awaiting incident coordinates
            </p>

            <p className="mt-1 text-xs text-slate-600">
              New emergency reports will appear on the map automatically.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}