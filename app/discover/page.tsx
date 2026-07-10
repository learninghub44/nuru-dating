'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Heart, MessageCircle, X, Sparkles, Filter, MapPin } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { calculateAge, formatDate } from '@/lib/utils'
import { NotificationBell } from '@/components/notifications/NotificationBell'

interface Profile {
  id: string
  full_name: string
  birth_date: string
  gender: string
  location: string
  bio: string
  photos: string[]
  verified: boolean
  is_ai_companion: boolean
}

export default function DiscoverPage() {
  const router = useRouter()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [ownProfile, setOwnProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [matchedProfile, setMatchedProfile] = useState<Profile | null>(null)
  const [actionError, setActionError] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    gender: '',
    location: '',
    minAge: 18,
    maxAge: 100,
  })

  useEffect(() => {
    loadProfiles()
  }, [filters])

  const loadProfiles = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      // Own profile is fetched independently of filters, so the header
      // avatar is always correct even when the discover feed is empty.
      const { data: ownData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      setOwnProfile(ownData ?? null)

      // Don't resurface people the user has already liked/passed on —
      // once a like is recorded there's no reason to see them in the feed again.
      const { data: myLikes } = await supabase
        .from('likes')
        .select('liked_id')
        .eq('liker_id', user.id)

      const likedIds = (myLikes || []).map((l) => l.liked_id)

      let query = supabase
        .from('profiles')
        .select('*')
        .neq('id', user.id)
        .not('photos', 'eq', '{}')
        .eq('banned', false)

      if (likedIds.length > 0) {
        query = query.not('id', 'in', `(${likedIds.join(',')})`)
      }

      if (filters.gender) {
        query = query.eq('gender', filters.gender)
      }

      if (filters.location) {
        query = query.ilike('location', `%${filters.location}%`)
      }

      const { data, error } = await query

      if (error) throw error

      // Filter by age
      const filteredByAge = (data || []).filter(profile => {
        const age = calculateAge(profile.birth_date)
        return age >= filters.minAge && age <= filters.maxAge
      })

      setProfiles(filteredByAge)
      setCurrentIndex(0)
    } catch (error) {
      console.error('Error loading profiles:', error)
    } finally {
      setLoading(false)
    }
  }

  const likeCurrentProfile = async (isSuperLike: boolean) => {
    if (currentIndex >= profiles.length) return

    const profile = profiles[currentIndex]
    const supabase = createClient()
    setActionError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error: likeError } = await supabase.from('likes').insert({
        liker_id: user.id,
        liked_id: profile.id,
        is_super_like: isSuperLike,
      })

      // 23505 = unique constraint violation (already liked this person before) — harmless, ignore.
      if (likeError && likeError.code !== '23505') throw likeError

      // Did they already like us back? If so, it's a match.
      const { data: reciprocalLike } = await supabase
        .from('likes')
        .select('id')
        .eq('liker_id', profile.id)
        .eq('liked_id', user.id)
        .maybeSingle()

      if (reciprocalLike) {
        // Sort the pair so the match row is identical no matter which of the
        // two users' clients inserts it first — avoids duplicate match rows
        // from a race between both sides liking at nearly the same time.
        const [user1_id, user2_id] = [user.id, profile.id].sort()

        const { error: matchError } = await supabase
          .from('matches')
          .insert({ user1_id, user2_id })

        if (matchError && matchError.code !== '23505') throw matchError

        setMatchedProfile(profile)
      }

      setCurrentIndex(currentIndex + 1)
    } catch (error: any) {
      console.error('Error liking profile:', error)
      setActionError('Something went wrong. Please try again.')
    }
  }

  const handleLike = () => likeCurrentProfile(false)
  const handleSuperLike = () => likeCurrentProfile(true)

  const handleDislike = () => {
    setCurrentIndex(currentIndex + 1)
  }

  const currentProfile = profiles[currentIndex]
  const hasNoProfiles = !loading && profiles.length === 0
  const hasExhaustedFeed = !loading && profiles.length > 0 && currentIndex >= profiles.length

  return (
    <div className="min-h-screen bg-background">
      {/* Header — always rendered, regardless of loading/empty/exhausted/card state,
          so a user can never get stuck without a way back to profile/matches/logout */}
      <header className="fixed top-0 w-full z-50 glass border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Heart className="h-8 w-8 text-gold-500 fill-gold-500" />
            <span className="text-2xl font-bold text-gold-500">Nuru</span>
          </Link>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="h-5 w-5" />
            </Button>
            <NotificationBell />
            <Link href="/matches">
              <Button variant="ghost" size="icon">
                <MessageCircle className="h-5 w-5" />
              </Button>
            </Link>
            <Link href="/profile">
              <Avatar className="h-10 w-10">
                <AvatarImage src={ownProfile?.photos?.[0]} />
                <AvatarFallback>
                  {ownProfile?.full_name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
            </Link>
          </div>
        </div>
      </header>

      {/* Filters Panel */}
      {showFilters && (
        <div className="fixed top-16 left-0 right-0 z-40 bg-background border-b border-border p-4">
          <div className="container mx-auto max-w-2xl">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Gender</label>
                <select
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm"
                  value={filters.gender}
                  onChange={(e) => setFilters({ ...filters, gender: e.target.value })}
                >
                  <option value="">All</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Location</label>
                <input
                  type="text"
                  placeholder="City"
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm"
                  value={filters.location}
                  onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Min Age</label>
                <input
                  type="number"
                  min="18"
                  max="100"
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm"
                  value={filters.minAge}
                  onChange={(e) => setFilters({ ...filters, minAge: parseInt(e.target.value) || 18 })}
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Max Age</label>
                <input
                  type="number"
                  min="18"
                  max="100"
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm"
                  value={filters.maxAge}
                  onChange={(e) => setFilters({ ...filters, maxAge: parseInt(e.target.value) || 100 })}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {actionError && (
        <div className="fixed top-20 left-0 right-0 z-40 flex justify-center px-4">
          <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 px-4 py-2 rounded-lg">
            {actionError}
          </div>
        </div>
      )}

      {/* Match celebration modal */}
      {matchedProfile && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4">
          <Card className="glass-card max-w-sm w-full">
            <CardContent className="pt-8 pb-6 text-center">
              <Heart className="h-14 w-14 text-gold-500 fill-gold-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-1">It's a Match!</h2>
              <p className="text-muted-foreground mb-6">
                You and {matchedProfile.full_name} liked each other.
              </p>
              <Avatar className="h-24 w-24 mx-auto mb-6">
                <AvatarImage src={matchedProfile.photos?.[0]} />
                <AvatarFallback className="text-3xl">
                  {matchedProfile.full_name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-2">
                <Link href={`/chat/${matchedProfile.id}`}>
                  <Button className="w-full bg-gold-500 text-black hover:bg-gold-600">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Send a Message
                  </Button>
                </Link>
                <Button variant="outline" className="w-full" onClick={() => setMatchedProfile(null)}>
                  Keep Swiping
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Body — swaps between loading / empty / exhausted / card states,
          header above always stays put */}
      {loading && (
        <div className="pt-20 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500 mx-auto mb-4" />
            <p className="text-muted-foreground">Loading profiles...</p>
          </div>
        </div>
      )}

      {hasNoProfiles && (
        <div className="pt-20 min-h-screen flex items-center justify-center p-4">
          <Card className="max-w-md glass-card">
            <CardContent className="pt-6 text-center">
              <Heart className="h-12 w-12 text-gold-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">No profiles found</h2>
              <p className="text-muted-foreground mb-4">
                Try adjusting your filters or check back later for new profiles.
              </p>
              <Button
                onClick={() => setFilters({ gender: '', location: '', minAge: 18, maxAge: 100 })}
                variant="outline"
              >
                Reset Filters
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {hasExhaustedFeed && (
        <div className="pt-20 min-h-screen flex items-center justify-center p-4">
          <Card className="max-w-md glass-card">
            <CardContent className="pt-6 text-center">
              <Heart className="h-12 w-12 text-gold-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">You've seen all profiles</h2>
              <p className="text-muted-foreground mb-4">
                Check back later for new matches!
              </p>
              <Button onClick={() => setCurrentIndex(0)} variant="outline">
                Start Over
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {!loading && currentProfile && (
        <div className="pt-20 pb-24 px-4">
          <div className="container mx-auto max-w-md">
            <Card className="glass-card overflow-hidden">
              <div className="relative aspect-[3/4]">
                {currentProfile.photos[0] ? (
                  <img
                    src={currentProfile.photos[0]}
                    alt={currentProfile.full_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <Avatar className="h-32 w-32">
                      <AvatarFallback className="text-4xl">
                        {currentProfile.full_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                )}

                {/* Profile Info Overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <h2 className="text-2xl font-bold text-white">
                      {currentProfile.full_name}
                    </h2>
                    {currentProfile.verified && (
                      <Badge className="bg-gold-500 text-black">Verified</Badge>
                    )}
                    {currentProfile.is_ai_companion && (
                      <Badge variant="outline" className="border-gold-500 text-gold-500">
                        <Sparkles className="h-3 w-3 mr-1" />
                        AI
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-white/80 mb-2">
                    <span>{calculateAge(currentProfile.birth_date)} years old</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {currentProfile.location}
                    </span>
                  </div>
                  {currentProfile.bio && (
                    <p className="text-white/90 line-clamp-2">{currentProfile.bio}</p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-4 flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-14 w-14 rounded-full"
                  onClick={handleDislike}
                >
                  <X className="h-6 w-6" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-12 w-12 rounded-full"
                  onClick={handleSuperLike}
                >
                  <Sparkles className="h-5 w-5 text-gold-500" />
                </Button>
                <Button
                  size="icon"
                  className="h-14 w-14 rounded-full bg-gold-500 text-black hover:bg-gold-600"
                  onClick={handleLike}
                >
                  <Heart className="h-6 w-6 fill-current" />
                </Button>
              </div>
            </Card>

            {/* Progress Indicator */}
            <div className="flex justify-center gap-2 mt-4">
              {profiles.map((_, index) => (
                <div
                  key={index}
                  className={`h-1 rounded-full transition-colors ${
                    index === currentIndex ? 'bg-gold-500 w-8' : 'bg-muted w-1'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
