create extension if not exists pgcrypto;

drop table if exists public.sale_items cascade;
drop table if exists public.sales cascade;
drop table if exists public.expenses cascade;
drop table if exists public.cash_sessions cascade;
drop table if exists public.products cascade;
drop table if exists public.categories cascade;
drop table if exists public.store_settings cascade;
drop table if exists public.authorized_devices cascade;
drop table if exists public.pin_sessions cascade;
drop table if exists public.pin_attempts cascade;

drop function if exists public.authorize_device(text, text);
drop function if exists public.revoke_current_device(text);
drop function if exists public.get_pos_state(text);
drop function if exists public.save_pos_state(text, jsonb);
drop function if exists public.is_authorized_device(uuid, text);

create table public.pin_sessions (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  last_used_at timestamptz not null default now(),
  expires_at timestamptz not null,
  is_active boolean not null default true
);

create table public.pin_attempts (
  id bigint generated always as identity primary key,
  ip_hash text not null,
  attempted_at timestamptz not null default now(),
  success boolean not null
);

create table public.store_settings (
  store_id text not null default 'default',
  key text not null,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (store_id, key)
);

create table public.categories (
  store_id text not null default 'default',
  id text not null,
  name text not null,
  sort_order integer not null default 0,
  primary key (store_id, id)
);

create table public.products (
  store_id text not null default 'default',
  id text not null,
  category_id text not null,
  name text not null,
  price numeric(10,2) not null check (price >= 0),
  sort_order integer not null default 0,
  primary key (store_id, id),
  foreign key (store_id, category_id) references public.categories(store_id, id) on delete cascade
);

create table public.cash_sessions (
  store_id text not null default 'default',
  id text not null,
  opened_at timestamptz not null,
  closed_at timestamptz,
  opening_amount numeric(10,2) not null check (opening_amount >= 0),
  primary key (store_id, id)
);

create table public.expenses (
  store_id text not null default 'default',
  id text not null,
  session_id text,
  description text not null,
  amount numeric(10,2) not null check (amount > 0),
  created_at timestamptz not null,
  primary key (store_id, id)
);

create table public.sales (
  store_id text not null default 'default',
  id text not null,
  session_id text,
  number integer not null,
  created_at timestamptz not null,
  discount numeric(10,2) not null default 0 check (discount >= 0),
  payment_method text not null default 'cash',
  total numeric(10,2) not null check (total >= 0),
  paid_amount numeric(10,2),
  change_amount numeric(10,2),
  primary key (store_id, id),
  unique (store_id, number)
);

create table public.sale_items (
  id bigint generated always as identity primary key,
  store_id text not null default 'default',
  sale_id text not null,
  product_id text,
  name text not null,
  price numeric(10,2) not null check (price >= 0),
  quantity integer not null check (quantity > 0),
  foreign key (store_id, sale_id) references public.sales(store_id, id) on delete cascade
);

alter table public.pin_sessions enable row level security;
alter table public.pin_attempts enable row level security;
alter table public.store_settings enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.cash_sessions enable row level security;
alter table public.expenses enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;

revoke all on public.pin_sessions from anon, authenticated;
revoke all on public.pin_attempts from anon, authenticated;
revoke all on public.store_settings from anon, authenticated;
revoke all on public.categories from anon, authenticated;
revoke all on public.products from anon, authenticated;
revoke all on public.cash_sessions from anon, authenticated;
revoke all on public.expenses from anon, authenticated;
revoke all on public.sales from anon, authenticated;
revoke all on public.sale_items from anon, authenticated;
