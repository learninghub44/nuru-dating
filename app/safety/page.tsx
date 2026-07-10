import { StaticPageLayout } from '@/components/static-page-layout'

export default function SafetyPage() {
  return (
    <StaticPageLayout
      title="Safety Tips"
      subtitle="A few things to keep in mind while dating online."
    >
      <h2>Before you meet</h2>
      <ul>
        <li>Video chat first if you can — it helps confirm the person is who they say they are.</li>
        <li>Keep early conversations on the app rather than moving to personal numbers right away.</li>
        <li>Be cautious of anyone who asks you for money, gifts, or financial help.</li>
      </ul>
      <h2>Meeting in person</h2>
      <ul>
        <li>Choose a public place for your first meeting.</li>
        <li>Tell a friend or family member where you're going and who you're meeting.</li>
        <li>Arrange your own transportation to and from the date.</li>
        <li>Trust your instincts — if something feels off, it's okay to leave.</li>
      </ul>
      <h2>Reporting concerns</h2>
      <p>
        If someone makes you uncomfortable, harasses you, or asks for money,
        report and block them from their profile or your chat with them. Our
        team reviews every report.
      </p>
    </StaticPageLayout>
  )
}
