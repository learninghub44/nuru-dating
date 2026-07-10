import { StaticPageLayout } from '@/components/static-page-layout'

export default function CookiesPage() {
  return (
    <StaticPageLayout
      title="Cookie Policy"
      subtitle={`Last updated ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}`}
    >
      <p>
        Nuru uses cookies and similar technologies to keep you signed in,
        remember your preferences, and understand how the app is used so we
        can improve it.
      </p>
      <h2>Types of cookies we use</h2>
      <ul>
        <li>
          <strong>Essential cookies</strong> — required for login sessions and
          core functionality.
        </li>
        <li>
          <strong>Preference cookies</strong> — remember settings like your
          display preferences.
        </li>
        <li>
          <strong>Analytics cookies</strong> — help us understand usage
          patterns so we can improve the product.
        </li>
      </ul>
      <p>
        You can control cookies through your browser settings. Disabling
        essential cookies may affect your ability to use parts of the app.
      </p>
    </StaticPageLayout>
  )
}
