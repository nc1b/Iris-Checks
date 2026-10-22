import { EyeTracker } from "@/components/ui/interactive-eye-tracker";

// Reference usage of the eye tracker (the live site uses it as the chat button, see chat-widget.tsx).
export default function Demo() {
  return (
    <div className="flex items-center justify-center min-h-[300px] w-full">
      <EyeTracker shape="Cube" size={120} />
    </div>
  );
}
