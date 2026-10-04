"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type A = { id:string; message:string; price:number; currency:string; seen:boolean; created_at:string };

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<A[]>([]);
  useEffect(() => {
    supabase.from("alerts").select("*").order("created_at",{ascending:false}).then(({data})=>{
      if (data) setAlerts(data as A[]);
    });
  }, []);
  async function markAllSeen() {
    await supabase.from("alerts").update({seen:true}).eq("seen", false);
    setAlerts(a=>a.map(x=>({...x,seen:true})));
  }
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Alerts</h1>
        <button onClick={markAllSeen} className="rounded-lg border px-3 py-2 text-sm">Mark all seen</button>
      </div>
      {alerts.length===0 && <p className="text-sm text-slate-600">No alerts yet. They fire when a recorded price falls at or below a watchlist target.</p>}
      <ul className="space-y-2">
        {alerts.map(a=>(
          <li key={a.id} className={`rounded-xl border p-3 text-sm ${a.seen?"bg-white":"border-emerald-200 bg-emerald-50"}`}>
            <div>{a.message}</div>
            <div className="mt-1 text-xs text-slate-500">{new Date(a.created_at).toLocaleString()}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
