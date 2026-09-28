import type { Metadata } from 'next';
import { LegalShell } from '@/components/marketing/LegalShell';

export const metadata: Metadata = { title: 'Terms', description: 'The rules for using Doorkey.' };

export default function TermsPage() {
  return (
    <LegalShell title="Terms of use" updated="in development">
      <section>
        <h2>What Doorkey is</h2>
        <p>
          Doorkey is an introduction service. It shows you people whose stated interests overlap with
          yours and lets you ask to connect. It is not a broker, not an adviser, and takes no part in
          any transaction you go on to make.
        </p>
      </section>

      <section>
        <h2>Nothing here is financial advice</h2>
        <p>
          A match score is an ordering of profiles, not a recommendation to invest, to raise, or to
          value anything at any price. Doorkey does not verify financial claims that members make
          about themselves. Do your own diligence.
        </p>
      </section>

      <section>
        <h2>Your account</h2>
        <ul>
          <li>Be yourself. One account per person, with your real name.</li>
          <li>Keep your profile accurate. Stale funding numbers waste other people&rsquo;s time.</li>
          <li>You are responsible for what happens under your account.</li>
        </ul>
      </section>

      <section>
        <h2>What is not allowed</h2>
        <ul>
          <li>Claiming a track record, a fund, a role or a relationship that is not yours.</li>
          <li>Bulk or automated outreach, scraping, or harvesting member details.</li>
          <li>Harassment, threats, or contacting someone who has declined or blocked you.</li>
          <li>Using Doorkey to solicit for anything unlawful.</li>
        </ul>
        <p>
          We can suspend or remove an account for any of the above. Members can report profiles, and
          reports are reviewed by a person.
        </p>
      </section>

      <section>
        <h2>Verification</h2>
        <p>
          A verification badge means a specific check was carried out and passed. It is not a
          statement that a member is trustworthy, solvent, or good at their job. The absence of a
          badge means only that the check has not been done.
        </p>
      </section>

      <section>
        <h2>Content you post</h2>
        <p>
          You keep ownership of what you write. You give Doorkey permission to display it to other
          members according to your visibility setting, and to store it to run the service.
        </p>
      </section>

      <section>
        <h2>Availability and liability</h2>
        <p>
          Doorkey is provided as it stands, with no guarantee of uptime or of results. To the extent
          the law allows, we are not liable for lost opportunities, lost funding, or decisions made
          on the basis of a match. A production deployment needs the governing law, jurisdiction and
          liability caps set out here by a lawyer.
        </p>
      </section>

      <section>
        <h2>Ending it</h2>
        <p>
          You can delete your account at any time from your security settings. We can close an
          account that breaks these terms, and will say why unless doing so would create a risk to
          someone.
        </p>
      </section>
    </LegalShell>
  );
}
