"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type P = { captured_at:string; total_amount:number; currency:string };

export default function PriceChart({ origin, destination, departure }:{origin:string;destination:string;departure:string}) {
  const [pts,setPts]=useState<P[]>([]);
  useEffect(()=>{
    supabase.from("price_points")
      .select("captured_at,total_amount,currency")
      .eq("origin",origin).eq("destination",destination).eq("departure_date",departure)
      .order("captured_at",{ascending:true}).limit(200)
      .then(({data})=>{ if (data) setPts(data as P[]); });
  },[origin,destination,departure]);

  if (pts.length < 2) {
    return <p className="text-xs text-slate-500">Not enough recorded price points yet for a chart.</p>;
  }
  const w=600,h=140,pad=20;
  const xs = pts.map((_,i)=>pad + (i*(w-2*pad))/(pts.length-1));
  const min=Math.min(...pts.map(p=>p.total_amount));
  const max=Math.max(...pts.map(p=>p.total_amount));
  const ys = pts.map(p=>h-pad-((p.total_amount-min)/(max-min||1))*(h-2*pad));
  const path = xs.map((x,i)=>`${i?"L":"M"}${x},${ys[i]}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
      <path d={path} fill="none" stroke="#059669" strokeWidth="2"/>
      <text x={pad} y={14} className="fill-slate-500 text-[10px]">
        {pts[0].currency} {min.toFixed(2)} – {max.toFixed(2)}
      </text>
    </svg>
  );
}
