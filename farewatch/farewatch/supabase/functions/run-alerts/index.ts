import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  const cron = Deno.env.get("CRON_SECRET");
  if (!cron || req.headers.get("x-cron-secret") !== cron) {
    return new Response("Forbidden", { status: 403 });
  }
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  const { data: watches } = await admin
    .from("watchlists")
    .select("*")
    .eq("active", true);

  let checked = 0;
  for (const w of watches ?? []) {
    await fetch(`${SUPABASE_URL}/functions/v1/search-flights`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Authorization": `Bearer ${SERVICE_ROLE}`,
      },
      body: JSON.stringify({
        origin: w.origin,
        destination: w.destination,
        departure_date: w.departure_date,
        return_date: w.return_date,
        cabin_class: w.cabin_class,
        adults: w.adults,
        currency: w.currency,
        watchlist_id: w.id,
        persist: true,
      }),
    }).catch(() => {});
    checked++;
  }
  return new Response(JSON.stringify({ checked }), {
    headers: { "content-type": "application/json" },
  });
});
