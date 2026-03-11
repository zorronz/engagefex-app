import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Check, Zap, Star, Gift, ArrowRight, X } from 'lucide-react';

interface CreditPack {
  id: string; name: string; credits: number; bonus_credits: number;
  price_inr: number; price_usd: number;
}
interface SubPlan {
  id: string; name: string; monthly_credits: number;
  price_inr: number; price_usd: number; features: string[]; is_popular: boolean;
}
interface WelcomeOffer {
  is_enabled: boolean; offer_credits: number;
  offer_price_inr: number; offer_price_usd: number; subscription_discount_pct: number;
}

// Simple currency detector: if timezone offset is UTC+5:30 → INR, else USD
const useINR = () => {
  const off = new Date().getTimezoneOffset();
  return off === -330; // India = UTC+5:30 = -330 min
};

export default function ChoosePlan() {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const isINR = useINR();
  const [packs, setPacks] = useState<CreditPack[]>([]);
  const [plans, setPlans] = useState<SubPlan[]>([]);
  const [offer, setOffer] = useState<WelcomeOffer | null>(null);
  const [loading, setLoading] = useState(true);
  const [offerDismissed, setOfferDismissed] = useState(false);

  useEffect(() => {
    (async () => {
      const [p, s, o] = await Promise.all([
        supabase.from('credit_packs').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('subscription_plans').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('welcome_offer_settings').select('*').limit(1).single(),
      ]);
      if (p.data) setPacks(p.data.map(x => ({ ...x, price_inr: Number(x.price_inr), price_usd: Number(x.price_usd) })));
      if (s.data) setPlans(s.data.map(x => ({
        ...x, price_inr: Number(x.price_inr), price_usd: Number(x.price_usd),
        features: Array.isArray(x.features) ? x.features as string[] : [],
      })));
      if (o.data) setOffer({ ...o.data, offer_price_inr: Number(o.data.offer_price_inr), offer_price_usd: Number(o.data.offer_price_usd) });
      setLoading(false);
    })();
  }, []);

  const price = (inr: number, usd: number) => isINR ? `₹${inr}` : `$${usd}`;

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
            Start free, or supercharge your engagement with credits and subscription plans.
          </p>
        </div>

        {/* ─── Welcome Offer Banner ─── */}
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
                  Welcome Offer — Available Only Right Now
                  <span className="label-caps px-1.5 py-0.5 bg-yellow-400/20 text-yellow-400 rounded">ONE TIME</span>
                </p>
                <p className="text-xs text-foreground-muted mt-1">
                  Get <span className="text-earn font-mono font-semibold">{offer.offer_credits} credits</span> for just{' '}
                  <span className="text-primary font-mono font-semibold">{price(offer.offer_price_inr, offer.offer_price_usd)}</span>
                  {' '}— or save <span className="text-yellow-400 font-semibold">{offer.subscription_discount_pct}%</span> on your first subscription month.
                </p>
                <div className="flex gap-2 mt-3 flex-wrap">
                  <button className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-400/20 border border-yellow-400/30 text-yellow-400 rounded text-xs font-semibold hover:bg-yellow-400/30 transition-colors">
                    Get {offer.offer_credits} credits — {price(offer.offer_price_inr, offer.offer_price_usd)}
                  </button>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 border border-primary/20 text-primary rounded text-xs font-semibold hover:bg-primary/20 transition-colors">
                    {offer.subscription_discount_pct}% off first month
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── Subscription Plans ─── */}
        <div>
          <p className="label-caps text-center mb-5">MONTHLY PLANS</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {plans.map(plan => (
              <div key={plan.id} className={`relative bg-surface border rounded-xl p-5 flex flex-col gap-4 ${plan.is_popular ? 'border-primary/50 shadow-lg shadow-primary/10' : 'border-border'}`}>
                {plan.is_popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="flex items-center gap-1 px-2.5 py-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full">
                      <Star className="w-2.5 h-2.5 fill-current" /> MOST POPULAR
                    </span>
                  </div>
                )}
                <div>
                  <p className="font-semibold text-foreground text-base">{plan.name}</p>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="font-mono text-2xl font-bold text-foreground">{price(plan.price_inr, plan.price_usd)}</span>
                    <span className="text-xs text-foreground-muted">/mo</span>
                  </div>
                  <p className="text-xs text-earn font-mono mt-1">{plan.monthly_credits.toLocaleString()} credits/month</p>
                </div>
                <ul className="space-y-1.5 flex-1">
                  {plan.features.filter(Boolean).map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-foreground-muted">
                      <Check className="w-3.5 h-3.5 text-earn mt-0.5 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => navigate('/wallet')}
                  className={`w-full py-2.5 rounded text-sm font-semibold transition-opacity hover:opacity-90 ${plan.is_popular ? 'bg-primary text-primary-foreground' : 'bg-surface-elevated border border-border text-foreground hover:border-primary/50'}`}>
                  Subscribe — {price(plan.price_inr, plan.price_usd)}/mo
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ─── Credit Packs ─── */}
        <div>
          <p className="label-caps text-center mb-5">ONE-TIME CREDIT PACKS</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {packs.map(pack => (
              <div key={pack.id} className="bg-surface border border-border rounded-xl p-5 flex flex-col gap-3">
                <div>
                  <p className="font-semibold text-foreground">{pack.name}</p>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="font-mono text-xl font-bold text-foreground">{price(pack.price_inr, pack.price_usd)}</span>
                    <span className="text-xs text-foreground-muted">one-time</span>
                  </div>
                </div>
                <div>
                  <p className="font-mono text-sm text-earn font-semibold">{pack.credits.toLocaleString()} credits</p>
                  {pack.bonus_credits > 0 && (
                    <p className="text-xs text-yellow-400 font-mono">+{pack.bonus_credits} bonus credits</p>
                  )}
                </div>
                <button onClick={handleFree}
                  className="w-full py-2 bg-surface-elevated border border-border rounded text-xs font-semibold text-foreground hover:border-primary/50 transition-colors">
                  Buy Pack
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ─── Free option ─── */}
        <div className="text-center">
          <div className="inline-block bg-surface border border-border rounded-xl p-6 space-y-3 max-w-xs w-full">
            <p className="text-sm font-semibold text-foreground">Continue as Free User</p>
            <p className="text-xs text-foreground-muted">Earn credits by completing tasks. No payment required.</p>
            <ul className="space-y-1.5 text-left">
              {['Earn credits by completing tasks', 'Basic marketplace access', 'Limited daily tasks', '50 welcome bonus credits'].map(f => (
                <li key={f} className="flex items-start gap-2 text-xs text-foreground-muted">
                  <Check className="w-3.5 h-3.5 text-earn mt-0.5 flex-shrink-0" />{f}
                </li>
              ))}
            </ul>
            <button onClick={handleFree}
              className="flex items-center justify-center gap-2 w-full py-2.5 border border-border rounded text-sm font-medium text-foreground hover:border-primary/50 transition-colors">
              Continue Free <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
