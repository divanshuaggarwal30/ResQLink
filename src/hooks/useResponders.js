import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { supabase } from "../lib/supabase";

import {
  getResponders,
} from "../services/responderService";

/**
 * Realtime responder state for the Admin Command Center.
 *
 * Handles:
 * - Initial responder loading
 * - INSERT
 * - UPDATE
 * - DELETE
 *
 * This means responder availability and GPS
 * changes appear in the Admin UI without refresh.
 */
export function useResponders() {
  const [responders, setResponders] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

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
          "Failed to load responders:",
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

    async function initialize() {
      try {
        setLoading(true);
        setError("");

        const data =
          await getResponders();

        if (mounted) {
          setResponders(data);
        }
      } catch (err) {
        console.error(
          "Failed to initialize responders:",
          err
        );

        if (mounted) {
          setError(
            err?.message ||
              "Unable to load responders."
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    initialize();

    /**
     * Realtime channel for responder profiles.
     *
     * We listen to all profile updates and then
     * keep only responder records in local state.
     */
    const channel = supabase
      .channel("responder-profiles-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "profiles",
        },
        (payload) => {
          const responder =
            payload.new;

          if (
            responder.role !==
            "responder"
          ) {
            return;
          }

          setResponders((current) => {
            const exists =
              current.some(
                (item) =>
                  item.id ===
                  responder.id
              );

            if (exists) {
              return current;
            }

            return [
              ...current,
              responder,
            ].sort((a, b) =>
              (
                a.full_name || ""
              ).localeCompare(
                b.full_name || ""
              )
            );
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
        },
        (payload) => {
          const updated =
            payload.new;

          if (
            updated.role !==
            "responder"
          ) {
            return;
          }

          setResponders(
            (current) => {
              const exists =
                current.some(
                  (item) =>
                    item.id ===
                    updated.id
                );

              if (!exists) {
                return [
                  ...current,
                  updated,
                ].sort((a, b) =>
                  (
                    a.full_name || ""
                  ).localeCompare(
                    b.full_name || ""
                  )
                );
              }

              return current.map(
                (item) =>
                  item.id ===
                  updated.id
                    ? {
                        ...item,
                        ...updated,
                      }
                    : item
              );
            }
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "profiles",
        },
        (payload) => {
          const deletedId =
            payload.old?.id;

          if (!deletedId) {
            return;
          }

          setResponders(
            (current) =>
              current.filter(
                (item) =>
                  item.id !==
                  deletedId
              )
          );
        }
      )
      .subscribe((status) => {
        console.log(
          "Responder realtime:",
          status
        );
      });

    return () => {
      mounted = false;

      supabase.removeChannel(
        channel
      );
    };
  }, []);

  return {
    responders,
    loading,
    error,
    reload: loadResponders,
  };
}