import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/blocks/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy · Iris",
  description: "How the Iris website and AI assistant handle your information.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="October 20, 2026"
      intro={
        <>
          <p>
            Iris (&quot;we&quot;, &quot;us&quot;) is a student research project building a phone-based eye check. This policy explains what
            information this website and its AI assistant handle, why, who it&apos;s shared with, and the choices you have.
          </p>
          <p className="mt-4">
            <strong className="text-foreground">The short version:</strong> there are no accounts, the eye scan isn&apos;t live yet, chat messages
            are sent to an AI service to get an answer, your chat history is saved only in your own browser, and we never sell your information.
          </p>
        </>
      }
      sections={[
        {
          heading: "Who we are",
          body: (
            <p>
              Iris is run by a team of students as a research project. We&apos;re responsible for the information described in this policy. You can
              reach us using the details in the &quot;Contact us&quot; section below.
            </p>
          ),
        },
        {
          heading: "Information we collect",
          body: (
            <>
              <p>We don&apos;t ask you to create an account or give us your name, email address or phone number. We handle:</p>
              <ul>
                <li>
                  <strong>Chat messages</strong> you type into the AI assistant, including questions sent from the footer&apos;s question box.
                </li>
                <li>
                  <strong>Technical data</strong> that every website receives, such as your IP address, browser and device type, the pages you visit
                  and the time of your visit. This comes from our hosting provider&apos;s standard logs.
                </li>
                <li>
                  <strong>Settings saved in your browser</strong>: your light/dark choice, your chat history and where you placed the chat button.
                  These stay on your device (see &quot;Cookies and browser storage&quot;).
                </li>
              </ul>
              <p>We don&apos;t collect precise location, contacts, photos or payment information.</p>
            </>
          ),
        },
        {
          heading: "How we use information",
          body: (
            <ul>
              <li>To answer your questions in the AI assistant</li>
              <li>To run, secure and fix the website, including preventing spam and abuse (for example, limiting how many messages can be sent per minute)</li>
              <li>To remember your preferences on your own device</li>
            </ul>
          ),
        },
        {
          heading: "The AI assistant",
          body: (
            <>
              <p>
                When you send a message, the recent conversation is sent to our server and passed to{" "}
                <a href="https://ai.hackclub.com" target="_blank" rel="noreferrer">
                  Hack Club AI
                </a>
                , which forwards it to an AI model provider (currently Anthropic) to write a reply.
              </p>
              <ul>
                <li>We don&apos;t store the content of your chat messages on our server or write them to our logs.</li>
                <li>Your chat history is saved in your browser so it&apos;s still there next time. Use &quot;New chat&quot; or &quot;Clear saved data&quot; to delete it.</li>
                <li>The AI services that process your messages handle them under their own privacy policies.</li>
                <li>
                  <strong>Please don&apos;t share personal, contact or health information in the chat.</strong> It answers questions about the
                  project and is not medical advice.
                </li>
              </ul>
            </>
          ),
        },
        {
          heading: "The eye scan and your camera",
          body: (
            <>
              <p>
                Eye scanning is <strong>coming soon</strong> and isn&apos;t available on this website yet, so we don&apos;t access your camera.
              </p>
              <p>
                When it launches, the plan is for the camera video to be processed on your own device and never uploaded or stored by us. Eye images
                and measurements can be sensitive health and biometric information, so before the scan goes live we will update this policy, ask for
                your clear permission first, and explain exactly what is measured and what (if anything) leaves your device.
              </p>
            </>
          ),
        },
        {
          heading: "Cookies and browser storage",
          body: (
            <>
              <p>We don&apos;t use advertising, analytics or tracking cookies. We use your browser&apos;s local storage only for:</p>
              <ul>
                <li><strong>iris-theme</strong>: your light or dark mode choice</li>
                <li><strong>iris-chat-messages</strong>: your recent chat history (up to 40 messages)</li>
                <li><strong>iris-chat-position</strong>: where you dragged the chat button</li>
              </ul>
              <p>
                This data never leaves your device unless you send a chat message. You can delete it at any time with &quot;Clear saved data&quot; at
                the bottom of every page, or by clearing your browser&apos;s site data.
              </p>
            </>
          ),
        },
        {
          heading: "Who we share information with",
          body: (
            <>
              <p>We only share information with service providers that help run the site:</p>
              <ul>
                <li><strong>Vercel</strong>: hosts the website and keeps standard server logs</li>
                <li><strong>Hack Club AI</strong> and its model provider: process chat messages to write replies</li>
                <li><strong>Unsplash</strong>: serves some photos, so your browser loads them from Unsplash&apos;s servers</li>
              </ul>
              <p>
                We may also share information if the law requires it or to protect the safety of people or the website. We <strong>do not sell</strong>{" "}
                or &quot;share&quot; personal information for targeted advertising.
              </p>
            </>
          ),
        },
        {
          heading: "How long we keep information",
          body: (
            <p>
              We don&apos;t keep chat content. Hosting logs are kept by our hosting provider for a limited time under its own retention settings.
              Information saved in your browser stays until you clear it.
            </p>
          ),
        },
        {
          heading: "Security",
          body: (
            <p>
              The site is served over HTTPS, chat requests are checked and rate-limited, and API keys are kept on the server, never in your browser.
              No system is perfectly secure, so please don&apos;t send sensitive information through the chat.
            </p>
          ),
        },
        {
          heading: "Your choices and rights",
          body: (
            <>
              <ul>
                <li>Use the site without the chat; nothing is sent unless you send a message.</li>
                <li>Delete your saved chat and settings with &quot;New chat&quot; or &quot;Clear saved data&quot;.</li>
                <li>
                  Depending on where you live (for example, under California or European privacy laws), you may have the right to ask what personal
                  information we hold about you, and to ask us to correct or delete it. Because we don&apos;t keep chat content or accounts, we usually
                  hold nothing that identifies you, but you can still contact us and we&apos;ll help.
                </li>
              </ul>
              <p>We don&apos;t respond differently to &quot;Do Not Track&quot; signals because we don&apos;t track you across sites.</p>
            </>
          ),
        },
        {
          heading: "Children's privacy",
          body: (
            <p>
              Iris is built by students and is meant for a general audience. We don&apos;t knowingly collect personal information from children under
              13. If you are under 13, please only use the chat with a parent, guardian or teacher, and don&apos;t share personal information. If you
              believe a child has given us personal information, contact us and we&apos;ll delete it.
            </p>
          ),
        },
        {
          heading: "Visitors outside the United States",
          body: (
            <p>
              The website is hosted in the United States. If you visit from another country, your information (such as chat messages and technical
              data) may be processed in the United States.
            </p>
          ),
        },
        {
          heading: "Changes to this policy",
          body: (
            <p>
              We&apos;ll update this policy when the website changes, and always before the eye scan launches. The &quot;Last updated&quot; date at the
              top shows the current version. Important changes will be highlighted on the site.
            </p>
          ),
        },
        {
          heading: "Contact us",
          body: (
            <p>
              Team contact details are coming soon and will be added here. You can also read our <Link href="/terms">Terms of Service</Link>.
            </p>
          ),
        },
      ]}
    />
  );
}
