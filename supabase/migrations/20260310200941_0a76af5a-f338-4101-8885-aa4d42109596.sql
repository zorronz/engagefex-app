
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create platform enum
CREATE TYPE public.platform_type AS ENUM ('instagram', 'facebook', 'youtube');

-- Create task_type enum
CREATE TYPE public.task_type AS ENUM ('like', 'comment', 'subscribe');

-- Create transaction_type enum  
CREATE TYPE public.transaction_type AS ENUM ('earned', 'spent', 'purchased', 'refunded', 'bonus', 'referral');

-- Create task_status enum
CREATE TYPE public.task_status AS ENUM ('active', 'paused', 'completed', 'expired', 'deleted');

-- Create completion_status enum
CREATE TYPE public.completion_status AS ENUM ('pending', 'approved', 'rejected', 'disputed');

-- Create payment_status enum
CREATE TYPE public.payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');

-- ============================================================
-- PROFILES TABLE
-- ============================================================
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  points_balance INTEGER NOT NULL DEFAULT 50,
  points_earned INTEGER NOT NULL DEFAULT 50,
  points_spent INTEGER NOT NULL DEFAULT 0,
  points_purchased INTEGER NOT NULL DEFAULT 0,
  trust_score NUMERIC(5,2) NOT NULL DEFAULT 75.0,
  tasks_completed INTEGER NOT NULL DEFAULT 0,
  tasks_submitted INTEGER NOT NULL DEFAULT 0,
  is_premium BOOLEAN NOT NULL DEFAULT false,
  is_banned BOOLEAN NOT NULL DEFAULT false,
  ban_reason TEXT,
  referral_code TEXT UNIQUE NOT NULL DEFAULT LOWER(SUBSTR(MD5(gen_random_uuid()::TEXT), 1, 8)),
  referred_by UUID REFERENCES public.profiles(user_id),
  wallet_balance NUMERIC(10,2) NOT NULL DEFAULT 0.0,
  withdrawable_balance NUMERIC(10,2) NOT NULL DEFAULT 0.0,
  ip_address TEXT,
  device_fingerprint TEXT,
  last_seen_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- USER ROLES TABLE
-- ============================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- ============================================================
-- POINT ECONOMY TABLE (admin configurable)
-- ============================================================
CREATE TABLE public.point_economy (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  platform platform_type NOT NULL,
  task_type task_type NOT NULL,
  earn_points INTEGER NOT NULL,
  cost_points INTEGER NOT NULL,
  estimated_seconds INTEGER NOT NULL DEFAULT 25,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(platform, task_type)
);
ALTER TABLE public.point_economy ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- TASKS TABLE
-- ============================================================
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform platform_type NOT NULL,
  task_type task_type NOT NULL,
  post_url TEXT NOT NULL,
  title TEXT,
  reward_points INTEGER NOT NULL,
  total_actions INTEGER NOT NULL,
  completed_actions INTEGER NOT NULL DEFAULT 0,
  status task_status NOT NULL DEFAULT 'active',
  is_boosted BOOLEAN NOT NULL DEFAULT false,
  boost_expires_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- TASK COMPLETIONS TABLE
-- ============================================================
CREATE TABLE public.task_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status completion_status NOT NULL DEFAULT 'pending',
  comment_text TEXT,
  screenshot_url TEXT,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  approved_at TIMESTAMP WITH TIME ZONE,
  rejected_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  points_awarded INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(task_id, user_id)
);
ALTER TABLE public.task_completions ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- WALLET TRANSACTIONS TABLE
-- ============================================================
CREATE TABLE public.wallet_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_type transaction_type NOT NULL,
  points INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  description TEXT,
  reference_id UUID,
  reference_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PAYMENTS TABLE
-- ============================================================
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  points INTEGER NOT NULL,
  status payment_status NOT NULL DEFAULT 'pending',
  gateway TEXT NOT NULL,
  gateway_order_id TEXT,
  gateway_payment_id TEXT,
  gateway_signature TEXT,
  package_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- REFERRALS TABLE
-- ============================================================
CREATE TABLE public.referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  signup_bonus_paid BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(referred_id)
);
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- REFERRAL COMMISSIONS TABLE
-- ============================================================
CREATE TABLE public.referral_commissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES public.payments(id),
  amount NUMERIC(10,2) NOT NULL,
  commission_rate NUMERIC(5,2) NOT NULL DEFAULT 25.0,
  status TEXT NOT NULL DEFAULT 'pending',
  locked_until TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.referral_commissions ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- REPORTS TABLE
-- ============================================================
CREATE TABLE public.reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  completion_id UUID REFERENCES public.task_completions(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PAYOUT REQUESTS TABLE
-- ============================================================
CREATE TABLE public.payout_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  method TEXT NOT NULL,
  account_details JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  processed_by UUID REFERENCES auth.users(id),
  processed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Timestamp update function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_referral_code TEXT;
  v_referrer_id UUID;
BEGIN
  v_referral_code := NEW.raw_user_meta_data->>'referral_code';
  IF v_referral_code IS NOT NULL THEN
    SELECT user_id INTO v_referrer_id FROM public.profiles WHERE referral_code = v_referral_code;
  END IF;

  INSERT INTO public.profiles (user_id, name, email, referred_by)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', SPLIT_PART(NEW.email, '@', 1)),
    NEW.email,
    v_referrer_id
  );

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');

  IF v_referrer_id IS NOT NULL THEN
    INSERT INTO public.referrals (referrer_id, referred_id, signup_bonus_paid)
    VALUES (v_referrer_id, NEW.id, true);

    UPDATE public.profiles SET points_balance = points_balance + 100, points_earned = points_earned + 100
    WHERE user_id = v_referrer_id;

    UPDATE public.profiles SET points_balance = points_balance + 50, points_earned = points_earned + 50
    WHERE user_id = NEW.id;
  END IF;

  INSERT INTO public.wallet_transactions (user_id, transaction_type, points, balance_after, description)
  VALUES (NEW.id, 'bonus', 50, 50, 'Welcome bonus points');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- TIMESTAMP TRIGGERS
-- ============================================================
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_task_completions_updated_at BEFORE UPDATE ON public.task_completions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_point_economy_updated_at BEFORE UPDATE ON public.point_economy FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_platform ON public.tasks(platform);
CREATE INDEX idx_tasks_owner ON public.tasks(owner_id);
CREATE INDEX idx_tasks_boosted ON public.tasks(is_boosted, status);
CREATE INDEX idx_task_completions_user ON public.task_completions(user_id);
CREATE INDEX idx_task_completions_task ON public.task_completions(task_id);
CREATE INDEX idx_wallet_transactions_user ON public.wallet_transactions(user_id);
CREATE INDEX idx_profiles_referral_code ON public.profiles(referral_code);

-- ============================================================
-- RLS POLICIES
-- ============================================================
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "System can insert profiles" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view point economy" ON public.point_economy FOR SELECT USING (true);
CREATE POLICY "Admins can manage point economy" ON public.point_economy FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Active tasks visible to authenticated users" ON public.tasks FOR SELECT USING (auth.uid() IS NOT NULL AND (status = 'active' OR owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin')));
CREATE POLICY "Users can create tasks" ON public.tasks FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners and admins can update tasks" ON public.tasks FOR UPDATE USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owners and admins can delete tasks" ON public.tasks FOR DELETE USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users see their own completions or completions of their tasks" ON public.task_completions FOR SELECT USING (
  auth.uid() = user_id OR 
  EXISTS(SELECT 1 FROM public.tasks WHERE id = task_completions.task_id AND owner_id = auth.uid()) OR
  public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Users can insert their own completions" ON public.task_completions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Task owners and admins can update completions" ON public.task_completions FOR UPDATE USING (
  auth.uid() = user_id OR
  EXISTS(SELECT 1 FROM public.tasks WHERE id = task_completions.task_id AND owner_id = auth.uid()) OR
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Users see own transactions" ON public.wallet_transactions FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "System inserts transactions" ON public.wallet_transactions FOR INSERT WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users see own payments" ON public.payments FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can create payments" ON public.payments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "System updates payments" ON public.payments FOR UPDATE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their referrals" ON public.referrals FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "System inserts referrals" ON public.referrals FOR INSERT WITH CHECK (true);

CREATE POLICY "Users see own commissions" ON public.referral_commissions FOR SELECT USING (auth.uid() = referrer_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "System inserts commissions" ON public.referral_commissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins update commissions" ON public.referral_commissions FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create reports" ON public.reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Admins can view all reports" ON public.reports FOR SELECT USING (auth.uid() = reporter_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update reports" ON public.reports FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can see own payout requests" ON public.payout_requests FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can create payout requests" ON public.payout_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can update payout requests" ON public.payout_requests FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- SEED POINT ECONOMY
-- ============================================================
INSERT INTO public.point_economy (platform, task_type, earn_points, cost_points, estimated_seconds) VALUES
  ('instagram', 'like', 2, 4, 20),
  ('instagram', 'comment', 8, 12, 45),
  ('facebook', 'like', 2, 4, 20),
  ('facebook', 'comment', 8, 12, 45),
  ('youtube', 'comment', 10, 15, 60),
  ('youtube', 'subscribe', 12, 18, 30);
