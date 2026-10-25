"use client";

import { Check, Loader2 } from "lucide-react";
import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { AGE_RANGES, ANSWERS, type Answer, type Profile } from "@/lib/dashboard-types";
import { cn } from "@/lib/utils";

type Form = Pick<Profile, "age_range" | "diabetes" | "glaucoma" | "cataract" | "research_consent">;

function Chips<T extends string>({ value, options, onChange, label }: { value: T | null; options: readonly T[]; onChange: (v: T | null) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          role="radio"
          aria-checked={value === o}
          onClick={() => onChange(value === o ? null : o)}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors",
            value === o ? "border-foreground bg-foreground text-background" : "text-muted-foreground hover:border-foreground/40 hover:text-foreground",
          )}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

const questions: { key: "diabetes" | "glaucoma" | "cataract"; label: string }[] = [
  { key: "diabetes", label: "Has a doctor told you that you have diabetes?" },
  { key: "glaucoma", label: "Has a doctor told you that you have glaucoma?" },
  { key: "cataract", label: "Has a doctor told you that you have cataracts?" },
];

export function ProfileCard({ profile, onSave }: { profile: Profile; onSave: (form: Form) => Promise<void> }) {
  const [form, setForm] = useState<Form>({
    age_range: profile.age_range,
    diabetes: profile.diabetes,
    glaucoma: profile.glaucoma,
    cataract: profile.cataract,
    research_consent: profile.research_consent,
  });
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const set = (patch: Partial<Form>) => {
    setForm((f) => ({ ...f, ...patch }));
    setState("idle");
  };

  return (
    <form
      className="rounded-3xl border bg-card p-6"
      onSubmit={async (e) => {
        e.preventDefault();
        setState("saving");
        try {
          await onSave(form);
          setState("saved");
        } catch {
          setState("error");
        }
      }}
    >
      <h2 className="font-semibold">About you</h2>
      <p className="mt-1 text-sm text-muted-foreground">Optional. Helps us compare results for the research. You can change or delete it anytime.</p>

      <div className="mt-5 space-y-5">
        <div>
          <p className="mb-2 text-sm font-medium">Age range</p>
          <Chips label="Age range" value={form.age_range} options={AGE_RANGES} onChange={(v) => set({ age_range: v })} />
        </div>
        {questions.map((q) => (
          <div key={q.key}>
            <p className="mb-2 text-sm font-medium">{q.label}</p>
            <Chips<Answer> label={q.label} value={form[q.key]} options={ANSWERS} onChange={(v) => set({ [q.key]: v } as Partial<Form>)} />
          </div>
        ))}

        <label className="flex items-start justify-between gap-4 rounded-2xl border p-4">
          <span>
            <span className="block text-sm font-medium">Use my results for research</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              Lets the team include your scan numbers (never images or your email) in the pilot study analysis.
            </span>
          </span>
          <Switch checked={form.research_consent} onCheckedChange={(v) => set({ research_consent: v })} aria-label="Use my results for research" />
        </label>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button
          type="submit"
          disabled={state === "saving"}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-foreground px-4 text-sm font-medium text-background transition-opacity hover:opacity-85 disabled:opacity-60"
        >
          {state === "saving" && <Loader2 className="size-4 animate-spin" />}
          Save
        </button>
        <span aria-live="polite" className="text-sm text-muted-foreground">
          {state === "saved" && (
            <span className="inline-flex items-center gap-1.5">
              <Check className="size-4" /> Saved
            </span>
          )}
          {state === "error" && "Couldn't save. Try again."}
        </span>
      </div>
    </form>
  );
}
