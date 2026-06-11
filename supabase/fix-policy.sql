-- 권한 오류(42501 / RLS)가 날 때 Supabase SQL Editor에서 실행하세요.

grant usage on schema public to anon, authenticated;
grant insert on table public.signups to anon, authenticated;

alter table public.signups enable row level security;

drop policy if exists "Allow anonymous insert" on public.signups;

create policy "Allow anonymous insert"
  on public.signups
  for insert
  to anon, authenticated
  with check (true);
