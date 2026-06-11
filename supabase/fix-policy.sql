-- 정책 중복 오류(42710)가 났을 때만 이 파일을 실행하세요.
-- 또는 schema.sql 전체 대신 이 파일만 실행해도 됩니다.

drop policy if exists "Allow anonymous insert" on public.signups;

create policy "Allow anonymous insert"
  on public.signups
  for insert
  to anon, authenticated
  with check (true);
