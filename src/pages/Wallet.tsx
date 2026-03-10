import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Database } from '@/lib/database.types';
import { ArrowUpRight, ArrowDownRight, ShoppingCart } from 'lucide-react';

type Transaction = Database['public']['Tables']['wallet_transactions']['Row'];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const PACKAGES = [
  { name: 'Starter', points: 500, price: 499, currency: '₹' },
  { name: 'Growth', points: 1500, price: 999, currency: '₹', popular: true },
  { name: 'Pro', points: 5000, price: 2999, currency: '₹' },
];

export default function Wallet() {
  const { profile, user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    db.from('wallet_transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50)
      .then(({ data }: { data: Transaction[] }) => { if (data) setTransactions(data); setLoading(false); });
  }, [user?.id]);

  const handlePurchase = async (pkg: typeof PACKAGES[0]) => {
    if (!user?.id || !profile) return;
    setPurchasing(pkg.name);
    const { error } = await db.from('payments').insert({
      user_id: user.id, amount: pkg.price, currency: 'INR', points: pkg.points,
      status: 'pending', gateway: 'manual', package_name: pkg.name,
    });
    if (!error) alert(`Payment flow for ${pkg.name} (${pkg.currency}${pkg.price}) initiated. Connect Razorpay/Stripe to complete.`);
    setPurchasing(null);
  };

  const txTypeColor = (t: string) => ['earned', 'bonus', 'referral', 'refunded'].includes(t) ? 'value-earn' : 'value-spend';
  const txTypeSign = (t: Transaction) => ['earned', 'bonus', 'referral', 'refunded'].includes(t.transaction_type) ? '+' : '';

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <h1 className="text-lg font-semibold text-foreground">Wallet</h1>
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
                  <ShoppingCart className="w-4 h-4" />{purchasing === pkg.name ? 'Processing...' : 'Purchase'}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="label-caps mb-3">TRANSACTION HISTORY</p>
          <div className="bg-surface border border-border rounded overflow-hidden">
            <div className="grid grid-cols-[1fr_120px_100px_80px] px-5 py-2.5 bg-surface-elevated border-b border-border">
              {['DESCRIPTION', 'DATE', 'TYPE', 'AMOUNT'].map(h => <span key={h} className="label-caps">{h}</span>)}
            </div>
            {loading ? <div className="p-6 text-center"><p className="label-caps animate-pulse">LOADING...</p></div>
              : transactions.length === 0 ? <div className="p-6 text-center"><p className="text-sm text-foreground-muted">No transactions yet.</p></div>
              : transactions.map(tx => (
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
