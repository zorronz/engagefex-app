-- Create affiliate_commissions table for Phase 1 referral tracking
CREATE TABLE IF NOT EXISTS public.affiliate_commissions (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id     uuid        NOT NULL,
  referred_user_id uuid       NOT NULL,
  subscription_id text,
  invoice_id      text        NOT NULL,
  amount          numeric     NOT NULL DEFAULT 0,
  commission_rate numeric     NOT NULL DEFAULT 0.25,
  status          text        NOT NULL DEFAULT 'pending',
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT affiliate_commissions_invoice_unique UNIQUE (invoice_id)
);

ALTER TABLE public.affiliate_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Referrers can view own commissions"
  ON public.affiliate_commissions
  FOR SELECT
  USING (auth.uid() = referrer_id);

CREATE POLICY "Admins can view all commissions"
  ON public.affiliate_commissions
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update commissions"
  ON public.affiliate_commissions
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can insert commissions"
  ON public.affiliate_commissions
  FOR INSERT
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_referrer_id
  ON public.affiliate_commissions (referrer_id);

CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_referred_user_id
  ON public.affiliate_commissions (referred_user_id);