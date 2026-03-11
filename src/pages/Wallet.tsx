import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { ArrowUpRight, ArrowDownRight, ShoppingCart, ExternalLink, Crown, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

type Transaction = Tables<'wallet_transactions'>;

interface SubPlan {
  id: string;
  name: string;
  monthly_credits: number;
  price_inr: number;
  price_usd: number;
  features: string[];
  is_popular: boolean;
}

const PACKAGES = [
  { name: 'Starter', points: 500, price: 499, currency: '₹', priceUSD: 5.99 },
  { name: 'Growth', points: 1500, price: 999, currency: '₹', priceUSD: 11.99, popular: true },
  { name: 'Pro', points: 5000, price: 2999, currency: '₹', priceUSD: 35.99 },
];

// Simple currency detector
const useINR = () => new Date().getTimezoneOffset() === -330;

export default function Wallet() {
  const { profile, user, refreshProfile } = useAuth();
  const isINR = useINR();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [paymentNote, setPaymentNote] = useState('');
  const [subPlans, setSubPlans] = useState<SubPlan[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    Promise.all([
      supabase.from('wallet_transactions').select('*').eq('user_id', user.id)
        .order('created_at', { ascending: false }).limit(50),
      supabase.from('subscription_plans').select('*').eq('is_active', true).order('sort_order'),
    ]).then(([txRes, plansRes]) => {
      if (txRes.data) setTransactions(txRes.data);
      if (plansRes.data) setSubPlans(plansRes.data.map(p => ({
        ...p,
        price_inr: Number(p.price_inr),
        price_usd: Number(p.price_usd),
        features: Array.isArray(p.features) ? p.features as string[] : [],
      })));
      setLoading(false);
    });
  }, [user?.id]);

  const handlePurchase = async (pkg: typeof PACKAGES[0]) => {
    if (!user?.id || !profile) return;
    setPurchasing(pkg.name);
    setPaymentNote('');

    const { data: payment, error } = await supabase.from('payments').insert({
      user_id: user.id,
      amount: pkg.price,
      currency: 'INR',
      points: pkg.points,
      status: 'pending',
      gateway: 'razorpay',
      package_name: pkg.name,
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
      body: { payment_id: payment.id, amount: pkg.price, currency: 'INR' },
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
      amount: pkg.price * 100,
      currency: 'INR',
      name: 'EngageExchange',
      description: `${pkg.points} Points — ${pkg.name} Package`,
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
            points: pkg.points,
          },
        });
        if (verifyData?.success) {
          await refreshProfile();
          const { data } = await supabase.from('wallet_transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50);
          if (data) setTransactions(data);
          setPaymentNote(`✓ ${pkg.points} points added to your balance!`);
        } else {
          setPaymentNote('Payment verification failed. Contact support if points were deducted.');
        }
        setPurchasing(null);
      },
      modal: { ondismiss: () => setPurchasing(null) },
    });
    rzp.open();
  };

  const price = (inr: number, usd: number) => isINR ? `₹${inr}` : `$${usd}`;

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
              <p className="label-caps mb-2">{s.label}</p>
              <p className={`font-mono text-2xl font-semibold ${s.cls}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* ── Subscription Section ── */}
        <div>
          <p className="label-caps mb-3">SUBSCRIPTION</p>
          <div className="bg-surface border border-border rounded p-5">
            <div className="flex items-center justify-between mb-4">
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

            {!profile?.is_premium && subPlans.length > 0 && (
              <div className="space-y-3">
                <p className="label-caps">UPGRADE TO MONTHLY PLAN</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {subPlans.map(plan => (
                    <div key={plan.id} className={`relative border rounded-lg p-4 flex flex-col gap-3 ${plan.is_popular ? 'border-primary/50 bg-primary/5' : 'border-border bg-background'}`}>
                      {plan.is_popular && (
                        <span className="absolute -top-2.5 left-3 px-2 py-0.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full">POPULAR</span>
                      )}
                      <div>
                        <p className="text-sm font-semibold text-foreground">{plan.name}</p>
                        <p className="font-mono text-xl font-bold text-foreground mt-0.5">
                          {price(plan.price_inr, plan.price_usd)}<span className="text-xs text-foreground-muted font-sans font-normal">/mo</span>
                        </p>
                        <p className="text-xs value-earn font-mono mt-0.5">{plan.monthly_credits.toLocaleString()} credits/mo</p>
                      </div>
                      <button
                        onClick={() => setPaymentNote('Subscription checkout coming soon. Please configure your payment gateway in Admin Settings.')}
                        className={`w-full flex items-center justify-center gap-1.5 py-2 rounded text-xs font-semibold transition-opacity hover:opacity-90 ${plan.is_popular ? 'bg-primary text-primary-foreground shadow-cta' : 'border border-border text-foreground hover:border-primary/50'}`}
                      >
                        Subscribe <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!profile?.is_premium && subPlans.length === 0 && (
              <div className="text-center py-4">
                <p className="text-sm text-foreground-muted mb-3">No subscription plans configured yet.</p>
                <Link to="/choose-plan" className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded text-sm font-semibold hover:opacity-90 transition-opacity">
                  View Plans <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}

            {paymentNote && (
              <div className={`flex items-center gap-2 p-3 mt-3 rounded border text-sm ${paymentNote.startsWith('✓') ? 'bg-earn-dim border-earn/20 text-earn' : 'bg-spend-dim border-spend/20 text-spend'}`}>
                {paymentNote}
              </div>
            )}
          </div>
        </div>

        {/* Purchase packages */}
        <div>
          <p className="label-caps mb-3">PURCHASE POINTS</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {PACKAGES.map(pkg => (
              <div key={pkg.name} className={`bg-surface border rounded p-5 relative ${pkg.popular ? 'border-primary/50 shadow-cta' : 'border-border'}`}>
                {pkg.popular && <span className="absolute -top-2 left-4 px-2 py-0.5 bg-primary text-primary-foreground text-xs font-mono rounded">POPULAR</span>}
                <p className="label-caps mb-1">{pkg.name.toUpperCase()}</p>
                <p className="font-mono text-3xl font-bold value-earn mb-0.5">{pkg.points.toLocaleString()}</p>
                <p className="label-caps text-foreground-dim mb-4">POINTS</p>
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono text-lg font-semibold text-foreground">{pkg.currency}{pkg.price.toLocaleString()}</span>
                  <span className="label-caps text-foreground-dim">{(pkg.price / pkg.points * 100).toFixed(1)}P/PT</span>
                </div>
                <button onClick={() => handlePurchase(pkg)} disabled={purchasing === pkg.name}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground rounded text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 shadow-cta">
                  <ShoppingCart className="w-4 h-4" />
                  {purchasing === pkg.name ? 'Opening checkout...' : 'Buy Now'}
                </button>
              </div>
            ))}
          </div>
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
