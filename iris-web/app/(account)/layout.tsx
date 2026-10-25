import { ClerkProvider } from "@clerk/nextjs";

export default function AccountLayout({ children }: LayoutProps<"/">) {
  return (
    <ClerkProvider signInUrl="/sign-in" signUpUrl="/sign-up" afterSignOutUrl="/">
      {children}
    </ClerkProvider>
  );
}
