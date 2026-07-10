import { createAdminClient } from '@/lib/supabase/admin'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

async function getUsers() {
  const admin = createAdminClient()
  const { data } = await admin
    .from('profiles')
    .select('id, full_name, email, gender, location, verified, is_ai_companion, photos, created_at')
    .order('created_at', { ascending: false })
    .limit(100)

  return data || []
}

export default async function AdminUsersPage() {
  const users = await getUsers()

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Users ({users.length})</h1>
      <Card className="glass-card">
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {users.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4 min-w-0">
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarImage src={user.photos?.[0]} />
                    <AvatarFallback>{user.full_name?.[0] || 'U'}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{user.full_name || 'Unnamed'}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {user.email} &middot; {user.location}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {user.is_ai_companion && <Badge variant="secondary">AI</Badge>}
                  {user.verified && <Badge className="bg-gold-500 text-black">Verified</Badge>}
                  <span className="text-xs text-muted-foreground hidden md:inline">
                    Joined {formatDate(new Date(user.created_at))}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
