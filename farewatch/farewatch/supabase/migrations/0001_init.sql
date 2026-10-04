create extension if not exists "pgcrypto";

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create table public.watchlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  origin text not null,
  destination text not null,
  departure_date date not null,
  return_date date,
  cabin_class text not null default 'economy',
  adults int not null default 1,
  currency text not null default 'USD',
  target_price numeric(10,2),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index on public.watchlists (user_id, active);

create table public.searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  watchlist_id uuid references public.watchlists(id) on delete set null,
  origin text not null,
  destination text not null,
  departure_date date not null,
  return_date date,
  cabin_class text not null,
  adults int not null,
  currency text not null,
  duffel_offer_request_id text,
  supplier text,
  cheapest_total numeric(10,2),
  cheapest_currency text,
  raw_summary jsonb,
  created_at timestamptz not null default now()
);
create index on public.searches (origin, destination, departure_date, created_at desc);
create index on public.searches (user_id, created_at desc);

create table public.price_points (
  id bigserial primary key,
  search_id uuid not null references public.searches(id) on delete cascade,
  watchlist_id uuid references public.watchlists(id) on delete cascade,
  origin text not null,
  destination text not null,
  departure_date date not null,
  cabin_class text not null,
  currency text not null,
  total_amount numeric(10,2) not null,
  supplier text,
  captured_at timestamptz not null default now()
);
create index on public.price_points (origin, destination, departure_date, captured_at desc);
create index on public.price_points (watchlist_id, captured_at desc);

create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  watchlist_id uuid not null references public.watchlists(id) on delete cascade,
  price_point_id bigint references public.price_points(id) on delete set null,
  price numeric(10,2) not null,
  currency text not null,
  message text not null,
  seen boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.alerts (user_id, seen, created_at desc);

alter table public.profiles     enable row level security;
alter table public.watchlists   enable row level security;
alter table public.searches     enable row level security;
alter table public.price_points enable row level security;
alter table public.alerts       enable row level security;

create policy "read own profile"   on public.profiles     for select using (auth.uid() = id);
create policy "update own profile" on public.profiles     for update using (auth.uid() = id);
create policy "own watchlists"     on public.watchlists   for all    using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own searches"       on public.searches     for select using (auth.uid() = user_id);
create policy "own price points"   on public.price_points for select using (
  exists (select 1 from public.watchlists w where w.id = price_points.watchlist_id and w.user_id = auth.uid())
  or exists (select 1 from public.searches s where s.id = price_points.search_id and s.user_id = auth.uid())
);
create policy "own alerts"         on public.alerts       for all    using (auth.uid() = user_id) with check (auth.uid() = user_id);
