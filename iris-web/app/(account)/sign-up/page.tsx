import type { Metadata } from "next";
import { AuthFrame } from "@/components/auth/auth-frame";
import { SignUpForm } from "@/components/auth/sign-up-form";

export const metadata: Metadata = {
  title: "Create an account",
  alternates: { canonical: "/sign-up" },
  description: "Create an account for the Iris research prototype.",
};

export default function SignUpPage() {
  return (
    <AuthFrame>
      <SignUpForm />
    </AuthFrame>
  );
}
