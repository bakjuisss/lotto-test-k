-- 로그인/회원 ID 체계 마이그레이션 (Supabase SQL Editor에서 실행)

alter table public.signups
  add column if not exists display_id text;

update public.signups
set display_id = 'LT-' || upper(substr(replace(id::text, '-', ''), 1, 8))
where display_id is null or display_id = '';

create unique index if not exists signups_display_id_unique on public.signups (display_id);

create or replace function public.set_signup_display_id()
returns trigger
language plpgsql
as $$
begin
  if new.display_id is null or new.display_id = '' then
    new.display_id := 'LT-' || upper(substr(replace(new.id::text, '-', ''), 1, 8));
  end if;
  return new;
end;
$$;

drop trigger if exists tr_signups_display_id on public.signups;
create trigger tr_signups_display_id
  before insert on public.signups
  for each row
  execute function public.set_signup_display_id();

create or replace function public.register_user(
  p_name text,
  p_phone text,
  p_email text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.signups;
begin
  insert into public.signups (name, phone, email)
  values (
    trim(p_name),
    regexp_replace(p_phone, '\D', '', 'g'),
    lower(trim(p_email))
  )
  returning * into v_row;

  return json_build_object(
    'id', v_row.id,
    'display_id', v_row.display_id,
    'name', v_row.name,
    'email', v_row.email,
    'phone', v_row.phone,
    'created_at', v_row.created_at
  );
exception
  when unique_violation then
    raise exception 'DUPLICATE_USER' using errcode = '23505';
end;
$$;

create or replace function public.login_user(
  p_email text,
  p_phone text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.signups;
  v_phone text := regexp_replace(p_phone, '\D', '', 'g');
begin
  select *
  into v_row
  from public.signups s
  where s.email = lower(trim(p_email))
    and s.phone = v_phone
  limit 1;

  if v_row.id is null then
    return null;
  end if;

  if v_row.display_id is null or v_row.display_id = '' then
    v_row.display_id := 'LT-' || upper(substr(replace(v_row.id::text, '-', ''), 1, 8));
    update public.signups set display_id = v_row.display_id where id = v_row.id;
  end if;

  return json_build_object(
    'id', v_row.id,
    'display_id', v_row.display_id,
    'name', v_row.name,
    'email', v_row.email,
    'phone', v_row.phone,
    'created_at', v_row.created_at
  );
end;
$$;

grant execute on function public.register_user(text, text, text) to anon, authenticated;
grant execute on function public.login_user(text, text) to anon, authenticated;
