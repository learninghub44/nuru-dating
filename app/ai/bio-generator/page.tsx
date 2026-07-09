'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Heart, ArrowLeft, Sparkles, RefreshCw, Copy, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function BioGeneratorPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [generatedBio, setGeneratedBio] = useState('')
  const [copied, setCopied] = useState(false)
  const [formData, setFormData] = useState({
    interests: '',
    personality: '',
    goals: '',
    funFact: '',
  })

  const supabase = createClient()

  const handleGenerate = async () => {
    if (!formData.interests || !formData.personality) {
      alert('Please fill in at least your interests and personality')
      return
    }

    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const response = await fetch('/api/ai/bio-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interests: formData.interests,
          personality: formData.personality,
          goals: formData.goals,
          funFact: formData.funFact,
        }),
      })

      if (!response.ok) throw new Error('Failed to generate bio')

      const data = await response.json()
      setGeneratedBio(data.bio)
    } catch (error) {
      console.error('Error generating bio:', error)
      alert('Failed to generate bio. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedBio)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSaveToProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { error } = await supabase
        .from('profiles')
        .update({ bio: generatedBio })
        .eq('id', user.id)

      if (error) throw error

      alert('Bio saved to your profile!')
      router.push('/profile')
    } catch (error) {
      console.error('Error saving bio:', error)
      alert('Failed to save bio. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 glass border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/discover">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <Link href="/" className="flex items-center gap-2">
            <Heart className="h-8 w-8 text-gold-500 fill-gold-500" />
            <span className="text-2xl font-bold text-gold-500">Nuru</span>
          </Link>
        </div>
      </header>

      {/* Content */}
      <div className="pt-20 pb-24 px-4">
        <div className="container mx-auto max-w-2xl">
          <Card className="glass-card mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-gold-500" />
                AI Bio Generator
              </CardTitle>
              <CardDescription>
                Create an attractive bio that showcases your personality
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Interests *</label>
                <textarea
                  className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm min-h-[80px]"
                  placeholder="Travel, cooking, hiking, photography, music..."
                  value={formData.interests}
                  onChange={(e) => setFormData({ ...formData, interests: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Personality *</label>
                <textarea
                  className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm min-h-[80px]"
                  placeholder="Outgoing, thoughtful, adventurous, funny..."
                  value={formData.personality}
                  onChange={(e) => setFormData({ ...formData, personality: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">What you're looking for</label>
                <textarea
                  className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm min-h-[80px]"
                  placeholder="Meaningful connections, someone who shares my love for adventure..."
                  value={formData.goals}
                  onChange={(e) => setFormData({ ...formData, goals: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Fun fact (optional)</label>
                <textarea
                  className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm min-h-[60px]"
                  placeholder="I once climbed Mount Kenya..."
                  value={formData.funFact}
                  onChange={(e) => setFormData({ ...formData, funFact: e.target.value })}
                />
              </div>
              <Button
                onClick={handleGenerate}
                disabled={loading}
                className="w-full bg-gold-500 text-black hover:bg-gold-600"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Bio
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {generatedBio && (
            <Card className="glass-card border-gold-500/50">
              <CardHeader>
                <CardTitle>Your Generated Bio</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="whitespace-pre-wrap">{generatedBio}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleCopy}
                    variant="outline"
                    className="flex-1"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleSaveToProfile}
                    className="flex-1 bg-gold-500 text-black hover:bg-gold-600"
                  >
                    Save to Profile
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
