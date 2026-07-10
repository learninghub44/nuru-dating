'use client'

import type React from 'react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Heart, Camera, MapPin, Edit2, Save, X, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { calculateAge } from '@/lib/utils'
import { AppHeader } from '@/components/app-header'

interface Profile {
  id: string
  email: string
  full_name: string
  birth_date: string
  gender: string
  interested_in: string[]
  location: string
  bio: string
  occupation: string
  education: string
  height: number | null
  body_type: string | null
  relationship_status: string | null
  drinking: string | null
  smoking: string | null
  interests: string[]
  photos: string[]
  verified: boolean
}

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false)

  const [formData, setFormData] = useState({
    full_name: '',
    birth_date: '',
    gender: '',
    interested_in: [] as string[],
    location: '',
    bio: '',
    occupation: '',
    education: '',
    height: '',
    body_type: '',
    relationship_status: '',
    drinking: '',
    smoking: '',
    interests: '',
  })

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      if (error) throw error

      if (!data) {
        setProfile(null)
        return
      }

      setProfile(data)
      setFormData({
        full_name: data.full_name || '',
        birth_date: data.birth_date || '',
        gender: data.gender || '',
        interested_in: data.interested_in || [],
        location: data.location || '',
        bio: data.bio || '',
        occupation: data.occupation || '',
        education: data.education || '',
        height: data.height?.toString() || '',
        body_type: data.body_type || '',
        relationship_status: data.relationship_status || '',
        drinking: data.drinking || '',
        smoking: data.smoking || '',
        interests: (data.interests || []).join(', '),
      })
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')

    if (formData.birth_date && calculateAge(formData.birth_date) < 18) {
      setError('You must be at least 18 years old to use Nuru.')
      setSaving(false)
      return
    }

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) throw new Error('User not found')

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          birth_date: formData.birth_date,
          gender: formData.gender,
          interested_in: formData.interested_in,
          location: formData.location,
          bio: formData.bio,
          occupation: formData.occupation,
          education: formData.education,
          height: formData.height ? parseInt(formData.height) : null,
          body_type: formData.body_type || null,
          relationship_status: formData.relationship_status || null,
          drinking: formData.drinking || null,
          smoking: formData.smoking || null,
          interests: formData.interests.split(',').map(i => i.trim()).filter(Boolean),
        })
        .eq('id', user.id)

      if (error) throw error

      setEditing(false)
      loadProfile()
    } catch (error: any) {
      setError(error.message)
    } finally {
      setSaving(false)
    }
  }

  const MAX_PHOTOS = 6
  const MAX_PHOTO_SIZE = 5 * 1024 * 1024 // 5MB
  const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

  const handlePhotoFiles = async (files: FileList | File[]) => {
    setError('')
    const fileArray = Array.from(files)
    const currentPhotos = profile?.photos || []
    const remainingSlots = MAX_PHOTOS - currentPhotos.length

    if (remainingSlots <= 0) {
      setError(`You can only have up to ${MAX_PHOTOS} photos`)
      return
    }

    const filesToUpload = fileArray.slice(0, remainingSlots)

    for (const file of filesToUpload) {
      if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
        setError('Please upload JPG, PNG, WEBP, or GIF images only')
        continue
      }
      if (file.size > MAX_PHOTO_SIZE) {
        setError('Each photo must be under 5MB')
        continue
      }
    }

    const validFiles = filesToUpload.filter(
      (f) => ALLOWED_PHOTO_TYPES.includes(f.type) && f.size <= MAX_PHOTO_SIZE
    )

    if (validFiles.length === 0) return

    setUploadingPhoto(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not found')

      const uploadedUrls: string[] = []

      for (const file of validFiles) {
        const ext = file.name.split('.').pop()
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

        const { error: uploadError } = await supabase.storage
          .from('profile-photos')
          .upload(path, file, { cacheControl: '3600', upsert: false })

        if (uploadError) throw uploadError

        const { data: publicUrlData } = supabase.storage
          .from('profile-photos')
          .getPublicUrl(path)

        uploadedUrls.push(publicUrlData.publicUrl)
      }

      const updatedPhotos = [...currentPhotos, ...uploadedUrls]

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ photos: updatedPhotos })
        .eq('id', user.id)

      if (updateError) throw updateError

      loadProfile()
    } catch (err: any) {
      setError(err.message || 'Failed to upload photo')
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handlePhotoDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    setIsDraggingPhoto(false)
    if (e.dataTransfer.files?.length) {
      handlePhotoFiles(e.dataTransfer.files)
    }
  }

  const handlePhotoInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      handlePhotoFiles(e.target.files)
    }
    e.target.value = ''
  }

  const handleRemovePhoto = async (index: number) => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) throw new Error('User not found')

      const updatedPhotos = (profile?.photos || []).filter((_, i) => i !== index)

      const { error } = await supabase
        .from('profiles')
        .update({ photos: updatedPhotos })
        .eq('id', user.id)

      if (error) throw error

      loadProfile()
    } catch (error: any) {
      setError(error.message)
    }
  }

  const handleInterestedInToggle = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      interested_in: prev.interested_in.includes(interest)
        ? prev.interested_in.filter(i => i !== interest)
        : [...prev.interested_in, interest]
    }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500 mx-auto mb-4" />
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md glass-card">
          <CardContent className="pt-6 text-center">
            <Heart className="h-12 w-12 text-gold-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Profile not found</h2>
            <p className="text-muted-foreground mb-4">
              Please complete your onboarding first.
            </p>
            <Link href="/onboarding">
              <Button>Complete Profile</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <AppHeader active="profile" avatarUrl={profile.photos?.[0]} displayName={profile.full_name} />

      {/* Content */}
      <div className="pt-20 pb-24 px-4">
        <div className="container mx-auto max-w-3xl">
          <Card className="glass-card mb-6">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={profile.photos[0]} />
                    <AvatarFallback className="text-2xl">
                      {profile.full_name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-2xl">{profile.full_name}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <MapPin className="h-4 w-4" />
                      {profile.location}
                    </CardDescription>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className="bg-gold-500 text-black">
                        {calculateAge(profile.birth_date)} years old
                      </Badge>
                      {profile.verified && (
                        <Badge>Verified</Badge>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setEditing(!editing)}
                >
                  {editing ? <X className="h-5 w-5" /> : <Edit2 className="h-5 w-5" />}
                </Button>
              </div>
            </CardHeader>
          </Card>

          {/* Photos Section */}
          <Card className="glass-card mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Photos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-4">
                {profile.photos.map((photo, index) => (
                  <div key={index} className="relative aspect-square group">
                    <img
                      src={photo}
                      alt={`Photo ${index + 1}`}
                      className="w-full h-full object-cover rounded-lg"
                    />
                    <button
                      onClick={() => handleRemovePhoto(index)}
                      className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                {profile.photos.length < 6 && (
                  <label
                    htmlFor="photo-upload-input"
                    onDragOver={(e) => { e.preventDefault(); setIsDraggingPhoto(true) }}
                    onDragLeave={() => setIsDraggingPhoto(false)}
                    onDrop={handlePhotoDrop}
                    className={`aspect-square border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${
                      isDraggingPhoto
                        ? 'border-gold-500 bg-gold-500/10'
                        : 'border-border hover:border-gold-500/50'
                    }`}
                  >
                    {uploadingPhoto ? (
                      <p className="text-xs text-muted-foreground">Uploading...</p>
                    ) : (
                      <>
                        <Camera className="h-8 w-8 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground text-center px-2">
                          Drag &amp; drop or click
                        </p>
                      </>
                    )}
                  </label>
                )}
              </div>
              <input
                id="photo-upload-input"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                className="hidden"
                onChange={handlePhotoInputChange}
                disabled={uploadingPhoto || profile.photos.length >= 6}
              />
              <p className="text-xs text-muted-foreground">
                JPG, PNG, WEBP or GIF, up to 5MB each. {6 - profile.photos.length} slot{6 - profile.photos.length !== 1 ? 's' : ''} remaining.
              </p>
            </CardContent>
          </Card>

          {/* Profile Details */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Profile Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {editing ? (
                <>
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Gender</Label>
                    <select
                      className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label>Interested In</Label>
                    <div className="flex gap-2">
                      {['male', 'female', 'other'].map((interest) => (
                        <button
                          key={interest}
                          type="button"
                          onClick={() => handleInterestedInToggle(interest)}
                          className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                            formData.interested_in.includes(interest)
                              ? 'border-gold-500 bg-gold-500/10 text-gold-500'
                              : 'border-border hover:border-gold-500/50'
                          }`}
                        >
                          {interest.charAt(0).toUpperCase() + interest.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Input
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Bio</Label>
                    <textarea
                      className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm min-h-[100px]"
                      value={formData.bio}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Occupation</Label>
                      <Input
                        value={formData.occupation}
                        onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Education</Label>
                      <Input
                        value={formData.education}
                        onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Height (cm)</Label>
                      <Input
                        type="number"
                        value={formData.height}
                        onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Body Type</Label>
                      <select
                        className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                        value={formData.body_type}
                        onChange={(e) => setFormData({ ...formData, body_type: e.target.value })}
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
                      <Label>Relationship Status</Label>
                      <select
                        className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                        value={formData.relationship_status}
                        onChange={(e) => setFormData({ ...formData, relationship_status: e.target.value })}
                      >
                        <option value="">Select...</option>
                        <option value="single">Single</option>
                        <option value="divorced">Divorced</option>
                        <option value="widowed">Widowed</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Drinking</Label>
                      <select
                        className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
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
                    <Label>Smoking</Label>
                    <select
                      className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
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
                    <Label>Interests (comma separated)</Label>
                    <Input
                      value={formData.interests}
                      onChange={(e) => setFormData({ ...formData, interests: e.target.value })}
                    />
                  </div>

                  {error && (
                    <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                      {error}
                    </div>
                  )}

                  <Button onClick={handleSave} disabled={saving} className="w-full bg-gold-500 text-black hover:bg-gold-600">
                    {saving ? 'Saving...' : <><Save className="h-4 w-4 mr-2" /> Save Changes</>}
                  </Button>
                </>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label className="text-muted-foreground">Bio</Label>
                    <p className="mt-1">{profile.bio || 'No bio added'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Occupation</Label>
                      <p className="mt-1">{profile.occupation || 'Not specified'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Education</Label>
                      <p className="mt-1">{profile.education || 'Not specified'}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Height</Label>
                      <p className="mt-1">{profile.height ? `${profile.height} cm` : 'Not specified'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Body Type</Label>
                      <p className="mt-1">{profile.body_type || 'Not specified'}</p>
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Interests</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {profile.interests?.map((interest, index) => (
                        <Badge key={index} variant="outline">{interest}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
