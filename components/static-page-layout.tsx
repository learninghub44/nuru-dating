import Link from 'next/link'
import { Heart, ArrowLeft } from 'lucide-react'

export function StaticPageLayout({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 w-full z-50 glass border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Heart className="h-8 w-8 text-gold-500 fill-gold-500" />
            <span className="text-2xl font-bold text-gold-500">Nuru</span>
          </Link>
          <Link
            href="/"
            className="flex items-center gap-2 text-foreground/80 hover:text-gold-500 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back home
          </Link>
        </div>
      </nav>

      <main className="pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-gold-200 to-gold-500 bg-clip-text text-transparent">
            {title}
          </h1>
          {subtitle && (
            <p className="text-lg text-foreground/70 mb-12">{subtitle}</p>
          )}
          <div className="prose prose-invert max-w-none prose-headings:text-gold-500 prose-a:text-gold-500 space-y-6 text-foreground/80 leading-relaxed">
            {children}
          </div>
        </div>
      </main>

      <footer className="border-t border-border py-8 px-4">
        <div className="container mx-auto text-center text-sm text-foreground/50">
          © {new Date().getFullYear()} Nuru. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
