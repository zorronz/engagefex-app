
-- ─── 1. Add tracking columns to referrals table ──────────────────────────────
ALTER TABLE public.referrals
  ADD COLUMN IF NOT EXISTS first_task_completed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS first_task_reward_paid BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS signup_reward_paid BOOLEAN NOT NULL DEFAULT FALSE;

-- ─── 2. Updated handle_new_user: 50pts new user, 30pts referrer (capped) ─────
CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  v_referral_code TEXT;
  v_referrer_id UUID;
  v_today_referral_count INTEGER;
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

  -- ─── Referrer signup reward ──────────────────────────────────────────────
  IF v_referrer_id IS NOT NULL THEN
    -- Count referral rewards given to referrer today (daily cap = 5)
    SELECT COUNT(*) INTO v_today_referral_count
    FROM public.referrals
    WHERE referrer_id = v_referrer_id
      AND signup_reward_paid = TRUE
      AND created_at >= date_trunc('day', now());

    -- Record the referral row; mark reward paid flag based on cap
    INSERT INTO public.referrals
      (referrer_id, referred_id, signup_bonus_paid, signup_reward_paid)
    VALUES
      (v_referrer_id, NEW.id, TRUE, v_today_referral_count < 5);

    -- Award 30 pts to referrer only if under daily cap
    IF v_today_referral_count < 5 THEN
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
  END IF;

  RETURN NEW;
END;
$$;

-- ─── 3. Re-attach the auth trigger ───────────────────────────────────────────
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── 4. First-task referral bonus function ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_first_task_referral_bonus()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  v_referral public.referrals%ROWTYPE;
  v_referrer_balance INTEGER;
  v_today_reward_count INTEGER;
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

  -- Count total referral-type wallet transactions for the referrer today (cap = 5)
  SELECT COUNT(*) INTO v_today_reward_count
  FROM public.wallet_transactions
  WHERE user_id = v_referral.referrer_id
    AND transaction_type = 'referral'
    AND created_at >= date_trunc('day', now());

  -- Mark first task completed regardless; reward paid only if under cap
  UPDATE public.referrals
  SET
    first_task_completed   = TRUE,
    first_task_reward_paid = (v_today_reward_count < 5)
  WHERE id = v_referral.id;

  -- Award 20 pts to referrer if under daily cap
  IF v_today_reward_count < 5 THEN
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
  END IF;

  RETURN NEW;
END;
$$;

-- ─── 5. Attach first-task trigger on task_completions ────────────────────────
DROP TRIGGER IF EXISTS on_first_task_referral_bonus ON public.task_completions;
CREATE TRIGGER on_first_task_referral_bonus
  AFTER UPDATE ON public.task_completions
  FOR EACH ROW EXECUTE FUNCTION public.handle_first_task_referral_bonus();
