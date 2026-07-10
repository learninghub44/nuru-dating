'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Heart, MessageCircle, Sparkles, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { calculateAge, formatTime } from '@/lib/utils'
import { AppHeader } from '@/components/app-header'

interface Match {
  id: string
  user1_id: string
  user2_id: string
  created_at: string
  matched_profile: {
    id: string
    full_name: string
    birth_date: string
    location: string
    photos: string[]
    verified: boolean
    is_ai_companion: boolean
  }
}

export default function MatchesPage() {
  const router = useRouter()
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadMatches()
  }, [])

  const loadMatches = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      // Get matches where current user is either user1 or user2
      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          matched_profile:profiles!matches_user2_id_fkey (
            id,
            full_name,
            birth_date,
            location,
            photos,
            verified,
            is_ai_companion
          )
        `)
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order('created_at', { ascending: false })

      if (error) throw error

      // If user is user2, we need to get user1's profile instead
      const processedMatches = await Promise.all(
        (data || []).map(async (match) => {
          if (match.user2_id === user.id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('id, full_name, birth_date, location, photos, verified, is_ai_companion')
              .eq('id', match.user1_id)
              .single()
            
            return {
              ...match,
              matched_profile: profile,
            }
          }
          return match
        })
      )

      setMatches(processedMatches)
    } catch (error) {
      console.error('Error loading matches:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500 mx-auto mb-4" />
          <p className="text-muted-foreground">Loading matches...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <AppHeader active="matches" />

      {/* Content */}
      <div className="pt-20 pb-24 px-4">
        <div className="container mx-auto max-w-2xl">
          <h1 className="text-2xl font-bold mb-6">Your Matches</h1>

          {matches.length === 0 ? (
            <Card className="glass-card">
              <CardContent className="pt-6 text-center">
                <Heart className="h-12 w-12 text-gold-500 mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">No matches yet</h2>
                <p className="text-muted-foreground mb-4">
                  Start liking profiles to find your matches!
                </p>
                <Link href="/discover">
                  <Button className="bg-gold-500 text-black hover:bg-gold-600">
                    Discover Profiles
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {matches.map((match) => (
                <Card key={match.id} className="glass-card hover:border-gold-500/50 transition-colors cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={match.matched_profile.photos[0]} />
                        <AvatarFallback className="text-xl">
                          {match.matched_profile.full_name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-lg">
                            {match.matched_profile.full_name}
                          </h3>
                          {match.matched_profile.verified && (
                            <Badge className="bg-gold-500 text-black text-xs">Verified</Badge>
                          )}
                          {match.matched_profile.is_ai_companion && (
                            <Badge variant="outline" className="border-gold-500 text-gold-500 text-xs">
                              <Sparkles className="h-3 w-3 mr-1" />
                              AI
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">
                          {calculateAge(match.matched_profile.birth_date)} • {match.matched_profile.location}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          Matched {formatTime(new Date(match.created_at))}
                        </div>
                      </div>
                      <Link href={`/chat/${match.matched_profile.id}`}>
                        <Button size="icon" className="bg-gold-500 text-black hover:bg-gold-600">
                          <MessageCircle className="h-5 w-5" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
