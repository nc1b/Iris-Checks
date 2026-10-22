import { ClerkProvider } from "@clerk/nextjs";

/**
 * Sign-in, sign-up and the dashboard. Clerk only loads on these pages, so the public
 * site stays as light as before. The UI is custom (components/auth, components/dashboard).
 */
export default function AccountLayout({ children }: LayoutProps<"/">) {
  return (
    <ClerkProvider signInUrl="/sign-in" signUpUrl="/sign-up" afterSignOutUrl="/">
      {children}
    </ClerkProvider>
  );
}
