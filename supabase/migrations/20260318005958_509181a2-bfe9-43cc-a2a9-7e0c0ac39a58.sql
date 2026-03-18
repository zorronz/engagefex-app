-- Allow admins to update any user's profile (needed for admin point/plan adjustments)
CREATE POLICY "Admins can update any profile"
  ON public.profiles
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));