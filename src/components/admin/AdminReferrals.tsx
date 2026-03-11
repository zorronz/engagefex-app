import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle } from 'lucide-react';

interface ReferralRow {
  id: string;
  referrer_id: string;
  referred_id: string;
  created_at: string;
  signup_reward_paid: boolean;
  first_task_completed: boolean;
  first_task_reward_paid: boolean;
  referrer_name?: string;
  referrer_email?: string;
  referred_name?: string;
  referred_email?: string;
  referred_ip?: string | null;
  referrer_ip?: string | null;
}

interface AggRow {
  referrer_id: string;
  referrer_name: string;
  referrer_email: string;
  total: number;
  completed: number;
  pending: number;
  suspicious: boolean;
}

export default function AdminReferrals() {
  const [referrals, setReferrals] = useState<ReferralRow[]>([]);
  const [agg, setAgg] = useState<AggRow[]>([]);
  const [view, setView] = useState<'overview' | 'detail'>('overview');
  const [selectedReferrer, setSelectedReferrer] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: refs } = await supabase.from('referrals').select('*').order('created_at', { ascending: false }).limit(500);
      if (!refs) { setLoading(false); return; }

      // Collect all unique user ids
      const userIds = [...new Set([...refs.map(r => r.referrer_id), ...refs.map(r => r.referred_id)])];
      const { data: profiles } = await supabase.from('profiles').select('user_id, name, email, ip_address').in('user_id', userIds);
      const profileMap: Record<string, { name: string; email: string; ip?: string | null }> = {};
      (profiles ?? []).forEach(p => { profileMap[p.user_id] = { name: p.name, email: p.email, ip: p.ip_address }; });

      const enriched: ReferralRow[] = refs.map(r => ({
        ...r,
        referrer_name: profileMap[r.referrer_id]?.name,
        referrer_email: profileMap[r.referrer_id]?.email,
        referred_name: profileMap[r.referred_id]?.name,
        referred_email: profileMap[r.referred_id]?.email,
        referrer_ip: profileMap[r.referrer_id]?.ip,
        referred_ip: profileMap[r.referred_id]?.ip,
      }));
      setReferrals(enriched);

      // Aggregate by referrer
      const byReferrer: Record<string, AggRow> = {};
      enriched.forEach(r => {
        if (!byReferrer[r.referrer_id]) {
          byReferrer[r.referrer_id] = {
            referrer_id: r.referrer_id,
            referrer_name: r.referrer_name ?? 'Unknown',
            referrer_email: r.referrer_email ?? '—',
            total: 0,
            completed: 0,
            pending: 0,
            suspicious: false,
          };
        }
        byReferrer[r.referrer_id].total++;
        if (r.first_task_completed) byReferrer[r.referrer_id].completed++;
        else byReferrer[r.referrer_id].pending++;
        // Flag suspicious: referred user has same IP as referrer
        if (r.referrer_ip && r.referred_ip && r.referrer_ip === r.referred_ip) {
          byReferrer[r.referrer_id].suspicious = true;
        }
      });
      setAgg(Object.values(byReferrer).sort((a, b) => b.total - a.total));
      setLoading(false);
    })();
  }, []);

  const detailRows = selectedReferrer ? referrals.filter(r => r.referrer_id === selectedReferrer) : [];

  if (loading) return <p className="label-caps animate-pulse p-6">LOADING REFERRALS...</p>;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(['overview', 'detail'] as const).map(v => (
          <button key={v} onClick={() => setView(v)}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${view === v ? 'bg-primary/20 border border-primary/30 text-primary' : 'bg-surface border border-border text-foreground-muted hover:text-foreground'}`}>
            {v === 'overview' ? 'REFERRER OVERVIEW' : 'ALL REFERRALS'}
          </button>
        ))}
      </div>

      {view === 'overview' && (
        <div className="bg-surface border border-border rounded overflow-hidden overflow-x-auto">
          <div className="grid grid-cols-[2fr_1.5fr_60px_70px_70px_80px] gap-3 px-5 py-2.5 bg-surface-elevated border-b border-border min-w-[600px]">
            {['REFERRER', 'EMAIL', 'TOTAL', 'SUCCESS', 'PENDING', 'FLAG'].map(h => <span key={h} className="label-caps">{h}</span>)}
          </div>
          {agg.map(row => (
            <div key={row.referrer_id}
              onClick={() => { setSelectedReferrer(row.referrer_id); setView('detail'); }}
              className="grid grid-cols-[2fr_1.5fr_60px_70px_70px_80px] gap-3 px-5 py-3 border-b border-border-subtle last:border-0 hover:bg-surface-elevated transition-colors items-center cursor-pointer min-w-[600px]">
              <span className="text-xs text-foreground font-medium truncate">{row.referrer_name}</span>
              <span className="text-xs text-foreground-muted font-mono truncate">{row.referrer_email}</span>
              <span className="font-mono text-xs text-foreground">{row.total}</span>
              <span className="font-mono text-xs text-earn">{row.completed}</span>
              <span className="font-mono text-xs text-yellow-400">{row.pending}</span>
              {row.suspicious
                ? <span className="flex items-center gap-1 text-spend text-[10px] font-semibold"><AlertTriangle className="w-3 h-3" />FLAGGED</span>
                : <span className="label-caps text-earn">CLEAN</span>}
            </div>
          ))}
          {agg.length === 0 && <p className="p-6 text-sm text-foreground-muted text-center">No referrals yet</p>}
        </div>
      )}

      {view === 'detail' && (
        <div className="space-y-3">
          {selectedReferrer && (
            <button onClick={() => { setView('overview'); setSelectedReferrer(null); }} className="text-xs text-primary hover:underline">
              ← Back to overview
            </button>
          )}
          <div className="bg-surface border border-border rounded overflow-hidden overflow-x-auto">
            <div className="grid grid-cols-[2fr_2fr_100px_80px_80px_80px] gap-3 px-5 py-2.5 bg-surface-elevated border-b border-border min-w-[620px]">
              {['REFERRER', 'REFERRED', 'DATE', 'SIGNUP', 'FIRST TASK', 'REWARD'].map(h => <span key={h} className="label-caps">{h}</span>)}
            </div>
            {(selectedReferrer ? detailRows : referrals).map(r => {
              const sameIP = r.referrer_ip && r.referred_ip && r.referrer_ip === r.referred_ip;
              return (
                <div key={r.id} className={`grid grid-cols-[2fr_2fr_100px_80px_80px_80px] gap-3 px-5 py-3 border-b border-border-subtle last:border-0 hover:bg-surface-elevated items-center min-w-[620px] ${sameIP ? 'bg-spend/5' : ''}`}>
                  <div>
                    <p className="text-xs text-foreground truncate">{r.referrer_name ?? r.referrer_id.substring(0, 12) + '…'}</p>
                    <p className="text-[10px] text-foreground-dim font-mono">{r.referrer_email ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-foreground truncate">{r.referred_name ?? r.referred_id.substring(0, 12) + '…'}</p>
                    <p className="text-[10px] text-foreground-dim font-mono">{r.referred_email ?? '—'}</p>
                    {sameIP && <span className="text-[10px] text-spend font-semibold">⚠ Same IP</span>}
                  </div>
                  <span className="font-mono text-[10px] text-foreground-muted">{new Date(r.created_at).toLocaleDateString()}</span>
                  <span className={`label-caps ${r.signup_reward_paid ? 'text-earn' : 'text-foreground-dim'}`}>{r.signup_reward_paid ? 'PAID' : 'NO'}</span>
                  <span className={`label-caps ${r.first_task_completed ? 'text-earn' : 'text-yellow-400'}`}>{r.first_task_completed ? 'DONE' : 'PENDING'}</span>
                  <span className={`label-caps ${r.first_task_reward_paid ? 'text-earn' : 'text-foreground-dim'}`}>{r.first_task_reward_paid ? 'PAID' : 'NO'}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
