export const CLINICAL_REVIEW = {
  reviewed: false,
  note: "Based on AAO and NHS public guidance. Not yet reviewed by a clinician; a doctor or optometrist must check this before real-world use.",
  sources: [
    { label: "American Academy of Ophthalmology: Eye emergencies", url: "https://www.aao.org/eye-health/tips-prevention/eye-emergencies" },
    { label: "NHS: Red eye", url: "https://www.nhs.uk/conditions/red-eye/" },
    { label: "NHS: Flashes and floaters", url: "https://www.nhs.uk/conditions/floaters-and-flashes-in-the-eyes/" },
  ],
};

export type Urgency = "emergency" | "same_day" | "soon" | "routine";

export type RedFlag = { id: string; label: string; urgency: "emergency" | "same_day"; advice: string };

export const RED_FLAGS: RedFlag[] = [
  {
    id: "chemical",
    label: "A chemical or cleaning product got in my eye",
    urgency: "emergency",
    advice: "Rinse the eye with clean running water for at least 15 minutes, then go to the emergency room or call 911.",
  },
  {
    id: "injury",
    label: "Something hit, cut or is stuck in my eye",
    urgency: "emergency",
    advice: "Don't rub or press on the eye or try to remove anything stuck in it. Cover it gently and go to the emergency room.",
  },
  {
    id: "vision_loss",
    label: "Sudden loss of vision, or a curtain or shadow over part of my vision",
    urgency: "emergency",
    advice: "Go to the emergency room now. Sudden vision loss needs to be checked within hours.",
  },
  {
    id: "stroke",
    label: "Sudden drooping face, weakness or trouble speaking, with an eye or eyelid change",
    urgency: "emergency",
    advice: "Call 911 now. These can be signs of a stroke.",
  },
  {
    id: "severe_pain",
    label: "Severe eye pain, especially with headache, nausea or seeing halos around lights",
    urgency: "emergency",
    advice: "Go to the emergency room now. This can be a sign of a sudden rise in eye pressure.",
  },
  {
    id: "flashes",
    label: "New flashes of light or a sudden shower of floaters",
    urgency: "same_day",
    advice: "See an eye doctor or urgent eye service today, as this can be a sign of a retinal tear.",
  },
  {
    id: "lens_pain",
    label: "I wear contact lenses and my eye is painful or red",
    urgency: "same_day",
    advice: "Take the lenses out, don't put them back in, and see an eye doctor today. Lens infections can damage the eye quickly.",
  },
  {
    id: "double",
    label: "Sudden double vision",
    urgency: "same_day",
    advice: "Get medical care today. If it comes with a headache, weakness or trouble speaking, call 911.",
  },
  {
    id: "newborn",
    label: "This is for a baby under 1 month old with a red or sticky eye",
    urgency: "same_day",
    advice: "Contact your pediatrician or urgent care today.",
  },
];

export type Symptoms = {
  redFlags: string[];
  eye: "left" | "right" | "both" | "";
  pain: "none" | "mild" | "moderate" | "";
  redness: boolean;
  discharge: "none" | "watery" | "thick" | "";
  itching: boolean;
  lightSensitivity: boolean;
  blurry: boolean;
  duration: "today" | "1_3_days" | "4_14_days" | "longer" | "";
  contactLenses: "yes" | "no" | "";
};

export const EMPTY_SYMPTOMS: Symptoms = {
  redFlags: [],
  eye: "",
  pain: "",
  redness: false,
  discharge: "",
  itching: false,
  lightSensitivity: false,
  blurry: false,
  duration: "",
  contactLenses: "",
};

export type Triage = { urgency: Urgency; reasons: string[] };

export function triage(s: Symptoms): Triage {
  const flags = RED_FLAGS.filter((f) => s.redFlags.includes(f.id));
  if (flags.some((f) => f.urgency === "emergency")) return { urgency: "emergency", reasons: flags.map((f) => f.advice) };
  if (flags.length) return { urgency: "same_day", reasons: flags.map((f) => f.advice) };

  const reasons: string[] = [];
  if ((s.pain === "moderate" || s.pain === "mild") && (s.lightSensitivity || s.blurry) && s.redness) {
    return { urgency: "same_day", reasons: ["A painful red eye with light sensitivity or blurry vision should be checked by a doctor today."] };
  }
  if (s.contactLenses === "yes" && (s.redness || s.pain !== "none" && s.pain !== "")) {
    return { urgency: "same_day", reasons: ["With contact lenses, a red or sore eye should be checked today. Take the lenses out until then."] };
  }
  if (s.blurry && s.duration !== "longer") reasons.push("New blurry vision that doesn't clear when you blink is worth getting checked within a few days.");
  if (s.discharge === "thick") reasons.push("Thick yellow or green discharge can mean an infection that may need treatment.");
  if ((s.redness || s.discharge !== "none") && (s.duration === "4_14_days" || s.duration === "longer")) {
    reasons.push("Redness or discharge lasting more than a few days should be checked.");
  }
  if (reasons.length) return { urgency: "soon", reasons };
  return { urgency: "routine", reasons: [] };
}

export function symptomContext(s: Symptoms) {
  const parts: string[] = [];
  if (s.eye) parts.push(`eye: ${s.eye}`);
  if (s.pain && s.pain !== "none") parts.push(`pain: ${s.pain}`);
  if (s.redness) parts.push("reports redness");
  if (s.discharge && s.discharge !== "none") parts.push(`discharge: ${s.discharge}`);
  if (s.itching) parts.push("itching");
  if (s.lightSensitivity) parts.push("light sensitivity");
  if (s.blurry) parts.push("blurry vision");
  if (s.duration) parts.push(`duration: ${s.duration.replace(/_/g, " ")}`);
  if (s.contactLenses === "yes") parts.push("wears contact lenses");
  return parts.join("; ") || "no symptoms reported";
}
