import { EyeTracker } from "@/components/ui/interactive-eye-tracker";

export default function Demo() {
  return (
    <div className="flex items-center justify-center min-h-[300px] w-full">
      <EyeTracker shape="Cube" size={120} />
    </div>
  );
}
