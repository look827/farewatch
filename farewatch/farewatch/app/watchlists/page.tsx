"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type W = {
  id: string; origin: string; destination: string;
  departure_date: string; return_date: string | null;
  cabin_class: string; adults: number; currency: string;
  target_price: number | null; active: boolean;
};

export default function WatchlistsPage() {
  const [items, setItems] = useState<W[]>([]);
  const [form, setForm] = useState({
    origin:"", destination:"", departure_date:"", return_date:"",
    cabin_class:"economy", adults:1, currency:"USD", target_price:"",
  });
  const [msg, setMsg] = useState<string|null>(null);

  async function load() {
    const { data, error } = await supabase.from("watchlists").select("*").order("created_at",{ascending:false});
    if (error) setMsg(error.message); else setItems(data as W[]);
  }
  useEffect(() => { load(); }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault(); setMsg(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return setMsg("Please sign in first.");
    const payload = {
      user_id: user.id,
      origin: form.origin.toUpperCase(), destination: form.destination.toUpperCase(),
      departure_date: form.departure_date,
      return_date: form.return_date || null,
      cabin_class: form.cabin_class, adults: Number(form.adults), currency: form.currency,
      target_price: form.target_price ? Number(form.target_price) : null,
    };
    const { error } = await supabase.from("watchlists").insert(payload);
    if (error) setMsg(error.message);
    else { setForm({...form, origin:"",destination:"",departure_date:"",return_date:"",target_price:""}); load(); }
  }

  async function remove(id: string) { await supabase.from("watchlists").delete().eq("id", id); load(); }
  async function toggle(id: string, active: boolean) { await supabase.from("watchlists").update({ active }).eq("id", id); load(); }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Watchlists</h1>
      {msg && <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm">{msg}</div>}

      <form onSubmit={add} className="grid grid-cols-1 gap-3 rounded-2xl border bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        <input required placeholder="From (IATA)" maxLength={3} value={form.origin}
          onChange={e=>setForm({...form, origin:e.target.value.toUpperCase()})} className="rounded-lg border px-3 py-2" />
        <input required placeholder="To (IATA)" maxLength={3} value={form.destination}
          onChange={e=>setForm({...form, destination:e.target.value.toUpperCase()})} className="rounded-lg border px-3 py-2" />
        <input required type="date" value={form.departure_date}
          onChange={e=>setForm({...form, departure_date:e.target.value})} className="rounded-lg border px-3 py-2" />
        <input type="date" value={form.return_date}
          onChange={e=>setForm({...form, return_date:e.target.value})} className="rounded-lg border px-3 py-2" />
        <select value={form.cabin_class} onChange={e=>setForm({...form, cabin_class:e.target.value})}
          className="rounded-lg border px-3 py-2">
          {["economy","premium_economy","business","first"].map(c=><option key={c}>{c}</option>)}
        </select>
        <input type="number" min={1} max={9} value={form.adults}
          onChange={e=>setForm({...form, adults:Number(e.target.value)})} className="rounded-lg border px-3 py-2" />
        <input placeholder="Target price (optional)" value={form.target_price}
          onChange={e=>setForm({...form, target_price:e.target.value})} className="rounded-lg border px-3 py-2" />
        <button className="rounded-lg bg-emerald-600 px-4 py-2 text-white">Add watchlist</button>
      </form>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(w => (
          <div key={w.id} id={w.id} className="rounded-2xl border bg-white p-4">
            <div className="flex items-center justify-between">
              <div className="font-medium">{w.origin} → {w.destination}</div>
              <button onClick={()=>toggle(w.id, !w.active)} className={`rounded-full px-2 py-0.5 text-xs ${w.active?"bg-emerald-100 text-emerald-800":"bg-slate-200 text-slate-700"}`}>
                {w.active?"active":"paused"}
              </button>
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {w.departure_date}{w.return_date?` – ${w.return_date}`:""} · {w.cabin_class} · {w.adults} pax
            </div>
            {w.target_price != null && (
              <div className="mt-1 text-sm">Target: {w.currency} {Number(w.target_price).toFixed(2)}</div>
            )}
            <button onClick={()=>remove(w.id)} className="mt-3 text-xs text-red-600 hover:underline">Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}
