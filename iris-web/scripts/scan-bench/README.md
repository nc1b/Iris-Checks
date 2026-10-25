# Scan test bench

Runs hundreds of simulated camera scans through the app's own scan code and measures how close
the phone's numbers come to a perfect pupillometer's, and how often each check gets it right.

```bash
node --import ./scripts/scan-bench/alias.mjs scripts/scan-bench/run.ts --n 300 --seed 1
```

Options: `--n` scans (300), `--seed` first seed (1), `--workers` processes (CPU count − 2),
`--out file.jsonl` to keep every scan's numbers. 300 scans take about 15 minutes on 14 cores.
Every scan is reproducible from its seed.

## What it runs

`session.ts` drives a scan the way `components/scanner/camera-scan.tsx` does, with the same
functions: `lib/eye-tracker` (find and follow the eye), `lib/pupil-fit` (iris and pupil circles,
haze), `lib/camera-scan` (line-up checks, screen light, recording, combining the eyes),
`lib/analysis` (the reflex numbers) and `lib/scan-rating` (the three results). For each eye:
line up until the hold completes (or give up after 10 s), a 3 s countdown, then the 6 s recording
with the flash. The second eye is held at the first eye's distance and screen light, as in the app.

`eye-sim.ts` is the camera: a phone front camera looking at one eye from about 15 cm, drawn from
a model in millimetres.

- **Eye:** skin, eyebrow, eyelids and lashes, the white of the eye, a textured iris 11.7 mm across
  (dark brown, brown, hazel, green or blue), and a pupil whose size follows a light reflex with
  known resting size, amplitude, delay and speed. A cataract adds grey haze to the pupil.
- **Reflections:** the phone screen reflects on the cornea where a real screen does. The cornea is
  a convex mirror (radius 7.8 mm), so a 7 × 15 cm screen 15 cm away reflects as a patch about
  1.8 × 3 mm, from just above the pupil's centre downward. During the flash it covers the middle of
  the pupil; the screen light (a frame along the sides and bottom) reflects as a thin outline.
  Half the people also have a room light reflected on the cornea.
- **Camera:** auto-exposure that lags behind the flash (so the first flash frames are washed out in
  a dim room), sensor noise that grows when the camera boosts a dark picture, defocus blur, hand
  tremor (9–12 Hz) and slow drift, distance changes, blinks, and a blink at the flash for some
  people. 1080 × 1920 frames at 30, 24 or 15 per second.
- **Reflex:** the pupil reacts to the flash's light relative to the light before it (roughly
  logarithmically, with saturation), so a dim screen, a bright room or a phone held further away
  gives a smaller reaction, as it does for a real pupil.

Each scan draws a random person (iris colour, resting pupil, reflex; 25% with a weaker,
slower, diabetes-like reflex; 20% with one eye's reflex weaker, as with glaucoma damage; 25% with
a cataract in one or both eyes) and random conditions (distance, noise, blur, room light, screen
brightness, exposure speed, tremor, blinks, frame rate).

The "perfect pupillometer" is the same simulated pupil sampled at the same moments without any
camera, through the same analysis. Comparing against it isolates what the phone camera and the
code get wrong. It does not say anything about how well a pupil reflex shows diabetes or
glaucoma: that needs real people and an eye exam.

## Results

300 simulated scans (seeds 1–300). "Perfect pupillometer" = the same simulated pupil measured
without a camera, through the same analysis.

| | Result |
|---|---|
| Eyes that lock on within 10 s | 99% (median 2.4 s; was 65% before the tracking fixes below) |
| Resting pupil size error, 90th percentile | 0.007 (pupil ÷ iris) |
| Reflex amplitude error, 90th percentile | 2.5 points |
| Reaction delay error, 90th percentile | 0.13 s |
| Left vs right balance error, 90th percentile | 0.04 |
| Diabetes: same flag / no flag as a perfect pupillometer | 91% (17% unclear) |
| Glaucoma: one eye clearly weaker → flagged | 97% |
| Glaucoma: even eyes → wrongly flagged | 4% (was 25%) |
| Cataract: cloudy lens → flagged | 95% (was 0%: cloudy pupils came back unclear) |
| Cataract: clear lenses → wrongly flagged | 0% |

What made the difference (each found by the bench):

- **The iris's real edge.** The rough eye search is ±10% on size and often a third of an iris
  off-centre (the eyelid covers the top of the iris). The pupil was measured around that rough
  spot. Now the iris edge is fitted (`lib/pupil-fit`), so pupil ÷ iris is right to about 1%.
- **The pupil as a circle, around reflections.** 36 edge points, a robust circle fit, reflections
  masked on the unsmoothed picture, and an edge only counts if the pupil doesn't come back past it
  (the screen light's reflection sits inside the pupil). Measuring takes ~2 ms instead of ~30 ms
  a frame, which also raises the phone's frame rate.
- **Follow the eye, don't search for it.** Each frame first fits the iris where it just was; the
  slower search runs only when that fails, tries several candidates, and only trusts one whose iris
  edge fits on both sides. A blink no longer makes it jump to the corner of the eye.
- **Steady means not moving, not not shaking.** Hand tremor shakes the eye a few pixels every
  frame; averaging over 0.2 s tells tremor from moving the phone. Line-up went from 65% to 99%.
- **A cloudy pupil can't stop the scan.** If everything else is lined up and the pupil can't be
  made out for 2.5 s, the scan goes ahead: that's what the cataract check is for.
- **Same flash for both eyes.** The second eye is held at the first eye's distance (±10%) and
  screen light; a closer phone gives a stronger flash and a bigger reaction.
- **Each frame against its own iris size**, so a phone drifting closer or further doesn't look
  like the pupil changing.
- **Haze against the white of the eye** between flashes (a flash's reflection covers the middle of
  the pupil), so exposure doesn't look like a cataract.
- **Say unclear rather than guess:** no delay or speed when the start of the reaction wasn't seen,
  and no reflex at all when the pupil hardly stands out from the iris.

## Limits

A simulation is only as real as its model. It can't show everything a real phone does (lens
flare, compression, the red reflex from a light right next to the camera, unusual eyes, makeup,
glasses), and the haze model and its cut-offs come from the same team. Use it to find bugs and
compare versions of the code, and check the real thing with real phones and people.
