"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState } from "react";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/search", label: "Search" },
  { href: "/watchlists", label: "Watchlists" },
  { href: "/alerts", label: "Alerts" },
];

export default function Nav() {
  const path = usePathname();
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) =>
      setEmail(s?.user?.email ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <nav className="sticky top-0 z-30 border-b bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Fare<span className="text-emerald-600">Watch</span>
        </Link>
        <div className="hidden gap-1 md:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href}
              className={`rounded-lg px-3 py-2 text-sm ${
                path === l.href ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
              }`}>{l.label}</Link>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {email ? (
            <button
              onClick={async () => { await supabase.auth.signOut(); router.push("/login"); }}
              className="rounded-lg border px-3 py-2 text-sm hover:bg-slate-50"
            >Sign out</button>
          ) : (
            <Link href="/login" className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white">
              Sign in
            </Link>
          )}
        </div>
      </div>
      <div className="flex gap-1 border-t px-3 py-2 md:hidden">
        {links.map((l) => (
          <Link key={l.href} href={l.href}
            className={`flex-1 rounded-lg px-2 py-2 text-center text-xs ${
              path === l.href ? "bg-slate-900 text-white" : "text-slate-700"
            }`}>{l.label}</Link>
        ))}
      </div>
    </nav>
  );
}
