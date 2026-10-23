import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/blocks/legal-page";

export const metadata: Metadata = {
  title: "Terms of Service",
  alternates: { canonical: "/terms" },
  description: "The terms for using the Iris website and AI assistant.",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      updated="October 20, 2026"
      intro={
        <p>
          These terms are an agreement between you and the Iris team (&quot;we&quot;, &quot;us&quot;) about using the Iris website and its AI
          assistant. Iris is a student research project. By using the site, you agree to these terms and to our{" "}
          <Link href="/privacy">Privacy Policy</Link>. If you don&apos;t agree, please don&apos;t use the site.
        </p>
      }
      sections={[
        {
          heading: "Not medical advice",
          body: (
            <>
              <p>
                Iris is a <strong>research prototype, not a medical device</strong>. Nothing on this website, including the AI assistant and any
                future eye scan, diagnoses, treats, cures or prevents any disease, or replaces a doctor, optometrist or other healthcare
                professional.
              </p>
              <p>
                Always ask a qualified professional about your health. Don&apos;t ignore or delay medical advice because of something you read here.
                <strong> If you think you have a medical emergency, call 911 or your local emergency number right away.</strong>
              </p>
            </>
          ),
        },
        {
          heading: "Who can use Iris",
          body: (
            <p>
              You must be at least 13 years old to use the AI assistant. If you&apos;re under 18, please use the site with permission from a parent or
              guardian, who agrees to these terms for you.
            </p>
          ),
        },
        {
          heading: "The eye scan is not available yet",
          body: (
            <p>
              The eye scan described on this site is <strong>coming soon</strong> and still being tested. How it works may change before launch.
              When it is available, its results will be screening information only, not a diagnosis, and additional terms and consent will apply.
            </p>
          ),
        },
        {
          heading: "The AI assistant",
          body: (
            <ul>
              <li>The assistant uses an AI model provided through Hack Club AI. Its answers are generated automatically and can be wrong, incomplete or out of date.</li>
              <li>Don&apos;t rely on it for medical, legal, financial or other important decisions.</li>
              <li>Don&apos;t enter personal, contact or health information.</li>
              <li>You&apos;re responsible for what you type. You give us permission to send your messages to our AI providers to produce replies, as described in the Privacy Policy.</li>
              <li>We may limit how many messages you can send, or change or turn off the assistant at any time.</li>
            </ul>
          ),
        },
        {
          heading: "Acceptable use",
          body: (
            <>
              <p>When using Iris, please don&apos;t:</p>
              <ul>
                <li>Break the law or encourage others to</li>
                <li>Try to hack, overload, scrape, or get around security or rate limits on the website or the AI assistant</li>
                <li>Use the assistant to create harmful, hateful, harassing, sexual or violent content</li>
                <li>Try to make the assistant ignore its instructions, or reveal its instructions or keys</li>
                <li>Pretend to be the Iris team or misrepresent the project or its results</li>
              </ul>
              <p>We may block access for anyone who misuses the site.</p>
            </>
          ),
        },
        {
          heading: "Our content and credits",
          body: (
            <p>
              The Iris name, logo, text and design belong to the Iris team. You may share links to the site and quote small parts with credit, but
              please don&apos;t copy the site or use our name or logo in a way that suggests we endorse you. Photos from Unsplash are used under the{" "}
              <a href="https://unsplash.com/license" target="_blank" rel="noreferrer">
                Unsplash License
              </a>
              . Research summaries link to the original published studies, which belong to their authors and publishers. Quotes are from public
              figures and are credited to them.
            </p>
          ),
        },
        {
          heading: "Links to other websites",
          body: (
            <p>
              The site links to other websites, such as research journals. We don&apos;t control them and aren&apos;t responsible for their content or
              privacy practices.
            </p>
          ),
        },
        {
          heading: "Changes and availability",
          body: (
            <p>
              Iris is a prototype and changes often. We may change, pause or stop any part of the website at any time, and it may sometimes be
              unavailable.
            </p>
          ),
        },
        {
          heading: "Disclaimer of warranties",
          body: (
            <p>
              The website and AI assistant are provided <strong>&quot;as is&quot; and &quot;as available&quot;</strong>, without warranties of any
              kind, including accuracy, reliability, fitness for a particular purpose or non-infringement, to the fullest extent the law allows.
            </p>
          ),
        },
        {
          heading: "Limitation of liability",
          body: (
            <p>
              To the fullest extent the law allows, the Iris team and its supporters are not liable for any indirect, incidental, special or
              consequential damages, or for any loss or harm that comes from using (or not being able to use) the website, relying on its content, or
              relying on AI assistant answers. Some places don&apos;t allow these limits, so they may not all apply to you.
            </p>
          ),
        },
        {
          heading: "Indemnity",
          body: (
            <p>
              If you misuse the website or break these terms and someone makes a claim against us because of it, you agree to cover the reasonable
              costs of that claim, to the extent the law allows.
            </p>
          ),
        },
        {
          heading: "Governing law",
          body: (
            <p>
              These terms are governed by the laws of the State of Florida and the United States, without regard to conflict-of-law rules, except where
              the law of your home country or state gives you protections that can&apos;t be waived.
            </p>
          ),
        },
        {
          heading: "Changes to these terms",
          body: (
            <p>
              We may update these terms as the project grows. The &quot;Last updated&quot; date shows the current version. If you keep using the site
              after changes, you accept the new terms.
            </p>
          ),
        },
        {
          heading: "Contact us",
          body: <p>Team contact details are coming soon and will be added here.</p>,
        },
      ]}
    />
  );
}
