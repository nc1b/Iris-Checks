import { SignInPage, type Testimonial } from "@/components/ui/sign-in";

// Reference usage of the original all-in-one SignInPage. The live sign-in page uses the
// same layout with real Clerk logic (app/(account)/sign-in, components/auth/sign-in-form.tsx).
const sampleTestimonials: Testimonial[] = [
  { avatarSrc: "/quotes/franklin.jpg", name: "Benjamin Franklin", handle: "Inventor, 1735", text: "An ounce of prevention is worth a pound of cure." },
  { avatarSrc: "/quotes/clarke.jpg", name: "Arthur C. Clarke", handle: "Profiles of the Future", text: "Any sufficiently advanced technology is indistinguishable from magic." },
];

const SignInPageDemo = () => {
  const handleSignIn = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    console.log("Sign In submitted:", { email: data.email });
  };

  return (
    <div className="bg-background text-foreground">
      <SignInPage
        heroImageSrc="https://images.unsplash.com/photo-1576176243977-7c62b6472a31?w=1600&q=80&auto=format&fit=crop"
        testimonials={sampleTestimonials}
        onSignIn={handleSignIn}
        onGoogleSignIn={() => console.log("Continue with Google clicked")}
        onResetPassword={() => console.log("Reset Password clicked")}
        onCreateAccount={() => console.log("Create Account clicked")}
      />
    </div>
  );
};

export default SignInPageDemo;
