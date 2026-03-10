import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Copy, Check, Users, TrendingUp, DollarSign } from 'lucide-react';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export default function Referrals() {
  const { profile, user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [referrals, setReferrals] = useState<{ referred_id: string; created_at: string }[]>([]);
  const [commissions, setCommissions] = useState<{ amount: number; status: string; locked_until: string }[]>([]);
  const [payoutForm, setPayoutForm] = useState({ method: 'upi', account: '', amount: '' });
  const [payoutError, setPayoutError] = useState('');
  const [payoutSuccess, setPayoutSuccess] = useState(false);

  const referralLink = `${window.location.origin}/auth?mode=signup&ref=${profile?.referral_code ?? ''}`;

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    if (!user?.id) return;
    db.from('referrals').select('referred_id, created_at').eq('referrer_id', user.id).then(({ data }: { data: typeof referrals }) => { if (data) setReferrals(data); });
    db.from('referral_commissions').select('amount, status, locked_until').eq('referrer_id', user.id).then(({ data }: { data: typeof commissions }) => { if (data) setCommissions(data); });
  }, [user?.id]);

  const totalCommissions = commissions.reduce((s, c) => s + c.amount, 0);
  const withdrawable = commissions.filter(c => c.status === 'unlocked' || new Date(c.locked_until) < new Date()).reduce((s, c) => s + c.amount, 0);
  const pending = commissions.filter(c => c.status === 'pending' && new Date(c.locked_until) >= new Date()).reduce((s, c) => s + c.amount, 0);

  const handlePayout = async (e: React.FormEvent) => {
    e.preventDefault();
    setPayoutError('');
    if (!user?.id) return;
    const amount = parseFloat(payoutForm.amount);
    if (amount < 500) { setPayoutError('Minimum withdrawal is ₹500'); return; }
    if (amount > withdrawable) { setPayoutError('Insufficient withdrawable balance'); return; }
    const { error } = await db.from('payout_requests').insert({
      user_id: user.id, amount, method: payoutForm.method,
      account_details: { account: payoutForm.account },
    });
    if (error) { setPayoutError(error.message); return; }
    setPayoutSuccess(true);
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-2xl">
        <h1 className="text-lg font-semibold text-foreground">Referral Program</h1>
        <div className="bg-surface border border-border rounded p-5">
          <p className="label-caps mb-3">YOUR REFERRAL LINK</p>
          <div className="flex gap-2">
            <div className="flex-1 bg-background border border-border rounded px-3 py-2.5 font-mono text-xs text-foreground-muted truncate">{referralLink}</div>
            <button onClick={copyLink} className="flex items-center gap-1.5 px-3 py-2.5 bg-primary text-primary-foreground rounded text-xs font-semibold hover:opacity-90 transition-opacity">
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}{copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="bg-earn-dim border border-earn/20 rounded p-3 text-center">
              <p className="font-mono text-lg font-bold value-earn">+100</p><p className="label-caps mt-1">YOU EARN / SIGNUP</p>
            </div>
            <div className="bg-earn-dim border border-earn/20 rounded p-3 text-center">
              <p className="font-mono text-lg font-bold value-earn">+50</p><p className="label-caps mt-1">FRIEND EARNS</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Users, label: 'TOTAL REFERRALS', value: referrals.length },
            { icon: DollarSign, label: 'TOTAL COMMISSIONS', value: `₹${totalCommissions.toFixed(2)}` },
            { icon: TrendingUp, label: 'WITHDRAWABLE', value: `₹${withdrawable.toFixed(2)}` },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-surface border border-border rounded p-4">
              <div className="flex items-center gap-2 mb-2"><Icon className="w-3.5 h-3.5 text-foreground-dim" /><p className="label-caps">{label}</p></div>
              <p className="font-mono text-xl font-semibold text-foreground">{value}</p>
            </div>
          ))}
        </div>

        {pending > 0 && (
          <div className="bg-yellow-400/5 border border-yellow-400/20 rounded p-4">
            <p className="label-caps text-yellow-400 mb-1">PENDING COMMISSIONS</p>
            <p className="font-mono text-lg font-semibold text-yellow-400">₹{pending.toFixed(2)}</p>
            <p className="text-xs text-foreground-dim mt-1">Commissions lock for 7 days after purchase</p>
          </div>
        )}

        <div className="bg-surface border border-border rounded p-5">
          <p className="label-caps mb-4">REQUEST WITHDRAWAL</p>
          {payoutSuccess ? (
            <div className="text-center py-4"><p className="font-mono text-sm value-earn">Payout request submitted.</p><p className="text-xs text-foreground-muted mt-1">Admin will process within 3–5 business days.</p></div>
          ) : (
            <form onSubmit={handlePayout} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label-caps block mb-1.5">METHOD</label>
                  <select value={payoutForm.method} onChange={e => setPayoutForm(f => ({ ...f, method: e.target.value }))} className="w-full bg-background border border-border rounded px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/60 font-mono">
                    <option value="upi">UPI</option><option value="paypal">PayPal</option>
                  </select></div>
                <div><label className="label-caps block mb-1.5">AMOUNT (₹)</label>
                  <input type="number" min={500} value={payoutForm.amount} onChange={e => setPayoutForm(f => ({ ...f, amount: e.target.value }))} placeholder="500" className="w-full bg-background border border-border rounded px-3 py-2.5 text-sm text-foreground placeholder:text-foreground-dim focus:outline-none focus:border-primary/60 font-mono" /></div>
              </div>
              <div><label className="label-caps block mb-1.5">{payoutForm.method === 'upi' ? 'UPI ID' : 'PAYPAL EMAIL'}</label>
                <input type="text" value={payoutForm.account} onChange={e => setPayoutForm(f => ({ ...f, account: e.target.value }))} required placeholder={payoutForm.method === 'upi' ? 'user@upi' : 'user@email.com'} className="w-full bg-background border border-border rounded px-3 py-2.5 text-sm text-foreground placeholder:text-foreground-dim focus:outline-none focus:border-primary/60 font-mono" /></div>
              {payoutError && <p className="text-xs text-spend">{payoutError}</p>}
              <p className="text-xs text-foreground-dim">Minimum ₹500 · Withdrawable: <span className="text-foreground font-mono">₹{withdrawable.toFixed(2)}</span></p>
              <button type="submit" className="w-full py-2.5 bg-primary text-primary-foreground rounded text-sm font-semibold hover:opacity-90 transition-opacity">Submit Withdrawal Request</button>
            </form>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
