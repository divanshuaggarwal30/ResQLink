import { supabase } from "../lib/supabase";

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
    throw new Error("You must be logged in to report an emergency.");
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