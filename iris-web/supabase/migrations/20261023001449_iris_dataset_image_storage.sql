-- Resized copies (max 1024 px, JPEG) of the dataset images in a PRIVATE storage bucket.
-- Originals stay on the team computer (local_path). Nothing here is public.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('eye-datasets', 'eye-datasets', false, 2097152, array['image/jpeg']);

alter table iris.dataset_images rename column storage_path to local_path;
alter table iris.dataset_images add column storage_object text;  -- path inside the eye-datasets bucket

-- The import function referred to storage_path; recreate it with the new column names.
create or replace function public.iris_import_dataset_images(p_secret text, p_rows jsonb)
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
    dataset_id, source_path, local_path, storage_object, condition, condition_detail, severity, image_type, eye,
    subject_ref, is_augmented, width, height, split, sha256, all_labels, label_quality, duplicate_paths
  )
  select r.dataset_id, r.source_path, coalesce(r.local_path, r.storage_path), r.storage_object, r.condition, r.condition_detail,
         r.severity, r.image_type, coalesce(r.eye, 'unknown'), r.subject_ref, coalesce(r.is_augmented, false), r.width,
         r.height, r.split, r.sha256, coalesce(r.all_labels, '{}'), coalesce(r.label_quality, 'clean'),
         coalesce(r.duplicate_paths, '{}')
  from jsonb_to_recordset(p_rows) as r(
    dataset_id text, source_path text, local_path text, storage_path text, storage_object text, condition text,
    condition_detail text, severity smallint, image_type text, eye text, subject_ref text, is_augmented boolean,
    width integer, height integer, split text, sha256 text, all_labels text[], label_quality text, duplicate_paths text[]
  )
  on conflict (sha256) do nothing;

  get diagnostics inserted = row_count;
  return inserted;
end;
$$;

-- TEMPORARY: lets the local upload script add files to this one bucket, under a dataset
-- folder, as new objects only (no reading, overwriting or deleting). Dropped right after.
create policy "temp dataset upload" on storage.objects
  for insert to anon
  with check (bucket_id = 'eye-datasets' and (storage.foldername(name))[1] in ('mendeley-bmrd', 'mendeley-bajwa'));

