import { supabase } from "../lib/supabase";

/**
 * ============================================================
 * CIVILIAN
 * ============================================================
 */

/**
 * Create a new emergency incident.
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
 * ============================================================
 * ADMIN
 * ============================================================
 */

/**
 * Get all active incidents for the Command Center.
 *
 * Resolved incidents are excluded because they should
 * eventually live in the archive.
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
 * Get all registered field responders.
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
 * pending
 *    ↓
 * responder accepts
 *    ↓
 * in_progress
 *    ↓
 * resolved
 *
 * RLS/database policies must ensure only an authorized
 * admin can perform this operation.
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
 * The Admin dashboard uses this to receive:
 *
 * INSERT → new emergency
 * UPDATE → dispatch/status changes
 * DELETE → removed incident
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
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}


/**
 * ============================================================
 * RESPONDER
 * ============================================================
 */

/**
 * Get incidents assigned to the currently logged-in responder.
 *
 * We intentionally obtain the user from Supabase Auth
 * instead of accepting a user ID from the frontend.
 */
export async function getMyAssignedIncidents() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    throw new Error("You must be logged in.");
  }

  const { data, error } = await supabase
    .from("incidents")
    .select("*")
    .eq("responder_id", user.id)
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
 * Update the status of an assigned incident.
 *
 * IMPORTANT:
 * We intentionally use a PostgreSQL RPC instead of allowing
 * the responder to directly update the incidents table.
 *
 * The database function is responsible for enforcing:
 *
 * pending → in_progress
 * in_progress → resolved
 *
 * and ensuring that the responder actually owns the assignment.
 */
export async function updateIncidentStatus(
  incidentId,
  status
) {
  if (!incidentId) {
    throw new Error("Incident ID is required.");
  }

  if (!status) {
    throw new Error("Incident status is required.");
  }

  const allowedStatuses = [
    "in_progress",
    "resolved",
  ];

  if (!allowedStatuses.includes(status)) {
    throw new Error(
      `Invalid responder status: ${status}`
    );
  }

  const { data, error } = await supabase.rpc(
    "update_incident_status",
    {
      incident_id: incidentId,
      new_status: status,
    }
  );

  if (error) {
    throw error;
  }

  return data;
}


/**
 * Subscribe to realtime incident changes for responders.
 *
 * The responder dashboard can use this to detect:
 *
 * - newly assigned missions
 * - assignment changes
 * - status changes
 * - resolved missions
 */
export function subscribeToResponderIncidents(
  callback
) {
  const channel = supabase
    .channel("responder-incidents")
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
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}