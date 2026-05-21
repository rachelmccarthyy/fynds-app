-- v0.5.2 initial schema
-- Supabase Auth (auth.users) is managed by Supabase; tables below reference it.

-- updated_at helper
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

-- 1) Product dimension (canonical product identity; load-bearing in v0.5.3)
create table public.products (
  product_key   text primary key,            -- hash(domain | normalized_title | canonical_link)
  title         text,
  source        text,                         -- merchant / retailer
  link          text,
  image_url     text,
  latest_price  numeric(12,2),
  attributes    jsonb       not null default '{}'::jsonb,
  first_seen    timestamptz not null default now(),
  last_seen     timestamptz not null default now()
);

-- 2) Style profile (1:1 with a user)
create table public.profiles (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  aesthetic    text,
  budget_range text,
  sizes        jsonb       not null default '{}'::jsonb,   -- {top, bottom, dress, ...}
  shoe_size    text,
  gender       text,
  avoid_brands text[]      not null default '{}',
  notes        text,
  updated_at   timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function set_updated_at();

-- 3) Saved items (favorites + cart, unified)
create type saved_kind as enum ('favorite', 'cart');

create table public.saved_items (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid       not null references auth.users(id)    on delete cascade,
  kind             saved_kind not null,
  product_key      text       not null references public.products(product_key),
  product_snapshot jsonb      not null,                 -- title/price/source/link/image AT SAVE TIME
  options          jsonb      not null default '{}'::jsonb,   -- {size, color, notes}
  saved_at         timestamptz not null default now(),
  unique (user_id, kind, product_key)
);
create index saved_items_user_kind_idx on public.saved_items (user_id, kind, saved_at desc);

-- Row Level Security: a user touches only their own rows
alter table public.profiles    enable row level security;
alter table public.saved_items enable row level security;
create policy "own profile"     on public.profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own saved_items" on public.saved_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- products is a shared read-only dimension; writes happen server-side (service role)
alter table public.products enable row level security;
create policy "products readable" on public.products for select using (true);
