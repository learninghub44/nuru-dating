import type { Metadata } from 'next'
import { Manrope } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'

const manrope = Manrope({ 
  subsets: ['latin'],
  variable: '--font-manrope',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://www.nurufindlove.co.ke'),
  title: {
    default: 'Nuru - Find Real Connections That Matter',
    template: '%s | Nuru',
  },
  description: 'A premium dating platform where meaningful connections begin. Discover real people, AI companions, and genuine relationships.',
  openGraph: {
    title: 'Nuru - Find Real Connections That Matter',
    description: 'A premium dating platform where meaningful connections begin. Discover real people, AI companions, and genuine relationships.',
    url: 'https://www.nurufindlove.co.ke',
    siteName: 'Nuru',
    locale: 'en_KE',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Nuru - Find Real Connections That Matter',
    description: 'A premium dating platform where meaningful connections begin.',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={manrope.variable}>
        <Script
          src="https://js.paystack.co/v2/inline.js"
          strategy="afterInteractive"
        />
        {children}
        <Toaster />
      </body>
    </html>
  )
}
