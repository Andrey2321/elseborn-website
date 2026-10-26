-- Elseborn: allow animated GIF avatars and banners in existing profile-images bucket.
-- Keeps existing objects and profiles. Run once in Supabase SQL Editor.
update storage.buckets
set public = true,
    file_size_limit = 15728640,
    allowed_mime_types = array['image/png','image/jpeg','image/webp','image/gif']
where id = 'profile-images';
-- If 0 rows were updated, run profile_setup.sql first (review its policies).
