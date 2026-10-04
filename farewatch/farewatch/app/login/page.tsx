"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const [email,setEmail]=useState(""); const [msg,setMsg]=useState<string|null>(null);
  async function send(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithOtp({
      email, options: { emailRedirectTo: window.location.origin },
    });
    setMsg(error ? error.message : "Check your email for the sign-in link.");
  }
  return (
    <div className="mx-auto max-w-md rounded-2xl border bg-white p-6">
      <h1 className="text-xl font-semibold">Sign in</h1>
      <p className="mt-1 text-sm text-slate-600">We'll email you a magic link.</p>
      <form onSubmit={send} className="mt-4 space-y-3">
        <input required type="email" value={email} onChange={e=>setEmail(e.target.value)}
          placeholder="you@example.com" className="w-full rounded-lg border px-3 py-2" />
        <button className="w-full rounded-lg bg-slate-900 px-4 py-2 text-white">Send link</button>
      </form>
      {msg && <p className="mt-3 text-sm text-slate-700">{msg}</p>}
    </div>
  );
}
