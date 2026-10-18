# Iris

A free eye check on any phone. Iris is a phone web app that takes guided photos of the front of the eye, uses on-device AI to flag visible problems (cataract, red eye, drooping eyelid, crossed eyes, white pupil), and points families to local eye care in Jacksonville, FL.

Built for Samsung Solve for Tomorrow. Iris is a screening aid, not a diagnosis.

## Project layout

| Folder | Purpose |
|---|---|
| `app/public` | Static files served to the phone browser |
| `app/src/camera` | Guided eye-photo capture |
| `app/src/quality` | Photo quality checks (blur, lighting, eye open) |
| `app/src/model` | Loading and running the on-device AI model |
| `app/src/results` | Results, explanations, and local referral resources |
| `app/src/styles` | App styling |
| `ml/data/raw` | Original datasets (not committed) |
| `ml/data/processed` | Cleaned and split images (not committed) |
| `ml/notebooks` | Data exploration and experiments |
| `ml/training` | Model training scripts |
| `ml/models` | Exported models for the app |
| `docs/research` | Prior work, studies, and sources |
| `docs/pitch` | Competition submission materials |
| `docs/design` | Wireframes and UX notes |
| `assets` | Images and logo |
| `tests` | Tests |

## Contributors

- [nc1b](https://github.com/nc1b) — Developer
- [Radhesh26](https://github.com/Radhesh26)
- [sahajk2011](https://github.com/sahajk2011)
- [udayang008](https://github.com/udayang008)
- [yashatol02](https://github.com/yashatol02)
