create extension if not exists vector with schema extensions;
create extension if not exists http with schema extensions;

insert into iris.datasets (id, name, source_url, doi, license, attribution, image_type, conditions, image_count, download_size_mb, access, relevance, status, notes)
values (
  'mendeley-eye-diseases-classification',
  'Eye Diseases Classification (front-of-eye photos)',
  'https://data.mendeley.com/datasets/n9zp473wfw/2',
  '10.17632/n9zp473wfw.2',
  'See the Mendeley Data listing; images were collected by the authors from public web sources',
  'Marzia Ahmed, "Eye Diseases Classification", Mendeley Data, V2, 2024, doi:10.17632/n9zp473wfw.2. Downloaded from the copy in github.com/Codernointed/Eye-Disease-Detection-Simple.',
  'external_photo',
  array['normal', 'cataract', 'conjunctivitis', 'uveitis', 'eyelid'],
  2298,
  45,
  'open_download',
  'Close-up photos of the front of the eye (what a phone camera sees), labelled normal, cataract, conjunctivitis, uveitis or eyelid problem. Used for the scan''s photo match.',
  'downloaded',
  'Labels checked by a professor at Bangladesh Eye Hospital, per the authors. Known issues: the normal photos are small crops while the disease photos are larger stock-style images, so every image is shrunk to 96 px before fingerprinting; the eyelid class mixes drooping lids with styes and swelling; some uveitis photos look like burst blood vessels. One exact duplicate removed. Stored as fingerprints only.'
)
on conflict (id) do nothing;

create table iris.eye_photo_embeddings (
  image_id uuid primary key references iris.dataset_images (id) on delete cascade,
  model text not null,
  embedding extensions.vector(1280) not null,
  created_at timestamptz not null default now()
);

alter table iris.eye_photo_embeddings enable row level security;

create function iris.vector_from_int8_b64(p_b64 text)
returns extensions.vector
language sql
immutable
set search_path = ''
as $$
  select array_agg(case when b > 127 then b - 256 else b end / 127.0 order by i)::real[]::extensions.vector
  from (
    select i, get_byte(bytes, i) as b
    from (select decode(p_b64, 'base64') as bytes) d, generate_series(0, length(bytes) - 1) as i
  ) s
$$;

create function iris.import_eye_references(p_url text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  resp record;
  doc jsonb;
  loaded integer;
begin
  select status, content into resp from extensions.http_get(p_url);
  if resp.status <> 200 then
    raise exception 'download failed with status %', resp.status;
  end if;
  doc := resp.content::jsonb;

  insert into iris.dataset_images (dataset_id, source_path, condition, condition_detail, image_type, eye, width, height, split, sha256, all_labels, label_quality)
  select
    'mendeley-eye-diseases-classification',
    it ->> 'file',
    case it ->> 'label' when 'normal' then 'normal' when 'cataract' then 'cataract' else 'other' end,
    case when it ->> 'label' in ('conjunctivitis', 'uveitis', 'eyelid') then it ->> 'label' end,
    'external_photo',
    'unknown',
    (it ->> 'width')::integer,
    (it ->> 'height')::integer,
    it ->> 'split',
    it ->> 'sha256',
    array[it ->> 'label'],
    'clean'
  from jsonb_array_elements(doc -> 'items') as it
  on conflict (sha256) do nothing;

  insert into iris.eye_photo_embeddings (image_id, model, embedding)
  select i.id, doc -> 'model' ->> 'model', iris.vector_from_int8_b64(it ->> 'embedding')
  from jsonb_array_elements(doc -> 'items') as it
  join iris.dataset_images i on i.sha256 = it ->> 'sha256'
  on conflict (image_id) do update set embedding = excluded.embedding, model = excluded.model;
  get diagnostics loaded = row_count;

  update iris.datasets
  set status = 'imported',
      image_count = (select count(*) from iris.dataset_images where dataset_id = 'mendeley-eye-diseases-classification')
  where id = 'mendeley-eye-diseases-classification';
  return loaded;
end;
$$;

create function public.iris_match_eye(p_secret text, p_embedding text, p_k integer default 7)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  q extensions.vector(1280);
  result jsonb;
begin
  perform iris.assert_server(p_secret);
  q := p_embedding::extensions.vector(1280);
  select coalesce(jsonb_agg(jsonb_build_object('label', label, 'similarity', round(similarity::numeric, 4)) order by similarity desc), '[]'::jsonb)
  into result
  from (
    select coalesce(i.condition_detail, i.condition) as label, 1 - (e.embedding operator(extensions.<=>) q) as similarity
    from iris.eye_photo_embeddings e
    join iris.dataset_images i on i.id = e.image_id
    order by e.embedding operator(extensions.<=>) q
    limit least(greatest(p_k, 1), 25)
  ) nearest;
  return result;
end;
$$;

revoke all on function iris.vector_from_int8_b64(text) from public, anon, authenticated;
revoke all on function iris.import_eye_references(text) from public, anon, authenticated;
revoke all on function public.iris_match_eye(text, text, integer) from public, authenticated;
grant execute on function public.iris_match_eye(text, text, integer) to anon;
