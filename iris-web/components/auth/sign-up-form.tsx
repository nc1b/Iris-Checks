"use client";

import { useAuth, useSignUp } from "@clerk/nextjs";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FormError, errorText, goToDashboard } from "@/components/auth/auth-frame";
import { CodeField, Divider, EmailField, SubmitButton } from "@/components/auth/sign-in-form";
import { GlassInputWrapper, GoogleIcon, PasswordInput } from "@/components/ui/sign-in";

export function SignUpForm() {
  const { signUp, fetchStatus } = useSignUp();
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const [verifying, setVerifying] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const busy = fetchStatus === "fetching" || !isLoaded;

  useEffect(() => {
    if (isLoaded && isSignedIn) router.replace("/dashboard");
  }, [isLoaded, isSignedIn, router]);

  const finish = async () => {
    const { error } = await signUp.finalize({ navigate: ({ decorateUrl }) => goToDashboard(decorateUrl, router.push) });
    if (error) setError(errorText(error));
  };

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!agreed) return setError("Please confirm you're 13 or older and agree to the Terms and Privacy Policy.");
    const { error } = await signUp.password({ emailAddress: email.trim(), password, firstName: firstName.trim() || undefined });
    if (error) return setError(errorText(error));
    const sent = await signUp.verifications.sendEmailCode();
    if (sent.error) return setError(errorText(sent.error));
    setCode("");
    setVerifying(true);
  };

  const onVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const { error } = await signUp.verifications.verifyEmailCode({ code: code.trim() });
    if (error) return setError(errorText(error));
    if (signUp.status === "complete") return finish();
    setError("Your account needs one more step this prototype doesn't support yet. Please try again.");
  };

  const onGoogle = async () => {
    setError(null);
    if (!agreed) return setError("Please confirm you're 13 or older and agree to the Terms and Privacy Policy first.");
    const { error } = await signUp.sso({ strategy: "oauth_google", redirectUrl: "/dashboard", redirectCallbackUrl: "/sso-callback" });
    if (error) setError(errorText(error));
  };

  if (verifying) {
    return (
      <div className="flex flex-col gap-6">
        <button
          type="button"
          onClick={() => {
            setVerifying(false);
            setError(null);
          }}
          className="animate-element flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Change email
        </button>
        <h1 className="animate-element animate-delay-100 text-4xl font-semibold leading-tight tracking-tight md:text-5xl">Check your email</h1>
        <p className="animate-element animate-delay-200 text-muted-foreground">
          We sent a 6-digit code to <span className="font-medium text-foreground">{email}</span>. It expires in 10 minutes.
        </p>
        <form className="space-y-5" onSubmit={onVerify}>
          <CodeField value={code} onChange={setCode} />
          <FormError message={error} />
          <SubmitButton busy={busy}>Verify and continue</SubmitButton>
        </form>
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setError(null);
            const { error } = await signUp.verifications.sendEmailCode();
            setError(error ? errorText(error) : "We sent a new code.");
          }}
          className="text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          Didn&apos;t get it? Send a new code
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="animate-element animate-delay-100 text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
        <span className="font-light">Join</span> Iris
      </h1>
      <p className="animate-element animate-delay-200 text-muted-foreground">
        Create an account to try the prototype. Scans are demo data for now; real camera checks are coming soon.
      </p>

      <form className="space-y-5" onSubmit={onCreate}>
        <div className="animate-element animate-delay-300">
          <label htmlFor="firstName" className="text-sm font-medium text-muted-foreground">
            First name <span className="font-normal">(optional)</span>
          </label>
          <GlassInputWrapper>
            <input
              id="firstName"
              name="firstName"
              autoComplete="given-name"
              maxLength={60}
              placeholder="What should we call you?"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full rounded-2xl bg-transparent p-4 text-sm focus:outline-none"
            />
          </GlassInputWrapper>
        </div>

        <EmailField value={email} onChange={setEmail} />

        <div className="animate-element animate-delay-400">
          <label htmlFor="password" className="text-sm font-medium text-muted-foreground">
            Password
          </label>
          <PasswordInput autoComplete="new-password" placeholder="At least 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>

        <label className="animate-element animate-delay-500 flex cursor-pointer items-start gap-3 text-sm">
          <input type="checkbox" className="custom-checkbox mt-0.5" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
          <span className="text-foreground/90">
            I&apos;m 13 or older and agree to the{" "}
            <Link href="/terms" className="underline underline-offset-4">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="underline underline-offset-4">
              Privacy Policy
            </Link>
            .
          </span>
        </label>

        <div id="clerk-captcha" />

        <FormError message={error} />
        <SubmitButton busy={busy} className="animate-element animate-delay-600">
          Create account
        </SubmitButton>
      </form>

      <Divider />

      <button
        type="button"
        onClick={onGoogle}
        disabled={busy}
        className="animate-element animate-delay-800 flex w-full items-center justify-center gap-3 rounded-2xl border border-border py-4 transition-colors hover:bg-secondary disabled:opacity-60"
      >
        <GoogleIcon />
        Continue with Google
      </button>

      <p className="animate-element animate-delay-900 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-medium text-foreground underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
