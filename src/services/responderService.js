import { supabase } from "../lib/supabase";

/**
 * Update the currently authenticated responder's GPS location.
 *
 * Security is enforced by the Supabase RPC:
 * update_responder_location()
 *
 * The responder cannot choose another user's profile ID.
 */
export async function updateResponderLocation(
  latitude,
  longitude
) {
  const { data, error } = await supabase.rpc(
    "update_responder_location",
    {
      responder_latitude: latitude,
      responder_longitude: longitude,
    }
  );

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Update the currently authenticated responder's
 * availability status.
 *
 * Allowed:
 * - available
 * - busy
 * - offline
 */
export async function updateResponderAvailability(
  availability
) {
  const { data, error } = await supabase.rpc(
    "update_responder_availability",
    {
      new_availability: availability,
    }
  );

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Fetch all responders.
 *
 * Admins can read these profiles through the
 * existing "Admins can read all profiles" RLS policy.
 */
export async function getResponders() {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      `
        id,
        full_name,
        role,
        availability,
        latitude,
        longitude,
        last_location_at
      `
    )
    .eq("role", "responder")
    .order("full_name", {
      ascending: true,
    });

  if (error) {
    throw error;
  }

  return data ?? [];
}