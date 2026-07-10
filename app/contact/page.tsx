import { StaticPageLayout } from '@/components/static-page-layout'
import { LifeBuoy, ShieldAlert, MessageSquare, Clock } from 'lucide-react'
import Link from 'next/link'

const CONTACT_CHANNELS = [
  {
    icon: LifeBuoy,
    title: 'General Support',
    description: "Account issues, payments, or anything you're stuck on.",
    email: 'support@gmail.co.ke',
  },
  {
    icon: ShieldAlert,
    title: 'Safety & Trust',
    description: 'Report a profile, a conversation, or a safety concern.',
    email: 'support@gmail.co.ke',
  },
  {
    icon: MessageSquare,
    title: 'Press & Partnerships',
    description: 'Media inquiries and partnership opportunities.',
    email: 'support@gmail.co.ke',
  },
]

export default function ContactPage() {
  return (
    <StaticPageLayout
      title="Contact Us"
      subtitle="We'd love to hear from you — reach out any time."
    >
      <div className="not-prose grid gap-4 sm:grid-cols-3">
        {CONTACT_CHANNELS.map((channel) => {
          const Icon = channel.icon
          return (
            <div
              key={channel.title}
              className="p-5 rounded-xl border border-border bg-card/50 flex flex-col gap-3"
            >
              <div className="h-10 w-10 rounded-lg bg-gold-500/20 flex items-center justify-center">
                <Icon className="h-5 w-5 text-gold-500" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">{channel.title}</h3>
                <p className="text-sm text-foreground/70">{channel.description}</p>
              </div>
              <a
                href={`mailto:${channel.email}`}
                className="text-gold-500 hover:underline text-sm mt-auto"
              >
                {channel.email}
              </a>
            </div>
          )
        })}
      </div>

      <div className="not-prose mt-6 flex items-center gap-3 p-4 rounded-xl border border-border bg-card/50">
        <Clock className="h-5 w-5 text-gold-500 shrink-0" />
        <p className="text-sm text-foreground/70">
          Our support team typically replies within 24–48 hours, every day of the week.
        </p>
      </div>

      <p className="mt-8">
        Whether it&apos;s a question, feedback, a safety concern, or a press
        inquiry, send us a message at{' '}
        <a href="mailto:support@gmail.co.ke" className="text-gold-500 hover:underline">
          support@gmail.co.ke
        </a>{' '}
        and we&apos;ll get back to you as soon as we can. For quick answers to
        common questions, check our{' '}
        <Link href="/help" className="text-gold-500 hover:underline">
          Help Center
        </Link>{' '}
        first — you might find what you need right away.
      </p>
    </StaticPageLayout>
  )
}
