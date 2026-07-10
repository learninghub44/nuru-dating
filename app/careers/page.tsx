import { StaticPageLayout } from '@/components/static-page-layout'

export default function CareersPage() {
  return (
    <StaticPageLayout
      title="Careers at Nuru"
      subtitle="We're a small team building something people actually use."
    >
      <p>
        We don&apos;t have open roles listed right now, but we&apos;re always
        happy to hear from people who care about building thoughtful,
        well-crafted products. If that sounds like you, get in touch and tell
        us what you&apos;d want to work on.
      </p>
      <p>
        Reach out via our{' '}
        <a href="/contact">contact page</a> and we&apos;ll get back to you.
      </p>
    </StaticPageLayout>
  )
}
