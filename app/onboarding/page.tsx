'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Heart, ArrowRight, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { calculateAge } from '@/lib/utils'

const MIN_AGE = 18

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    birthDate: '',
    gender: '',
    interestedIn: [] as string[],
    location: '',
    bio: '',
    occupation: '',
    education: '',
    height: '',
    bodyType: '',
    relationshipStatus: '',
    drinking: '',
    smoking: '',
    interests: [] as string[],
  })

  const handleGenderSelect = (gender: string) => {
    setFormData({ ...formData, gender })
  }

  const handleInterestedInToggle = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      interestedIn: prev.interestedIn.includes(interest)
        ? prev.interestedIn.filter(i => i !== interest)
        : [...prev.interestedIn, interest]
    }))
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError('')

    if (!formData.birthDate || !formData.gender || formData.interestedIn.length === 0 || !formData.location) {
      setError('Please fill in all required fields')
      setLoading(false)
      return
    }

    if (calculateAge(formData.birthDate) < MIN_AGE) {
      setError('You must be at least 18 years old to use Nuru.')
      setLoading(false)
      return
    }

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('User not found')
      }

      const { error } = await supabase.from('profiles').insert({
        id: user.id,
        email: user.email,
        full_name: user.user_metadata.full_name || '',
        birth_date: formData.birthDate,
        gender: formData.gender,
        interested_in: formData.interestedIn,
        location: formData.location,
        bio: formData.bio,
        occupation: formData.occupation,
        education: formData.education,
        height: formData.height ? parseInt(formData.height) : null,
        body_type: formData.bodyType || null,
        relationship_status: formData.relationshipStatus || null,
        drinking: formData.drinking || null,
        smoking: formData.smoking || null,
        interests: formData.interests,
      })

      if (error) throw error

      router.push('/discover')
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const nextStep = () => {
    if (step === 1 && (!formData.birthDate || !formData.gender)) {
      setError('Please fill in all required fields')
      return
    }
    if (step === 1 && calculateAge(formData.birthDate) < MIN_AGE) {
      setError('You must be at least 18 years old to use Nuru.')
      return
    }
    if (step === 2 && formData.interestedIn.length === 0) {
      setError('Please select at least one preference')
      return
    }
    if (step === 3 && !formData.location) {
      setError('Please enter your location')
      return
    }
    setError('')
    setStep(step + 1)
  }

  const prevStep = () => {
    setStep(step - 1)
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl glass-card">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <Heart className="h-12 w-12 text-gold-500 fill-gold-500" />
          </div>
          <CardTitle className="text-2xl">Complete your profile</CardTitle>
          <CardDescription>
            Step {step} of 4 - Tell us about yourself
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="birthDate">Date of Birth *</Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                  max={new Date().toISOString().split('T')[0]}
                  required
                />
                {formData.birthDate && (
                  <p
                    className={`text-sm ${
                      calculateAge(formData.birthDate) < MIN_AGE
                        ? 'text-destructive'
                        : 'text-muted-foreground'
                    }`}
                  >
                    Age: {calculateAge(formData.birthDate)} years old
                    {calculateAge(formData.birthDate) < MIN_AGE &&
                      ' — you must be 18 or older to use Nuru'}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Gender *</Label>
                <div className="grid grid-cols-3 gap-3">
                  {['male', 'female', 'other'].map((gender) => (
                    <button
                      key={gender}
                      type="button"
                      onClick={() => handleGenderSelect(gender)}
                      className={`p-3 rounded-lg border-2 transition-colors ${
                        formData.gender === gender
                          ? 'border-gold-500 bg-gold-500/10 text-gold-500'
                          : 'border-border hover:border-gold-500/50'
                      }`}
                    >
                      {gender.charAt(0).toUpperCase() + gender.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <Button onClick={nextStep} className="w-full bg-gold-500 text-black hover:bg-gold-600">
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>Interested in * (select all that apply)</Label>
                <div className="grid grid-cols-2 gap-3">
                  {['male', 'female', 'other'].map((interest) => (
                    <button
                      key={interest}
                      type="button"
                      onClick={() => handleInterestedInToggle(interest)}
                      className={`p-3 rounded-lg border-2 transition-colors ${
                        formData.interestedIn.includes(interest)
                          ? 'border-gold-500 bg-gold-500/10 text-gold-500'
                          : 'border-border hover:border-gold-500/50'
                      }`}
                    >
                      {interest.charAt(0).toUpperCase() + interest.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <Button onClick={prevStep} variant="outline" className="flex-1">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button onClick={nextStep} className="flex-1 bg-gold-500 text-black hover:bg-gold-600">
                  Next <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="location">Location *</Label>
                <Input
                  id="location"
                  type="text"
                  placeholder="Nairobi, Kenya"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">About me</Label>
                <textarea
                  id="bio"
                  className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[100px]"
                  placeholder="Tell others about yourself..."
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                />
              </div>

              <div className="flex gap-3">
                <Button onClick={prevStep} variant="outline" className="flex-1">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button onClick={nextStep} className="flex-1 bg-gold-500 text-black hover:bg-gold-600">
                  Next <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="occupation">Occupation</Label>
                  <Input
                    id="occupation"
                    type="text"
                    placeholder="Software Engineer"
                    value={formData.occupation}
                    onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="education">Education</Label>
                  <Input
                    id="education"
                    type="text"
                    placeholder="University"
                    value={formData.education}
                    onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="height">Height (cm)</Label>
                  <Input
                    id="height"
                    type="number"
                    placeholder="175"
                    value={formData.height}
                    onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bodyType">Body Type</Label>
                  <select
                    id="bodyType"
                    className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={formData.bodyType}
                    onChange={(e) => setFormData({ ...formData, bodyType: e.target.value })}
                  >
                    <option value="">Select...</option>
                    <option value="slim">Slim</option>
                    <option value="average">Average</option>
                    <option value="athletic">Athletic</option>
                    <option value="curvy">Curvy</option>
                    <option value="heavy">Heavy</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="relationshipStatus">Relationship Status</Label>
                  <select
                    id="relationshipStatus"
                    className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={formData.relationshipStatus}
                    onChange={(e) => setFormData({ ...formData, relationshipStatus: e.target.value })}
                  >
                    <option value="">Select...</option>
                    <option value="single">Single</option>
                    <option value="divorced">Divorced</option>
                    <option value="widowed">Widowed</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="drinking">Drinking</Label>
                  <select
                    id="drinking"
                    className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={formData.drinking}
                    onChange={(e) => setFormData({ ...formData, drinking: e.target.value })}
                  >
                    <option value="">Select...</option>
                    <option value="never">Never</option>
                    <option value="socially">Socially</option>
                    <option value="regularly">Regularly</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="smoking">Smoking</Label>
                <select
                  id="smoking"
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={formData.smoking}
                  onChange={(e) => setFormData({ ...formData, smoking: e.target.value })}
                >
                  <option value="">Select...</option>
                  <option value="never">Never</option>
                  <option value="occasionally">Occasionally</option>
                  <option value="regularly">Regularly</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="interests">Interests (comma separated)</Label>
                <Input
                  id="interests"
                  type="text"
                  placeholder="Travel, Music, Sports, Reading"
                  value={formData.interests.join(', ')}
                  onChange={(e) => setFormData({ ...formData, interests: e.target.value.split(',').map(i => i.trim()).filter(Boolean) })}
                />
              </div>

              <div className="flex gap-3">
                <Button onClick={prevStep} variant="outline" className="flex-1">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button onClick={handleSubmit} className="flex-1 bg-gold-500 text-black hover:bg-gold-600" disabled={loading}>
                  {loading ? 'Saving...' : 'Complete Profile'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
