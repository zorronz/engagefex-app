import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type Payment = Tables<'payments'>;
type Payout = Tables<'payout_requests'>;

interface AdminPaymentsProps {
  logAction: (action: string, targetType: string, targetId: string, details?: Record<string, unknown>) => void;
}

export default function AdminPayments({ logAction }: AdminPaymentsProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [view, setView] = useState<'payments' | 'payouts'>('payments');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from('payments').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('payout_requests').select('*').order('created_at', { ascending: false }).limit(200),
    ]).then(([p, po]) => {
      if (p.data) setPayments(p.data);
      if (po.data) setPayouts(po.data);
      setLoading(false);
    });
  }, []);

  const handlePayoutAction = async (id: string, status: string) => {
    await supabase.from('payout_requests').update({ status, processed_at: new Date().toISOString() }).eq('id', id);
    setPayouts(p => p.map(x => x.id === id ? { ...x, status } : x));
    logAction(`payout_${status}`, 'payout', id);
  };

  const totalRevenue = payments.filter(p => p.status === 'completed').reduce((s, p) => s + Number(p.amount), 0);
  const totalPointsSold = payments.filter(p => p.status === 'completed').reduce((s, p) => s + p.points, 0);
  const pendingPayouts = payouts.filter(p => p.status === 'pending').reduce((s, p) => s + Number(p.amount), 0);

  if (loading) return <p className="label-caps animate-pulse p-6">LOADING PAYMENTS...</p>;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'TOTAL REVENUE', value: `₹${totalRevenue.toLocaleString()}`, color: 'text-earn' },
          { label: 'POINTS SOLD', value: totalPointsSold.toLocaleString(), color: 'text-primary' },
          { label: 'PENDING PAYOUTS', value: `₹${pendingPayouts.toLocaleString()}`, color: 'text-yellow-400' },
        ].map(s => (
          <div key={s.label} className="bg-surface border border-border rounded p-4">
            <p className="label-caps mb-2">{s.label}</p>
            <p className={`font-mono text-xl font-semibold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        {(['payments', 'payouts'] as const).map(v => (
          <button key={v} onClick={() => setView(v)}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${view === v ? 'bg-primary/20 border border-primary/30 text-primary' : 'bg-surface border border-border text-foreground-muted hover:text-foreground'}`}>
            {v === 'payments' ? `PAYMENT HISTORY (${payments.length})` : `PAYOUT REQUESTS (${payouts.filter(p => p.status === 'pending').length} pending)`}
          </button>
        ))}
      </div>

      {view === 'payments' && (
        <div className="bg-surface border border-border rounded overflow-hidden overflow-x-auto">
          <div className="grid grid-cols-[1fr_80px_80px_80px_80px_80px] gap-3 px-5 py-2.5 bg-surface-elevated border-b border-border min-w-[580px]">
            {['USER', 'PACKAGE', 'AMOUNT', 'POINTS', 'GATEWAY', 'STATUS'].map(h => <span key={h} className="label-caps">{h}</span>)}
          </div>
          {payments.length === 0 ? (
            <p className="p-6 text-sm text-foreground-muted text-center">No payments</p>
          ) : payments.map(p => (
            <div key={p.id} className="grid grid-cols-[1fr_80px_80px_80px_80px_80px] gap-3 px-5 py-3 border-b border-border-subtle last:border-0 hover:bg-surface-elevated items-center min-w-[580px]">
              <span className="font-mono text-xs text-foreground-muted truncate">{p.user_id.substring(0, 16)}…</span>
              <span className="text-xs text-foreground">{p.package_name ?? '—'}</span>
              <span className="font-mono text-xs value-spend">₹{p.amount}</span>
              <span className="font-mono text-xs value-earn">+{p.points}</span>
              <span className="label-caps">{p.gateway.toUpperCase()}</span>
              <span className={`label-caps ${p.status === 'completed' ? 'text-earn' : p.status === 'failed' ? 'text-spend' : 'text-yellow-400'}`}>{p.status.toUpperCase()}</span>
            </div>
          ))}
        </div>
      )}

      {view === 'payouts' && (
        <div className="bg-surface border border-border rounded overflow-hidden overflow-x-auto">
          <div className="grid grid-cols-[1fr_80px_80px_100px_80px_140px] gap-3 px-5 py-2.5 bg-surface-elevated border-b border-border min-w-[600px]">
            {['USER', 'AMOUNT', 'METHOD', 'ACCOUNT', 'STATUS', 'ACTIONS'].map(h => <span key={h} className="label-caps">{h}</span>)}
          </div>
          {payouts.length === 0 ? (
            <p className="p-6 text-sm text-foreground-muted text-center">No payout requests</p>
          ) : payouts.map(p => {
            const account = (p.account_details as { account?: string })?.account ?? '—';
            return (
              <div key={p.id} className="grid grid-cols-[1fr_80px_80px_100px_80px_140px] gap-3 px-5 py-3 border-b border-border-subtle last:border-0 hover:bg-surface-elevated items-center min-w-[600px]">
                <span className="font-mono text-xs text-foreground-muted truncate">{p.user_id.substring(0, 16)}…</span>
                <span className="font-mono text-xs value-spend">₹{p.amount}</span>
                <span className="label-caps">{p.method.toUpperCase()}</span>
                <span className="font-mono text-xs text-foreground truncate">{account}</span>
                <span className={`label-caps ${p.status === 'pending' ? 'text-yellow-400' : p.status === 'approved' ? 'text-earn' : 'text-spend'}`}>{p.status.toUpperCase()}</span>
                {p.status === 'pending' ? (
                  <div className="flex gap-1.5">
                    <button onClick={() => handlePayoutAction(p.id, 'approved')} className="px-2 py-1 bg-earn/10 border border-earn/20 rounded text-xs text-earn hover:bg-earn/20 transition-colors">Approve</button>
                    <button onClick={() => handlePayoutAction(p.id, 'rejected')} className="px-2 py-1 bg-spend/10 border border-spend/20 rounded text-xs text-spend hover:bg-spend/20 transition-colors">Reject</button>
                  </div>
                ) : (
                  <span className="text-xs text-foreground-dim">{p.processed_at ? new Date(p.processed_at).toLocaleDateString() : '—'}</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
