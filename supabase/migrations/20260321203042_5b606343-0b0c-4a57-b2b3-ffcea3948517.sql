-- Allow unauthenticated visitors to look up a referrer's name by referral_code (for signup banner)
CREATE POLICY "Public can lookup referrer name by referral code"
  ON public.profiles
  FOR SELECT
  TO anon
  USING (true);
