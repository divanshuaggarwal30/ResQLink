import { useCallback, useEffect, useState } from "react";

import {
  getActiveIncidents,
  subscribeToIncidents,
} from "../services/incidentService";

export function useIncidents() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadIncidents = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getActiveIncidents();

      setIncidents(data);
    } catch (err) {
      console.error(err);
      setError(
        err.message || "Unable to load incidents."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadIncidents();

    const unsubscribe = subscribeToIncidents(
      (payload) => {
        console.log("Realtime incident:", payload);

        if (payload.eventType === "INSERT") {
          setIncidents((current) => {
            const exists = current.some(
              (incident) =>
                incident.id === payload.new.id
            );

            if (exists) return current;

            return [payload.new, ...current];
          });
        }

        if (payload.eventType === "UPDATE") {
          setIncidents((current) => {
            if (payload.new.status === "resolved") {
              return current.filter(
                (incident) =>
                  incident.id !== payload.new.id
              );
            }

            return current.map((incident) =>
              incident.id === payload.new.id
                ? payload.new
                : incident
            );
          });
        }

        if (payload.eventType === "DELETE") {
          setIncidents((current) =>
            current.filter(
              (incident) =>
                incident.id !== payload.old.id
            )
          );
        }
      }
    );

    return unsubscribe;
  }, [loadIncidents]);

  return {
    incidents,
    loading,
    error,
    reload: loadIncidents,
  };
}