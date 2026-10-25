import { STUDIES, THRESHOLDS } from "@/lib/reference";
import { aiConfigured, aiFetch } from "@/lib/server/hackclub";

/**
 * Turns the scan's numbers into a plain-language explanation using the
 * Hack Club AI proxy. Only numbers are sent, never images.
 *
 * Env:
 *   HACKCLUB_API_KEY  – required for AI text (falls back to a built-in explanation)
 *   HACKCLUB_API_KEY_BACKUP – optional, used when the main key runs out (lib/server/hackclub)
 *   IRIS_AI_MODEL     – optional, defaults to anthropic/claude-haiku-5.5
 */

const DEFAULT_MODEL = "anthropic/claude-haiku-5.5";

type Body = {
  verdict?: string;
  metrics?: Record<string, number | null>;
  ratings?: Record<string, string>;
  restingPupilMm?: number | null;
  netPipr?: number | null;
  quality?: { validFraction?: number; meanContrast?: number; reasons?: string[] };
  protocol?: string;
  age?: number | null;
  diabetes?: string;
  demo?: boolean;
};

function num(v: unknown) {
  return typeof v === "number" && Number.isFinite(v) ? Math.round(v * 1000) / 1000 : null;
}

function clean(body: Body) {
  const metrics: Record<string, number | null> = {};
  const ratings: Record<string, string> = {};
  for (const t of THRESHOLDS) {
    metrics[t.key] = num(body.metrics?.[t.key]);
    const r = body.ratings?.[t.key];
    ratings[t.key] = typeof r === "string" ? r.slice(0, 12) : "unknown";
  }
  return {
    verdict: typeof body.verdict === "string" ? body.verdict.slice(0, 12) : "unknown",
    metrics,
    ratings,
    restingPupilMm: num(body.restingPupilMm),
    netPipr: num(body.netPipr),
    validFraction: num(body.quality?.validFraction),
    meanContrast: num(body.quality?.meanContrast),
    qualityIssues: (body.quality?.reasons ?? []).slice(0, 3).map((r) => String(r).slice(0, 160)),
    protocol: body.protocol === "chromatic" ? "chromatic" : "standard",
    age: num(body.age),
    diabetes: typeof body.diabetes === "string" ? body.diabetes.slice(0, 10) : "",
    demo: body.demo === true,
  };
}

function fallback(d: ReturnType<typeof clean>) {
  const lines: string[] = [];
  if (d.demo) lines.push("This is a demo using simulated data, so it says nothing about your own eyes.");
  if (d.verdict === "retake") {
    lines.push(
      "Iris couldn't track your pupil clearly enough to measure it. Dim the lights, turn screen brightness up, hold the phone a bit closer and keep both eyes open during the flash.",
    );
    return lines.join("\n\n");
  }
  const parts = THRESHOLDS.map((t) => {
    const v = d.metrics[t.key];
    return `${t.label}: ${v == null ? "not measured" : `${v}${t.unit}`} (${d.ratings[t.key]})`;
  });
  lines.push(`Here is what Iris measured: ${parts.join("; ")}.`);
  if (d.verdict === "weaker") {
    lines.push(
      "Your pupil reacted more weakly or slowly than our starter range. Research with clinic pupillometers has linked this pattern to diabetes and early nerve changes, but many other things (lighting, age, tiredness, medicines, caffeine) affect pupils too. It's a reason to ask a doctor about an A1c blood test, not a diagnosis.",
    );
  } else if (d.verdict === "check") {
    lines.push("Most measures looked typical. One was outside the range, which is often caused by lighting or movement, so a retake is worthwhile.");
  } else {
    lines.push("Your pupil's reaction to the flash looked typical. That doesn't rule anything out. Regular check-ups are still the best way to catch diabetes early.");
  }
  lines.push("Remember: Iris is a student prototype and its thresholds are provisional.");
  return lines.join("\n\n");
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const data = clean(body);

  if (!aiConfigured()) return Response.json({ text: fallback(data), source: "fallback" });

  const research = STUDIES.map((s) => `- ${s.short}: ${s.finding}`).join("\n");
  const ranges = THRESHOLDS.map(
    (t) => `- ${t.label} (${t.key}): typical ${t.better === "higher" ? ">=" : "<="} ${t.typical}${t.unit}, borderline ${t.borderline}${t.unit}`,
  ).join("\n");

  const system = `You are the explanation assistant inside Iris, a student research prototype.
Iris uses a phone camera and screen flash to measure the pupillary light reflex and compares it with published research linking weaker/slower pupil reactions to diabetes and diabetic nerve damage.

Rules:
- Write for a teenager or adult with no medical background. 110-170 words. Plain text, short paragraphs, no markdown headings, no bullet symbols.
- Never diagnose. Never say the person has or does not have diabetes. Use "may", "can be linked to".
- If the verdict is "weaker", suggest asking a doctor about an A1c blood test. If "retake", focus on how to get a better reading.
- Mention one or two everyday factors that also change pupils (lighting, age, tiredness, caffeine, medicines).
- If demo is true, say clearly that the data is simulated.
- Do not invent statistics. Only use the research summary below.

Research summary:
${research}

Iris starter thresholds (provisional, team-set):
${ranges}`;

  try {
    const res = await aiFetch(
      "/chat/completions",
      {
        model: process.env.IRIS_AI_MODEL || DEFAULT_MODEL,
        // Some models spend tokens on hidden reasoning before answering; leave room and turn it off where supported.
        max_tokens: 1200,
        reasoning: { enabled: false },
        temperature: 0.4,
        messages: [
          { role: "system", content: system },
          { role: "user", content: `Scan result as JSON:\n${JSON.stringify(data)}\n\nExplain this result.` },
        ],
      },
      25_000,
    );
    if (!res.ok) throw new Error(`AI proxy returned ${res.status}`);
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = json.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error(`Empty AI response: ${JSON.stringify(json).slice(0, 400)}`);
    return Response.json({ text, source: "ai" });
  } catch (e) {
    console.error("explain: AI request failed", e);
    return Response.json({ text: fallback(data), source: "fallback" });
  }
}
