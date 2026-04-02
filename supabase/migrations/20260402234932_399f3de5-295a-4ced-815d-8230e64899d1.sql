
CREATE TABLE public.training_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  youtube_url TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.training_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage training videos"
ON public.training_videos
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view active training videos"
ON public.training_videos
FOR SELECT
TO authenticated
USING (is_active = true);
