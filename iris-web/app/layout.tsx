import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ChatWidget } from "@/components/blocks/chat-widget-loader";
import { themeScript } from "@/lib/theme-script";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter-family",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Iris: eye checks by phone",
  description:
    "Iris is developing three phone-based research checks for diabetes-related pupil responses, glaucoma-related eye differences, and cataract-related cloudiness. Coming soon.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // The inline script sets the theme class before paint, so the server and client markup can differ here.
    <html lang="en" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        {children}
        <ChatWidget />
      </body>
    </html>
  );
}
