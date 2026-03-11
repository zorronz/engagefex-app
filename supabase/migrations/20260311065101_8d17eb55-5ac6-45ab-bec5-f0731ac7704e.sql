
-- ============================================================
-- TRIGGER: approve_task_completion
-- When a completion is set to 'approved':
--   1. Award points to the worker
--   2. Log transaction
--   3. Update task completed_actions (mark task completed if full)
--   4. Increase worker trust score (+2)
-- When a completion is set to 'rejected':
--   1. Return points to task owner
--   2. Log refund transaction  
--   3. Decrease worker trust score (-5)
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_completion_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task tasks%ROWTYPE;
  v_worker_balance INTEGER;
  v_owner_balance INTEGER;
BEGIN
  -- Only act on status transitions
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Fetch the task
  SELECT * INTO v_task FROM public.tasks WHERE id = NEW.task_id;

  -- ─── APPROVED ───
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    -- Get worker's current balance
    SELECT points_balance INTO v_worker_balance FROM public.profiles WHERE user_id = NEW.user_id;

    -- Award points to worker
    UPDATE public.profiles
    SET
      points_balance   = points_balance + v_task.reward_points,
      points_earned    = points_earned  + v_task.reward_points,
      tasks_completed  = tasks_completed + 1,
      trust_score      = LEAST(100, trust_score + 2),
      updated_at       = now()
    WHERE user_id = NEW.user_id;

    -- Log the earn transaction
    INSERT INTO public.wallet_transactions
      (user_id, transaction_type, points, balance_after, description, reference_id, reference_type)
    VALUES
      (NEW.user_id, 'earned', v_task.reward_points,
       COALESCE(v_worker_balance, 0) + v_task.reward_points,
       'Task approved: ' || COALESCE(v_task.title, LEFT(v_task.post_url, 40)),
       NEW.id, 'task_completion');

    -- Set points_awarded on completion record
    NEW.points_awarded := v_task.reward_points;
    NEW.approved_at    := now();

    -- Increment completed_actions on task
    UPDATE public.tasks
    SET
      completed_actions = completed_actions + 1,
      status = CASE
        WHEN completed_actions + 1 >= total_actions THEN 'completed'::task_status
        ELSE status
      END,
      updated_at = now()
    WHERE id = v_task.id;

  -- ─── REJECTED ───
  ELSIF NEW.status = 'rejected' AND OLD.status = 'pending' THEN
    -- Get owner's current balance
    SELECT points_balance INTO v_owner_balance FROM public.profiles WHERE user_id = v_task.owner_id;

    -- Refund points to campaign owner
    UPDATE public.profiles
    SET
      points_balance = points_balance + v_task.reward_points,
      points_spent   = GREATEST(0, points_spent - v_task.reward_points),
      updated_at     = now()
    WHERE user_id = v_task.owner_id;

    -- Log refund transaction for owner
    INSERT INTO public.wallet_transactions
      (user_id, transaction_type, points, balance_after, description, reference_id, reference_type)
    VALUES
      (v_task.owner_id, 'refunded', v_task.reward_points,
       COALESCE(v_owner_balance, 0) + v_task.reward_points,
       'Rejected completion refund: ' || COALESCE(v_task.title, LEFT(v_task.post_url, 40)),
       NEW.id, 'task_rejection');

    -- Penalise worker trust score
    UPDATE public.profiles
    SET
      trust_score = GREATEST(0, trust_score - 5),
      updated_at  = now()
    WHERE user_id = NEW.user_id;

    NEW.rejected_at := now();
  END IF;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS on_completion_status_change ON public.task_completions;

CREATE TRIGGER on_completion_status_change
  BEFORE UPDATE ON public.task_completions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_completion_status_change();


-- ============================================================
-- TRIGGER: handle_task_expiry_refund
-- Nightly job / manual call: refund unused points for expired tasks
-- We also add a trigger-based refund when a task is set to 'expired'
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_task_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_unused_actions INTEGER;
  v_refund_points  INTEGER;
  v_owner_balance  INTEGER;
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;

  -- On expiry or deletion, refund unused slot points to owner
  IF NEW.status IN ('expired', 'deleted') AND OLD.status = 'active' THEN
    v_unused_actions := NEW.total_actions - NEW.completed_actions;
    v_refund_points  := v_unused_actions * NEW.reward_points;

    IF v_refund_points > 0 THEN
      SELECT points_balance INTO v_owner_balance FROM public.profiles WHERE user_id = NEW.owner_id;

      UPDATE public.profiles
      SET
        points_balance = points_balance + v_refund_points,
        points_spent   = GREATEST(0, points_spent - v_refund_points),
        updated_at     = now()
      WHERE user_id = NEW.owner_id;

      INSERT INTO public.wallet_transactions
        (user_id, transaction_type, points, balance_after, description, reference_id, reference_type)
      VALUES
        (NEW.owner_id, 'refunded', v_refund_points,
         COALESCE(v_owner_balance, 0) + v_refund_points,
         'Task ' || NEW.status || ' refund: ' || COALESCE(NEW.title, LEFT(NEW.post_url, 40)),
         NEW.id, 'task_refund');
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_task_status_change ON public.tasks;

CREATE TRIGGER on_task_status_change
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_task_status_change();
