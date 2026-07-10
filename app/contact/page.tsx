import { StaticPageLayout } from '@/components/static-page-layout'
import { Mail } from 'lucide-react'

export default function ContactPage() {
  return (
    <StaticPageLayout
      title="Contact Us"
      subtitle="We'd love to hear from you."
    >
      <div className="not-prose flex items-center gap-3 p-4 rounded-xl border border-border bg-card/50">
        <Mail className="h-5 w-5 text-gold-500" />
        <a href="mailto:support@nuru.app" className="text-gold-500 hover:underline">
          support@nuru.app
        </a>
      </div>
      <p className="mt-6">
        Whether it&apos;s a question, feedback, a safety concern, or a press
        inquiry, send us a message and we&apos;ll get back to you as soon as
        we can.
      </p>
    </StaticPageLayout>
  )
}
