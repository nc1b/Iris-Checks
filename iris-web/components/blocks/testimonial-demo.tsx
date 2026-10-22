import TestimonialsBlock from "@/components/ui/testimonials-2"

// Reference usage of the quote block (the home page renders it inside its own section).
export default function TestimonialDemo() {
  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-background p-8">
      <TestimonialsBlock />
    </main>
  )
}
