create schema if not exists iris;
revoke all on schema iris from public, anon, authenticated;

create table iris.app_config (
  key text primary key,
  value text not null
);

insert into iris.app_config (key, value)
values ('server_secret_sha256', '5a2782b5c85a12422c9a6a2726f9f8fc845663f9404b30181073670420875c3d');

create table iris.profiles (
  clerk_user_id text primary key,
  first_name text,
  age_range text check (age_range in ('13-17', '18-39', '40-59', '60+')),
  diabetes text check (diabetes in ('yes', 'no', 'unsure')),
  glaucoma text check (glaucoma in ('yes', 'no', 'unsure')),
  cataract text check (cataract in ('yes', 'no', 'unsure')),
  research_consent boolean not null default false,
  research_consent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table iris.scans (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null references iris.profiles (clerk_user_id) on delete cascade,
  created_at timestamptz not null default now(),
  source text not null check (source in ('demo', 'camera')),
  diabetes_status text not null check (diabetes_status in ('typical', 'borderline', 'see_doctor', 'unclear')),
  glaucoma_status text not null check (glaucoma_status in ('typical', 'borderline', 'see_doctor', 'unclear')),
  cataract_status text not null check (cataract_status in ('typical', 'borderline', 'see_doctor', 'unclear')),
  metrics jsonb not null default '{}'::jsonb,
  note text check (char_length(note) <= 500)
);

create index scans_user_created_idx on iris.scans (clerk_user_id, created_at desc);

alter table iris.app_config enable row level security;
alter table iris.profiles enable row level security;
alter table iris.scans enable row level security;

create function iris.assert_server(p_secret text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  expected text;
begin
  select value into expected from iris.app_config where key = 'server_secret_sha256';
  if p_secret is null or expected is null or encode(sha256(convert_to(p_secret, 'UTF8')), 'hex') <> expected then
    raise exception 'not allowed' using errcode = '42501';
  end if;
end;
$$;

create function iris.valid_user(p_user text)
returns void
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p_user is null or p_user !~ '^user_[A-Za-z0-9]{10,64}$' then
    raise exception 'bad user id' using errcode = '22023';
  end if;
end;
$$;

create function public.iris_dashboard(p_secret text, p_user text, p_first_name text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  perform iris.assert_server(p_secret);
  perform iris.valid_user(p_user);

  insert into iris.profiles (clerk_user_id, first_name)
  values (p_user, nullif(left(btrim(p_first_name), 60), ''))
  on conflict (clerk_user_id) do update
    set first_name = coalesce(nullif(left(btrim(excluded.first_name), 60), ''), iris.profiles.first_name);

  select jsonb_build_object(
    'profile', (select to_jsonb(p) - 'clerk_user_id' from iris.profiles p where p.clerk_user_id = p_user),
    'scans', coalesce((
      select jsonb_agg(to_jsonb(s) - 'clerk_user_id' order by s.created_at desc)
      from (select * from iris.scans where clerk_user_id = p_user order by created_at desc limit 50) s
    ), '[]'::jsonb),
    'total_scans', (select count(*) from iris.scans where clerk_user_id = p_user)
  ) into result;

  return result;
end;
$$;

create function public.iris_update_profile(p_secret text, p_user text, p_profile jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  consent boolean := coalesce((p_profile ->> 'research_consent')::boolean, false);
begin
  perform iris.assert_server(p_secret);
  perform iris.valid_user(p_user);

  insert into iris.profiles (clerk_user_id) values (p_user) on conflict do nothing;

  update iris.profiles set
    age_range = nullif(p_profile ->> 'age_range', ''),
    diabetes = nullif(p_profile ->> 'diabetes', ''),
    glaucoma = nullif(p_profile ->> 'glaucoma', ''),
    cataract = nullif(p_profile ->> 'cataract', ''),
    research_consent = consent,
    research_consent_at = case
      when consent and not research_consent then now()
      when consent then research_consent_at
      else null
    end,
    updated_at = now()
  where clerk_user_id = p_user;

  return (select to_jsonb(p) - 'clerk_user_id' from iris.profiles p where p.clerk_user_id = p_user);
end;
$$;

create function public.iris_add_scan(p_secret text, p_user text, p_scan jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  row_out iris.scans;
begin
  perform iris.assert_server(p_secret);
  perform iris.valid_user(p_user);

  insert into iris.profiles (clerk_user_id) values (p_user) on conflict do nothing;

  if (select count(*) from iris.scans where clerk_user_id = p_user and created_at > now() - interval '1 hour') >= 30 then
    raise exception 'too many scans, try again later' using errcode = '54000';
  end if;

  insert into iris.scans (clerk_user_id, source, diabetes_status, glaucoma_status, cataract_status, metrics, note)
  values (
    p_user,
    coalesce(p_scan ->> 'source', 'demo'),
    p_scan ->> 'diabetes_status',
    p_scan ->> 'glaucoma_status',
    p_scan ->> 'cataract_status',
    coalesce(p_scan -> 'metrics', '{}'::jsonb),
    nullif(left(p_scan ->> 'note', 500), '')
  )
  returning * into row_out;

  return to_jsonb(row_out) - 'clerk_user_id';
end;
$$;

create function public.iris_delete_scan(p_secret text, p_user text, p_scan_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform iris.assert_server(p_secret);
  perform iris.valid_user(p_user);
  delete from iris.scans where id = p_scan_id and clerk_user_id = p_user;
  return found;
end;
$$;

create function public.iris_delete_my_data(p_secret text, p_user text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform iris.assert_server(p_secret);
  perform iris.valid_user(p_user);
  delete from iris.profiles where clerk_user_id = p_user;
  return found;
end;
$$;

revoke all on function iris.assert_server(text) from public, anon, authenticated;
revoke all on function iris.valid_user(text) from public, anon, authenticated;
revoke all on function public.iris_dashboard(text, text, text) from public, authenticated;
revoke all on function public.iris_update_profile(text, text, jsonb) from public, authenticated;
revoke all on function public.iris_add_scan(text, text, jsonb) from public, authenticated;
revoke all on function public.iris_delete_scan(text, text, uuid) from public, authenticated;
revoke all on function public.iris_delete_my_data(text, text) from public, authenticated;
grant execute on function public.iris_dashboard(text, text, text) to anon;
grant execute on function public.iris_update_profile(text, text, jsonb) to anon;
grant execute on function public.iris_add_scan(text, text, jsonb) to anon;
grant execute on function public.iris_delete_scan(text, text, uuid) to anon;
grant execute on function public.iris_delete_my_data(text, text) to anon;

