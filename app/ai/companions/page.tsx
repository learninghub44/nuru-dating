'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Sparkles, MessageCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { calculateAge } from '@/lib/utils'
import { AppHeader } from '@/components/app-header'

interface AICompanion {
  id: string
  name: string
  age: number
  gender: string
  bio: string
  personality: string
  avatar_url: string
  photos: string[]
  interests: string[]
  is_active: boolean
}

export default function AICompanionsPage() {
  const router = useRouter()
  const [companions, setCompanions] = useState<AICompanion[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    loadCompanions()
  }, [])

  const loadCompanions = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_companions')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) throw error
      setCompanions(data || [])
    } catch (error) {
      console.error('Error loading companions:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500 mx-auto mb-4" />
          <p className="text-muted-foreground">Loading AI companions...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <AppHeader
        active="companions"
        extra={
          <div className="hidden md:flex items-center gap-2">
            <Link href="/ai/coach">
              <Button variant="ghost" size="sm">Dating Coach</Button>
            </Link>
            <Link href="/ai/bio-generator">
              <Button variant="ghost" size="sm">Bio Generator</Button>
            </Link>
          </div>
        }
      />

      {/* Content */}
      <div className="pt-20 pb-24 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-2">AI Companions</h1>
            <p className="text-muted-foreground">
              Chat with AI companions for practice, advice, or just fun conversations
            </p>
          </div>

          {companions.length === 0 ? (
            <Card className="glass-card">
              <CardContent className="pt-6 text-center">
                <Sparkles className="h-12 w-12 text-gold-500 mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">No AI companions available</h2>
                <p className="text-muted-foreground">
                  Check back later for new AI companions!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {companions.map((companion) => (
                <Card
                  key={companion.id}
                  className="glass-card hover:border-gold-500/50 transition-colors cursor-pointer"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={companion.avatar_url} />
                        <AvatarFallback className="text-xl">
                          {companion.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-lg">{companion.name}</h3>
                          <Badge variant="outline" className="border-gold-500 text-gold-500">
                            <Sparkles className="h-3 w-3 mr-1" />
                            AI
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {companion.age} years old • {companion.gender}
                        </p>
                        <p className="text-sm mb-3 line-clamp-2">{companion.bio}</p>
                        <div className="flex flex-wrap gap-1 mb-3">
                          {companion.interests.slice(0, 3).map((interest, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {interest}
                            </Badge>
                          ))}
                        </div>
                        <Link href={`/ai/chat/${companion.id}`}>
                          <Button className="w-full bg-gold-500 text-black hover:bg-gold-600">
                            <MessageCircle className="h-4 w-4 mr-2" />
                            Start Chat
                          </Button>
                        </Link>
                      </div>
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
