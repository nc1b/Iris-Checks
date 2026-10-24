import IPhoneMockup from "@/components/ui/iphone-mockup";

// Reference usage of the iPhone mockup.
export default function DemoOne() {
  return (
    <IPhoneMockup
      model="15-pro"
      color="natural-titanium"
      wallpaper="https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=800&q=80"
    >
      {/* Optional content instead of wallpaper */}
    </IPhoneMockup>
  );
}
