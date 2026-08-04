import "server-only";

import { createClient } from "@supabase/supabase-js";

type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type RadarDigest = {
  id: string;
  window_start: string;
  window_end: string;
  event_count: number | null;
  event_ids: string[];
};

export type RadarListingEvent = {
  id: string;
  canonical_encar_id: string;
  published_at: string | null;
  detected_at: string;
  detection_delay_seconds: number | null;
  current_state: Json;
};

function createRadarClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error("Radar Supabase configuration is missing");
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
    db: { schema: "radar" },
  });
}

export async function getRadarDigest(id: string): Promise<{
  digest: RadarDigest;
  events: RadarListingEvent[];
} | null> {
  const client = createRadarClient();
  const { data: digest, error: digestError } = await client
    .from("digest_deliveries")
    .select("id,window_start,window_end,event_count,event_ids")
    .eq("id", id)
    .eq("status", "sent")
    .maybeSingle();
  if (digestError) throw new Error(`Radar digest query failed: ${digestError.message}`);
  if (!digest) return null;

  let query = client
    .from("listing_events")
    .select(
      "id,canonical_encar_id,published_at,detected_at,detection_delay_seconds,current_state",
    )
    .order("detected_at", { ascending: false });

  if (digest.event_ids.length > 0) {
    query = query.in("id", digest.event_ids);
  } else {
    query = query
      .gte("detected_at", digest.window_start)
      .lt("detected_at", digest.window_end)
      .in("event_type", ["new_listing", "late_discovered"]);
  }

  const { data: events, error: eventsError } = await query.limit(500);
  if (eventsError) throw new Error(`Radar events query failed: ${eventsError.message}`);
  return {
    digest: digest as RadarDigest,
    events: (events ?? []) as RadarListingEvent[],
  };
}
