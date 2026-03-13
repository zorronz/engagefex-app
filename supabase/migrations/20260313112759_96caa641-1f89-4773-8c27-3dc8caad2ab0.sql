
-- Add login_streak column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS login_streak integer NOT NULL DEFAULT 0;

-- Add first_5_tasks_bonus_paid column to profiles (tracks if bonus was awarded)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS first_5_tasks_bonus_paid boolean NOT NULL DEFAULT false;

-- Create a DB function to award first-5-tasks bonus
CREATE OR REPLACE FUNCTION public.handle_first_five_tasks_bonus()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task_count INTEGER;
  v_balance INTEGER;
  v_already_paid BOOLEAN;
BEGIN
  -- Only on approved transitions
  IF NOT (NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved')) THEN
    RETURN NEW;
  END IF;

  -- Check if already paid
  SELECT first_5_tasks_bonus_paid INTO v_already_paid
  FROM public.profiles WHERE user_id = NEW.user_id;
  
  IF v_already_paid THEN
    RETURN NEW;
  END IF;

  -- Count approved completions for this user (including current)
  SELECT COUNT(*) INTO v_task_count
  FROM public.task_completions
  WHERE user_id = NEW.user_id AND status = 'approved';

  IF v_task_count >= 5 THEN
    SELECT points_balance INTO v_balance FROM public.profiles WHERE user_id = NEW.user_id;
    
    UPDATE public.profiles
    SET
      points_balance = points_balance + 40,
      points_earned = points_earned + 40,
      first_5_tasks_bonus_paid = TRUE,
      updated_at = now()
    WHERE user_id = NEW.user_id
      AND first_5_tasks_bonus_paid = FALSE;

    IF FOUND THEN
      INSERT INTO public.wallet_transactions
        (user_id, transaction_type, points, balance_after, description, reference_type)
      VALUES
        (NEW.user_id, 'bonus', 40, COALESCE(v_balance, 0) + 40, 'First 5 tasks bonus', 'first_5_tasks');
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Attach trigger on task_completions
CREATE TRIGGER on_first_five_tasks_bonus
AFTER UPDATE ON public.task_completions
FOR EACH ROW
EXECUTE FUNCTION public.handle_first_five_tasks_bonus();
