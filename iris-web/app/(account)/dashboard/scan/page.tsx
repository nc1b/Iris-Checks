import type { Metadata } from "next";
import { CameraScan } from "@/components/scanner/camera-scan";

export const metadata: Metadata = {
  title: "Camera scan",
  description: "Run the Iris camera scan: three screen flashes, three results.",
  robots: { index: false },
};

export default function CameraScanPage() {
  return <CameraScan />;
}
