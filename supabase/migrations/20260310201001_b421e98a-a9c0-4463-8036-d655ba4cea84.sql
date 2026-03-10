
-- Fix overly permissive RLS policies
-- Replace INSERT WITH CHECK (true) with auth.uid() IS NOT NULL check

DROP POLICY IF EXISTS "System inserts referrals" ON public.referrals;
DROP POLICY IF EXISTS "System inserts commissions" ON public.referral_commissions;

CREATE POLICY "System inserts referrals" ON public.referrals FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "System inserts commissions" ON public.referral_commissions FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Move pg_trgm to extensions schema if needed (it's in public by default, but this is a minor warning)
