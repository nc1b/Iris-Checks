import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ChatWidget } from "@/components/blocks/chat-widget";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter-family",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Iris: eye checks by phone",
  description:
    "Iris is building a 10-second eye check that uses your phone's camera and screen light. Coming soon. A student project for Samsung Solve for Tomorrow.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        {children}
        <ChatWidget />
      </body>
    </html>
  );
}
