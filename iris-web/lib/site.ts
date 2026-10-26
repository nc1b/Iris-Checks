export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://irischecks.app";
export const SITE_NAME = "Iris Checks";
export const SITE_TAGLINE = "Many eye checks. Just your phone.";
export const SITE_DESCRIPTION =
  "Iris Checks is a student research project building a 30-second phone scan that looks for signs linked to diabetic retinopathy, glaucoma and cataracts, using only your camera and screen light. Coming soon.";

export const PUBLIC_PAGES: { path: string; priority: number; changeFrequency: "weekly" | "monthly" | "yearly" }[] = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/research", priority: 0.8, changeFrequency: "weekly" },
  { path: "/team", priority: 0.5, changeFrequency: "monthly" },
  { path: "/privacy", priority: 0.3, changeFrequency: "yearly" },
  { path: "/terms", priority: 0.3, changeFrequency: "yearly" },
  { path: "/scan", priority: 0.4, changeFrequency: "monthly" },
];

export const CONTENT_UPDATED = "2026-10-22";
