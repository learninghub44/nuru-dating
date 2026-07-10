import { createAdminClient } from '@/lib/supabase/admin'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Heart, MessageCircle, Wallet, Flag, TrendingUp } from 'lucide-react'

export const dynamic = 'force-dynamic'

async function getStats() {
  const admin = createAdminClient()

  const [
    { count: totalUsers },
    { count: newUsersToday },
    { count: totalMatches },
    { count: totalMessages },
    { count: pendingReports },
    { data: paymentsToday },
  ] = await Promise.all([
    admin.from('profiles').select('id', { count: 'exact', head: true }),
    admin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
    admin.from('matches').select('id', { count: 'exact', head: true }),
    admin.from('messages').select('id', { count: 'exact', head: true }),
    admin.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    admin
      .from('payments')
      .select('amount')
      .eq('status', 'completed')
      .gte('completed_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
  ])

  const revenueToday = (paymentsToday || []).reduce((sum, p: any) => sum + Number(p.amount), 0)

  return {
    totalUsers: totalUsers || 0,
    newUsersToday: newUsersToday || 0,
    totalMatches: totalMatches || 0,
    totalMessages: totalMessages || 0,
    pendingReports: pendingReports || 0,
    revenueToday,
  }
}

export default async function AdminOverviewPage() {
  const stats = await getStats()

  const cards = [
    { label: 'Total Users', value: stats.totalUsers.toLocaleString(), icon: Users },
    { label: 'New Today', value: stats.newUsersToday.toLocaleString(), icon: TrendingUp },
    { label: 'Total Matches', value: stats.totalMatches.toLocaleString(), icon: Heart },
    { label: 'Total Messages', value: stats.totalMessages.toLocaleString(), icon: MessageCircle },
    { label: 'Pending Reports', value: stats.pendingReports.toLocaleString(), icon: Flag },
    { label: 'Revenue Today', value: `KES ${stats.revenueToday.toLocaleString()}`, icon: Wallet },
  ]

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Overview</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {cards.map((card) => (
          <Card key={card.label} className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.label}
              </CardTitle>
              <card.icon className="h-4 w-4 text-gold-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
