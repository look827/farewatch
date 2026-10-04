"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { SearchResponse } from "@/lib/types";
import ConfigBanner from "./ConfigBanner";

const cabins = ["economy", "premium_economy", "business", "first"];

export default function SearchForm({ defaultWatchlistId }: { defaultWatchlistId?: string }) {
  const [origin, setOrigin] = useState("LHR");
  const [destination, setDestination] = useState("JFK");
  const [departure, setDeparture] = useState("");
  const [ret, setRet] = useState("");
  const [cabin, setCabin] = useState("economy");
  const [adults, setAdults] = useState(1);
  const [currency, setCurrency] = useState("USD");
  const [loading, setLoading] = useState(false);
  const [resp, setResp] = useState<SearchResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setErr(null); setResp(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {
        "content-type": "application/json",
        "apikey": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      };
      if (session) headers["Authorization"] = `Bearer ${session.access_token}`;

      const r = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/search-flights`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            origin: origin.toUpperCase(),
            destination: destination.toUpperCase(),
            departure_date: departure,
            return_date: ret || null,
            cabin_class: cabin,
            adults,
            currency,
            watchlist_id: defaultWatchlistId ?? null,
            persist: true,
          }),
        },
      );
      const j: SearchResponse = await r.json();
      if (!r.ok || j.error) setErr(j.error || `Request failed (${r.status})`);
      setResp(j);
    } catch (e) {
      setErr(String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3 rounded-2xl border bg-white p-4 sm:grid-cols-2 lg:grid-cols-6">
        <input required maxLength={3} value={origin} onChange={e=>setOrigin(e.target.value.toUpperCase())}
          placeholder="From (IATA)" className="rounded-lg border px-3 py-2 uppercase" />
        <input required maxLength={3} value={destination} onChange={e=>setDestination(e.target.value.toUpperCase())}
          placeholder="To (IATA)" className="rounded-lg border px-3 py-2 uppercase" />
        <input required type="date" value={departure} onChange={e=>setDeparture(e.target.value)}
          className="rounded-lg border px-3 py-2" />
        <input type="date" value={ret} onChange={e=>setRet(e.target.value)}
          className="rounded-lg border px-3 py-2" />
        <select value={cabin} onChange={e=>setCabin(e.target.value)}
          className="rounded-lg border px-3 py-2">
          {cabins.map(c => <option key={c} value={c}>{c.replace("_"," ")}</option>)}
        </select>
        <div className="flex gap-2">
          <input type="number" min={1} max={9} value={adults} onChange={e=>setAdults(Number(e.target.value))}
            className="w-20 rounded-lg border px-3 py-2" />
          <select value={currency} onChange={e=>setCurrency(e.target.value)}
            className="flex-1 rounded-lg border px-3 py-2">
            {["USD","EUR","GBP","INR","AUD","CAD"].map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <button disabled={loading}
          className="rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700 disabled:opacity-50 lg:col-span-6">
          {loading ? "Searching Duffel…" : "Search live fares"}
        </button>
      </form>

      {resp && resp.configured === false && (
        <ConfigBanner message={resp.error ?? "Missing key."} />
      )}
      {err && resp?.configured !== false && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-red-800">{err}</div>
      )}
      {resp?.configured && resp.offers && (
        <Offers offers={resp.offers} cheapestId={resp.cheapest?.id} disclaimer={resp.disclaimer}/>
      )}
    </div>
  );
}

function Offers({ offers, cheapestId, disclaimer }:{
  offers: NonNullable<SearchResponse["offers"]>; cheapestId?: string; disclaimer?: string;
}) {
  if (!offers.length) return <p className="text-sm text-slate-600">No offers returned for this route/date.</p>;
  return (
    <div className="space-y-3">
      {offers.map(o => (
        <div key={o.id}
          className={`rounded-2xl border bg-white p-4 ${o.id === cheapestId ? "ring-2 ring-emerald-500" : ""}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-medium">
              {o.owner?.name ?? o.owner?.iata_code ?? "Airline"}
              {o.id === cheapestId && (
                <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">Cheapest</span>
              )}
            </div>
            <div className="text-lg font-semibold">
              {o.total_currency} {o.total_amount.toFixed(2)}
            </div>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {o.slices.map((s, i) => (
              <div key={i} className="rounded-lg bg-slate-50 p-3 text-sm">
                <div className="font-medium">{s.origin} → {s.destination} · {s.departure_date}</div>
                <div className="text-slate-600">Duration {s.duration}</div>
                <ul className="mt-1 space-y-0.5 text-xs text-slate-600">
                  {s.segments.map((g, j) => (
                    <li key={j}>
                      {g.marketing_carrier} {g.flight_number} · {g.origin}→{g.destination} ·{" "}
                      {g.departing_at?.slice(11,16)} → {g.arriving_at?.slice(11,16)}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      ))}
      {disclaimer && <p className="text-xs text-slate-500">{disclaimer}</p>}
    </div>
  );
}
