-- Supabase SQL Editor에서 실행하세요.

create table if not exists public.signups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 20),
  phone text not null check (phone ~ '^01[016789][0-9]{7,8}$'),
  email text not null check (email ~ '^[^@]+@[^@]+\.[^@]+$'),
  created_at timestamptz not null default now()
);

create unique index if not exists signups_phone_unique on public.signups (phone);
create unique index if not exists signups_email_unique on public.signups (email);

alter table public.signups enable row level security;

-- 브라우저(anon key) 또는 서버 API에서 insert 허용
drop policy if exists "Allow anonymous insert" on public.signups;
create policy "Allow anonymous insert"
  on public.signups
  for insert
  to anon, authenticated
  with check (true);
