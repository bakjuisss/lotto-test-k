-- Supabase SQL Editor에서 전체를 한 번에 실행하세요.
-- 이미 테이블/정책이 있어도 오류 없이 다시 실행할 수 있습니다.

-- 1) 테이블
create table if not exists public.signups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 20),
  phone text not null check (phone ~ '^01[016789][0-9]{7,8}$'),
  email text not null check (email ~ '^[^@]+@[^@]+\.[^@]+$'),
  created_at timestamptz not null default now()
);

-- 2) 중복 방지 인덱스
create unique index if not exists signups_phone_unique on public.signups (phone);
create unique index if not exists signups_email_unique on public.signups (email);

-- 3) anon/authenticated 역할에 테이블 권한 부여 (RLS와 별도로 필요)
grant usage on schema public to anon, authenticated;
grant insert on table public.signups to anon, authenticated;

-- 4) RLS 활성화
alter table public.signups enable row level security;

-- 5) insert 정책 (기존 정책이 있으면 삭제 후 재생성)
drop policy if exists "Allow anonymous insert" on public.signups;

create policy "Allow anonymous insert"
  on public.signups
  for insert
  to anon, authenticated
  with check (true);
