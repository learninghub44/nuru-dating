'use client'

import { useEffect, useRef, useState } from 'react'
import { Bell, Heart, MessageCircle, Sparkles, Wallet, Eye, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'

interface Notification {
  id: string
  type: string
  title: string
  body: string
  is_read: boolean
  created_at: string
}

const ICONS: Record<string, any> = {
  match: Heart,
  like: Heart,
  message: MessageCircle,
  wallet: Wallet,
  payment: Wallet,
  view: Eye,
  boost: Sparkles,
  system: Bell,
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  const loadNotifications = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/notifications?limit=20')
      if (!res.ok) return
      const data = await res.json()
      setNotifications(data.notifications || [])
      setUnreadCount(data.unreadCount || 0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadNotifications()

    // Keep the unread count live via Supabase Realtime.
    let channel: ReturnType<typeof supabase.channel> | null = null
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      channel = supabase
        .channel(`notifications:${user.id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
          () => loadNotifications()
        )
        .subscribe()
    })()

    return () => {
      if (channel) supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    setUnreadCount(0)
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAll: true }),
    })
  }

  const markOneRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)))
    setUnreadCount((c) => Math.max(0, c - 1))
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationIds: [id] }),
    })
  }

  return (
    <div className="relative" ref={containerRef}>
      <Button variant="ghost" size="icon" className="relative" onClick={() => setOpen((v) => !v)}>
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge className="absolute -top-1 -right-1 h-5 min-w-5 px-1 flex items-center justify-center bg-gold-500 text-black text-xs">
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto rounded-lg border border-border bg-background shadow-xl z-50">
          <div className="flex items-center justify-between p-3 border-b border-border">
            <span className="font-semibold">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-gold-500 hover:underline flex items-center gap-1"
              >
                <Check className="h-3 w-3" /> Mark all read
              </button>
            )}
          </div>

          {loading && notifications.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground text-center">Loading...</p>
          ) : notifications.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground text-center">No notifications yet</p>
          ) : (
            <div>
              {notifications.map((n) => {
                const Icon = ICONS[n.type] || Bell
                return (
                  <button
                    key={n.id}
                    onClick={() => !n.is_read && markOneRead(n.id)}
                    className={`w-full text-left flex gap-3 p-3 border-b border-border last:border-0 hover:bg-muted/50 transition-colors ${
                      !n.is_read ? 'bg-gold-500/5' : ''
                    }`}
                  >
                    <div className="h-8 w-8 rounded-full bg-gold-500/20 text-gold-500 flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{n.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{n.body}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(new Date(n.created_at))}
                      </p>
                    </div>
                    {!n.is_read && (
                      <span className="h-2 w-2 rounded-full bg-gold-500 shrink-0 mt-1" />
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
