// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DUFFEL_API_KEY = Deno.env.get("DUFFEL_API_KEY") ?? "";
const DUFFEL_API_VERSION = Deno.env.get("DUFFEL_API_VERSION") ?? "v2";
const DUFFEL_BASE = "https://api.duffel.com";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...cors },
  });
}

function isIata(s: unknown): s is string {
  return typeof s === "string" && /^[A-Za-z]{3}$/.test(s);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  if (!DUFFEL_API_KEY) {
    return json({
      configured: false,
      error: "Duffel API not configured",
      hint: "Set DUFFEL_API_KEY as a Supabase Edge Function secret.",
    }, 200);
  }

  let payload: any;
  try { payload = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const {
    origin, destination, departure_date, return_date = null,
    cabin_class = "economy", adults = 1, currency = "USD",
    watchlist_id = null, persist = true,
  } = payload ?? {};

  if (!isIata(origin) || !isIata(destination)) return json({ error: "origin/destination must be IATA codes" }, 400);
  if (!departure_date) return json({ error: "departure_date required (YYYY-MM-DD)" }, 400);

  const auth = req.headers.get("Authorization") ?? "";
  const supabaseUser = createClient(SUPABASE_URL, SERVICE_ROLE, {
    global: { headers: { Authorization: auth } },
  });
  let userId: string | null = null;
  if (auth) {
    const { data } = await supabaseUser.auth.getUser();
    userId = data?.user?.id ?? null;
  }

  const slices = [
    { origin, destination, departure_date },
    ...(return_date ? [{ origin: destination, destination: origin, departure_date: return_date }] : []),
  ];
  const duffelBody = {
    data: {
      slices,
      passengers: Array.from({ length: Math.max(1, Math.min(9, Number(adults))) }, () => ({ type: "adult" })),
      cabin_class,
    },
  };

  let duffelRes: Response;
  try {
    duffelRes = await fetch(`${DUFFEL_BASE}/air/offer_requests?return_offers=true`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${DUFFEL_API_KEY}`,
        "Duffel-Version": DUFFEL_API_VERSION,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(duffelBody),
    });
  } catch (e) {
    return json({ configured: true, error: "Upstream Duffel request failed", detail: String(e) }, 502);
  }

  const duffelJson = await duffelRes.json().catch(() => ({}));
  if (!duffelRes.ok) {
    return json({
      configured: true,
      error: "Duffel API error",
      status: duffelRes.status,
      detail: duffelJson,
    }, 502);
  }

  const requestId: string | undefined = duffelJson?.data?.id;
  const offers: any[] = duffelJson?.data?.offers ?? [];

  const normalized = offers
    .map((o) => ({
      id: o.id,
      total_amount: Number(o.total_amount),
      total_currency: o.total_currency,
      base_amount: o.base_amount != null ? Number(o.base_amount) : null,
      tax_amount: o.tax_amount != null ? Number(o.tax_amount) : null,
      owner: o.owner ?? null,
      expires_at: o.expires_at ?? null,
      slices: (o.slices ?? []).map((s: any) => ({
        origin: s.origin?.iata_code,
        destination: s.destination?.iata_code,
        departure_date: s.segments?.[0]?.departing_at?.slice(0, 10),
        arrival_date: s.segments?.at(-1)?.arriving_at?.slice(0, 10),
        duration: s.duration,
        segments: (s.segments ?? []).map((g: any) => ({
          marketing_carrier: g.marketing_carrier?.iata_code,
          flight_number: g.marketing_carrier_flight_number,
          departing_at: g.departing_at,
          arriving_at: g.arriving_at,
          origin: g.origin?.iata_code,
          destination: g.destination?.iata_code,
        })),
      })),
    }))
    .sort((a, b) => a.total_amount - b.total_amount);

  const cheapest = normalized[0] ?? null;

  let searchId: string | null = null;
  let pricePointId: number | null = null;

  if (persist && userId) {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: searchRow, error: searchErr } = await admin
      .from("searches")
      .insert({
        user_id: userId,
        watchlist_id,
        origin, destination,
        departure_date,
        return_date,
        cabin_class,
        adults: Number(adults),
        currency,
        duffel_offer_request_id: requestId ?? null,
        supplier: cheapest?.owner?.name ?? null,
        cheapest_total: cheapest?.total_amount ?? null,
        cheapest_currency: cheapest?.total_currency ?? null,
        raw_summary: { offer_count: normalized.length, top: normalized.slice(0, 5) },
      })
      .select("id")
      .single();

    if (!searchErr && searchRow) {
      searchId = searchRow.id;
      if (cheapest) {
        const { data: pp } = await admin.from("price_points").insert({
          search_id: searchId,
          watchlist_id,
          origin, destination, departure_date, cabin_class,
          currency: cheapest.total_currency,
          total_amount: cheapest.total_amount,
          supplier: cheapest.owner?.name ?? null,
        }).select("id").single();
        pricePointId = pp?.id ?? null;

        if (watchlist_id && pricePointId) {
          const { data: wl } = await admin
            .from("watchlists")
            .select("user_id, target_price, currency")
            .eq("id", watchlist_id)
            .single();
          if (wl?.target_price != null && cheapest.total_amount <= Number(wl.target_price)) {
            await admin.from("alerts").insert({
              user_id: wl.user_id,
              watchlist_id,
              price_point_id: pricePointId,
              price: cheapest.total_amount,
              currency: cheapest.total_currency,
              message: `${origin}→${destination} on ${departure_date} dropped to ${cheapest.total_currency} ${cheapest.total_amount.toFixed(2)} (target ${wl.currency} ${Number(wl.target_price).toFixed(2)})`,
            });
          }
        }
      }
    }
  }

  return json({
    configured: true,
    request_id: requestId ?? null,
    offer_count: normalized.length,
    cheapest,
    offers: normalized.slice(0, 20),
    persisted: { search_id: searchId, price_point_id: pricePointId },
    disclaimer: "Live prices from Duffel. Fares can change until ticketed.",
  });
});
