
-- Remove daily referral cap: update handle_new_user to always award signup reward
CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
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

  -- Create profile (50 pts welcome bonus always)
  INSERT INTO public.profiles (user_id, name, email, referred_by, points_balance, points_earned)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', SPLIT_PART(NEW.email, '@', 1)),
    NEW.email,
    v_referrer_id,
    50,
    50
  );

  -- Assign default role
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');

  -- Log welcome bonus transaction for new user
  INSERT INTO public.wallet_transactions
    (user_id, transaction_type, points, balance_after, description)
  VALUES
    (NEW.id, 'bonus', 50, 50, 'Welcome bonus points');

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
$$;

-- Remove daily cap from first-task referral bonus function
CREATE OR REPLACE FUNCTION public.handle_first_task_referral_bonus()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  v_referral public.referrals%ROWTYPE;
  v_referrer_balance INTEGER;
BEGIN
  -- Only fire when status transitions TO approved
  IF NOT (NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved')) THEN
    RETURN NEW;
  END IF;

  -- Find an un-rewarded referral for this worker
  SELECT * INTO v_referral
  FROM public.referrals
  WHERE referred_id = NEW.user_id
    AND first_task_reward_paid = FALSE
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Mark first task completed and reward paid
  UPDATE public.referrals
  SET
    first_task_completed   = TRUE,
    first_task_reward_paid = TRUE
  WHERE id = v_referral.id;

  -- Award 20 pts to referrer (no daily cap)
  SELECT points_balance INTO v_referrer_balance
  FROM public.profiles WHERE user_id = v_referral.referrer_id;

  UPDATE public.profiles
  SET
    points_balance = points_balance + 20,
    points_earned  = points_earned  + 20,
    updated_at     = now()
  WHERE user_id = v_referral.referrer_id;

  INSERT INTO public.wallet_transactions
    (user_id, transaction_type, points, balance_after, description, reference_id, reference_type)
  VALUES
    (v_referral.referrer_id, 'referral', 20,
     COALESCE(v_referrer_balance, 0) + 20,
     'Referral first-task bonus',
     NEW.id, 'referral_first_task');

  RETURN NEW;
END;
$$;
