import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Cookie Policy — AdDrop',
}

export default function CookiePolicyPage() {
  return (
    <>
      {/*
        @generated-by: legal-pages
        @generated-date: 2026-02-12
        @jurisdictions: global-baseline, us-general
        @page-type: cookie-policy
        @skill-version: 1.0
        Not legal advice — review with a lawyer for production use.
      */}

      <h1>Cookie Policy</h1>
      <p><strong>Effective date:</strong> February 12, 2026</p>

      <p>
        This Cookie Policy explains how AdDrop uses cookies and similar technologies when you visit
        our service. For broader information about our data practices, please see our{' '}
        <Link href="/privacy">Privacy Policy</Link>.
      </p>

      <h2>1. What Are Cookies</h2>
      <p>
        Cookies are small text files placed on your device when you visit a website. They help the
        website maintain your session, remember your preferences, and understand how you use the site.
        We also use related technologies like local storage for similar purposes.
      </p>

      <h2>2. Cookies We Use</h2>

      <h3>Essential Cookies</h3>
      <p>
        These cookies are strictly necessary for the service to function. They cannot be disabled
        without breaking core functionality.
      </p>
      <table>
        <thead>
          <tr>
            <th>Cookie</th>
            <th>Purpose</th>
            <th>Duration</th>
            <th>Type</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Supabase auth cookies (sb-*)</td>
            <td>Maintain your login session and authentication state</td>
            <td>Session / up to 7 days</td>
            <td>First-party</td>
          </tr>
          <tr>
            <td>Cloudflare Turnstile (cf_clearance, __cf_bm)</td>
            <td>Verify you are human during signup and login</td>
            <td>Session</td>
            <td>Third-party (Cloudflare)</td>
          </tr>
        </tbody>
      </table>

      <h3>Analytics Cookies</h3>
      <p>We do not currently use any analytics cookies.</p>

      <h3>Marketing / Advertising Cookies</h3>
      <p>We do not use any marketing or advertising cookies.</p>

      <h2>3. Third-Party Cookies</h2>
      <p>
        This cookie policy lists the cookies we are aware of based on the technologies integrated
        into our service. However, third-party services may set additional cookies at runtime that we
        cannot fully enumerate from our source code. We recommend using your browser&apos;s developer
        tools (Application &gt; Cookies) to see all cookies currently set by this site.
      </p>

      <h2>4. How to Manage Cookies</h2>
      <p>You can control cookies through your browser settings:</p>
      <ul>
        <li>
          <strong>Chrome:</strong> Settings &gt; Privacy and Security &gt; Cookies and other site data
        </li>
        <li>
          <strong>Firefox:</strong> Settings &gt; Privacy &amp; Security &gt; Cookies and Site Data
        </li>
        <li>
          <strong>Safari:</strong> Preferences &gt; Privacy &gt; Manage Website Data
        </li>
        <li>
          <strong>Edge:</strong> Settings &gt; Cookies and site permissions &gt; Cookies and site data
        </li>
      </ul>
      <p>
        For comprehensive instructions, visit{' '}
        <a href="https://www.allaboutcookies.org/manage-cookies" target="_blank" rel="noopener noreferrer">
          www.allaboutcookies.org/manage-cookies
        </a>.
      </p>
      <p>
        <strong>Note:</strong> Disabling essential cookies will prevent you from logging in and using
        authenticated features of AdDrop.
      </p>

      <h2>5. Do Not Track</h2>
      <p>
        We do not currently respond to Do Not Track (DNT) browser signals. We will update this policy
        if a standard is adopted.
      </p>

      <h2>6. Changes to This Policy</h2>
      <p>
        We may update this Cookie Policy to reflect changes in our cookie usage. Changes will be
        posted on this page with an updated effective date.
      </p>

      <h2>7. Contact Us</h2>
      <p>
        If you have questions about this Cookie Policy, please see our{' '}
        <Link href="/privacy">Privacy Policy</Link> for broader data practices or contact us
        at <a href="mailto:support@addrop.com">support@addrop.com</a>.
      </p>
    </>
  )
}
