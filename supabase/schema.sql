-- Core profile row for each auth user
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Phase 1 snapshot tables (used by current app integration)
create table if not exists public.user_finance_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.user_layout_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  layout jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.user_cover_image (
  user_id uuid primary key references auth.users(id) on delete cascade,
  image text,
  updated_at timestamptz not null default now()
);

-- Future normalized domain tables (phase 2+)
create table if not exists public.accounts (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.categories (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.transactions (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.budgets (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.planning_costs (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.user_finance_state enable row level security;
alter table public.user_layout_state enable row level security;
alter table public.user_cover_image enable row level security;
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;
alter table public.planning_costs enable row level security;

-- Generic owner policies (safe to run repeatedly with drop/create)
drop policy if exists "profiles_owner" on public.profiles;
create policy "profiles_owner"
  on public.profiles
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "finance_state_owner" on public.user_finance_state;
create policy "finance_state_owner"
  on public.user_finance_state
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "layout_state_owner" on public.user_layout_state;
create policy "layout_state_owner"
  on public.user_layout_state
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "cover_owner" on public.user_cover_image;
create policy "cover_owner"
  on public.user_cover_image
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "accounts_owner" on public.accounts;
create policy "accounts_owner"
  on public.accounts
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "categories_owner" on public.categories;
create policy "categories_owner"
  on public.categories
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "transactions_owner" on public.transactions;
create policy "transactions_owner"
  on public.transactions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "budgets_owner" on public.budgets;
create policy "budgets_owner"
  on public.budgets
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "planning_costs_owner" on public.planning_costs;
create policy "planning_costs_owner"
  on public.planning_costs
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
