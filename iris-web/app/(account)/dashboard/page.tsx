import type { Metadata } from "next";
import { Dashboard } from "@/components/dashboard/dashboard";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Your Iris research prototype dashboard.",
  robots: { index: false },
};

export default function DashboardPage() {
  return <Dashboard />;
}
