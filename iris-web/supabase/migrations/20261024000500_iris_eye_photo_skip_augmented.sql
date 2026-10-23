-- The Eye Diseases Classification dataset includes 340 edited copies ("aug_" files: flips,
-- rotations...) that exist only in the disease folders. Keep them recorded but marked as
-- augmented, without fingerprints, so photo matching only ever compares with original photos.
-- A re-import now also updates each photo's train/val/test split.

create or replace function iris.import_eye_references(p_url text)
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

  insert into iris.dataset_images (dataset_id, source_path, condition, condition_detail, image_type, eye, width, height, split, sha256, all_labels, label_quality, is_augmented)
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
    'clean',
    false
  from jsonb_array_elements(doc -> 'items') as it
  on conflict (sha256) do update set split = excluded.split, is_augmented = false;

  insert into iris.dataset_images (dataset_id, source_path, condition, condition_detail, image_type, eye, width, height, split, sha256, all_labels, label_quality, is_augmented)
  select
    'mendeley-eye-diseases-classification',
    it ->> 'file',
    case it ->> 'label' when 'normal' then 'normal' when 'cataract' then 'cataract' else 'other' end,
    case when it ->> 'label' in ('conjunctivitis', 'uveitis', 'eyelid') then it ->> 'label' end,
    'external_photo',
    'unknown',
    (it ->> 'width')::integer,
    (it ->> 'height')::integer,
    null,
    it ->> 'sha256',
    array[it ->> 'label'],
    'clean',
    true
  from jsonb_array_elements(coalesce(doc -> 'augmented', '[]'::jsonb)) as it
  on conflict (sha256) do update set split = null, is_augmented = true;

  delete from iris.eye_photo_embeddings e
  using iris.dataset_images i
  where i.id = e.image_id and i.is_augmented;

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

create or replace function public.iris_match_eye(p_secret text, p_embedding text, p_k integer default 7)
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
    where not i.is_augmented
    order by e.embedding operator(extensions.<=>) q
    limit least(greatest(p_k, 1), 25)
  ) nearest;
  return result;
end;
$$;

revoke all on function iris.import_eye_references(text) from public, anon, authenticated;
revoke all on function public.iris_match_eye(text, text, integer) from public, authenticated;
grant execute on function public.iris_match_eye(text, text, integer) to anon;

update iris.datasets
set notes = 'Labels checked by a professor at Bangladesh Eye Hospital, per the authors. 340 "aug_" files are edited copies found only in the disease folders: marked is_augmented and never used for training, testing or matching. Near-identical originals are grouped so a group stays in one split. Every image is shrunk to 96 px before fingerprinting, because the normal photos are small crops while the disease photos are large stock-style images. The eyelid class mixes drooping lids with styes and swelling; some uveitis photos look like burst blood vessels. Stored as fingerprints only, never the photos.'
where id = 'mendeley-eye-diseases-classification';
