import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/blocks/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy · Iris",
  description: "How the Iris website handles your information.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="October 20, 2026"
      intro={
        <p>
          Iris is a student project for Samsung Solve for Tomorrow. This policy explains what information this website handles and why. In short:
          there are no accounts, the eye scan isn&apos;t live yet, and we don&apos;t sell or share your information for advertising.
        </p>
      }
      sections={[
        {
          heading: "Information we collect",
          body: (
            <>
              <p>We don&apos;t ask you to create an account or give us your name, email or phone number. The website handles only:</p>
              <ul>
                <li>
                  <strong>Messages you type into the AI chat</strong> (see section 3).
                </li>
                <li>
                  <strong>Basic technical data</strong> that every website receives, such as your IP address, browser type and the pages you visit.
                  Our hosting provider uses this to deliver the site and keep it secure.
                </li>
              </ul>
            </>
          ),
        },
        {
          heading: "The eye scan and your camera",
          body: (
            <p>
              Eye scanning is <strong>coming soon</strong> and is not available on this website yet, so we don&apos;t access your camera. When it
              launches, the plan is for camera images to be processed on your own device and never uploaded. We&apos;ll update this policy before
              that happens.
            </p>
          ),
        },
        {
          heading: "The AI chat",
          body: (
            <>
              <p>
                When you send a message in the chat, the conversation is sent to our server and passed to the{" "}
                <a href="https://ai.hackclub.com" target="_blank" rel="noreferrer">
                  Hack Club AI
                </a>{" "}
                service, which forwards it to an AI model provider to write a reply.
              </p>
              <ul>
                <li>We don&apos;t save your chat messages on our server or in your browser. Closing or reloading the page clears the conversation.</li>
                <li>The AI services that process your messages have their own privacy policies.</li>
                <li>
                  <strong>Please don&apos;t share personal, contact or health information in the chat.</strong> It&apos;s for questions about the
                  project, not medical advice.
                </li>
              </ul>
            </>
          ),
        },
        {
          heading: "Services we use",
          body: (
            <ul>
              <li>
                <strong>Vercel</strong> hosts the website and may keep standard server logs.
              </li>
              <li>
                <strong>Hack Club AI</strong> and its model providers power the chat.
              </li>
              <li>
                <strong>Unsplash</strong> serves some of the photos on the site, so your browser loads them from Unsplash&apos;s servers.
              </li>
            </ul>
          ),
        },
        {
          heading: "Cookies",
          body: <p>We don&apos;t use advertising or tracking cookies.</p>,
        },
        {
          heading: "Children",
          body: (
            <p>
              Iris is built by students and is meant for a general audience. We don&apos;t knowingly collect personal information from children
              under 13. Because the chat sends messages to outside AI services, younger visitors should use it with a parent or teacher.
            </p>
          ),
        },
        {
          heading: "Changes to this policy",
          body: (
            <p>
              We&apos;ll update this page when the website changes, especially before the eye scan launches. The date at the top shows the latest
              version.
            </p>
          ),
        },
        {
          heading: "Contact",
          body: (
            <p>
              Contact details for the team are coming soon. You can also read our <Link href="/terms">Terms &amp; Conditions</Link>.
            </p>
          ),
        },
      ]}
    />
  );
}
