import { supabase } from "../lib/supabase";

/* -------------------------------------------------------------------------- */
/* Civilian                                                                    */
/* -------------------------------------------------------------------------- */

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
      "You must be logged in to report an incident."
    );
  }

  const { data, error } = await supabase
    .from("incidents")
    .insert({
      reported_by: user.id,
      type,
      severity,
      latitude: Number(latitude),
      longitude: Number(longitude),
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function getMyIncidents() {
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
    .eq("reported_by", user.id)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  return data ?? [];
}

/* -------------------------------------------------------------------------- */
/* Admin                                                                       */
/* -------------------------------------------------------------------------- */

export async function getActiveIncidents() {
  const { data, error } = await supabase
    .from("incidents")
    .select("*")
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function dispatchIncident(
  incidentId,
  responderId
) {
  const { data, error } = await supabase.rpc(
    "dispatch_incident",
    {
      target_incident_id: incidentId,
      target_responder_id: responderId,
    }
  );

  if (error) {
    throw error;
  }

  return data;
}

export async function getIncidentArchive() {
  const { data, error } = await supabase
    .from("incident_archive")
    .select("*")
    .order("archived_at", {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  return data ?? [];
}

/* -------------------------------------------------------------------------- */
/* Responder                                                                   */
/* -------------------------------------------------------------------------- */

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
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function updateIncidentStatus(
  incidentId,
  status
) {
  const allowedStatuses = [
    "accepted",
    "arrived",
    "resolved",
  ];

  if (!allowedStatuses.includes(status)) {
    throw new Error(
      `Invalid mission status: ${status}`
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

/* -------------------------------------------------------------------------- */
/* Realtime                                                                    */
/* -------------------------------------------------------------------------- */

export function subscribeToIncidents(callback) {
  const channel = supabase
    .channel(`incidents-${crypto.randomUUID()}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "incidents",
      },
      callback
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToResponderIncidents(
  callback
) {
  const channel = supabase
    .channel(
      `responder-incidents-${crypto.randomUUID()}`
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "incidents",
      },
      callback
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}