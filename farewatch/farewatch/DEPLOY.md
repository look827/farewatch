# Deploy FareWatch

## 1. Prereqs
    npm i -g supabase vercel
    supabase login
    vercel login

## 2. Supabase
    supabase init
    supabase link --project-ref <REF>
    supabase db push

    supabase secrets set \
      DUFFEL_API_KEY=duffel_test_xxx \
      DUFFEL_API_VERSION=v2 \
      CRON_SECRET=$(openssl rand -hex 32)

    supabase functions deploy search-flights --no-verify-jwt
    supabase functions deploy run-alerts --no-verify-jwt

Enable Email OTP in Supabase Auth.
Dashboard → Authentication → URL Configuration → Site URL = your Vercel URL.

## 3. Local
    cp .env.local.example .env.local   # fill in the two Supabase values
    npm install
    npm run dev

## 4. Vercel
    vercel link
    vercel env add NEXT_PUBLIC_SUPABASE_URL production
    vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
    vercel --prod

## 5. Schedule alerts (Supabase SQL editor)
    create extension if not exists pg_cron;
    create extension if not exists pg_net;

    select cron.schedule(
      'farewatch-run-alerts',
      '0 */6 * * *',
      $$ select net.http_post(
        url := 'https://<REF>.functions.supabase.co/run-alerts',
        headers := '{"x-cron-secret":"<CRON_SECRET>"}'::jsonb
      ); $$
    );
