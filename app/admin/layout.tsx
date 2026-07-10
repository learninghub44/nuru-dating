import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession, isCurrentUserAdmin } from '@/lib/supabase/server'
import { Heart, LayoutDashboard, Users, Flag, ArrowLeft } from 'lucide-react'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) {
    redirect('/login')
  }

  const admin = await isCurrentUserAdmin()
  if (!admin) {
    redirect('/discover')
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 w-full z-50 glass border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/discover">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <Link href="/admin" className="flex items-center gap-2">
              <Heart className="h-7 w-7 text-gold-500 fill-gold-500" />
              <span className="text-xl font-bold text-gold-500">Nuru Admin</span>
            </Link>
          </div>
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/admin" className="flex items-center gap-2 hover:text-gold-500">
              <LayoutDashboard className="h-4 w-4" /> Overview
            </Link>
            <Link href="/admin/users" className="flex items-center gap-2 hover:text-gold-500">
              <Users className="h-4 w-4" /> Users
            </Link>
            <Link href="/admin/reports" className="flex items-center gap-2 hover:text-gold-500">
              <Flag className="h-4 w-4" /> Reports
            </Link>
            <span className="text-muted-foreground">{admin.role}</span>
          </nav>
        </div>
      </header>
      <div className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-6xl">{children}</div>
      </div>
    </div>
  )
}
