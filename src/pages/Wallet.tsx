import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import {
  ArrowUpRight, ArrowDownRight, ShoppingCart, ExternalLink,
  Crown, ArrowRight, Check, Star, Gift, Zap, RefreshCw,
} from 'lucide-react';

type Transaction = Tables<'wallet_transactions'>;
type CreditPack = Tables<'credit_packs'>;
type BillingCycle = 'monthly' | 'yearly';

function engagementEstimate(credits: number) {
  return { comments: Math.round(credits / 12), likes: Math.round(credits / 4) };
}

const PLAN_DISPLAY: Record<string, {
  description: string; benefits: string[]; buttonText: string;
  planKey: { monthly: string; yearly: string };
  monthlyPrice: number; yearlyPrice: number;
}> = {
  free: {
    description: 'Earn engagement by completing tasks.',
    benefits: ['Earn up to ~20 comments per day', '~600 comments/month with activity', '2 campaigns per day', 'Daily login rewards (+5 credits/day)'],
    buttonText: 'Current Plan',
    planKey: { monthly: '', yearly: '' },
    monthlyPrice: 0, yearlyPrice: 0,
  },
  pro: {
    description: 'Get instant engagement without completing tasks.',
    benefits: ['Up to ~160 comments per month', 'Up to ~500 likes per month', '2,000 credits/month included', 'Create up to 10 campaigns/day', 'Faster campaign completion'],
    buttonText: 'Upgrade to Pro',
    planKey: { monthly: 'pro_monthly', yearly: 'pro_yearly' },
    monthlyPrice: 5, yearlyPrice: 50,
  },
  agency: {
    description: 'For creators, marketers, and power users.',
    benefits: ['Up to ~660 comments per month', 'Up to ~2,000 likes per month', '8,000 credits/month included', 'Create up to 50 campaigns/day', 'Priority campaign processing'],
    buttonText: 'Upgrade to Agency',
    planKey: { monthly: 'agency_monthly', yearly: 'agency_yearly' },
    monthlyPrice: 15, yearlyPrice: 150,
  },
};

const getDisplayKey = (name: string) => name.toLowerCase().replace(/\s+/g, '');

export default function Wallet() {
  const { profile, user, refreshProfile, stripeSubscription, checkStripeSubscription } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [paymentNote, setPaymentNote] = useState('');
  const [subPlans, setSubPlans] = useState<{ id: string; name: string; monthly_credits: number; price_usd: number; is_popular: boolean }[]>([]);
  const [creditPacks, setCreditPacks] = useState<CreditPack[]>([]);
  const [billing, setBilling] = useState<BillingCycle>('monthly');
  const [checkingStripe, setCheckingStripe] = useState(false);
  const [paymentSettings, setPaymentSettings] = useState<{ razorpay_enabled: boolean; stripe_enabled: boolean } | null>(null);

  // Fetch payment gateway settings from platform_settings
  useEffect(() => {
    supabase.from('platform_settings').select('key, value').in('key', ['razorpay_enabled', 'stripe_enabled']).then(({ data }) => {
      const map: Record<string, string | null> = {};
      (data ?? []).forEach(r => { map[r.key] = r.value; });
      setPaymentSettings({
        razorpay_enabled: map.razorpay_enabled === 'true',
        stripe_enabled: map.stripe_enabled !== 'false', // default true if not set
      });
    });
  }, []);

  // Check for Stripe success/cancel in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('stripe_success')) {
      setPaymentNote('✓ Subscription activated! Your plan has been upgraded.');
      checkStripeSubscription().then(() => refreshProfile());
      window.history.replaceState({}, '', '/wallet');
    } else if (params.get('stripe_pack_success')) {
      const pack = params.get('pack') ?? 'credit pack';
      setPaymentNote(`✓ ${decodeURIComponent(pack)} purchased! Credits will appear shortly.`);
      window.history.replaceState({}, '', '/wallet');
    } else if (params.get('stripe_cancel')) {
      setPaymentNote('Payment cancelled. You can try again anytime.');
      window.history.replaceState({}, '', '/wallet');
    }
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    Promise.all([
      supabase.from('wallet_transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(100),
      supabase.from('subscription_plans').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('credit_packs').select('*').eq('is_active', true).order('sort_order'),
    ]).then(([txRes, plansRes, packsRes]) => {
      if (txRes.data) setTransactions(txRes.data);
      if (plansRes.data) setSubPlans(plansRes.data.map(p => ({
        id: p.id, name: p.name, monthly_credits: p.monthly_credits,
        price_usd: Number(p.price_usd), is_popular: p.is_popular,
      })));
      if (packsRes.data) setCreditPacks(packsRes.data);
      setLoading(false);
    });
  }, [user?.id]);

  const handleStripeSubscription = async (planKey: string) => {
    setPurchasing(planKey);
    setPaymentNote('');
    try {
      const { data, error } = await supabase.functions.invoke('create-stripe-checkout', {
        body: { plan: planKey },
      });
      if (error || !data?.url) throw new Error(error?.message ?? 'Failed to create checkout session');
      window.location.href = data.url;
    } catch (e) {
      setPaymentNote(`Error: ${e instanceof Error ? e.message : e}`);
      setPurchasing(null);
    }
  };

  const handleStripePackPurchase = async (pack: CreditPack) => {
    setPurchasing(pack.id);
    setPaymentNote('');
    try {
      const { data, error } = await supabase.functions.invoke('create-stripe-checkout', {
        body: { pack_name: pack.name, price_usd: Number(pack.price_usd) },
      });
      if (error || !data?.url) throw new Error(error?.message ?? 'Failed to create checkout session');
      window.location.href = data.url;
    } catch (e) {
      setPaymentNote(`Error: ${e instanceof Error ? e.message : e}`);
      setPurchasing(null);
    }
  };

  // Legacy Razorpay for INR users (kept intact)
  const handleRazorpayPack = async (pack: CreditPack) => {
    if (!user?.id || !profile) return;
    setPurchasing(pack.id);
    setPaymentNote('');
    const totalCredits = pack.credits + pack.bonus_credits;
    const priceInr = Number(pack.price_inr);

    const { data: payment, error } = await supabase.from('payments').insert({
      user_id: user.id, amount: priceInr, currency: 'INR',
      points: totalCredits, status: 'pending', gateway: 'razorpay', package_name: pack.name,
    }).select().single();

    if (error || !payment) { setPaymentNote('Failed to initiate payment.'); setPurchasing(null); return; }

    const scriptLoaded = await new Promise<boolean>(resolve => {
      if ((window as unknown as Record<string, unknown>).Razorpay) { resolve(true); return; }
      const s = document.createElement('script');
      s.src = 'https://checkout.razorpay.com/v1/checkout.js';
      s.onload = () => resolve(true); s.onerror = () => resolve(false);
      document.body.appendChild(s);
    });

    if (!scriptLoaded) { setPaymentNote('Razorpay unavailable.'); setPurchasing(null); return; }

    const { data: orderData, error: orderError } = await supabase.functions.invoke('create-razorpay-order', {
      body: { payment_id: payment.id, amount: priceInr, currency: 'INR' },
    });

    if (orderError || !orderData?.order_id) {
      setPaymentNote('Could not create Razorpay order.'); 
      await supabase.from('payments').update({ status: 'failed' }).eq('id', payment.id);
      setPurchasing(null); return;
    }

    const RazorpayClass = (window as unknown as { Razorpay: new (opts: unknown) => { open: () => void } }).Razorpay;
    const rzp = new RazorpayClass({
      key: orderData.key_id, amount: priceInr * 100, currency: 'INR',
      name: 'EngageExchange', description: `${totalCredits} Credits — ${pack.name}`,
      order_id: orderData.order_id,
      prefill: { email: profile.email, name: profile.name },
      theme: { color: '#3b82f6' },
      handler: async (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
        const { data: verifyData } = await supabase.functions.invoke('verify-razorpay-payment', {
          body: { payment_id: payment.id, razorpay_payment_id: response.razorpay_payment_id, razorpay_order_id: response.razorpay_order_id, razorpay_signature: response.razorpay_signature, points: totalCredits },
        });
        if (verifyData?.success) {
          await refreshProfile();
          const { data } = await supabase.from('wallet_transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(100);
          if (data) setTransactions(data);
          setPaymentNote(`✓ ${totalCredits} credits added!`);
        } else {
          setPaymentNote('Payment verification failed. Contact support.');
        }
        setPurchasing(null);
      },
      modal: { ondismiss: () => setPurchasing(null) },
    });
    rzp.open();
  };

  const handleRefreshSubscription = async () => {
    setCheckingStripe(true);
    await checkStripeSubscription();
    await refreshProfile();
    setCheckingStripe(false);
    setPaymentNote('✓ Subscription status refreshed.');
    setTimeout(() => setPaymentNote(''), 3000);
  };

  const txTypeColor = (t: string) => ['earned', 'bonus', 'referral', 'refunded'].includes(t) ? 'value-earn' : 'value-spend';
  const txTypeSign = (tx: Transaction) => ['earned', 'bonus', 'referral', 'refunded'].includes(tx.transaction_type) ? '+' : '';

  // Determine active plan from Stripe first, then fall back to admin-granted stripe_plan on profile
  const activePlanKey: string | null =
    stripeSubscription.subscribed && stripeSubscription.plan
      ? stripeSubscription.plan
      : profile?.stripe_plan ?? null;

  const currentPlanName = activePlanKey
    ? (activePlanKey.startsWith('agency') ? 'Agency' : 'Pro')
    : 'Free';

  // A plan tier is "active" if the user has it via Stripe OR via admin grant on profile
  const isPlanActive = (tier: string) => {
    if (!activePlanKey) return tier === 'free';
    return activePlanKey.startsWith(tier);
  };

  const hasAnyPaidPlan = !!activePlanKey;

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <h1 className="text-lg font-semibold text-foreground">Wallet</h1>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'BALANCE', value: profile?.points_balance?.toLocaleString() ?? 0, cls: 'value-earn' },
            { label: 'EARNED', value: profile?.points_earned?.toLocaleString() ?? 0, cls: 'value-earn' },
            { label: 'SPENT', value: profile?.points_spent?.toLocaleString() ?? 0, cls: 'value-spend' },
            { label: 'PURCHASED', value: profile?.points_purchased?.toLocaleString() ?? 0, cls: 'data-mono text-foreground' },
          ].map(s => (
            <div key={s.label} className="bg-surface border border-border rounded p-4">
              <p className="label-caps mb-2">{s.label} <span className="normal-case font-sans font-normal text-foreground-dim">credits</span></p>
              <p className={`font-mono text-2xl font-semibold ${s.cls}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Subscription Plans */}
        <div>
          <p className="label-caps mb-3">SUBSCRIPTION PLAN</p>
          <div className="bg-surface border border-border rounded p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-foreground-muted" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Current Plan: {currentPlanName}</p>
                  <p className="text-xs text-foreground-muted mt-0.5">
                    {stripeSubscription.subscribed
                      ? `Active until ${stripeSubscription.subscription_end ? new Date(stripeSubscription.subscription_end).toLocaleDateString() : '—'}`
                      : hasAnyPaidPlan
                        ? `You have access to ${currentPlanName} features.`
                        : 'Upgrade to get monthly credits, higher limits, and priority access.'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {hasAnyPaidPlan && (
                  <span className="flex items-center gap-1 px-2.5 py-1 bg-yellow-400/10 border border-yellow-400/20 rounded text-xs text-yellow-400 font-semibold">
                    Active
                  </span>
                )}
                <button
                  onClick={handleRefreshSubscription}
                  disabled={checkingStripe}
                  title="Refresh subscription status"
                  className="p-1.5 rounded border border-border text-foreground-muted hover:text-foreground hover:border-primary/40 transition-colors disabled:opacity-50">
                  <RefreshCw className={`w-3.5 h-3.5 ${checkingStripe ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Billing toggle */}
            <div className="flex items-center gap-1 bg-background border border-border rounded-full p-1 w-fit mb-4">
              <button
                onClick={() => setBilling('monthly')}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${billing === 'monthly' ? 'bg-primary text-primary-foreground' : 'text-foreground-muted hover:text-foreground'}`}>
                Monthly
              </button>
              <button
                onClick={() => setBilling('yearly')}
                className={`flex items-center gap-1 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${billing === 'yearly' ? 'bg-primary text-primary-foreground' : 'text-foreground-muted hover:text-foreground'}`}>
                Yearly
                <span className={`text-[9px] font-bold px-1 py-0.5 rounded ${billing === 'yearly' ? 'bg-white/20' : 'text-earn'}`}>
                  -17%
                </span>
              </button>
            </div>

            {/* Plan cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Free */}
              <div className={`relative border rounded-lg p-4 flex flex-col gap-3 ${isPlanActive('free') ? 'border-primary/40 bg-primary/5' : 'border-border bg-background'}`}>
                {isPlanActive('free') && (
                  <span className="absolute -top-2.5 left-3 px-2 py-0.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full">CURRENT</span>
                )}
                <div>
                  <p className="text-sm font-semibold text-foreground">Free</p>
                  <p className="font-mono text-xl font-bold text-foreground mt-0.5">$0<span className="text-xs text-foreground-muted font-sans font-normal">/mo</span></p>
                </div>
                <ul className="space-y-1.5 flex-1">
                  {PLAN_DISPLAY.free.benefits.map((b, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-foreground-muted">
                      <Check className="w-3 h-3 text-earn mt-0.5 flex-shrink-0" />{b}
                    </li>
                  ))}
                </ul>
                <button disabled className="w-full py-1.5 rounded text-xs font-semibold border border-border text-foreground-muted cursor-default opacity-60">
                  Free Plan
                </button>
              </div>

              {/* DB plans */}
              {subPlans.map(plan => {
                const key = getDisplayKey(plan.name);
                const display = PLAN_DISPLAY[key];
                if (!display) return null;
                const planKey = display.planKey[billing];
                const price = billing === 'yearly' ? display.yearlyPrice : display.monthlyPrice;
                const perMonth = billing === 'yearly' ? (display.yearlyPrice / 12).toFixed(2) : null;
                const isActive = isPlanActive(key);
                const isCheckingOut = purchasing === planKey;

                return (
                  <div key={plan.id} className={`relative border rounded-lg p-4 flex flex-col gap-3 ${plan.is_popular ? 'border-primary/50 bg-primary/5' : 'border-border bg-background'} ${isActive ? 'ring-1 ring-earn/40' : ''}`}>
                    {plan.is_popular && !isActive && (
                      <span className="absolute -top-2.5 left-3 flex items-center gap-1 px-2 py-0.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full">
                        <Star className="w-2.5 h-2.5 fill-current" /> POPULAR
                      </span>
                    )}
                    {isActive && (
                      <span className="absolute -top-2.5 left-3 px-2 py-0.5 bg-earn text-background text-[10px] font-bold rounded-full">ACTIVE</span>
                    )}
                    <div>
                      <p className="text-sm font-semibold text-foreground">{plan.name}</p>
                      {plan.is_popular && <p className="text-[10px] text-primary font-semibold mt-0.5">Best value for creators</p>}
                      <p className="font-mono text-xl font-bold text-foreground mt-0.5">
                        ${price}<span className="text-xs text-foreground-muted font-sans font-normal">/{billing === 'yearly' ? 'yr' : 'mo'}</span>
                      </p>
                      {perMonth && <p className="text-[10px] text-earn font-mono">${perMonth}/mo · Save 17%</p>}
                      <p className="text-[10px] text-foreground-dim font-mono mt-0.5">{plan.monthly_credits.toLocaleString()} credits/month</p>
                    </div>
                    <ul className="space-y-1.5 flex-1">
                      {display.benefits.map((b, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-xs text-foreground-muted">
                          <Check className="w-3 h-3 text-earn mt-0.5 flex-shrink-0" />{b}
                        </li>
                      ))}
                    </ul>
                    {isActive ? (
                      <button disabled className="w-full py-2 rounded text-xs font-semibold border border-earn/30 text-earn opacity-80 cursor-default">
                        ✓ Your Current Plan
                      </button>
                    ) : (
                      <button
                        onClick={() => handleStripeSubscription(planKey)}
                        disabled={!!isCheckingOut}
                        className={`w-full flex items-center justify-center gap-1.5 py-2 rounded text-xs font-semibold transition-opacity hover:opacity-90 disabled:opacity-60 ${plan.is_popular ? 'bg-primary text-primary-foreground' : 'border border-border text-foreground hover:border-primary/50'}`}>
                        {isCheckingOut ? 'Redirecting...' : <>{display.buttonText} <ArrowRight className="w-3 h-3" /></>}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {billing === 'yearly' && (
              <p className="text-xs text-earn font-semibold mt-3">✓ Save 17% with yearly billing</p>
            )}

            {paymentNote && (
              <div className={`flex items-center gap-2 p-3 mt-4 rounded border text-sm ${paymentNote.startsWith('✓') ? 'bg-earn-dim border-earn/20 text-earn' : 'bg-spend-dim border-spend/20 text-spend'}`}>
                {paymentNote}
              </div>
            )}
          </div>
        </div>

        {/* Credit Packs */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="label-caps">CREDIT PACKS</p>
            <span className="label-caps text-foreground-dim">ONE-TIME PURCHASE</span>
          </div>
          <p className="text-xs text-foreground-muted mb-3">Purchase additional credits to instantly boost your engagement campaigns.</p>
          {creditPacks.length === 0 ? (
            <div className="bg-surface border border-border rounded p-6 text-center">
              <p className="text-sm text-foreground-muted">No credit packs available yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {creditPacks.map(pack => {
                const totalCredits = pack.credits + pack.bonus_credits;
                const est = engagementEstimate(totalCredits);
                const priceUSD = Number(pack.price_usd);
                const isCheckingOut = purchasing === pack.id;
                return (
                  <div key={pack.id} className="bg-surface border border-border rounded p-5 flex flex-col gap-3">
                    <div>
                      <p className="label-caps mb-1">{pack.name.toUpperCase()}</p>
                      <p className="font-mono text-3xl font-bold value-earn">{totalCredits.toLocaleString()}</p>
                      <p className="label-caps text-foreground-dim mt-0.5">CREDITS</p>
                      {pack.bonus_credits > 0 && (
                        <p className="text-[10px] text-earn font-mono mt-1">+{pack.bonus_credits} bonus credits included</p>
                      )}
                    </div>
                    <div className="bg-earn-dim border border-earn/15 rounded p-2.5 space-y-1">
                      <p className="label-caps text-earn text-[10px]">APPROX. ENGAGEMENT</p>
                      <p className="text-xs text-foreground-muted font-mono">~{est.comments} comments</p>
                      <p className="text-xs text-foreground-muted font-mono">~{est.likes} likes</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-lg font-semibold text-foreground">${priceUSD.toFixed(2)}</span>
                    </div>
                    {/* Stripe (USD) — shown when stripe_enabled or settings not yet loaded */}
                    {paymentSettings === null ? (
                      <div className="w-full h-10 rounded bg-surface-elevated animate-pulse" />
                    ) : paymentSettings.stripe_enabled && (
                      <button
                        onClick={() => handleStripePackPurchase(pack)}
                        disabled={isCheckingOut}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground rounded text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
                        <ShoppingCart className="w-4 h-4" />
                        {isCheckingOut ? 'Opening checkout...' : 'Buy with Card (USD)'}
                      </button>
                    )}
                    {/* Razorpay (INR) — only shown when razorpay_enabled = true in Admin */}
                    {paymentSettings?.razorpay_enabled && Number(pack.price_inr) > 0 && (
                      <button
                        onClick={() => handleRazorpayPack(pack)}
                        disabled={isCheckingOut}
                        className="w-full flex items-center justify-center gap-2 py-2 bg-surface-elevated border border-border rounded text-xs font-semibold text-foreground-muted hover:text-foreground hover:border-primary/40 transition-colors disabled:opacity-50">
                        Pay with Razorpay (INR)
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <div className="flex items-center gap-3 mt-3">
            <p className="text-xs text-foreground-dim flex items-center gap-1">
              <ExternalLink className="w-3 h-3" />
              Card payments powered by Stripe · INR payments via Razorpay
            </p>
            <span className="text-xs text-foreground-dim">•</span>
            <p className="text-xs text-foreground-dim flex items-center gap-1">
              <Gift className="w-3 h-3 text-earn" />
              Daily login: +5 credits
            </p>
          </div>
        </div>

        {/* Transaction History */}
        <div>
          <p className="label-caps mb-3">TRANSACTION HISTORY</p>
          <div className="bg-surface border border-border rounded overflow-hidden">
            <div className="grid grid-cols-[1fr_120px_100px_80px] px-5 py-2.5 bg-surface-elevated border-b border-border">
              {['DESCRIPTION', 'DATE', 'TYPE', 'AMOUNT'].map(h => <span key={h} className="label-caps">{h}</span>)}
            </div>
            {loading ? (
              <div className="p-6 text-center"><p className="label-caps animate-pulse">LOADING...</p></div>
            ) : transactions.length === 0 ? (
              <div className="p-6 text-center"><p className="text-sm text-foreground-muted">No transactions yet.</p></div>
            ) : transactions.map(tx => (
              <div key={tx.id} className="grid grid-cols-[1fr_120px_100px_80px] px-5 py-3 border-b border-border-subtle last:border-0 hover:bg-surface-elevated transition-colors">
                <span className="text-xs text-foreground truncate">{tx.description ?? '—'}</span>
                <span className="font-mono text-xs text-foreground-muted">{new Date(tx.created_at).toLocaleDateString()}</span>
                <span className="label-caps">{tx.transaction_type.toUpperCase()}</span>
                <div className="flex items-center gap-1">
                  {tx.points > 0 ? <ArrowUpRight className="w-3 h-3 text-earn" /> : <ArrowDownRight className="w-3 h-3 text-spend" />}
                  <span className={`font-mono text-xs font-semibold ${txTypeColor(tx.transaction_type)}`}>{txTypeSign(tx)}{tx.points}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-start gap-1.5 mt-3 p-3 bg-earn-dim border border-earn/20 rounded">
            <Zap className="w-3.5 h-3.5 text-earn mt-0.5 flex-shrink-0" />
            <p className="text-xs text-earn">
              Daily login rewards, signup bonuses, and early adopter bonuses all appear here automatically.
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
