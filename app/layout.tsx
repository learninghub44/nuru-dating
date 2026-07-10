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
  title: 'Nuru - Find Real Connections That Matter',
  description: 'A premium dating platform where meaningful connections begin. Discover real people, AI companions, and genuine relationships.',
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
