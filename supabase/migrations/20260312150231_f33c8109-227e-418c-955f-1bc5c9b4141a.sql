
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_referral_code TEXT;
  v_referrer_id UUID;
BEGIN
  v_referral_code := NEW.raw_user_meta_data->>'referral_code';

  -- Resolve referrer (cannot refer yourself)
  IF v_referral_code IS NOT NULL THEN
    SELECT user_id INTO v_referrer_id
    FROM public.profiles
    WHERE referral_code = v_referral_code
      AND user_id <> NEW.id;
  END IF;

  -- Create profile (120 pts welcome bonus)
  INSERT INTO public.profiles (user_id, name, email, referred_by, points_balance, points_earned)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', SPLIT_PART(NEW.email, '@', 1)),
    NEW.email,
    v_referrer_id,
    120,
    120
  );

  -- Assign default role
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');

  -- Log welcome bonus transaction for new user
  INSERT INTO public.wallet_transactions
    (user_id, transaction_type, points, balance_after, description)
  VALUES
    (NEW.id, 'bonus', 120, 120, 'Welcome bonus points');

  -- Award 30 pts to referrer on every valid signup (no daily cap)
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
$function$
