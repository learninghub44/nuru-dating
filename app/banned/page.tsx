import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Heart, ShieldAlert } from 'lucide-react'
import { createServerClient } from '@/lib/supabase/server'

export default async function BannedPage() {
  async function signOut() {
    'use server'
    const supabase = await createServerClient()
    await supabase.auth.signOut()
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md glass-card">
        <CardContent className="pt-8 pb-6 text-center">
          <div className="flex justify-center mb-4">
            <Heart className="h-10 w-10 text-gold-500 fill-gold-500" />
          </div>
          <ShieldAlert className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h1 className="text-xl font-semibold mb-2">Account suspended</h1>
          <p className="text-muted-foreground mb-6">
            Your account has been suspended for violating Nuru's community guidelines.
            If you believe this is a mistake, please contact support.
          </p>
          <div className="flex flex-col gap-2">
            <Link href="/contact">
              <Button className="w-full bg-gold-500 text-black hover:bg-gold-600">
                Contact Support
              </Button>
            </Link>
            <form action={signOut}>
              <Button variant="outline" type="submit" className="w-full">
                Sign Out
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
