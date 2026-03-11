import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Copy, Check, Users, TrendingUp, Clock, Gift, Star, AlertCircle } from 'lucide-react';

type Referral = {
  referred_id: string;
  created_at: string;
  first_task_completed: boolean;
  first_task_reward_paid: boolean;
  signup_reward_paid: boolean;
};

type Commission = {
  id: string;
  amount: number;
  status: string;
  locked_until: string;
  created_at: string;
};

export default function Referrals() {
  const { profile, user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [payoutForm, setPayoutForm] = useState({ method: 'upi', account: '', amount: '' });
  const [payoutError, setPayoutError] = useState('');
  const [payoutSuccess, setPayoutSuccess] = useState(false);

  const referralLink = `${window.location.origin}/ref/${profile?.referral_code ?? ''}`;

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('referrals')
      .select('referred_id, created_at, first_task_completed, first_task_reward_paid, signup_reward_paid')
      .eq('referrer_id', user.id)
      .then(({ data }) => { if (data) setReferrals(data as Referral[]); });

    supabase
      .from('referral_commissions')
      .select('id, amount, status, locked_until, created_at')
      .eq('referrer_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setCommissions(data as Commission[]); });
  }, [user?.id]);

  // Derived stats
  const totalReferrals = referrals.length;
  const successfulReferrals = referrals.filter(r => r.first_task_completed).length;
  const pendingReferrals = referrals.filter(r => !r.first_task_completed).length;

  // Points earned from referral wallet transactions
  const [referralPoints, setReferralPoints] = useState(0);
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('wallet_transactions')
      .select('points')
      .eq('user_id', user.id)
      .eq('transaction_type', 'referral')
      .then(({ data }) => {
        if (data) setReferralPoints(data.reduce((s, t) => s + (t.points ?? 0), 0));
      });
  }, [user?.id]);

  const totalCommissions = commissions.reduce((s, c) => s + c.amount, 0);
  const withdrawable = commissions
    .filter(c => c.status === 'unlocked' || new Date(c.locked_until) < new Date())
    .reduce((s, c) => s + c.amount, 0);
  const pending = commissions
    .filter(c => c.status === 'pending' && new Date(c.locked_until) >= new Date())
    .reduce((s, c) => s + c.amount, 0);

  const handlePayout = async (e: React.FormEvent) => {
    e.preventDefault();
    setPayoutError('');
    if (!user?.id) return;
    const amount = parseFloat(payoutForm.amount);
    if (amount < 500) { setPayoutError('Minimum withdrawal is ₹500'); return; }
    if (amount > withdrawable) { setPayoutError('Insufficient withdrawable balance'); return; }
    if (!payoutForm.account.trim()) { setPayoutError('Please enter your account details'); return; }
    const { error } = await supabase.from('payout_requests').insert({
      user_id: user.id,
      amount,
      method: payoutForm.method,
      account_details: { account: payoutForm.account },
    });
    if (error) { setPayoutError(error.message); return; }
    setPayoutSuccess(true);
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-2xl">
        <h1 className="text-lg font-semibold text-foreground">Referral Program</h1>

        {/* Referral link */}
        <div className="bg-surface border border-border rounded p-5">
          <p className="label-caps mb-3">YOUR REFERRAL LINK</p>
          <div className="flex gap-2">
            <div className="flex-1 bg-background border border-border rounded px-3 py-2.5 font-mono text-xs text-foreground-muted truncate">
              {referralLink}
            </div>
            <button
              onClick={copyLink}
              className="flex items-center gap-1.5 px-3 py-2.5 bg-primary text-primary-foreground rounded text-xs font-semibold hover:opacity-90 transition-opacity"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>

          {/* Reward breakdown */}
          <div className="grid grid-cols-3 gap-2 mt-4">
            <div className="bg-earn-dim border border-earn/20 rounded p-3 text-center">
              <p className="font-mono text-lg font-bold value-earn">+50</p>
              <p className="label-caps mt-1">YOU EARN / SIGNUP</p>
            </div>
            <div className="bg-earn-dim border border-earn/20 rounded p-3 text-center">
              <p className="font-mono text-lg font-bold value-earn">+20</p>
              <p className="label-caps mt-1">FIRST TASK BONUS</p>
            </div>
            <div className="bg-earn-dim border border-earn/20 rounded p-3 text-center">
              <p className="font-mono text-lg font-bold value-earn">+50</p>
              <p className="label-caps mt-1">FRIEND EARNS</p>
            </div>
          </div>

          <div className="mt-3 p-3 bg-surface-elevated rounded">
            <p className="text-xs text-foreground-muted">
              Earn <span className="text-foreground font-mono font-semibold">+30 pts</span> when a friend signs up and an additional{' '}
              <span className="text-foreground font-mono font-semibold">+20 pts</span> when they complete their first task. No daily limit — every valid referral earns rewards.
            </p>
          </div>

          <div className="mt-2 p-3 bg-surface-elevated rounded">
            <p className="label-caps mb-1">PURCHASE COMMISSION</p>
            <p className="text-xs text-foreground-muted">
              Earn <span className="text-foreground font-mono font-semibold">25%</span> commission on every purchase made by your referrals. Commissions are locked for 7 days.
            </p>
          </div>
        </div>

        {/* Referral stats */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: Users,     label: 'TOTAL REFERRALS',      value: totalReferrals,      cls: 'text-foreground' },
            { icon: Star,      label: 'SUCCESSFUL REFERRALS', value: successfulReferrals, cls: 'value-earn' },
            { icon: Clock,     label: 'PENDING (NO TASK YET)',value: pendingReferrals,    cls: 'text-yellow-400' },
            { icon: Gift,      label: 'REFERRAL POINTS EARNED',value: `+${referralPoints}`, cls: 'value-earn' },
          ].map(({ icon: Icon, label, value, cls }) => (
            <div key={label} className="bg-surface border border-border rounded p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-3.5 h-3.5 text-foreground-dim" />
                <p className="label-caps">{label}</p>
              </div>
              <p className={`font-mono text-xl font-semibold ${cls}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Referral list */}
        {referrals.length > 0 && (
          <div>
            <p className="label-caps mb-3">REFERRAL ACTIVITY</p>
            <div className="bg-surface border border-border rounded overflow-hidden">
              <div className="grid grid-cols-[1fr_100px_110px] px-5 py-2.5 bg-surface-elevated border-b border-border">
                {['DATE', 'SIGNUP', 'FIRST TASK'].map(h => (
                  <span key={h} className="label-caps">{h}</span>
                ))}
              </div>
              {referrals.map((r, i) => (
                <div
                  key={r.referred_id + i}
                  className="grid grid-cols-[1fr_100px_110px] px-5 py-3 border-b border-border last:border-0 hover:bg-surface-elevated transition-colors"
                >
                  <span className="font-mono text-xs text-foreground-muted">
                    {new Date(r.created_at).toLocaleDateString()}
                  </span>
                  <span className={`label-caps ${r.signup_reward_paid ? 'text-earn' : 'text-yellow-400'}`}>
                    {r.signup_reward_paid ? '+30 PTS' : 'CAPPED'}
                  </span>
                  <span className={`label-caps ${r.first_task_completed ? (r.first_task_reward_paid ? 'text-earn' : 'text-yellow-400') : 'text-foreground-dim'}`}>
                    {r.first_task_completed
                      ? r.first_task_reward_paid ? '+20 PTS' : 'CAPPED'
                      : 'PENDING'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pending commissions */}
        {pending > 0 && (
          <div className="bg-yellow-400/5 border border-yellow-400/20 rounded p-4 flex items-start gap-3">
            <Clock className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
            <div>
              <p className="label-caps text-yellow-400 mb-0.5">LOCKED COMMISSIONS</p>
              <p className="font-mono text-lg font-semibold text-yellow-400">₹{pending.toFixed(2)}</p>
              <p className="text-xs text-foreground-dim mt-1">
                Commissions lock for 7 days after the referred user's purchase
              </p>
            </div>
          </div>
        )}

        {/* Commission history */}
        {commissions.length > 0 && (
          <div>
            <p className="label-caps mb-3">COMMISSION HISTORY</p>
            <div className="bg-surface border border-border rounded overflow-hidden">
              <div className="grid grid-cols-[1fr_80px_80px] px-5 py-2.5 bg-surface-elevated border-b border-border">
                {['DATE', 'AMOUNT', 'STATUS'].map(h => <span key={h} className="label-caps">{h}</span>)}
              </div>
              {commissions.map(c => (
                <div
                  key={c.id}
                  className="grid grid-cols-[1fr_80px_80px] px-5 py-3 border-b border-border last:border-0 hover:bg-surface-elevated transition-colors"
                >
                  <span className="font-mono text-xs text-foreground-muted">
                    {new Date(c.created_at).toLocaleDateString()}
                  </span>
                  <span className="font-mono text-xs value-earn">₹{c.amount.toFixed(2)}</span>
                  <span className={`label-caps ${
                    c.status === 'paid'
                      ? 'text-earn'
                      : new Date(c.locked_until) < new Date()
                        ? 'text-earn'
                        : 'text-yellow-400'
                  }`}>
                    {c.status === 'paid'
                      ? 'PAID'
                      : new Date(c.locked_until) < new Date()
                        ? 'UNLOCKED'
                        : 'LOCKED'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Commission total (if any) */}
        {totalCommissions > 0 && (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-surface border border-border rounded p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-3.5 h-3.5 text-foreground-dim" />
                <p className="label-caps">TOTAL COMMISSIONS</p>
              </div>
              <p className="font-mono text-xl font-semibold value-earn">₹{totalCommissions.toFixed(2)}</p>
            </div>
            <div className="bg-surface border border-border rounded p-4">
              <div className="flex items-center gap-2 mb-2">
                <Gift className="w-3.5 h-3.5 text-foreground-dim" />
                <p className="label-caps">WITHDRAWABLE</p>
              </div>
              <p className="font-mono text-xl font-semibold value-earn">₹{withdrawable.toFixed(2)}</p>
            </div>
          </div>
        )}

        {/* Withdrawal form */}
        <div className="bg-surface border border-border rounded p-5">
          <p className="label-caps mb-4">REQUEST WITHDRAWAL</p>
          {payoutSuccess ? (
            <div className="text-center py-4">
              <p className="font-mono text-sm value-earn">✓ Payout request submitted.</p>
              <p className="text-xs text-foreground-muted mt-1">Admin will process within 3–5 business days.</p>
            </div>
          ) : (
            <form onSubmit={handlePayout} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-caps block mb-1.5">METHOD</label>
                  <select
                    value={payoutForm.method}
                    onChange={e => setPayoutForm(f => ({ ...f, method: e.target.value }))}
                    className="w-full bg-background border border-border rounded px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/60 font-mono"
                  >
                    <option value="upi">UPI</option>
                    <option value="paypal">PayPal</option>
                  </select>
                </div>
                <div>
                  <label className="label-caps block mb-1.5">AMOUNT (₹)</label>
                  <input
                    type="number"
                    min={500}
                    value={payoutForm.amount}
                    onChange={e => setPayoutForm(f => ({ ...f, amount: e.target.value }))}
                    placeholder="500"
                    className="w-full bg-background border border-border rounded px-3 py-2.5 text-sm text-foreground placeholder:text-foreground-dim focus:outline-none focus:border-primary/60 font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="label-caps block mb-1.5">
                  {payoutForm.method === 'upi' ? 'UPI ID' : 'PAYPAL EMAIL'}
                </label>
                <input
                  type="text"
                  value={payoutForm.account}
                  onChange={e => setPayoutForm(f => ({ ...f, account: e.target.value }))}
                  required
                  placeholder={payoutForm.method === 'upi' ? 'user@upi' : 'user@email.com'}
                  className="w-full bg-background border border-border rounded px-3 py-2.5 text-sm text-foreground placeholder:text-foreground-dim focus:outline-none focus:border-primary/60 font-mono"
                />
              </div>
              {payoutError && <p className="text-xs text-spend">{payoutError}</p>}
              <p className="text-xs text-foreground-dim">
                Minimum ₹500 · Withdrawable:{' '}
                <span className="text-foreground font-mono">₹{withdrawable.toFixed(2)}</span>
              </p>
              <button
                type="submit"
                className="w-full py-2.5 bg-primary text-primary-foreground rounded text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Submit Withdrawal Request
              </button>
            </form>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
