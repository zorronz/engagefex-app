
-- Add daily_login_claimed_at to profiles to track last login reward
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS daily_login_claimed_at DATE;

-- Add stripe_customer_id to profiles for Stripe subscription tracking
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Add stripe_subscription_id and stripe_plan to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_plan TEXT; -- 'pro_monthly','pro_yearly','agency_monthly','agency_yearly'

-- Create early_adopter_settings table
CREATE TABLE IF NOT EXISTS public.early_adopter_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  max_users INTEGER NOT NULL DEFAULT 500,
  bonus_credits INTEGER NOT NULL DEFAULT 100,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  current_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on early_adopter_settings
ALTER TABLE public.early_adopter_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view early adopter settings"
  ON public.early_adopter_settings FOR SELECT USING (true);

CREATE POLICY "Admins can manage early adopter settings"
  ON public.early_adopter_settings FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert default early adopter settings row
INSERT INTO public.early_adopter_settings (max_users, bonus_credits, is_enabled, current_count)
VALUES (500, 100, true, 0)
ON CONFLICT DO NOTHING;

-- Update handle_new_user to award early adopter bonus if within first 500 signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_referral_code TEXT;
  v_referrer_id UUID;
  v_ea_settings public.early_adopter_settings%ROWTYPE;
  v_is_early_adopter BOOLEAN := FALSE;
BEGIN
  v_referral_code := NEW.raw_user_meta_data->>'referral_code';

  -- Resolve referrer (cannot refer yourself)
  IF v_referral_code IS NOT NULL THEN
    SELECT user_id INTO v_referrer_id
    FROM public.profiles
    WHERE referral_code = v_referral_code
      AND user_id <> NEW.id;
  END IF;

  -- Check early adopter eligibility
  SELECT * INTO v_ea_settings FROM public.early_adopter_settings LIMIT 1;
  IF v_ea_settings.is_enabled AND v_ea_settings.current_count < v_ea_settings.max_users THEN
    v_is_early_adopter := TRUE;
    UPDATE public.early_adopter_settings 
    SET current_count = current_count + 1,
        is_enabled = CASE WHEN current_count + 1 >= max_users THEN false ELSE is_enabled END,
        updated_at = now();
  END IF;

  -- Create profile (120 pts welcome bonus + 100 early adopter if eligible)
  INSERT INTO public.profiles (user_id, name, email, referred_by, points_balance, points_earned)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', SPLIT_PART(NEW.email, '@', 1)),
    NEW.email,
    v_referrer_id,
    120 + CASE WHEN v_is_early_adopter THEN 100 ELSE 0 END,
    120 + CASE WHEN v_is_early_adopter THEN 100 ELSE 0 END
  );

  -- Assign default role
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');

  -- Log welcome bonus transaction
  INSERT INTO public.wallet_transactions
    (user_id, transaction_type, points, balance_after, description)
  VALUES
    (NEW.id, 'bonus', 120, 120, 'Welcome bonus credits');

  -- Log early adopter bonus transaction if eligible
  IF v_is_early_adopter THEN
    INSERT INTO public.wallet_transactions
      (user_id, transaction_type, points, balance_after, description)
    VALUES
      (NEW.id, 'bonus', 100, 220, 'Early adopter bonus');
  END IF;

  -- Award 30 pts to referrer on every valid signup
  IF v_referrer_id IS NOT NULL THEN
    INSERT INTO public.referrals
      (referrer_id, referred_id, signup_bonus_paid, signup_reward_paid)
    VALUES
      (v_referrer_id, NEW.id, TRUE, TRUE);

    UPDATE public.profiles
    SET
      points_balance = points_balance + 30,
      points_earned  = points_earned  + 30,
      updated_at     = now()
    WHERE user_id = v_referrer_id;

    INSERT INTO public.wallet_transactions
      (user_id, transaction_type, points, balance_after, description, reference_id, reference_type)
    SELECT
      v_referrer_id, 'referral', 30, points_balance,
      'Referral signup bonus', NEW.id, 'referral_signup'
    FROM public.profiles
    WHERE user_id = v_referrer_id;
  END IF;

  RETURN NEW;
END;
$function$;
