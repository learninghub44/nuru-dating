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
  const [loading, setLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
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

      let query = supabase
        .from('profiles')
        .select('*')
        .neq('id', user.id)
        .not('photos', 'eq', '{}')

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

  const handleLike = async () => {
    if (currentIndex >= profiles.length) return

    const profile = profiles[currentIndex]
    const supabase = createClient()

    try {
      await supabase.from('likes').insert({
        liker_id: (await supabase.auth.getUser()).data.user?.id,
        liked_id: profile.id,
        is_super_like: false,
      })

      setCurrentIndex(currentIndex + 1)
    } catch (error) {
      console.error('Error liking profile:', error)
    }
  }

  const handleDislike = () => {
    setCurrentIndex(currentIndex + 1)
  }

  const handleSuperLike = async () => {
    if (currentIndex >= profiles.length) return

    const profile = profiles[currentIndex]
    const supabase = createClient()

    try {
      await supabase.from('likes').insert({
        liker_id: (await supabase.auth.getUser()).data.user?.id,
        liked_id: profile.id,
        is_super_like: true,
      })

      setCurrentIndex(currentIndex + 1)
    } catch (error) {
      console.error('Error super liking profile:', error)
    }
  }

  const currentProfile = profiles[currentIndex]

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500 mx-auto mb-4" />
          <p className="text-muted-foreground">Loading profiles...</p>
        </div>
      </div>
    )
  }

  if (profiles.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
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
    )
  }

  if (currentIndex >= profiles.length) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
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
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
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
            <Link href="/matches">
              <Button variant="ghost" size="icon">
                <MessageCircle className="h-5 w-5" />
              </Button>
            </Link>
            <Link href="/profile">
              <Avatar className="h-10 w-10">
                <AvatarImage src={currentProfile?.photos[0]} />
                <AvatarFallback>U</AvatarFallback>
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

      {/* Profile Card */}
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
    </div>
  )
}
