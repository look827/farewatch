export default function ConfigBanner({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900">
      <p className="font-semibold">Duffel API not configured</p>
      <p className="mt-1 text-sm">
        {message} Live flight prices will appear here once your Duffel API key is set
        as a Supabase Edge Function secret (<code>DUFFEL_API_KEY</code>).
        No placeholder or example prices are shown.
      </p>
    </div>
  );
}
