import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  getMyAssignedIncidents,
  subscribeToResponderIncidents,
} from "../services/incidentService";

export function useResponderIncidents() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getMyAssignedIncidents();

      setIncidents(data);
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          "Unable to load assigned missions."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();

    const unsubscribe =
      subscribeToResponderIncidents(
        (payload) => {
          if (
            payload.eventType === "INSERT"
          ) {
            if (payload.new.responder_id) {
              setIncidents((current) => {
                const exists = current.some(
                  (incident) =>
                    incident.id ===
                    payload.new.id
                );

                if (exists) return current;

                return [
                  payload.new,
                  ...current,
                ];
              });
            }
          }

          if (
            payload.eventType === "UPDATE"
          ) {
            setIncidents((current) => {
              if (
                payload.new.status ===
                  "resolved" ||
                !payload.new.responder_id
              ) {
                return current.filter(
                  (incident) =>
                    incident.id !==
                    payload.new.id
                );
              }

              const exists = current.some(
                (incident) =>
                  incident.id ===
                  payload.new.id
              );

              if (exists) {
                return current.map(
                  (incident) =>
                    incident.id ===
                    payload.new.id
                      ? payload.new
                      : incident
                );
              }

              return [
                payload.new,
                ...current,
              ];
            });
          }

          if (
            payload.eventType === "DELETE"
          ) {
            setIncidents((current) =>
              current.filter(
                (incident) =>
                  incident.id !==
                  payload.old.id
              )
            );
          }
        }
      );

    return unsubscribe;
  }, [load]);

  return {
    incidents,
    loading,
    error,
    reload: load,
  };
}