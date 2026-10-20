-- 0001_init.sql
-- Skema awal sistem keuangan: ledger pribadi + ledger bisnis terpisah.
-- Semua tabel bergaya single-user: pemilik ditentukan lewat auth.uid().

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Profil pengguna
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  monthly_savings_target numeric(18, 2) not null default 0,
  ai_provider text not null default 'gemini',
  ai_model text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Rekening & e-wallet (ledger pribadi)
-- ---------------------------------------------------------------------------
create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  type text not null check (type in ('bank', 'ewallet', 'cash', 'savings', 'credit')),
  institution text,
  opening_balance numeric(18, 2) not null default 0,
  color text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists accounts_user_id_idx on public.accounts (user_id);

-- ---------------------------------------------------------------------------
-- Kategori (dipakai transaksi pribadi & expense bisnis)
-- ---------------------------------------------------------------------------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('income', 'expense')),
  scope text not null default 'personal' check (scope in ('personal', 'business')),
  parent_id uuid references public.categories (id) on delete set null,
  icon text,
  created_at timestamptz not null default now(),
  unique (user_id, name, scope)
);

create index if not exists categories_user_id_idx on public.categories (user_id);

-- ---------------------------------------------------------------------------
-- Batch import CSV (untuk dedup & undo)
-- ---------------------------------------------------------------------------
create table if not exists public.import_batches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  account_id uuid references public.accounts (id) on delete set null,
  file_name text not null,
  row_count integer not null default 0,
  status text not null default 'completed',
  content_hash text not null,
  imported_at timestamptz not null default now()
);

create index if not exists import_batches_user_id_idx on public.import_batches (user_id);

-- ---------------------------------------------------------------------------
-- Transaksi ledger pribadi
-- amount bertanda: positif = uang masuk, negatif = uang keluar.
-- transfer antar akun = 2 baris (amount berlawanan, kind = 'transfer').
-- ---------------------------------------------------------------------------
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  occurred_on date not null,
  amount numeric(18, 2) not null,
  kind text not null check (kind in ('income', 'expense', 'transfer')),
  account_id uuid references public.accounts (id) on delete set null,
  to_account_id uuid references public.accounts (id) on delete set null,
  category_id uuid references public.categories (id) on delete set null,
  description text,
  merchant text,
  notes text,
  source text not null default 'manual' check (source in ('manual', 'csv')),
  import_batch_id uuid references public.import_batches (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists transactions_user_date_idx on public.transactions (user_id, occurred_on desc);
create index if not exists transactions_account_idx on public.transactions (account_id);
create index if not exists transactions_batch_idx on public.transactions (import_batch_id);

-- ---------------------------------------------------------------------------
-- Anggaran bulanan per kategori
-- ---------------------------------------------------------------------------
create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  period text not null,
  category_id uuid not null references public.categories (id) on delete cascade,
  limit_amount numeric(18, 2) not null,
  created_at timestamptz not null default now(),
  unique (user_id, period, category_id)
);

-- ---------------------------------------------------------------------------
-- Target keuangan (dana darurat, modal bisnis, investasi, ...)
-- ---------------------------------------------------------------------------
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  type text not null default 'lainnya' check (type in ('dana_darurat', 'modal_bisnis', 'investasi', 'lainnya')),
  target_amount numeric(18, 2) not null,
  target_date date,
  priority integer not null default 3,
  status text not null default 'active' check (status in ('active', 'reached', 'paused')),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.goal_contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  goal_id uuid not null references public.goals (id) on delete cascade,
  amount numeric(18, 2) not null,
  occurred_on date not null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists goal_contributions_goal_idx on public.goal_contributions (goal_id);

-- ---------------------------------------------------------------------------
-- Ledger bisnis: brand, kampanye iklan, dan expense operasional
-- ---------------------------------------------------------------------------
create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  kind text not null default 'own_brand' check (kind in ('own_brand', 'client_service')),
  status text not null default 'active' check (status in ('active', 'paused', 'archived')),
  notes text,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  platform text not null check (platform in ('shopee', 'tiktok', 'meta', 'tiktok_shop', 'google', 'lainnya')),
  period_start date not null,
  period_end date not null,
  spend numeric(18, 2) not null default 0,
  revenue numeric(18, 2) not null default 0,
  orders integer,
  ctr numeric(6, 3),
  cvr numeric(6, 3),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists campaigns_user_idx on public.campaigns (user_id, period_start desc);

create table if not exists public.business_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  occurred_on date not null,
  amount numeric(18, 2) not null,
  category_id uuid references public.categories (id) on delete set null,
  description text,
  source text not null default 'manual' check (source in ('manual', 'csv')),
  created_at timestamptz not null default now()
);

create index if not exists business_expenses_user_idx on public.business_expenses (user_id, occurred_on desc);

-- ---------------------------------------------------------------------------
-- Import CSV: profil pemetaan kolom per institutions
-- ---------------------------------------------------------------------------
create table if not exists public.import_mappings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  institution text not null,
  mapping jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, institution)
);

-- ---------------------------------------------------------------------------
-- AI advisor: riwayat chat & laporan bulanan
-- ---------------------------------------------------------------------------
create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  conversation_id uuid not null references public.ai_conversations (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists ai_messages_conversation_idx on public.ai_messages (conversation_id, created_at);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  period text not null,
  summary_md text not null,
  insights jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, period)
);

-- ---------------------------------------------------------------------------
-- Row Level Security: seluruh data hanya bisa diakses pemiliknya
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'accounts', 'categories', 'transactions', 'budgets', 'goals',
    'goal_contributions', 'businesses', 'campaigns', 'business_expenses',
    'import_batches', 'import_mappings', 'ai_conversations', 'ai_messages', 'reports'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "%I_owner" on public.%I', t, t);
    execute format(
      'create policy "%I_owner" on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)',
      t, t
    );
  end loop;
end
$$;
