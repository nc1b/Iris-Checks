# Iris

A phone pupil-reflex scan that compares your pupil's reaction to light with published diabetes research. Student research prototype. **Not a medical device.**

Live: https://iris-pupil-scan.vercel.app

## How it works

- **Eye tracking:** Google MediaPipe Face Landmarker runs in the browser and finds both irises.
- **Pupil measurement:** `lib/pupil.ts` measures the dark pupil inside each iris, frame by frame.
- **Light reflex:** the screen flashes (white, or red then blue in experimental mode). `lib/analysis.ts` turns the recording into resting pupil-to-iris ratio, constriction amplitude, reaction delay and constriction speed.
- **Research comparison:** `lib/reference.ts` holds the published studies and the team's provisional starter thresholds.
- **AI explanation:** `app/api/explain/route.ts` sends only the numbers to the Hack Club AI proxy for a plain-language explanation. Without an API key it falls back to a built-in explanation.
- **Research log:** results can be saved in the browser and exported as CSV for the pilot study.

## Run locally

```bash
cd iris-web
npm install
npm run dev
```

Create `.env.local` (never commit it):

```
HACKCLUB_API_KEY=your-key
IRIS_AI_MODEL=anthropic/claude-haiku-5.5
```

The camera needs HTTPS or `localhost`. Use the demo mode (`/scan?demo=1`) on computers without a camera.
