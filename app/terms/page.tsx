import { StaticPageLayout } from '@/components/static-page-layout'

export default function TermsPage() {
  return (
    <StaticPageLayout
      title="Terms of Service"
      subtitle={`Last updated ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}`}
    >
      <h2>Eligibility</h2>
      <p>
        You must be at least 18 years old to create a Nuru account. By using
        the app, you confirm that you meet this requirement and that the
        information on your profile is accurate.
      </p>
      <h2>Your conduct</h2>
      <p>
        Be respectful. Harassment, impersonation, scams, and any illegal
        activity are not allowed and may result in account suspension or
        termination.
      </p>
      <h2>Payments and credits</h2>
      <p>
        Wallet credits and premium features are purchased through supported
        payment methods and are subject to the pricing shown at the time of
        purchase. Credits are non-transferable.
      </p>
      <h2>Termination</h2>
      <p>
        We may suspend or terminate accounts that violate these terms. You
        can delete your account at any time from your profile settings.
      </p>
      <h2>Changes to these terms</h2>
      <p>
        We may update these terms from time to time. Continued use of Nuru
        after changes means you accept the updated terms.
      </p>
    </StaticPageLayout>
  )
}
