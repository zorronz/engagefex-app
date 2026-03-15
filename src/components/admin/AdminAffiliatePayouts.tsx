import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AffiliateRow {
  referrer_id: string;
  referrer_name: string;
  referrer_email: string;
  pending: number;
  paid: number;
  referral_count: number;
}

export default function AdminAffiliatePayouts() {
  const [rows, setRows] = useState<AffiliateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);

    const [{ data: commissions }, { data: profiles }] = await Promise.all([
      supabase.from('affiliate_commissions').select('referrer_id, referred_user_id, amount, status'),
      supabase.from('profiles').select('user_id, name, email'),
    ]);

    if (!commissions) { setLoading(false); return; }

    const profileMap = new Map((profiles ?? []).map(p => [p.user_id, p]));

    // group by referrer_id
    const map = new Map<string, { pending: number; paid: number; referred: Set<string> }>();
    for (const c of commissions) {
      if (!map.has(c.referrer_id)) map.set(c.referrer_id, { pending: 0, paid: 0, referred: new Set() });
      const entry = map.get(c.referrer_id)!;
      if (c.status === 'pending') entry.pending += Number(c.amount);
      if (c.status === 'paid') entry.paid += Number(c.amount);
      entry.referred.add(c.referred_user_id);
    }

    const result: AffiliateRow[] = [];
    for (const [referrer_id, data] of map.entries()) {
      const profile = profileMap.get(referrer_id);
      result.push({
        referrer_id,
        referrer_name: profile?.name ?? 'Unknown',
        referrer_email: profile?.email ?? referrer_id.substring(0, 16) + '…',
        pending: data.pending,
        paid: data.paid,
        referral_count: data.referred.size,
      });
    }

    result.sort((a, b) => b.pending - a.pending);
    setRows(result);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleMarkPaid = async (referrer_id: string) => {
    setMarking(referrer_id);
    await supabase
      .from('affiliate_commissions')
      .update({ status: 'paid', paid_at: new Date().toISOString() } as never)
      .eq('referrer_id', referrer_id)
      .eq('status', 'pending');
    await load();
    setMarking(null);
  };

  const totalPending = rows.reduce((s, r) => s + r.pending, 0);
  const totalPaid = rows.reduce((s, r) => s + r.paid, 0);

  if (loading) return <p className="label-caps animate-pulse p-6">LOADING AFFILIATE PAYOUTS...</p>;

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'TOTAL PENDING', value: `$${totalPending.toFixed(2)}`, color: 'text-yellow-400' },
          { label: 'TOTAL PAID OUT', value: `$${totalPaid.toFixed(2)}`, color: 'text-earn' },
          { label: 'AFFILIATES', value: rows.length.toString(), color: 'text-primary' },
        ].map(s => (
          <div key={s.label} className="bg-surface border border-border rounded p-4">
            <p className="label-caps mb-2">{s.label}</p>
            <p className={`font-mono text-xl font-semibold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-surface border border-border rounded overflow-hidden overflow-x-auto">
        <div className="grid grid-cols-[1fr_100px_100px_80px_120px] gap-3 px-5 py-2.5 bg-surface-elevated border-b border-border min-w-[560px]">
          {['AFFILIATE', 'PENDING', 'PAID', 'REFERRALS', 'ACTION'].map(h => (
            <span key={h} className="label-caps">{h}</span>
          ))}
        </div>

        {rows.length === 0 ? (
          <p className="p-8 text-sm text-foreground-muted text-center">No affiliate commissions yet.</p>
        ) : rows.map(row => (
          <div
            key={row.referrer_id}
            className="grid grid-cols-[1fr_100px_100px_80px_120px] gap-3 px-5 py-3 border-b border-border-subtle last:border-0 hover:bg-surface-elevated items-center min-w-[560px]"
          >
            <div className="min-w-0">
              <p className="text-xs text-foreground font-medium truncate">{row.referrer_name}</p>
              <p className="font-mono text-xs text-foreground-muted truncate">{row.referrer_email}</p>
            </div>
            <span className="font-mono text-xs text-yellow-400">${row.pending.toFixed(2)}</span>
            <span className="font-mono text-xs value-earn">${row.paid.toFixed(2)}</span>
            <span className="font-mono text-xs text-foreground">{row.referral_count}</span>
            {row.pending > 0 ? (
              <button
                onClick={() => handleMarkPaid(row.referrer_id)}
                disabled={marking === row.referrer_id}
                className="px-2.5 py-1 bg-earn/10 border border-earn/20 rounded text-xs text-earn hover:bg-earn/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {marking === row.referrer_id ? 'Processing…' : 'Mark Paid'}
              </button>
            ) : (
              <span className="label-caps text-foreground-dim">ALL PAID</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
