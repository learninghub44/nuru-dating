import { StaticPageLayout } from '@/components/static-page-layout'

export default function AboutPage() {
  return (
    <StaticPageLayout
      title="About Nuru"
      subtitle="Building real connections, one match at a time."
    >
      <p>
        Nuru was built on a simple idea: dating apps should help you find
        someone worth staying off the app for. We focus on genuine profiles,
        thoughtful matching, and features that encourage real conversation
        instead of endless swiping.
      </p>
      <p>
        Our team is based in Kenya and designed Nuru with the local dating
        scene in mind — from the way people connect to how they pay for
        premium features. We&apos;re still early, and we&apos;re building this
        with our community, not just for it.
      </p>
      <h2>What we care about</h2>
      <ul>
        <li>Safety and verification, so people are who they say they are.</li>
        <li>Meaningful features over vanity metrics.</li>
        <li>A product that respects your time and your privacy.</li>
      </ul>
    </StaticPageLayout>
  )
}
