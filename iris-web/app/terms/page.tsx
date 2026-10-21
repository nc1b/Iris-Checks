import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/blocks/legal-page";

export const metadata: Metadata = {
  title: "Terms & Conditions · Iris",
  description: "The terms for using the Iris website.",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms & Conditions"
      updated="October 20, 2026"
      intro={
        <p>
          These terms apply to your use of the Iris website. Iris is a student research project for Samsung Solve for Tomorrow. By using the site,
          you agree to these terms.
        </p>
      }
      sections={[
        {
          heading: "Not medical advice",
          body: (
            <>
              <p>
                Iris is a <strong>research prototype, not a medical device</strong>. Nothing on this website, including the AI chat, diagnoses,
                treats or prevents any condition, or replaces a doctor.
              </p>
              <p>If you&apos;re worried about your eyes or your health, talk to a qualified healthcare professional. In an emergency, call 911.</p>
            </>
          ),
        },
        {
          heading: "Eye scanning is not available yet",
          body: (
            <p>
              The eye scan described on this site is <strong>coming soon</strong> and still being tested. Descriptions of how it will work may change.
              Any future results will be screening information only, not a diagnosis.
            </p>
          ),
        },
        {
          heading: "The AI chat",
          body: (
            <ul>
              <li>The chat answers questions about the project using an AI model. Its answers can be wrong or incomplete.</li>
              <li>Don&apos;t rely on the chat for medical, legal or other important decisions.</li>
              <li>
                Don&apos;t share personal or health information. See our <Link href="/privacy">Privacy Policy</Link> for how messages are handled.
              </li>
            </ul>
          ),
        },
        {
          heading: "Acceptable use",
          body: (
            <>
              <p>Please don&apos;t:</p>
              <ul>
                <li>Try to break, overload or get around limits on the website or the AI chat</li>
                <li>Use the chat to create harmful, abusive or illegal content</li>
                <li>Pretend to be the Iris team or misrepresent the project</li>
              </ul>
              <p>We may limit or block access if the site is misused.</p>
            </>
          ),
        },
        {
          heading: "Content and credits",
          body: (
            <p>
              The text, logo and design of this website belong to the Iris team. Photos from Unsplash are used under the{" "}
              <a href="https://unsplash.com/license" target="_blank" rel="noreferrer">
                Unsplash License
              </a>
              . Research summaries link to the original published studies, which belong to their authors and publishers.
            </p>
          ),
        },
        {
          heading: "No warranty",
          body: (
            <p>
              The website is provided &quot;as is&quot; while it&apos;s being built. We try to keep it accurate and available, but we can&apos;t
              promise it will always be correct, complete or online.
            </p>
          ),
        },
        {
          heading: "Limitation of liability",
          body: (
            <p>
              To the extent the law allows, the Iris team is not responsible for any loss or harm that comes from using this website or relying on its
              content, including AI chat answers.
            </p>
          ),
        },
        {
          heading: "Changes to these terms",
          body: <p>We may update these terms as the project grows. The date at the top shows the latest version.</p>,
        },
        {
          heading: "Contact",
          body: <p>Contact details for the team are coming soon.</p>,
        },
      ]}
    />
  );
}
