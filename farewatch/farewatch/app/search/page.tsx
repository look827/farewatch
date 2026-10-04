import { Suspense } from "react";
import SearchForm from "@/components/SearchForm";

export default function SearchPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Search live fares</h1>
      <p className="text-sm text-slate-600">
        All prices are fetched live from Duffel via a server-side Edge Function.
        Results are stored as history for your charts and alerts.
      </p>
      <Suspense><SearchForm /></Suspense>
    </div>
  );
}
