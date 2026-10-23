# Eye photo match: reference database

How the scan's photo match was built. Only fingerprints (embeddings) and labels go into
Supabase, never the photos.

1. **Photos.** Eye Diseases Classification (Marzia Ahmed, Mendeley Data V2, 2024,
   doi:10.17632/n9zp473wfw.2), 2,298 front-of-eye photos, from the copy in
   github.com/Codernointed/Eye-Disease-Detection-Simple (`Dataset/`).
2. **Fingerprints.** `node embed.mjs <Dataset dir> embeddings.json <@mediapipe/tasks-vision dir> <mobilenet_v3_large.tflite>`
   runs Google's MediaPipe Image Embedder (MobileNet V3 Large, the same model and version as
   the site) in headless Chromium (needs `playwright`). Every photo is centre-cropped to a square,
   shrunk to 96 px and enlarged to 224 px, exactly like the scan's eye close-up. The 96 px step
   matters: the dataset's normal photos are small crops while the disease photos are large, so
   without it the model would learn "blurry = healthy".
3. **Training.** `node train.mjs embeddings.json eye-photo-model.json eye-reference-v1.json`
   removes duplicates, splits 70/15/15 per label (seed 42), trains a softmax classifier with
   mirrored copies, sets each condition's flag line on the validation photos to catch at least
   85% of cases, and measures accuracy on the test photos only.
4. **Supabase.** The migration `20261023233000_iris_eye_photo_match.sql` adds pgvector and
   `iris.eye_photo_embeddings`. `select iris.import_eye_references('<url of eye-reference-v1.json>')`
   loads the file; `public.iris_match_eye` finds the closest reference photos for a scan.

`data/eye-photo-model.json` (classifier + test accuracy) and `data/eye-photo-thresholds.json`
are the outputs the site uses.
