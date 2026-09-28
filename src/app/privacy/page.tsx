import type { Metadata } from 'next';
import { LegalShell } from '@/components/marketing/LegalShell';

export const metadata: Metadata = { title: 'Privacy', description: 'What Doorkey collects and why.' };

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy" updated="in development">
      <section>
        <h2>What we collect</h2>
        <p>
          Doorkey stores what you put into your profile: your name, headline, biography, location,
          links, photo, and either your company details or your investment preferences. We also store
          your email address and a hashed form of your password. We never store your password itself.
        </p>
      </section>

      <section>
        <h2>What we record about how you use it</h2>
        <p>
          We keep an internal event log so we can tell whether the product works: an event name such
          as &ldquo;connection request sent&rdquo;, your account id, and a fixed list of non-identifying
          properties such as a stage or a sector. Message contents, search terms and anything else you
          type are not written to that log.
        </p>
      </section>

      <section>
        <h2>Who can see your profile</h2>
        <p>
          You choose, in your privacy settings, between public, connections only, and hidden. Your
          email address is never shown to anyone unless you switch that on, and then only to people
          you have accepted a connection from. Private fields are filtered on the server, not in the
          browser, so a hidden profile is not merely hidden from view.
        </p>
      </section>

      <section>
        <h2>Who we share it with</h2>
        <p>
          Other Doorkey members see what your visibility setting allows. Beyond that, data goes only
          to the infrastructure providers needed to run the service: the database host, the file
          storage provider, and the transactional email provider. We do not sell data, and we do not
          use it to train models.
        </p>
      </section>

      <section>
        <h2>The writing assistant</h2>
        <p>
          If you use the writing assistant, the text you give it is sent to the configured model
          provider so it can return a draft. We record that a request happened, its length, and
          whether it succeeded — not its content. Drafts are never written to your profile without
          you accepting them.
        </p>
      </section>

      <section>
        <h2>How long we keep things</h2>
        <p>
          Profile data stays until you delete your account. Deleting sets your account to deleted,
          hides your profile, scrambles your email address and ends every session. Messages you
          already sent remain visible to the people who received them, in the same way a sent email
          does.
        </p>
      </section>

      <section>
        <h2>Your rights</h2>
        <p>
          Depending on where you live you may have rights to access, correct, export or erase your
          data, and to object to some processing. Write to us and we will act on it. A production
          deployment needs a named data controller, a lawful basis for each kind of processing, and a
          retention schedule; this document is where those belong.
        </p>
      </section>
    </LegalShell>
  );
}
