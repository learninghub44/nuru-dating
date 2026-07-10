import { createAdminClient } from '@/lib/supabase/admin'
import { isCurrentUserAdmin } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { formatDate } from '@/lib/utils'
import { revalidatePath } from 'next/cache'

export const dynamic = 'force-dynamic'

async function getUsers() {
  const admin = createAdminClient()
  const { data } = await admin
    .from('profiles')
    .select('id, full_name, email, gender, location, verified, banned, is_ai_companion, photos, created_at')
    .order('created_at', { ascending: false })
    .limit(100)

  return data || []
}

async function setVerified(formData: FormData) {
  'use server'
  const admin = await isCurrentUserAdmin()
  if (!admin) return

  const userId = formData.get('userId') as string
  const verified = formData.get('verified') === 'true'

  const supabaseAdmin = createAdminClient()
  await supabaseAdmin.from('profiles').update({ verified }).eq('id', userId)

  revalidatePath('/admin/users')
}

async function setBanned(formData: FormData) {
  'use server'
  const admin = await isCurrentUserAdmin()
  if (!admin) return

  const userId = formData.get('userId') as string
  const banned = formData.get('banned') === 'true'

  const supabaseAdmin = createAdminClient()
  await supabaseAdmin
    .from('profiles')
    .update({
      banned,
      banned_at: banned ? new Date().toISOString() : null,
      banned_reason: banned ? 'Banned by admin' : null,
    })
    .eq('id', userId)

  revalidatePath('/admin/users')
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
              <div key={user.id} className="flex items-center justify-between gap-4 p-4">
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
                  {user.banned && <Badge className="bg-destructive text-destructive-foreground">Banned</Badge>}
                  {user.verified && <Badge className="bg-gold-500 text-black">Verified</Badge>}
                  <span className="text-xs text-muted-foreground hidden md:inline">
                    Joined {formatDate(new Date(user.created_at))}
                  </span>
                  {!user.is_ai_companion && (
                    <>
                      <form action={setVerified}>
                        <input type="hidden" name="userId" value={user.id} />
                        <input type="hidden" name="verified" value={(!user.verified).toString()} />
                        <Button size="sm" variant="outline" type="submit">
                          {user.verified ? 'Unverify' : 'Verify'}
                        </Button>
                      </form>
                      <form action={setBanned}>
                        <input type="hidden" name="userId" value={user.id} />
                        <input type="hidden" name="banned" value={(!user.banned).toString()} />
                        <Button size="sm" variant={user.banned ? 'outline' : 'destructive'} type="submit">
                          {user.banned ? 'Unban' : 'Ban'}
                        </Button>
                      </form>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
