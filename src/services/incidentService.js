import { supabase } from "../lib/supabase";

/* =========================================================
   CIVILIAN
   ========================================================= */

export const createIncident = async ({
  type,
  severity,
  latitude,
  longitude,
}) => {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    throw new Error("You must be logged in to report an incident.");
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
    console.error("createIncident:", error);
    throw error;
  }

  return data;
};

export const getMyIncidents = async () => {
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
    console.error("getMyIncidents:", error);
    throw error;
  }

  return data || [];
};


/* =========================================================
   ADMIN
   ========================================================= */

export const getActiveIncidents = async () => {
  const { data, error } = await supabase
    .from("incidents")
    .select("*")
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    console.error("getActiveIncidents:", error);
    throw error;
  }

  return data || [];
};


export const dispatchIncident = async (
  incidentId,
  responderId
) => {
  const { data, error } = await supabase.rpc(
    "dispatch_incident",
    {
      p_incident_id: incidentId,
      p_responder_id: responderId,
    }
  );

  if (error) {
    console.error("dispatchIncident:", error);
    throw error;
  }

  return data;
};


export const getIncidentArchive = async () => {
  const { data, error } = await supabase
    .from("incident_archive")
    .select("*")
    .order("archived_at", {
      ascending: false,
    });

  if (error) {
    console.error("getIncidentArchive:", error);
    throw error;
  }

  return data || [];
};


/* =========================================================
   RESPONDER
   ========================================================= */

/**
 * Get incidents assigned to the currently logged-in responder.
 */
export const getMyAssignedIncidents = async () => {
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
    console.error(
      "getMyAssignedIncidents:",
      error
    );

    throw error;
  }

  return data || [];
};


/**
 * Update responder mission status.
 *
 * Supported actions:
 *
 * "accept"
 * "arrive"
 * "resolve"
 *
 * The database RPC is responsible for validating
 * the responder and allowed state transition.
 */
export const updateIncidentStatus = async (
 incidentId,
 action
) => {
  const { data, error } = await supabase.rpc(
    "update_mission_stage",
    {
      p_incident_id: incidentId,
      p_action: action,
    }
  );

  if (error) {
    console.error(
      "updateIncidentStatus:",
      error
    );

    throw error;
  }

  return data;
};


/* =========================================================
   REALTIME
   ========================================================= */

/**
 * Generic incident realtime subscription.
 */
export const subscribeToIncidents = (
  callback
) => {
  const channel = supabase
    .channel(
      `incidents-${Date.now()}`
    )
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
};


/**
 * Responder-specific realtime subscription.
 *
 * We listen for incident changes and let the
 * responder hook refresh its assigned incidents.
 */
export const subscribeToResponderIncidents = (
  callback
) => {
  const channel = supabase
    .channel(
      `responder-incidents-${Date.now()}`
    )
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
};