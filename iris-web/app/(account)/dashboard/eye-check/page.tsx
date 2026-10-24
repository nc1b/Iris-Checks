import type { Metadata } from "next";
import { EyeCheck } from "@/components/eye-check/eye-check";

export const metadata: Metadata = {
  title: "Eye photo check",
  description: "Answer a few questions and take one close-up photo of the front of the eye.",
  robots: { index: false },
};

export default function EyeCheckPage() {
  return <EyeCheck />;
}
