import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy — AdDrop',
}

export default function PrivacyPolicyPage() {
  return (
    <>
      {/*
        @generated-by: legal-pages
        @generated-date: 2026-02-12
        @jurisdictions: global-baseline, us-general
        @page-type: privacy-policy
        @skill-version: 1.0
        Not legal advice — review with a lawyer for production use.
      */}

      <h1>Privacy Policy</h1>
      <p><strong>Effective date:</strong> February 12, 2026</p>

      <p>
        AdDrop (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) operates the AdDrop platform.
        This policy explains how we collect, use, and protect your personal information when you use
        our service. We value your privacy and are committed to handling your data responsibly.
      </p>

      <h2>1. Information We Collect</h2>

      <h3>Information You Provide</h3>
      <ul>
        <li><strong>Account info:</strong> email address, password (securely hashed), display name</li>
        <li>
          <strong>Property data:</strong> property address, price, beds/baths/sqft/lot size/year built,
          property type, MLS number, property description, selling points, listing agent name, brokerage
        </li>
        <li><strong>Property photos:</strong> images you upload for ad generation</li>
        <li><strong>Feedback:</strong> type (bug/feature/general), description text</li>
      </ul>

      <h3>Information Collected Automatically</h3>
      <ul>
        <li>Device and browser info (type, OS, browser version)</li>
        <li>IP address and approximate location (via infrastructure providers)</li>
        <li>Pages visited, features used, and actions taken within the service</li>
        <li>Server logs (access times, error logs)</li>
        <li>CAPTCHA verification tokens (Cloudflare Turnstile)</li>
      </ul>

      <h3>Information from Third Parties</h3>
      <p>
        We do not currently receive personal information from third-party sources beyond
        authentication and security services (Supabase, Cloudflare).
      </p>

      <h2>2. How We Use Your Information</h2>
      <ul>
        <li>
          <strong>Providing the service:</strong> creating and displaying AI-generated ad campaigns
          from your property data
        </li>
        <li>
          Processing your property data through OpenAI&apos;s API to generate ad copy (property
          details are sent to OpenAI for processing)
        </li>
        <li>Account management and authentication</li>
        <li>Responding to your feedback and support requests</li>
        <li>Improving the service based on usage patterns</li>
        <li>Security, fraud prevention, and enforcing rate limits</li>
        <li>Communicating service-related information (email)</li>
        <li>Legal compliance</li>
      </ul>

      <h2>3. How We Share Your Information</h2>
      <ul>
        <li>
          <strong>OpenAI:</strong> Property data you submit is sent to OpenAI&apos;s API for ad copy
          generation. OpenAI processes this data according to their API data usage policies. We use
          the API (not ChatGPT), meaning your data is not used to train OpenAI&apos;s models.
        </li>
        <li>
          <strong>Supabase:</strong> Hosts our database and authentication system. Your account data
          and campaign data are stored on Supabase infrastructure.
        </li>
        <li>
          <strong>Cloudflare:</strong> Processes CAPTCHA verification during signup/login. Cloudflare
          may collect IP address and browser data for security purposes.
        </li>
        <li>
          <strong>Unsplash:</strong> Landing page images may be loaded from Unsplash servers.
          Unsplash may collect IP addresses and browser data when images are served.
        </li>
      </ul>

      <p>We do not sell your personal information.</p>
      <p>
        We only share data as necessary to provide the service as described in this policy.
      </p>
      <p>
        We may disclose information if required by law, legal process, or government request.
      </p>
      <p>
        In the event of a business transfer (merger, acquisition, sale of assets), user data may be
        transferred to the new entity with notice.
      </p>

      <h2>4. Cookies and Tracking Technologies</h2>
      <p>
        We use a limited number of cookies, all essential for the service to function:
      </p>
      <ul>
        <li>
          <strong>Supabase auth cookies:</strong> Maintain your login session (essential, session-based)
        </li>
        <li>
          <strong>Cloudflare Turnstile cookies:</strong> Verify you are human during signup/login
          (essential, session-based)
        </li>
      </ul>
      <p>
        We do not use analytics cookies, advertising cookies, or tracking pixels. For full details,
        see our <Link href="/cookies">Cookie Policy</Link>.
      </p>

      <h2>5. Data Retention</h2>
      <table>
        <thead>
          <tr>
            <th>Data Category</th>
            <th>Retention Period</th>
            <th>Rationale</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Account data</td>
            <td>Duration of account + 30 days after deletion</td>
            <td>Account recovery window</td>
          </tr>
          <tr>
            <td>Property/campaign data</td>
            <td>Duration of account + 30 days</td>
            <td>Service delivery</td>
          </tr>
          <tr>
            <td>Feedback submissions</td>
            <td>2 years</td>
            <td>Quality improvement</td>
          </tr>
          <tr>
            <td>Server logs</td>
            <td>90 days</td>
            <td>Security and debugging</td>
          </tr>
          <tr>
            <td>CAPTCHA tokens</td>
            <td>Session only</td>
            <td>Security verification</td>
          </tr>
        </tbody>
      </table>
      <p>After the retention period, data is permanently deleted.</p>

      <h2>6. Data Security</h2>
      <p>We implement appropriate security measures including:</p>
      <ul>
        <li>Encryption in transit (HTTPS/TLS)</li>
        <li>Secure password hashing (handled by Supabase)</li>
        <li>Access controls and authentication for all systems</li>
        <li>CAPTCHA protection against automated abuse</li>
        <li>Rate limiting to prevent abuse</li>
      </ul>
      <p>
        No system is 100% secure. We commit to notifying affected users of any data breach without
        unreasonable delay, consistent with applicable law.
      </p>

      <h2>7. Your Rights</h2>
      <p>You have the right to:</p>
      <ul>
        <li><strong>Access</strong> your personal data</li>
        <li><strong>Correct</strong> inaccurate data via your account settings</li>
        <li><strong>Delete</strong> your account and associated data by contacting us</li>
        <li><strong>Object</strong> to certain processing of your data</li>
        <li><strong>Receive a copy</strong> of your data (data portability)</li>
      </ul>
      <p>
        To exercise these rights, contact us at{' '}
        <a href="mailto:support@addrop.com">support@addrop.com</a>. We will respond within 30 days.
      </p>

      <h2>8. Do Not Track</h2>
      <p>
        We do not currently respond to Do Not Track (DNT) browser signals, as there is no
        industry-standard technology for honoring DNT. We will update this policy if a standard is
        adopted.
      </p>

      <h2>9. Children&apos;s Privacy</h2>
      <p>
        AdDrop is not directed to children under 13. We do not knowingly collect personal information
        from children under 13. If we learn we have collected such information, we will delete it
        promptly. If you believe a child under 13 has provided us with personal information, please
        contact us at <a href="mailto:support@addrop.com">support@addrop.com</a>.
      </p>

      <h2>10. Third-Party Links</h2>
      <p>
        Our service may contain links to third-party websites. We are not responsible for the privacy
        practices of those sites. We encourage you to review their privacy policies. Linking does not
        imply endorsement.
      </p>

      <h2>11. Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. Changes will be posted on this page with
        an updated effective date. For material changes, we will provide notice via email or a
        prominent notice on our service at least 30 days before the changes take effect. Continued use
        after changes constitutes acceptance.
      </p>

      <h2>12. Contact Us</h2>
      <p>If you have questions about this Privacy Policy, contact us at:</p>
      <p>
        Email: <a href="mailto:support@addrop.com">support@addrop.com</a>
      </p>
    </>
  )
}
