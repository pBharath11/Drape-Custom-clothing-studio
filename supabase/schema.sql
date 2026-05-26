
-- ─── Addresses ────────────────────────────────────────────────────────────────
create table if not exists public.addresses (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users(id) on delete cascade,
  full_name  text        not null,
  line1      text        not null,
  line2      text,
  city       text        not null,
  postcode   text        not null,
  country    text        not null,
  created_at timestamptz not null default now()
);

alter table public.addresses enable row level security;

create policy "Users manage their own addresses"
  on public.addresses for all
  to authenticated
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── Orders ───────────────────────────────────────────────────────────────────
create table if not exists public.orders (
  id                uuid        primary key default gen_random_uuid(),
  user_id           uuid        references auth.users(id) on delete set null,
  payment_intent_id text        unique,
  status            text        not null default 'processing',
  items             jsonb       not null default '[]',
  address           jsonb       not null,
  subtotal          integer     not null,
  delivery          integer     not null,
  total             integer     not null,
  customer_email    text,
  customer_name     text,
  created_at        timestamptz not null default now()
);

alter table public.orders enable row level security;

-- Authenticated users can read their own orders; inserts and updates go through
-- the service-role API route (bypasses RLS) so no insert/update policy needed.
create policy "Users view their own orders"
  on public.orders for select
  to authenticated
  using (auth.uid() = user_id);

-- ─── Order status history ─────────────────────────────────────────────────────
create table if not exists public.order_status_history (
  id         uuid        primary key default gen_random_uuid(),
  order_id   uuid        not null references public.orders(id) on delete cascade,
  status     text        not null,
  note       text,
  created_at timestamptz not null default now()
);

alter table public.order_status_history enable row level security;

-- Users can read the history for orders that belong to them.
create policy "Users view their own order history"
  on public.order_status_history for select
  to authenticated
  using (
    exists (
      select 1 from public.orders
      where orders.id = order_status_history.order_id
        and orders.user_id = auth.uid()
    )
  );


-- No RLS / no user access — only the service-role webhook handler reads/writes here.
create table if not exists public.stripe_events (
  id         text        primary key,   -- Stripe event ID (evt_xxx) — natural dedup key
  type       text        not null,
  payload    jsonb       not null,
  processed  boolean     not null default false,
  created_at timestamptz not null default now()
);
