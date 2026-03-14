-- Tighten the INSERT policy — service_role bypasses RLS anyway, so restrict to admins for safety
DROP POLICY IF EXISTS "Service role can insert commissions" ON public.affiliate_commissions;

CREATE POLICY "Admins can insert commissions"
  ON public.affiliate_commissions
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));