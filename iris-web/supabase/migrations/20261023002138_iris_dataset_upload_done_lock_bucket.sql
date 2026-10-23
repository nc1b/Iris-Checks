-- Uploads finished: remove the temporary upload permission so nothing else can be added.
drop policy "temp dataset upload" on storage.objects;

-- Link every image row to its uploaded copy.
update iris.dataset_images i
set storage_object = o.name
from storage.objects o
where o.bucket_id = 'eye-datasets' and o.name = i.dataset_id || '/' || i.sha256 || '.jpg' and i.storage_object is distinct from o.name;

update iris.datasets set
  status = 'imported',
  image_type = 'fundus',
  image_count = (select count(*) from iris.dataset_images where dataset_id = 'mendeley-bajwa'),
  notes = '300 normal, 100 cataract, 101 glaucoma, 100 retinal disease. All 601 images turned out to be retina (fundus) photos from three camera sizes (checked: every image has the round fundus border); "cataract" shows as a hazy retina photo. Imported 2026-10-22; originals on D:\Iris-datasets\mendeley-bajwa, 1024 px copies in the eye-datasets bucket.'
where id = 'mendeley-bajwa';

update iris.datasets set notes = notes || ' 1024 px copies in the eye-datasets bucket.' where id = 'mendeley-bmrd' and notes not like '%eye-datasets bucket%';

