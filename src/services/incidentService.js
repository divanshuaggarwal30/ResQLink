import { supabase } from "../lib/supabase";

/**
 * ============================================================
 * CIVILIAN
 * ============================================================
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
 * Dispatch does NOT change the incident status.
 *
 * Workflow:
 *
 * pending
 *    ↓
 * Admin dispatch
 *    ↓
 * pending + responder_id
 *    ↓
 * Responder accepts
 *    ↓
 * accepted
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
    .eq("status", "pending")
    .select()
    .single();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(
      "Incident could not be dispatched. It may already be assigned or no longer be pending."
    );
  }

  return data;
}


/**
 * ============================================================
 * RESPONDER
 * ============================================================
 */

/**
 * Get only incidents assigned to the currently
 * authenticated responder.
 *
 * RLS remains the actual security boundary.
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
 * Update responder mission status through the
 * PostgreSQL RPC.
 *
 * Valid transitions are enforced by PostgreSQL:
 *
 * pending  -> accepted
 * accepted -> arrived
 * arrived  -> resolved
 *
 * The responder cannot directly manipulate the
 * incident status from the client.
 */
export async function updateIncidentStatus(
  incidentId,
  status
) {
  if (!incidentId) {
    throw new Error("Incident ID is required.");
  }

  const allowedStatuses = [
    "accepted",
    "arrived",
    "resolved",
  ];

  if (!allowedStatuses.includes(status)) {
    throw new Error(
      "Invalid responder status."
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
 * ============================================================
 * REALTIME — ADMIN
 * ============================================================
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
 * REALTIME — RESPONDER
 * ============================================================
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