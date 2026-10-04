import { supabaseServer } from "@/lib/supabaseServer";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border bg-white p-6 text-center">
        <h1 className="text-2xl font-semibold">Welcome to FareWatch</h1>
        <p className="mt-2 text-sm text-slate-600">
          Sign in to track routes and receive price alerts. Live fares come from Duffel;
          history is built from your own searches.
        </p>
        <Link href="/login" className="mt-4 inline-block rounded-lg bg-slate-900 px-4 py-2 text-white">
          Sign in
        </Link>
      </div>
    );
  }

  const { data: watchlists } = await supabase
    .from("watchlists").select("*").eq("active", true).order("created_at", { ascending: false }).limit(20);

  const { data: recentPoints } = await supabase
    .from("price_points").select("origin,destination,departure_date,currency,total_amount,captured_at,supplier")
    .order("captured_at", { ascending: false }).limit(30);

  const { data: alerts } = await supabase
    .from("alerts").select("*").eq("seen", false).order("created_at", { ascending: false }).limit(5);

  const hasHistory = (recentPoints?.length ?? 0) > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <Link href="/search" className="rounded-lg bg-emerald-600 px-4 py-2 text-white">New search</Link>
      </div>

      {!hasHistory && (
        <div className="rounded-2xl border bg-white p-6 text-center text-slate-600">
          <p className="font-medium">No price history yet.</p>
          <p className="mt-1 text-sm">
            Charts and alerts will populate from your own Duffel searches.
            Run your first search to record a real price point.
          </p>
          <Link href="/search" className="mt-3 inline-block rounded-lg bg-slate-900 px-4 py-2 text-white">
            Search flights
          </Link>
        </div>
      )}

      {!!alerts?.length && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">New alerts</h2>
          <ul className="space-y-2">
            {alerts.map(a => (
              <li key={a.id} className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm">
                {a.message}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Your watchlists</h2>
        {(!watchlists || watchlists.length === 0) ? (
          <p className="text-sm text-slate-600">No watchlists yet. <Link href="/watchlists" className="underline">Create one</Link>.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {watchlists.map(w => (
              <Link key={w.id} href={`/watchlists#${w.id}`}
                className="rounded-2xl border bg-white p-4 hover:shadow-sm">
                <div className="font-medium">{w.origin} → {w.destination}</div>
                <div className="text-xs text-slate-500">{w.departure_date}{w.return_date ? ` – ${w.return_date}` : ""} · {w.cabin_class}</div>
                {w.target_price != null && (
                  <div className="mt-1 text-xs text-slate-600">Target {w.currency} {Number(w.target_price).toFixed(2)}</div>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Recorded price points</h2>
        {hasHistory ? (
          <div className="overflow-x-auto rounded-2xl border bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Route</th><th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Price</th><th className="px-3 py-2">Supplier</th>
                  <th className="px-3 py-2">Captured</th>
                </tr>
              </thead>
              <tbody>
                {recentPoints!.map((p, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-3 py-2">{p.origin} → {p.destination}</td>
                    <td className="px-3 py-2">{p.departure_date}</td>
                    <td className="px-3 py-2 font-medium">{p.currency} {Number(p.total_amount).toFixed(2)}</td>
                    <td className="px-3 py-2">{p.supplier ?? "—"}</td>
                    <td className="px-3 py-2 text-slate-500">{new Date(p.captured_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-slate-600">No price points recorded yet.</p>
        )}
      </section>
    </div>
  );
}
