-- =============================================================================
-- Profile photo storage bucket + RLS policies
-- Enables drag-and-drop photo upload from app/profile/page.tsx
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-photos',
  'profile-photos',
  true, -- public read, so photos render in <img>/<AvatarImage> without signed URLs
  5242880, -- 5MB per file
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Anyone can view profile photos (they're shown on public-ish profile/discover cards)
CREATE POLICY "Profile photos are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-photos');

-- Users can only upload into a folder named after their own user id:
-- profile-photos/<user_id>/<filename>
CREATE POLICY "Users can upload their own profile photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profile-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own profile photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'profile-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own profile photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'profile-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
