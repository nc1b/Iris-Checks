# Eye-image datasets → database

Scripts that turned the downloaded datasets into labeled rows in `iris.dataset_images`
(Supabase) plus resized copies in the private `eye-datasets` storage bucket.
The catalog of datasets is `iris.datasets`; counts are in the `iris.dataset_summary` view.

Originals live outside the repo on the team computer: `D:\Iris-datasets\<dataset id>\`.
Run with Python 3 and Pillow, from any folder:

```
python -I scan_images.py   <image folder> <index.csv>              # sha256, size per image
python -I import_dataset.py <dataset id> <index.csv> <image folder>  # labels -> database (add --dry-run first)
python -I upload_images.py  <dataset id> <index.csv> <image folder>  # 1024 px JPEG copies -> bucket
```

Then link rows to files (in the Supabase SQL editor):

```sql
update iris.dataset_images i set storage_object = o.name
from storage.objects o
where o.bucket_id = 'eye-datasets' and o.name = i.dataset_id || '/' || i.sha256 || '.jpg';
```

Notes
- `import_dataset.py` needs a labeler for each new dataset (see `LABELERS`): folder path →
  condition, detail, severity and image type. Look at sample images before deciding the image type.
- Duplicate images are merged; images given different diagnoses are `condition_conflict` and
  left out of the train/val/test splits. Splits come from the sha256, so they never change.
- The bucket accepts no uploads by default. For a new upload, temporarily add an insert policy
  for the dataset folder (see migration `20261023001449_iris_dataset_image_storage.sql`) and
  drop it afterwards, as in `..._iris_dataset_upload_done_lock_bucket.sql`.
- Keys come from `iris-web/.env.local` (git-ignored): `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`,
  `SUPABASE_ANON_KEY`, `IRIS_DB_SECRET`.
- Respect each dataset's license and cite it (stored in `iris.datasets.attribution`).
