'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  Heart,
  Compass,
  MessageCircle,
  Wallet,
  Sparkles,
  User,
  LogOut,
  Menu,
  X,
  LifeBuoy,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { createClient } from '@/lib/supabase/client'
import { NotificationBell } from '@/components/notifications/NotificationBell'

export type AppHeaderActive = 'discover' | 'matches' | 'wallet' | 'companions' | 'profile' | null

interface AppHeaderProps {
  active?: AppHeaderActive
  avatarUrl?: string | null
  displayName?: string | null
  /** Extra controls rendered before the notification bell, e.g. a filter button on Discover. */
  extra?: React.ReactNode
}

const NAV_LINKS: { key: AppHeaderActive; href: string; label: string; icon: typeof Compass }[] = [
  { key: 'discover', href: '/discover', label: 'Discover', icon: Compass },
  { key: 'matches', href: '/matches', label: 'Matches', icon: MessageCircle },
  { key: 'companions', href: '/ai/companions', label: 'AI Companions', icon: Sparkles },
  { key: 'wallet', href: '/wallet', label: 'Wallet', icon: Wallet },
]

/**
 * Shared header for every screen behind login. Every page previously rolled
 * its own header with a different subset of links and no way to log out —
 * this is the single source of truth so navigation (and sign-out) is
 * consistent everywhere.
 */
export function AppHeader({ active = null, avatarUrl, displayName, extra }: AppHeaderProps) {
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  const handleLogout = async () => {
    setSigningOut(true)
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
    } finally {
      router.push('/login')
      router.refresh()
    }
  }

  return (
    <header className="fixed top-0 w-full z-50 glass border-b border-border">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <Link href="/discover" className="flex items-center gap-2 shrink-0">
          <Heart className="h-8 w-8 text-gold-500 fill-gold-500" />
          <span className="text-2xl font-bold text-gold-500">Nuru</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-2">
          {NAV_LINKS.map((link) => {
            const Icon = link.icon
            return (
              <Link key={link.href} href={link.href}>
                <Button
                  variant={active === link.key ? 'secondary' : 'ghost'}
                  className="gap-2"
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Button>
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          {extra}
          <NotificationBell />

          {/* Avatar dropdown — profile, wallet, support, logout, always reachable */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500">
                <Avatar className="h-10 w-10 border-2 border-transparent hover:border-gold-500/50 transition-colors">
                  <AvatarImage src={avatarUrl || undefined} />
                  <AvatarFallback>{displayName?.charAt(0) || 'U'}</AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              {displayName && (
                <>
                  <DropdownMenuLabel>{displayName}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem asChild>
                <Link href="/profile" className="flex items-center gap-2 w-full">
                  <User className="h-4 w-4" /> My Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/wallet" className="flex items-center gap-2 w-full">
                  <Wallet className="h-4 w-4" /> Wallet
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/help" className="flex items-center gap-2 w-full">
                  <LifeBuoy className="h-4 w-4" /> Help &amp; Support
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                disabled={signingOut}
                className="flex items-center gap-2 text-red-400 focus:text-red-400"
              >
                <LogOut className="h-4 w-4" /> {signingOut ? 'Logging out...' : 'Log Out'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile nav toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile nav panel */}
      {mobileOpen && (
        <nav className="lg:hidden border-t border-border bg-background/95 px-4 py-3 flex flex-col gap-1">
          {NAV_LINKS.map((link) => {
            const Icon = link.icon
            return (
              <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)}>
                <Button
                  variant={active === link.key ? 'secondary' : 'ghost'}
                  className="w-full justify-start gap-2"
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Button>
              </Link>
            )
          })}
        </nav>
      )}
    </header>
  )
}
