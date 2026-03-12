import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Check, Zap, Star, Gift, ArrowRight, X, Heart, Layers, Users } from 'lucide-react';

interface SubPlan {
  id: string; name: string; monthly_credits: number;
  price_inr: number; price_usd: number; features: string[]; is_popular: boolean;
}
interface WelcomeOffer {
  is_enabled: boolean; offer_credits: number;
  offer_price_inr: number; offer_price_usd: number; subscription_discount_pct: number;
}

type BillingCycle = 'monthly' | 'yearly';

const PLAN_DISPLAY: Record<string, {
  title: string; description: string; benefits: string[]; buttonText: string;
  planKey: { monthly: string; yearly: string };
  yearlyPrice: number; monthlyPrice: number;
}> = {
  pro: {
    title: 'Pro', description: 'Get engagement instantly without completing tasks.',
    benefits: [
      'Up to ~160 comments per month', 'Up to ~500 likes per month',
      '2,000 credits automatically added each month',
      'Create up to 10 campaigns per day', 'Faster campaign completion',
    ],
    buttonText: 'Upgrade to Pro',
    planKey: { monthly: 'pro_monthly', yearly: 'pro_yearly' },
    monthlyPrice: 5, yearlyPrice: 50,
  },
  agency: {
    title: 'Agency', description: 'For creators, marketers, and power users.',
    benefits: [
      'Up to ~660 comments per month', 'Up to ~2,000 likes per month',
      '8,000 credits automatically added each month',
      'Create up to 50 campaigns per day', 'Priority campaign processing',
    ],
    buttonText: 'Upgrade to Agency',
    planKey: { monthly: 'agency_monthly', yearly: 'agency_yearly' },
    monthlyPrice: 15, yearlyPrice: 150,
  },
};

const getDisplayKey = (name: string) => name.toLowerCase().replace(/\s+/g, '');

export default function ChoosePlan() {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<SubPlan[]>([]);
  const [offer, setOffer] = useState<WelcomeOffer | null>(null);
  const [loading, setLoading] = useState(true);
  const [offerDismissed, setOfferDismissed] = useState(false);
  const [billing, setBilling] = useState<BillingCycle>('monthly');
  const [checkingOut, setCheckingOut] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [s, o] = await Promise.all([
        supabase.from('subscription_plans').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('welcome_offer_settings').select('*').limit(1).single(),
      ]);
      if (s.data) setPlans(s.data.map(x => ({
        ...x, price_inr: Number(x.price_inr), price_usd: Number(x.price_usd),
        features: Array.isArray(x.features) ? x.features as string[] : [],
      })));
      if (o.data) setOffer({ ...o.data, offer_price_inr: Number(o.data.offer_price_inr), offer_price_usd: Number(o.data.offer_price_usd) });
      setLoading(false);
    })();
  }, []);

  const handleFree = async () => {
    if (user) {
      await supabase.from('profiles').update({ welcome_offer_shown: true }).eq('user_id', user.id);
      await refreshProfile();
    }
    navigate('/dashboard');
  };

  const dismissOffer = async () => {
    setOfferDismissed(true);
    if (user) await supabase.from('profiles').update({ welcome_offer_shown: true }).eq('user_id', user.id);
  };

  const handleStripeCheckout = async (planKey: string) => {
    setCheckingOut(planKey);
    try {
      const { data, error } = await supabase.functions.invoke('create-stripe-checkout', {
        body: { plan: planKey },
      });
      if (error || !data?.url) throw new Error(error?.message ?? 'Failed to create checkout');
      window.location.href = data.url;
    } catch (e) {
      alert(`Checkout error: ${e instanceof Error ? e.message : e}`);
      setCheckingOut(null);
    }
  };

  const showOffer = offer?.is_enabled && !offerDismissed;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="font-mono text-xs text-foreground-muted animate-pulse">LOADING PLANS...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-5xl mx-auto px-4 py-12 space-y-10">

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-full mb-4">
            <Zap className="w-3.5 h-3.5 text-primary" />
            <span className="label-caps text-primary">YOUR ACCOUNT IS READY</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground">Choose Your Plan</h1>
          <p className="text-foreground-muted text-sm max-w-md mx-auto">
            Grow your social presence with real engagement — earned or purchased.
          </p>
        </div>

        {/* Welcome Offer Banner */}
        {showOffer && offer && (
          <div className="relative bg-gradient-to-r from-yellow-400/10 via-primary/10 to-earn/10 border border-yellow-400/30 rounded-xl p-5 overflow-hidden">
            <button onClick={dismissOffer} className="absolute top-3 right-3 text-foreground-muted hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-yellow-400/20 flex items-center justify-center flex-shrink-0">
                <Gift className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                  Launch Offer — Limited Time
                  <span className="label-caps px-1.5 py-0.5 bg-yellow-400/20 text-yellow-400 rounded">LIMITED</span>
                </p>
                <p className="text-xs text-foreground-muted mt-1">
                  <b className="text-yellow-400">LAUNCH30</b>
                </p>
                <div className="flex gap-2 mt-3 flex-wrap">
                  <button
                    onClick={() => handleStripeCheckout('pro_monthly')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/20 border border-primary/30 text-primary rounded text-xs font-semibold hover:bg-primary/30 transition-colors">
                    <Zap className="w-3 h-3" /> Upgrade to Pro
                  </button>
                  <button
                    onClick={() => handleStripeCheckout('pro_monthly')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-400/20 border border-yellow-400/30 text-yellow-400 rounded text-xs font-semibold hover:bg-yellow-400/30 transition-colors">
                    Claim {offer.subscription_discount_pct}% Launch Discount
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-1 bg-surface border border-border rounded-full p-1 w-fit mx-auto">
          <button
            onClick={() => setBilling('monthly')}
            className={`px-5 py-2 rounded-full text-xs font-semibold transition-all ${billing === 'monthly' ? 'bg-primary text-primary-foreground shadow' : 'text-foreground-muted hover:text-foreground'}`}>
            Monthly
          </button>
          <button
            onClick={() => setBilling('yearly')}
            className={`flex items-center gap-1.5 px-5 py-2 rounded-full text-xs font-semibold transition-all ${billing === 'yearly' ? 'bg-primary text-primary-foreground shadow' : 'text-foreground-muted hover:text-foreground'}`}>
            Yearly
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${billing === 'yearly' ? 'bg-white/20 text-white' : 'bg-earn-dim text-earn'}`}>
              SAVE 17%
            </span>
          </button>
        </div>

        {/* Plans Grid */}
        <div>
          <p className="label-caps text-center mb-6">CHOOSE YOUR GROWTH PLAN</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">

            {/* Free Plan */}
            <div className="relative bg-surface border border-border rounded-xl p-5 flex flex-col gap-4">
              <div>
                <p className="font-bold text-foreground text-lg">Free</p>
                <div className="mt-1">
                  <span className="font-mono text-2xl font-bold text-foreground">$0</span>
                </div>
                <p className="text-xs text-foreground-muted mt-2">Earn engagement by helping others grow.</p>
              </div>
              <ul className="space-y-2 flex-1">
                {[
                  'Earn up to ~20 comments per day by completing tasks',
                  'Approximately up to ~600 comments per month with consistent activity',
                  '2 campaigns per day',
                  'Daily login rewards (+5 credits/day)',
                  'Earn credits by completing campaigns',
                ].map((b, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-foreground-muted">
                    <Check className="w-3.5 h-3.5 text-earn mt-0.5 flex-shrink-0" />
                    {b}
                  </li>
                ))}
              </ul>
              <button
                onClick={handleFree}
                className="w-full py-2.5 rounded text-sm font-semibold transition-colors bg-surface-elevated border border-border text-foreground hover:border-primary/50 flex items-center justify-center gap-2">
                Start Free <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Paid Plans from DB */}
            {plans.map(plan => {
              const key = getDisplayKey(plan.name);
              const display = PLAN_DISPLAY[key];
              if (!display) return null;
              const planKey = display.planKey[billing];
              const isCheckingOut = checkingOut === planKey;
              const price = billing === 'yearly' ? display.yearlyPrice : display.monthlyPrice;
              const perMonth = billing === 'yearly' ? (display.yearlyPrice / 12).toFixed(2) : null;

              return (
                <div key={plan.id} className={`relative bg-surface border rounded-xl p-5 flex flex-col gap-4 ${plan.is_popular ? 'border-primary/60 shadow-lg shadow-primary/10' : 'border-border'}`}>
                  {plan.is_popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="flex items-center gap-1 px-2.5 py-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full whitespace-nowrap">
                        <Star className="w-2.5 h-2.5 fill-current" /> MOST POPULAR
                      </span>
                    </div>
                  )}
                  <div>
                    <p className="font-bold text-foreground text-lg">{display.title}</p>
                    {plan.is_popular && (
                      <p className="text-[10px] text-primary font-semibold mt-0.5">Best value for creators</p>
                    )}
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="font-mono text-2xl font-bold text-foreground">${price}</span>
                      <span className="text-xs text-foreground-muted">/{billing === 'yearly' ? 'year' : 'month'}</span>
                    </div>
                    {billing === 'yearly' && perMonth && (
                      <p className="text-[10px] text-earn font-mono mt-0.5">${perMonth}/mo — Save 17%</p>
                    )}
                    <p className="text-xs text-foreground-muted mt-2">{display.description}</p>
                    <p className="text-[10px] text-foreground-dim font-mono mt-1">{plan.monthly_credits.toLocaleString()} credits/month included</p>
                  </div>
                  <ul className="space-y-2 flex-1">
                    {display.benefits.map((b, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-foreground-muted">
                        <Check className="w-3.5 h-3.5 text-earn mt-0.5 flex-shrink-0" />
                        {b}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => handleStripeCheckout(planKey)}
                    disabled={isCheckingOut}
                    className={`w-full py-2.5 rounded text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60 ${plan.is_popular ? 'bg-primary text-primary-foreground' : 'bg-surface-elevated border border-border text-foreground hover:border-primary/50'}`}>
                    {isCheckingOut ? 'Redirecting...' : display.buttonText}
                  </button>
                </div>
              );
            })}
          </div>
          {billing === 'yearly' && (
            <p className="text-center text-xs text-earn font-semibold mt-3">✓ Save 17% with yearly billing — pay once, grow all year</p>
          )}
        </div>

        {/* How The Platform Works */}
        <div className="bg-surface border border-border rounded-xl p-6">
          <p className="label-caps text-center mb-5">HOW THE PLATFORM WORKS</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
            {[
              { icon: <Layers className="w-5 h-5 text-primary" />, text: 'Creators launch campaigns to promote their posts' },
              { icon: <Users className="w-5 h-5 text-earn" />, text: 'Engagers complete simple social media interactions' },
              { icon: <Zap className="w-5 h-5 text-yellow-400" />, text: 'Engagers earn credits for every completed task' },
              { icon: <Heart className="w-5 h-5 text-spend" />, text: 'Credits are used to boost your own posts' },
            ].map((step, i) => (
              <div key={i} className="flex flex-col items-center text-center gap-3">
                <div className="w-10 h-10 rounded-full bg-surface-elevated border border-border flex items-center justify-center flex-shrink-0">
                  {step.icon}
                </div>
                <p className="text-xs text-foreground-muted leading-relaxed">{step.text}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
