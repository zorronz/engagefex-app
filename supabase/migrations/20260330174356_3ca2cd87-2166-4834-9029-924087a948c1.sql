
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS welcome_video_seen boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS welcome_video_version_seen integer NOT NULL DEFAULT 0;
