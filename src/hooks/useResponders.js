import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { supabase } from "../lib/supabase";

import {
  getResponders,
} from "../services/responderService";

export function useResponders() {
  const [
    responders,
    setResponders,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const loadResponders =
    useCallback(async () => {
      try {
        setLoading(true);
        setError("");

        const data =
          await getResponders();

        setResponders(data);
      } catch (err) {
        console.error(
          "Responder loading error:",
          err
        );

        setError(
          err?.message ||
            "Unable to load responders."
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    let mounted = true;

    loadResponders();

    const channel =
      supabase
        .channel(
          "resqlink-responder-operations"
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "profiles",
          },
          (payload) => {
            const next =
              payload.new;

            const previous =
              payload.old;

            /*
            INSERT
            */

            if (
              payload.eventType ===
                "INSERT" &&
              next?.role ===
                "responder"
            ) {
              setResponders(
                (current) => {
                  if (
                    current.some(
                      (item) =>
                        item.id ===
                        next.id
                    )
                  ) {
                    return current;
                  }

                  return [
                    ...current,
                    next,
                  ].sort((a, b) =>
                    (
                      a.full_name ||
                      ""
                    ).localeCompare(
                      b.full_name ||
                        ""
                    )
                  );
                }
              );

              return;
            }

            /*
            UPDATE
            */

            if (
              payload.eventType ===
                "UPDATE" &&
              next?.role ===
                "responder"
            ) {
              setResponders(
                (current) =>
                  current.map(
                    (item) =>
                      item.id ===
                      next.id
                        ? {
                            ...item,
                            ...next,
                          }
                        : item
                  )
              );

              return;
            }

            /*
            DELETE
            */

            if (
              payload.eventType ===
                "DELETE" &&
              previous?.id
            ) {
              setResponders(
                (current) =>
                  current.filter(
                    (item) =>
                      item.id !==
                      previous.id
                  )
              );
            }
          }
        )
        .subscribe((status) => {
          console.log(
            "ResQLink responder realtime:",
            status
          );
        });

    return () => {
      mounted = false;

      supabase.removeChannel(
        channel
      );
    };
  }, [loadResponders]);

  return {
    responders,
    loading,
    error,
    reload: loadResponders,
  };
}