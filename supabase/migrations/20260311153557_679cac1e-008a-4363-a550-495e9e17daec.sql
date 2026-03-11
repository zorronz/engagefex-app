
-- ─── 1. Add linkedin to platform_type enum ───
ALTER TYPE public.platform_type ADD VALUE IF NOT EXISTS 'linkedin';

-- ─── 2. Platform Settings (branding) ───
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value text,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view platform settings"
  ON public.platform_settings FOR SELECT USING (true);

CREATE POLICY "Admins can manage platform settings"
  ON public.platform_settings FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.platform_settings (key, value) VALUES
  ('platform_name', 'EngageExchange'),
  ('logo_url', NULL),
  ('favicon_url', NULL)
ON CONFLICT (key) DO NOTHING;

-- ─── 3. Credit Packs ───
CREATE TABLE IF NOT EXISTS public.credit_packs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  credits integer NOT NULL,
  bonus_credits integer NOT NULL DEFAULT 0,
  price_inr numeric NOT NULL,
  price_usd numeric NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.credit_packs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active credit packs"
  ON public.credit_packs FOR SELECT USING (true);

CREATE POLICY "Admins can manage credit packs"
  ON public.credit_packs FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.credit_packs (name, credits, bonus_credits, price_inr, price_usd, sort_order) VALUES
  ('Starter Pack', 500, 0, 99, 1.49, 1),
  ('Value Pack', 1500, 150, 249, 3.49, 2),
  ('Pro Pack', 5000, 750, 699, 9.99, 3);

-- ─── 4. Subscription Plans ───
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  monthly_credits integer NOT NULL,
  price_inr numeric NOT NULL,
  price_usd numeric NOT NULL,
  features jsonb NOT NULL DEFAULT '[]',
  is_active boolean NOT NULL DEFAULT true,
  is_popular boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active subscription plans"
  ON public.subscription_plans FOR SELECT USING (true);

CREATE POLICY "Admins can manage subscription plans"
  ON public.subscription_plans FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.subscription_plans (name, monthly_credits, price_inr, price_usd, is_popular, sort_order, features) VALUES
  ('Starter', 600, 149, 1.99, false, 1, '["600 credits/month","Basic marketplace access","Up to 30 tasks/day","Email support"]'),
  ('Pro', 2000, 399, 4.99, true, 2, '["2000 credits/month","Priority task access","Up to 100 tasks/day","Faster approval","Priority support"]'),
  ('Agency', 8000, 999, 12.99, false, 3, '["8000 credits/month","Unlimited task access","Dedicated support","API access","Bulk campaign tools"]');

-- ─── 5. Welcome Offer Settings ───
CREATE TABLE IF NOT EXISTS public.welcome_offer_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  is_enabled boolean NOT NULL DEFAULT true,
  offer_credits integer NOT NULL DEFAULT 1000,
  offer_price_inr numeric NOT NULL DEFAULT 99,
  offer_price_usd numeric NOT NULL DEFAULT 1.49,
  subscription_discount_pct integer NOT NULL DEFAULT 30,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.welcome_offer_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view welcome offer settings"
  ON public.welcome_offer_settings FOR SELECT USING (true);

CREATE POLICY "Admins can manage welcome offer"
  ON public.welcome_offer_settings FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.welcome_offer_settings (is_enabled, offer_credits, offer_price_inr, offer_price_usd, subscription_discount_pct)
VALUES (true, 1000, 99, 1.49, 30);

-- ─── 6. User signup offer tracking ───
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS welcome_offer_shown boolean NOT NULL DEFAULT false;

-- ─── 7. Logo assets storage bucket ───
INSERT INTO storage.buckets (id, name, public)
VALUES ('platform-assets', 'platform-assets', true)
ON CONFLICT DO NOTHING;

CREATE POLICY "Public can read platform assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'platform-assets');

CREATE POLICY "Admins can upload platform assets"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'platform-assets' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update platform assets"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'platform-assets' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete platform assets"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'platform-assets' AND has_role(auth.uid(), 'admin'::app_role));

-- ─── 8. Triggers for updated_at ───
CREATE TRIGGER update_credit_packs_updated_at
  BEFORE UPDATE ON public.credit_packs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscription_plans_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_platform_settings_updated_at
  BEFORE UPDATE ON public.platform_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
