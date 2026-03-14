import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Copy, Check, TrendingUp, Clock, DollarSign, Users } from 'lucide-react';

type AffiliateCommission = {
  id: string;
  referred_user_id: string;
  subscription_id: string | null;
  invoice_id: string;
  amount: number;
  commission_rate: number;
  status: string;
  created_at: string;
};

type Referral = {
  id: string;
  referred_id: string;
  created_at: string;
};

function truncateId(id: string) {
  return id.slice(0, 8) + '…';
}

export default function Affiliate() {
  const { user, profile } = useAuth();
  const [commissions, setCommissions] = useState<AffiliateCommission[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const referralLink = `${window.location.origin}/ref/${profile?.referral_code ?? ''}`;

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);

    Promise.all([
      supabase
        .from('affiliate_commissions')
        .select('id, referred_user_id, subscription_id, invoice_id, amount, commission_rate, status, created_at')
        .eq('referrer_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('referrals')
        .select('id, referred_id, created_at')
        .eq('referrer_id', user.id)
        .order('created_at', { ascending: false }),
    ]).then(([commissionsRes, referralsRes]) => {
      if (commissionsRes.data) setCommissions(commissionsRes.data as AffiliateCommission[]);
      if (referralsRes.data) setReferrals(referralsRes.data as Referral[]);
      setLoading(false);
    });
  }, [user?.id]);

  // Derived stats
  const totalEarnings = commissions.reduce((s, c) => s + Number(c.amount), 0);
  const pendingEarnings = commissions
    .filter(c => c.status === 'pending')
    .reduce((s, c) => s + Number(c.amount), 0);
  const paidEarnings = commissions
    .filter(c => c.status === 'paid')
    .reduce((s, c) => s + Number(c.amount), 0);
  const totalReferrals = referrals.length;

  const summaryCards = [
    {
      icon: TrendingUp,
      label: 'TOTAL EARNINGS',
      value: `$${totalEarnings.toFixed(2)}`,
      cls: 'value-earn',
    },
    {
      icon: Clock,
      label: 'PENDING EARNINGS',
      value: `$${pendingEarnings.toFixed(2)}`,
      cls: 'text-yellow-400',
    },
    {
      icon: DollarSign,
      label: 'PAID EARNINGS',
      value: `$${paidEarnings.toFixed(2)}`,
      cls: 'value-earn',
    },
    {
      icon: Users,
      label: 'TOTAL REFERRALS',
      value: totalReferrals.toString(),
      cls: 'text-foreground',
    },
  ];

  const hasNoData = !loading && referrals.length === 0 && commissions.length === 0;

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-3xl">
        <h1 className="text-lg font-semibold text-foreground">Affiliate Dashboard</h1>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {summaryCards.map(({ icon: Icon, label, value, cls }) => (
            <div key={label} className="bg-surface border border-border rounded p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-3.5 h-3.5 text-foreground-dim" />
                <p className="label-caps">{label}</p>
              </div>
              <p className={`font-mono text-xl font-semibold ${cls}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Referral Link */}
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
          <p className="text-xs text-foreground-dim mt-3">
            Earn <span className="text-foreground font-mono font-semibold">25%</span> commission on every subscription payment made by your referrals.
          </p>
        </div>

        {/* Empty state */}
        {hasNoData && (
          <div className="bg-surface border border-border rounded p-8 text-center">
            <Users className="w-8 h-8 text-foreground-dim mx-auto mb-3" />
            <p className="text-sm text-foreground-muted">You haven't referred anyone yet.</p>
            <p className="text-xs text-foreground-dim mt-1">
              Share your referral link to start earning commissions.
            </p>
          </div>
        )}

        {/* Commission History Table */}
        {commissions.length > 0 && (
          <div>
            <p className="label-caps mb-3">COMMISSION HISTORY</p>
            <div className="bg-surface border border-border rounded overflow-hidden">
              <div className="grid grid-cols-[1fr_120px_80px_80px] px-5 py-2.5 bg-surface-elevated border-b border-border">
                {['DATE', 'REFERRED USER', 'AMOUNT', 'STATUS'].map(h => (
                  <span key={h} className="label-caps">{h}</span>
                ))}
              </div>
              {commissions.map(c => (
                <div
                  key={c.id}
                  className="grid grid-cols-[1fr_120px_80px_80px] px-5 py-3 border-b border-border last:border-0 hover:bg-surface-elevated transition-colors"
                >
                  <span className="font-mono text-xs text-foreground-muted">
                    {new Date(c.created_at).toLocaleDateString()}
                  </span>
                  <span className="font-mono text-xs text-foreground-muted">
                    {truncateId(c.referred_user_id)}
                  </span>
                  <span className="font-mono text-xs value-earn">
                    ${Number(c.amount).toFixed(2)}
                  </span>
                  <span className={`label-caps ${
                    c.status === 'paid' ? 'text-earn' : 'text-yellow-400'
                  }`}>
                    {c.status.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Referral List */}
        {referrals.length > 0 && (
          <div>
            <p className="label-caps mb-3">REFERRED USERS</p>
            <div className="bg-surface border border-border rounded overflow-hidden">
              <div className="grid grid-cols-[1fr_140px_100px] px-5 py-2.5 bg-surface-elevated border-b border-border">
                {['USER', 'SIGNUP DATE', 'STATUS'].map(h => (
                  <span key={h} className="label-caps">{h}</span>
                ))}
              </div>
              {referrals.map(r => {
                const hasCommission = commissions.some(c => c.referred_user_id === r.referred_id);
                return (
                  <div
                    key={r.id}
                    className="grid grid-cols-[1fr_140px_100px] px-5 py-3 border-b border-border last:border-0 hover:bg-surface-elevated transition-colors"
                  >
                    <span className="font-mono text-xs text-foreground-muted">
                      {truncateId(r.referred_id)}
                    </span>
                    <span className="font-mono text-xs text-foreground-muted">
                      {new Date(r.created_at).toLocaleDateString()}
                    </span>
                    <span className={`label-caps ${hasCommission ? 'text-earn' : 'text-foreground-dim'}`}>
                      {hasCommission ? 'SUBSCRIBED' : 'SIGNED UP'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
