import { supabase } from "../lib/supabase";

/**
 * Create a new emergency incident.
 * Used by the Civilian portal.
 */
export async function createIncident({
  type,
  severity,
  latitude,
  longitude,
}) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    throw new Error(
      "You must be logged in to report an emergency."
    );
  }

  const { data, error } = await supabase
    .from("incidents")
    .insert({
      reported_by: user.id,
      type,
      severity,
      latitude,
      longitude,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Fetch all active incidents.
 * Used by the Admin Command Center.
 */
export async function getActiveIncidents() {
  const { data, error } = await supabase
    .from("incidents")
    .select("*")
    .neq("status", "resolved")
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  return data ?? [];
}

/**
 * Fetch all field responders.
 * Used by the Admin when dispatching a team.
 */
export async function getResponders() {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("role", "responder")
    .order("full_name", {
      ascending: true,
    });

  if (error) {
    throw error;
  }

  return data ?? [];
}

/**
 * Dispatch an incident to a responder.
 *
 * IMPORTANT:
 * Dispatching does NOT change the incident status.
 *
 * The workflow is:
 *
 * Admin:
 *   pending → assigned responder
 *
 * Responder:
 *   pending → in_progress → resolved
 */
export async function dispatchIncident(
  incidentId,
  responderId
) {
  if (!incidentId) {
    throw new Error("Incident ID is required.");
  }

  if (!responderId) {
    throw new Error("Responder ID is required.");
  }

  const { data, error } = await supabase
    .from("incidents")
    .update({
      responder_id: responderId,
      assigned_at: new Date().toISOString(),
    })
    .eq("id", incidentId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Subscribe to realtime incident changes.
 *
 * Events handled by the Admin dashboard:
 * - INSERT → new emergency
 * - UPDATE → assignment/status changes
 * - DELETE → incident removed
 */
export function subscribeToIncidents(callback) {
  const channel = supabase
    .channel("admin-incidents")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "incidents",
      },
      (payload) => {
        callback(payload);
      }
    )
    .subscribe((status) => {
      console.log(
        "ResQLink realtime status:",
        status
      );
    });

  return () => {
    supabase.removeChannel(channel);
  };
}