-- Some datasets list the same image under two labels. Keep one row per image with every
-- label it was given, and say how trustworthy the label is:
--   clean              one consistent label
--   severity_conflict  same disease, different severity levels (severity left empty)
--   condition_conflict different diagnoses (kept out of train/val/test: split is null)
alter table iris.dataset_images
  add column all_labels text[] not null default '{}',
  add column label_quality text not null default 'clean'
    check (label_quality in ('clean', 'severity_conflict', 'condition_conflict')),
  add column duplicate_paths text[] not null default '{}';

alter table iris.dataset_images
  add constraint conflict_not_in_splits check (label_quality <> 'condition_conflict' or split is null);

drop view iris.dataset_summary;
create view iris.dataset_summary with (security_invoker = true) as
select d.id as dataset_id, d.name, d.license, i.image_type, i.condition,
       count(*) as images,
       count(*) filter (where i.label_quality = 'clean') as clean,
       count(*) filter (where i.label_quality <> 'clean') as conflicting,
       count(*) filter (where i.split = 'train') as train,
       count(*) filter (where i.split = 'val') as val,
       count(*) filter (where i.split = 'test') as test
from iris.datasets d
join iris.dataset_images i on i.dataset_id = d.id
group by d.id, d.name, d.license, i.image_type, i.condition;

-- Bulk import from a local script, gated by the server secret like the dashboard functions.
create function public.iris_import_dataset_images(p_secret text, p_rows jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  inserted integer;
begin
  perform iris.assert_server(p_secret);
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) > 1000 then
    raise exception 'send 1 to 1000 rows per call' using errcode = '22023';
  end if;

  insert into iris.dataset_images (
    dataset_id, source_path, storage_path, condition, condition_detail, severity, image_type, eye,
    subject_ref, is_augmented, width, height, split, sha256, all_labels, label_quality, duplicate_paths
  )
  select r.dataset_id, r.source_path, r.storage_path, r.condition, r.condition_detail, r.severity, r.image_type,
         coalesce(r.eye, 'unknown'), r.subject_ref, coalesce(r.is_augmented, false), r.width, r.height, r.split,
         r.sha256, coalesce(r.all_labels, '{}'), coalesce(r.label_quality, 'clean'), coalesce(r.duplicate_paths, '{}')
  from jsonb_to_recordset(p_rows) as r(
    dataset_id text, source_path text, storage_path text, condition text, condition_detail text, severity smallint,
    image_type text, eye text, subject_ref text, is_augmented boolean, width integer, height integer, split text,
    sha256 text, all_labels text[], label_quality text, duplicate_paths text[]
  )
  on conflict (sha256) do nothing;

  get diagnostics inserted = row_count;
  return inserted;
end;
$$;

revoke all on function public.iris_import_dataset_images(text, jsonb) from public, authenticated;
grant execute on function public.iris_import_dataset_images(text, jsonb) to anon;

