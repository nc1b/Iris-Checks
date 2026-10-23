import type { Metadata } from "next";
import { AuthFrame } from "@/components/auth/auth-frame";
import { SignInForm } from "@/components/auth/sign-in-form";

export const metadata: Metadata = {
  title: "Sign in",
  alternates: { canonical: "/sign-in" },
  description: "Sign in to the Iris research prototype.",
};

export default function SignInPage() {
  return (
    <AuthFrame>
      <SignInForm />
    </AuthFrame>
  );
}
