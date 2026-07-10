import { StaticPageLayout } from '@/components/static-page-layout'

const faqs = [
  {
    q: 'How do I create a profile?',
    a: 'Sign up with your email, verify your account, and follow the onboarding steps to add your photos, bio, and preferences.',
  },
  {
    q: 'How does matching work?',
    a: 'We show you profiles based on your preferences and activity. When two people like each other, it\'s a match and a chat opens up.',
  },
  {
    q: 'How do wallet credits work?',
    a: 'Credits are used to unlock certain conversations and premium features. You can top up your wallet from the Wallet page using M-Pesa or card.',
  },
  {
    q: 'How do I report or block someone?',
    a: 'Open their profile or your conversation with them, and use the report or block option. Our team reviews every report.',
  },
  {
    q: 'How do I delete my account?',
    a: 'Go to your Profile settings and select Delete Account. This permanently removes your data.',
  },
]

export default function HelpPage() {
  return (
    <StaticPageLayout
      title="Help Center"
      subtitle="Answers to common questions."
    >
      <div className="space-y-8 not-prose">
        {faqs.map((item) => (
          <div key={item.q}>
            <h3 className="text-xl font-semibold text-gold-500 mb-2">
              {item.q}
            </h3>
            <p className="text-foreground/80 leading-relaxed">{item.a}</p>
          </div>
        ))}
      </div>
      <p className="mt-10">
        Can&apos;t find what you&apos;re looking for?{' '}
        <a href="/contact">Contact us</a> directly.
      </p>
    </StaticPageLayout>
  )
}
