import { StaticPageLayout } from '@/components/static-page-layout'

export default function PressPage() {
  return (
    <StaticPageLayout
      title="Press"
      subtitle="Media resources and inquiries."
    >
      <p>
        For press inquiries, interview requests, or media assets, please
        reach out through our <a href="/contact">contact page</a> and
        we&apos;ll get back to you as soon as we can.
      </p>
    </StaticPageLayout>
  )
}
