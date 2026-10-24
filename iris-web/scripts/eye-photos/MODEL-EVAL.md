# Choosing the image model for the eye photo check

Run on 24 October 2026 through the Hack Club AI proxy (`ai.hackclub.com/proxy/v1`), which listed
504 models, 314 of them accepting images. Every model got the same system prompt
(`lib/server/eye-photo-ai.ts`), temperature 0, low reasoning effort, and the same 36 photos.

## Test set (36 photos)

| Group | n | Source | Counts as correct |
| --- | --- | --- | --- |
| Cataract | 6 | Test split of the public dataset in `eval/dataset-cases.json` (≥150 px) | `lens_cloudiness` |
| Conjunctivitis | 6 | same | `redness` or `inflammation_signs` |
| Uveitis | 6 | same | `inflammation_signs` or `redness` (a photo can only show the redness) |
| Eyelid | 6 | same | `eyelid` |
| Normal | 6 | the 6 largest normal photos, all tiny (70–80 px) | `no_visible_concern`; "inconclusive" is acceptable; any finding is a false alarm |
| Photo quality | 6 | `eval/fixtures` (sharp, blur, dark, glare, far, no eye) made from a public-domain portrait | unusable photos must be called unusable |

"Abstained" means the model said the photo was unusable or inconclusive. That's the honest answer
for a weak photo, so it's scored separately from a wrong answer.

## Results

| Model | Disease: correct / abstained / wrong or missed (of 24) | Normal: correct / abstained / false alarm (of 6) | Quality (of 6) | Unsupported claims | Median / p90 latency | Cost per 100 photos* |
| --- | --- | --- | --- | --- | --- | --- |
| **anthropic/claude-opus-5.5** (run 1) | **20 / 4 / 0** | 3 / 3 / **0** | 5 + 1 abstained | 0 | 6.0 s / 7.9 s | ~$1.20 |
| **anthropic/claude-opus-5.5** (run 2) | **18 / 6 / 0** | 3 / 3 / **0** | 5 + 1 abstained | 0 | 5.0 s / 6.5 s | ~$1.20 |
| anthropic/claude-sonnet-5.5 | 18 / 3 / 3 | 0 / 6 / 0 | 5 + 1 abstained | 0 | 2.5 s / 4.0 s | $0.42 |
| anthropic/claude-haiku-5.5 | 19 / 1 / 4 | 3 / 3 / 0 | 5 + 1 wrong reason | 0 | 4.0 s / 4.6 s | $0.03 |
| openai/gpt-6.1-sol | 17 / 3 / 3 (+1 timeout) | 3 / 2 / **1** | 5 + 1 abstained | 0 | 5.3 s / 8.1 s | $0.27 |
| google/gemini-4-argon | 17 / 3 / 4 | 0 / 6 / 0 | 4 + 1 wrong reason + 1 abstained | 0 | 5.5 s / 9–17 s | $0.46 |
| google/gemini-3.8-flash | 17 / 1 / 6 | 2 / 4 / 0 | 4 + 1 wrong reason + 1 abstained | 0 | 3.3 s / 13 s | $0.18 |
| qwen/qwen3-vl-235b-a22b-instruct | 13 / 0 / 11 | 4 / 2 / 0 | 4 + 2 wrong reason | 0 | 3.5 s / 5.0 s | $0.04 |

\* As reported by the proxy (`usage.cost`, or `cost_details.upstream_inference_cost` for
bring-your-own-key models). Hack Club currently covers it.

Patterns in the wrong answers:
- **Qwen** called every eyelid photo "redness", missed 4 of 6 cataracts, and was "high
  confidence" every time. That's the worst kind of failure for this app.
- **Gemini** models and **Haiku** often called conjunctival swelling (chemosis) or a flipped
  eyelid an "eyelid" problem, and sometimes called a cataract normal.
- **GPT-6.1-sol** called a healthy eye red: the only false alarm on a normal eye.
- **Opus 5.5** never gave a wrong category in 48 disease answers over two runs. When unsure it
  said so ("the pupil is hard to tell apart from the light grey iris… low resolution"). It also
  gave the most useful photo-quality explanations (it named glare, distance and missing eyes).

## Decision

**Primary: `anthropic/claude-opus-5.5`. Fallback: `anthropic/claude-sonnet-5.5`.**

The choice is based on the errors above, not on reputation. Opus is the only model with zero wrong
answers and zero false alarms, and it handled uncertainty best. It is the slowest (about 5–6 s)
and most expensive, which is acceptable for a one-photo check. Sonnet is the fallback because when
it was unsure it abstained instead of guessing, and it never false-alarmed. Set
`IRIS_EYE_MODELS` to change the order.

## What this does NOT show (still unvalidated)

- **Real phone photos.** The disease photos are internet images, often clinical close-ups, and
  the normal photos are tiny. No real phone photo taken through the app has been scored yet.
  Before any real use, collect labelled phone photos (with consent and a clinician's labels)
  and re-run this comparison.
- **Small sample.** 36 photos is enough to rule out clearly bad models, not to state an accuracy.
- **Skin tone and eye colour.** Performance across eye colours and skin tones wasn't measured.
- **Only what a photo can show.** None of this tests glaucoma, diabetic eye disease, retinal
  problems or vision. The prompt forbids the model from mentioning them, and the API blocks any
  reply that does.
- **The proxy can change.** Model names, prices and availability are the proxy's. Re-run this if
  results change.

## Re-running

The temporary endpoint that ran this (`app/api/admin/model-eval`, now removed) read
`eval/dataset-cases.json` and `eval/fixtures/`. To re-run, restore it from git history
(commit 2f8012e) and set `IRIS_EVAL_TOKEN`.
