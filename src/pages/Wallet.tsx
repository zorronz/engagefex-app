import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { ArrowUpRight, ArrowDownRight, ShoppingCart, ExternalLink, Crown, ArrowRight, Check, Star } from 'lucide-react';
import { Link } from 'react-router-dom';

type Transaction = Tables<'wallet_transactions'>;
type CreditPack = Tables<'credit_packs'>;

/** Engagement approximations per credit:
 * ~1 comment per 12 credits (comment task costs 12 pts)
 * ~1 like per 4 credits (like task costs 4 pts)
 */
function engagementEstimate(credits: number) {
  const comments = Math.round(credits / 12);
  const likes = Math.round(credits / 4);
  return { comments, likes };
}

// Static engagement display data for subscription plans (keyed by lowercase name)
const PLAN_DISPLAY: Record<string, {
  description: string;
  benefits: string[];
  buttonText: string;
}> = {
  free: {
    description: 'Earn engagement by completing tasks.',
    benefits: [
      'Earn up to ~20 comments per day',
      '~600 comments per month with consistent activity',
      '2 campaigns per day',
      'Daily login rewards',
    ],
    buttonText: 'Current Plan',
  },
  pro: {
    description: 'Get instant engagement without completing tasks.',
    benefits: [
      'Up to ~160 comments per month',
      'Up to ~500 likes per month',
      '2,000 credits automatically added monthly',
      'Create up to 10 campaigns per day',
      'Faster campaign completion',
    ],
    buttonText: 'Upgrade to Pro',
  },
  agency: {
    description: 'For creators, marketers, and power users.',
    benefits: [
      'Up to ~660 comments per month',
      'Up to ~2,000 likes per month',
      '8,000 credits automatically added monthly',
      'Create up to 50 campaigns per day',
      'Priority campaign processing',
    ],
    buttonText: 'Upgrade to Agency',
  },
};

const getDisplayKey = (name: string) => name.toLowerCase().replace(/\s+/g, '');

export default function Wallet() {
  const { profile, user, refreshProfile } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [paymentNote, setPaymentNote] = useState('');
  const [subPlans, setSubPlans] = useState<{ id: string; name: string; monthly_credits: number; price_usd: number; is_popular: boolean }[]>([]);
  const [creditPacks, setCreditPacks] = useState<CreditPack[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    Promise.all([
      supabase.from('wallet_transactions').select('*').eq('user_id', user.id)
        .order('created_at', { ascending: false }).limit(50),
      supabase.from('subscription_plans').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('credit_packs').select('*').eq('is_active', true).order('sort_order'),
    ]).then(([txRes, plansRes, packsRes]) => {
      if (txRes.data) setTransactions(txRes.data);
      if (plansRes.data) setSubPlans(plansRes.data.map(p => ({
        id: p.id,
        name: p.name,
        monthly_credits: p.monthly_credits,
        price_usd: Number(p.price_usd),
        is_popular: p.is_popular,
      })));
      if (packsRes.data) setCreditPacks(packsRes.data);
      setLoading(false);
    });
  }, [user?.id]);

  const handlePurchasePack = async (pack: CreditPack) => {
    if (!user?.id || !profile) return;
    setPurchasing(pack.id);
    setPaymentNote('');

    const totalCredits = pack.credits + pack.bonus_credits;
    const priceInr = Number(pack.price_inr);

    const { data: payment, error } = await supabase.from('payments').insert({
      user_id: user.id,
      amount: priceInr,
      currency: 'INR',
      points: totalCredits,
      status: 'pending',
      gateway: 'razorpay',
      package_name: pack.name,
    }).select().single();

    if (error || !payment) {
      setPaymentNote('Failed to initiate payment. Please try again.');
      setPurchasing(null);
      return;
    }

    const scriptLoaded = await new Promise<boolean>(resolve => {
      if ((window as unknown as Record<string, unknown>).Razorpay) { resolve(true); return; }
      const s = document.createElement('script');
      s.src = 'https://checkout.razorpay.com/v1/checkout.js';
      s.onload = () => resolve(true);
      s.onerror = () => resolve(false);
      document.body.appendChild(s);
    });

    if (!scriptLoaded) {
      setPaymentNote('Razorpay is not available. Please connect your Razorpay account in settings.');
      setPurchasing(null);
      return;
    }

    const { data: orderData, error: orderError } = await supabase.functions.invoke('create-razorpay-order', {
      body: { payment_id: payment.id, amount: priceInr, currency: 'INR' },
    });

    if (orderError || !orderData?.order_id) {
      setPaymentNote('Could not create payment order. Please ensure Razorpay is configured.');
      await supabase.from('payments').update({ status: 'failed' }).eq('id', payment.id);
      setPurchasing(null);
      return;
    }

    const RazorpayClass = (window as unknown as { Razorpay: new (opts: unknown) => { open: () => void } }).Razorpay;
    const rzp = new RazorpayClass({
      key: orderData.key_id,
      amount: priceInr * 100,
      currency: 'INR',
      name: 'EngageExchange',
      description: `${totalCredits} Credits — ${pack.name}`,
      order_id: orderData.order_id,
      prefill: { email: profile.email, name: profile.name },
      theme: { color: '#3b82f6' },
      handler: async (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
        const { data: verifyData } = await supabase.functions.invoke('verify-razorpay-payment', {
          body: {
            payment_id: payment.id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_signature: response.razorpay_signature,
            points: totalCredits,
          },
        });
        if (verifyData?.success) {
          await refreshProfile();
          const { data } = await supabase.from('wallet_transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50);
          if (data) setTransactions(data);
          setPaymentNote(`✓ ${totalCredits} credits added to your balance!`);
        } else {
          setPaymentNote('Payment verification failed. Contact support if credits were deducted.');
        }
        setPurchasing(null);
      },
      modal: { ondismiss: () => setPurchasing(null) },
    });
    rzp.open();
  };

  const txTypeColor = (t: string) => ['earned', 'bonus', 'referral', 'refunded'].includes(t) ? 'value-earn' : 'value-spend';
  const txTypeSign = (tx: Transaction) => ['earned', 'bonus', 'referral', 'refunded'].includes(tx.transaction_type) ? '+' : '';

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

        {/* ── Subscription Plans ── */}
        <div>
          <p className="label-caps mb-3">SUBSCRIPTION PLAN</p>
          <div className="bg-surface border border-border rounded p-5">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-foreground-muted" />
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Current Plan: {profile?.is_premium ? 'Premium' : 'Free'}
                  </p>
                  <p className="text-xs text-foreground-muted mt-0.5">
                    {profile?.is_premium
                      ? 'You have access to premium features and priority support.'
                      : 'Upgrade to get monthly credits, higher limits, and priority access.'}
                  </p>
                </div>
              </div>
              {profile?.is_premium && (
                <span className="flex items-center gap-1 px-2.5 py-1 bg-yellow-400/10 border border-yellow-400/20 rounded text-xs text-yellow-400 font-semibold">
                  Active
                </span>
              )}
            </div>

            {/* Plan cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Free plan card */}
              <div className={`relative border rounded-lg p-4 flex flex-col gap-3 ${!profile?.is_premium ? 'border-primary/40 bg-primary/5' : 'border-border bg-background'}`}>
                {!profile?.is_premium && (
                  <span className="absolute -top-2.5 left-3 px-2 py-0.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full">CURRENT</span>
                )}
                <div>
                  <p className="text-sm font-semibold text-foreground">Free</p>
                  <p className="font-mono text-xl font-bold text-foreground mt-0.5">
                    $0<span className="text-xs text-foreground-muted font-sans font-normal">/mo</span>
                  </p>
                </div>
                <ul className="space-y-1.5 flex-1">
                  {PLAN_DISPLAY.free.benefits.map((b, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-foreground-muted">
                      <Check className="w-3 h-3 text-earn mt-0.5 flex-shrink-0" />
                      {b}
                    </li>
                  ))}
                </ul>
                <button disabled className="w-full py-1.5 rounded text-xs font-semibold border border-border text-foreground-muted cursor-default opacity-60">
                  Free Plan
                </button>
              </div>

              {/* DB subscription plans */}
              {subPlans.map(plan => {
                const key = getDisplayKey(plan.name);
                const display = PLAN_DISPLAY[key];
                if (!display) return null;
                return (
                  <div key={plan.id} className={`relative border rounded-lg p-4 flex flex-col gap-3 ${plan.is_popular ? 'border-primary/50 bg-primary/5' : 'border-border bg-background'}`}>
                    {plan.is_popular && (
                      <span className="absolute -top-2.5 left-3 flex items-center gap-1 px-2 py-0.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full">
                        <Star className="w-2.5 h-2.5 fill-current" /> POPULAR
                      </span>
                    )}
                    <div>
                      <p className="text-sm font-semibold text-foreground">{plan.name}</p>
                      {plan.is_popular && (
                        <p className="text-[10px] text-primary font-semibold mt-0.5">Best value for creators</p>
                      )}
                      <p className="font-mono text-xl font-bold text-foreground mt-0.5">
                        ${plan.price_usd}<span className="text-xs text-foreground-muted font-sans font-normal">/mo</span>
                      </p>
                      <p className="text-[10px] text-foreground-dim font-mono mt-0.5">{plan.monthly_credits.toLocaleString()} credits/month</p>
                    </div>
                    <ul className="space-y-1.5 flex-1">
                      {display.benefits.map((b, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-xs text-foreground-muted">
                          <Check className="w-3 h-3 text-earn mt-0.5 flex-shrink-0" />
                          {b}
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={() => setPaymentNote('Subscription checkout coming soon. Please configure your payment gateway in Admin Settings.')}
                      className={`w-full flex items-center justify-center gap-1.5 py-2 rounded text-xs font-semibold transition-opacity hover:opacity-90 ${plan.is_popular ? 'bg-primary text-primary-foreground shadow-cta' : 'border border-border text-foreground hover:border-primary/50'}`}
                    >
                      {display.buttonText} <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>

            {paymentNote && (
              <div className={`flex items-center gap-2 p-3 mt-4 rounded border text-sm ${paymentNote.startsWith('✓') ? 'bg-earn-dim border-earn/20 text-earn' : 'bg-spend-dim border-spend/20 text-spend'}`}>
                {paymentNote}
              </div>
            )}
          </div>
        </div>

        {/* ── Credit Packs ── */}
        <div>
          <p className="label-caps mb-1">CREDIT PACKS</p>
          <p className="text-xs text-foreground-muted mb-3">Purchase additional credits to instantly boost your engagement campaigns.</p>
          {creditPacks.length === 0 ? (
            <div className="bg-surface border border-border rounded p-6 text-center">
              <p className="text-sm text-foreground-muted">No credit packs available yet.</p>
              <p className="text-xs text-foreground-dim mt-1">Check back soon or contact support.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {creditPacks.map(pack => {
                const totalCredits = pack.credits + pack.bonus_credits;
                const est = engagementEstimate(totalCredits);
                const priceUSD = Number(pack.price_usd);
                return (
                  <div key={pack.id} className="bg-surface border border-border rounded p-5 relative flex flex-col gap-3">
                    <div>
                      <p className="label-caps mb-1">{pack.name.toUpperCase()}</p>
                      <p className="font-mono text-3xl font-bold value-earn">{totalCredits.toLocaleString()}</p>
                      <p className="label-caps text-foreground-dim mt-0.5">CREDITS</p>
                      {pack.bonus_credits > 0 && (
                        <p className="text-[10px] text-earn font-mono mt-1">+{pack.bonus_credits} bonus credits included</p>
                      )}
                    </div>
                    {/* Engagement approximations */}
                    <div className="bg-earn-dim border border-earn/15 rounded p-2.5 space-y-1">
                      <p className="label-caps text-earn text-[10px]">APPROX. ENGAGEMENT</p>
                      <p className="text-xs text-foreground-muted font-mono">~{est.comments} comments</p>
                      <p className="text-xs text-foreground-muted font-mono">~{est.likes} likes</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-lg font-semibold text-foreground">${priceUSD.toFixed(2)}</span>
                    </div>
                    <button onClick={() => handlePurchasePack(pack)} disabled={purchasing === pack.id}
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground rounded text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 shadow-cta">
                      <ShoppingCart className="w-4 h-4" />
                      {purchasing === pack.id ? 'Opening checkout...' : 'Buy Now'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          <p className="text-xs text-foreground-dim mt-3 flex items-center gap-1">
            <ExternalLink className="w-3 h-3" />
            Payments powered by Razorpay. Connect your Razorpay key in Admin → Settings to enable purchases.
          </p>
        </div>

        {/* Transaction history */}
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
        </div>
      </div>
    </DashboardLayout>
  );
}
