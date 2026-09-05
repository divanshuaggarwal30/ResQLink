import { supabase } from "../lib/supabase";

export async function updateResponderLocation(latitude, longitude) {
  const { data, error } = await supabase.rpc("update_responder_location", {
    responder_latitude: latitude,
    responder_longitude: longitude,
  });

  if (error) throw error;
  return data;
}

export async function updateResponderAvailability(availability) {
  const { data, error } = await supabase.rpc("update_responder_availability", {
    new_availability: availability,
  });

  if (error) throw error;
  return data;
}

export async function getResponders() {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, availability, latitude, longitude, last_location_at")
    .eq("role", "responder")
    .order("full_name", { ascending: true });

  if (error) throw error;
  return data ?? [];
}
