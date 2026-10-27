import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/blocks/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  alternates: { canonical: "/privacy" },
  description: "What Iris collects, where it goes, who can see it and how to delete it.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="October 26, 2026"
      intro={
        <>
          <p>
            Iris (&quot;we&quot;, &quot;us&quot;) is a student research project building phone-based eye checks. This policy explains what
            information the website, the eye checks and the AI assistant collect, where it goes, who can see it, and the choices you have.
          </p>
          <p className="mt-4">
            <strong className="text-foreground">The short version:</strong> you can browse and chat without an account. If you sign up, we store
            your scan numbers and optional answers, linked to your account. We never store pictures or video of your eyes. The optional eye photo
            check sends one photo to an AI service to be reviewed, and you&apos;re told before it&apos;s sent. You can delete your data at any time,
            and we never sell it.
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
              <p>
                <strong>If you create an account</strong>, our sign-in provider, Clerk, stores your email address, your first name if you give it,
                and your password or Google sign-in. We never see or store your password.
              </p>
              <p>
                <strong>In your dashboard</strong>, our database stores, linked to your account:
              </p>
              <ul>
                <li>Your optional profile answers: age range, whether a doctor has told you that you have diabetes, glaucoma or cataracts, and whether you agree to research use</li>
                <li>Each scan you save: its results for the three checks, the measurements behind them (such as pupil size and reaction speed), and an optional note of up to 500 characters</li>
              </ul>
              <p>
                <strong>Everyone</strong>, with or without an account:
              </p>
              <ul>
                <li>Chat messages you send to the AI assistant</li>
                <li>Technical data every website receives, such as your IP address, browser and device type, the pages you visit and the time of your visit, from our hosting provider&apos;s standard logs</li>
                <li>Settings saved in your own browser (see &quot;Cookies and browser storage&quot;)</li>
              </ul>
              <p>We don&apos;t collect precise location, contacts or payment information, and we don&apos;t store photos or video of your eyes.</p>
            </>
          ),
        },
        {
          heading: "The eye checks and your camera",
          body: (
            <>
              <p>The camera only turns on when you start a check and your browser asks for your permission.</p>
              <ul>
                <li>
                  <strong>Pupil scan.</strong> The camera video is processed on your own device. Only the measurements, such as pupil size and how
                  fast it shrinks, leave your device: to write the plain-language explanation on your results screen, and to save the scan if you choose to.
                </li>
                <li>
                  <strong>Eye photo check.</strong> This one sends a photo. When you continue, your close-up photo, a brightened copy of it and your
                  symptom answers go to our server, which passes them to{" "}
                  <a href="https://ai.hackclub.com" target="_blank" rel="noreferrer">
                    Hack Club AI
                  </a>{" "}
                  and on to Anthropic&apos;s Claude to be described. The app tells you this before anything is sent. We don&apos;t save the photo,
                  and those services handle it under their own privacy policies.
                </li>
                <li>
                  <strong>Photo comparison.</strong> Your phone turns the eye close-up into a list of numbers that describes it. Only those numbers
                  are sent to our server to compare with labeled reference eye photos, never the picture itself.
                </li>
              </ul>
              <p>
                Eye measurements can be sensitive health information, so we keep them to what each check needs and never put them in our server logs.
              </p>
            </>
          ),
        },
        {
          heading: "How we use information",
          body: (
            <ul>
              <li>To run the eye checks and show your results and history in your dashboard</li>
              <li>To answer your questions in the AI assistant and explain your scan results</li>
              <li>To run, secure and fix the website, including preventing spam and abuse (for example, limiting how many scans or messages can be sent)</li>
              <li>For our research study, only if you turn on &quot;Use my results for research&quot;. Then the team may include your scan numbers, never images or your email, in the pilot study analysis</li>
            </ul>
          ),
        },
        {
          heading: "The AI assistant",
          body: (
            <>
              <p>
                When you send a message, the recent conversation is sent to our server and passed to Hack Club AI, which forwards it to an AI model
                provider (currently NVIDIA or Anthropic) to write a reply. When a pupil scan finishes, its measurements and any age and diabetes
                answers you gave for that scan are sent the same way to write the explanation on your results screen.
              </p>
              <ul>
                <li>We don&apos;t store the content of your chat messages on our server or write them to our logs.</li>
                <li>Your chat history is saved in your browser so it&apos;s still there next time. Use &quot;New chat&quot; or &quot;Clear saved data&quot; to delete it.</li>
                <li>
                  <strong>Please don&apos;t share personal or contact information in the chat.</strong> It answers questions about the project and
                  is not medical advice.
                </li>
              </ul>
            </>
          ),
        },
        {
          heading: "Cookies and browser storage",
          body: (
            <>
              <p>
                We don&apos;t use advertising, analytics or tracking cookies. Clerk sets the cookies needed to keep you signed in. We also use your
                browser&apos;s local storage for:
              </p>
              <ul>
                <li><strong>iris-theme</strong>: your light or dark mode choice</li>
                <li><strong>iris-chat-messages</strong>: your recent chat history (up to 40 messages)</li>
                <li><strong>iris-chat-position</strong>: where you dragged the chat button</li>
                <li><strong>iris.research-log.v1</strong>: results from the pupil reflex test page, kept only on your device so you can export them</li>
              </ul>
              <p>
                You can delete your theme and chat data with &quot;Clear saved data&quot; at the bottom of every page, clear the test log from the
                results screen, or clear your browser&apos;s site data.
              </p>
            </>
          ),
        },
        {
          heading: "Who can see your information",
          body: (
            <>
              <p>
                Only you can see your dashboard. Our server checks your sign-in on every request and only returns your own records. Our database
                can&apos;t be read directly from the internet, and only our team can manage it. We share information only with service providers that
                help run Iris:
              </p>
              <ul>
                <li><strong>Vercel</strong>: hosts the website and keeps standard server logs</li>
                <li><strong>Clerk</strong>: handles sign-up, sign-in and your account</li>
                <li><strong>Supabase</strong>: hosts our database</li>
                <li><strong>Hack Club AI</strong> and its model providers (Anthropic and NVIDIA): process chat messages, scan explanations and eye photos</li>
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
              We keep your profile answers and saved scans until you delete them or your account. We don&apos;t keep chat content or eye photos.
              Hosting logs are kept by our hosting provider for a limited time under its own retention settings. Information saved in your browser
              stays until you clear it.
            </p>
          ),
        },
        {
          heading: "Security",
          body: (
            <p>
              The site only loads over HTTPS and can&apos;t be embedded in other websites. Sign-in uses verified email codes, checks passwords against
              known leaks, locks an account after repeated wrong passwords, and blocks bots. Our database tables can&apos;t be reached directly, every
              request is checked and rate-limited, and our keys stay on the server, never in your browser or our code. No system is perfectly
              secure, so please don&apos;t send sensitive information you don&apos;t need to.
            </p>
          ),
        },
        {
          heading: "Your choices and rights",
          body: (
            <>
              <ul>
                <li>Use the site and chat without an account, or skip the camera checks entirely.</li>
                <li>Leave any profile question blank, and turn research use on or off at any time.</li>
                <li>Delete any saved scan, or all your answers and scans at once with &quot;Delete my data&quot; in your dashboard.</li>
                <li>Delete your sign-in account in &quot;Account settings&quot; in your dashboard.</li>
                <li>
                  Depending on where you live (for example, under California or European privacy laws), you may have the right to ask what personal
                  information we hold about you, and to ask us to correct or delete it. Contact us and we&apos;ll help.
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
              You must be 13 or older to create an account. We don&apos;t knowingly collect personal information from children under 13. If you
              believe a child under 13 has given us personal information, contact us and we&apos;ll delete it.
            </p>
          ),
        },
        {
          heading: "Visitors outside the United States",
          body: (
            <p>
              Iris is hosted in the United States. If you visit from another country, your information may be processed in the United States.
            </p>
          ),
        },
        {
          heading: "Changes to this policy",
          body: (
            <p>
              We&apos;ll update this policy whenever the way Iris handles information changes. The &quot;Last updated&quot; date at the top shows the
              current version. Important changes will be highlighted on the site.
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
