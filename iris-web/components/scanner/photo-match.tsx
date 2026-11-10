import { Loader2 } from "lucide-react";
import { EYE_ORDER } from "@/lib/camera-scan";
import { PHOTO_CONDITIONS, PHOTO_THRESHOLDS, type PhotoCondition, type PhotoMatchResponse } from "@/lib/eye-photo";
import { cn } from "@/lib/utils";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export type PhotoState =
  | { status: "none" }
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "done"; data: PhotoMatchResponse };

const pct = (v: number) => `${Math.round(v * 100)}%`;
const SHOWN: PhotoCondition[] = ["cataract"];

export function PhotoMatch({ photo }: { photo: PhotoState }) {
  if (photo.status === "none") {
    return (
      <section className="mt-4 rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
        No clear close-up of either eye was captured, so the photo match was skipped.
      </section>
    );
  }
  if (photo.status === "loading") {
    return (
      <section className="mt-4 flex items-center gap-3 rounded-2xl border p-4 text-sm">
        <Loader2 className="size-4 animate-spin" /> Comparing your eye photos with the Iris database…
      </section>
    );
  }
  if (photo.status === "error") {
    return <section className="mt-4 rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">Photo match: {photo.error}</section>;
  }

  const { data } = photo;
  return (
    <section className="mt-4 rounded-2xl border bg-card p-4">
      <h2 className="font-semibold">Photo match</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        A close-up of each eye, compared on our server with {data.referenceCount.toLocaleString()} labelled front-of-eye photos, to look for a cloudy lens. Only a numeric
        fingerprint was sent, never the photo.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {EYE_ORDER.map((eye) => {
          const m = data.eyes[eye];
          if (!m) return null;
          const counts = new Map<string, number>();
          for (const n of m.neighbors) counts.set(n.label === "cataract" ? "cataract" : "other", (counts.get(n.label === "cataract" ? "cataract" : "other") ?? 0) + 1);
          const flagged = m.flagged.filter((c) => SHOWN.includes(c));
          return (
            <article key={eye} className="rounded-xl border p-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">{cap(eye)} eye</h3>
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[11px] font-medium",
                    !m.usable ? "border-dashed text-muted-foreground" : flagged.length ? "border-foreground bg-foreground text-background" : "",
                  )}
                >
                  {!m.usable ? "Unclear photo" : flagged.length ? "Worth a check" : "Looks typical"}
                </span>
              </div>
              {!m.usable ? (
                <p className="mt-2 text-xs text-muted-foreground">This close-up didn&apos;t look like any photo in the database, so Iris won&apos;t guess.</p>
              ) : (
                <>
                  <ul className="mt-3 space-y-2">
                    {SHOWN.map((c) => {
                      const v = m.probs[c];
                      const t = PHOTO_THRESHOLDS[c];
                      return (
                        <li key={c} className="text-xs">
                          <div className="flex justify-between gap-2">
                            <span className={cn(flagged.includes(c) && "font-semibold")}>{PHOTO_CONDITIONS[c].name}</span>
                            <span className="tabular-nums text-muted-foreground">{pct(v)}</span>
                          </div>
                          <div className="relative mt-1 h-1.5 rounded-full bg-muted">
                            <div className="h-full rounded-full bg-foreground/70" style={{ width: pct(Math.min(1, v)) }} />
                            <span className="absolute -top-0.5 h-2.5 w-0.5 rounded bg-foreground" style={{ left: pct(t) }} title="Flag line" />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  <p className="mt-3 text-[11px] text-muted-foreground">
                    Closest {m.neighbors.length} photos:{" "}
                    {counts.get("cataract") ?? 0} cataract, {counts.get("other") ?? 0} other.
                  </p>
                  {flagged.map((c) => (
                    <p key={c} className="mt-2 text-[11px]">
                      <span className="font-medium">{PHOTO_CONDITIONS[c].name}:</span> {PHOTO_CONDITIONS[c].summary}. Next step: {PHOTO_CONDITIONS[c].nextStep}.
                      {data.accuracy[c]?.sensitivity != null &&
                        ` In testing, Iris caught ${pct(data.accuracy[c].sensitivity!)} of these photos and wrongly flagged ${pct(1 - (data.accuracy[c].specificity ?? 1))} of others.`}
                    </p>
                  ))}
                </>
              )}
            </article>
          );
        })}
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">
        The reference photos come from a public dataset collected from the web, not phone scans, so treat this as a rough first check.
      </p>
    </section>
  );
}
