# FareWatch

Flight fare monitoring + price alerts.

- Live prices: Duffel (server-side, via Supabase Edge Function `search-flights`).
- Historical prices: rows in `price_points` written by this app's own searches.
- If `DUFFEL_API_KEY` is unset, the UI shows "Duffel API not configured" — never fake data.

## Deploy

See DEPLOY.md
