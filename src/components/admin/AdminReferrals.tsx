import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, Shield, Users, TrendingUp, Clock, CheckCircle } from 'lucide-react';

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
  referred_fingerprint?: string | null;
  referrer_fingerprint?: string | null;
}

type RiskLevel = 'clean' | 'medium' | 'high';

interface AggRow {
  referrer_id: string;
  referrer_name: string;
  referrer_email: string;
  total: number;
  completed: number;
  pending: number;
  risk: RiskLevel;
  riskReasons: string[];
}

function calcRisk(rows: ReferralRow[], referrer_id: string): { risk: RiskLevel; reasons: string[] } {
  const mine = rows.filter(r => r.referrer_id === referrer_id);
  const reasons: string[] = [];

  // Same IP as referrer
  const sameIPCount = mine.filter(r => r.referrer_ip && r.referred_ip && r.referrer_ip === r.referred_ip).length;
  if (sameIPCount > 0) reasons.push(`${sameIPCount} same-IP signup(s)`);

  // Same device fingerprint
  const sameFP = mine.filter(r => r.referrer_fingerprint && r.referred_fingerprint && r.referrer_fingerprint === r.referred_fingerprint).length;
  if (sameFP > 0) reasons.push(`${sameFP} same-device signup(s)`);

  // Unusual speed: >3 referrals in <24h
  const sorted = [...mine].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  if (sorted.length >= 3) {
    const first = new Date(sorted[0].created_at).getTime();
    const third = new Date(sorted[2].created_at).getTime();
    if (third - first < 24 * 60 * 60 * 1000) reasons.push('3+ referrals within 24h');
  }

  // Completion rate suspiciously low (>5 refs, <10% completed)
  if (mine.length >= 5) {
    const completedCount = mine.filter(r => r.first_task_completed).length;
    const rate = completedCount / mine.length;
    if (rate < 0.1) reasons.push(`Low completion rate (${Math.round(rate * 100)}%)`);
  }

  const risk: RiskLevel = sameIPCount > 0 || sameFP > 0 ? 'high' : reasons.length > 0 ? 'medium' : 'clean';
  return { risk, reasons };
}

const RISK_COLORS: Record<RiskLevel, string> = {
  clean: 'text-earn',
  medium: 'text-yellow-400',
  high: 'text-spend',
};
const RISK_BG: Record<RiskLevel, string> = {
  clean: 'bg-earn/10 border-earn/20',
  medium: 'bg-yellow-400/10 border-yellow-400/20',
  high: 'bg-spend/10 border-spend/20',
};

export default function AdminReferrals() {
  const [referrals, setReferrals] = useState<ReferralRow[]>([]);
  const [agg, setAgg] = useState<AggRow[]>([]);
  const [view, setView] = useState<'overview' | 'detail'>('overview');
  const [selectedReferrer, setSelectedReferrer] = useState<string | null>(null);
  const [riskFilter, setRiskFilter] = useState<RiskLevel | 'all'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: refs } = await supabase.from('referrals').select('*').order('created_at', { ascending: false }).limit(500);
      if (!refs) { setLoading(false); return; }

      const userIds = [...new Set([...refs.map(r => r.referrer_id), ...refs.map(r => r.referred_id)])];
      const { data: profiles } = await supabase.from('profiles').select('user_id, name, email, ip_address, device_fingerprint').in('user_id', userIds);
      const profileMap: Record<string, { name: string; email: string; ip?: string | null; fp?: string | null }> = {};
      (profiles ?? []).forEach(p => { profileMap[p.user_id] = { name: p.name, email: p.email, ip: p.ip_address, fp: p.device_fingerprint }; });

      const enriched: ReferralRow[] = refs.map(r => ({
        ...r,
        referrer_name: profileMap[r.referrer_id]?.name,
        referrer_email: profileMap[r.referrer_id]?.email,
        referred_name: profileMap[r.referred_id]?.name,
        referred_email: profileMap[r.referred_id]?.email,
        referrer_ip: profileMap[r.referrer_id]?.ip,
        referred_ip: profileMap[r.referred_id]?.ip,
        referrer_fingerprint: profileMap[r.referrer_id]?.fp,
        referred_fingerprint: profileMap[r.referred_id]?.fp,
      }));
      setReferrals(enriched);

      const byReferrer: Record<string, AggRow> = {};
      enriched.forEach(r => {
        if (!byReferrer[r.referrer_id]) {
          const { risk, reasons } = calcRisk(enriched, r.referrer_id);
          byReferrer[r.referrer_id] = {
            referrer_id: r.referrer_id,
            referrer_name: r.referrer_name ?? 'Unknown',
            referrer_email: r.referrer_email ?? '—',
            total: 0, completed: 0, pending: 0, risk, riskReasons: reasons,
          };
        }
        byReferrer[r.referrer_id].total++;
        if (r.first_task_completed) byReferrer[r.referrer_id].completed++;
        else byReferrer[r.referrer_id].pending++;
      });
      setAgg(Object.values(byReferrer).sort((a, b) => {
        const riskOrder: Record<RiskLevel, number> = { high: 0, medium: 1, clean: 2 };
        return riskOrder[a.risk] - riskOrder[b.risk] || b.total - a.total;
      }));
      setLoading(false);
    })();
  }, []);

  const filtered = agg.filter(r => riskFilter === 'all' || r.risk === riskFilter);
  const detailRows = selectedReferrer ? referrals.filter(r => r.referrer_id === selectedReferrer) : referrals;
  const totalReferrals = agg.reduce((s, r) => s + r.total, 0);
  const totalCompleted = agg.reduce((s, r) => s + r.completed, 0);
  const highRisk = agg.filter(r => r.risk === 'high').length;

  if (loading) return <p className="label-caps animate-pulse p-6">LOADING REFERRALS...</p>;

  return (
    <div className="space-y-4">

      {/* ─── Analytics Cards ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'TOTAL REFERRALS', value: totalReferrals, icon: Users, color: 'text-primary' },
          { label: 'COMPLETED', value: totalCompleted, icon: CheckCircle, color: 'text-earn' },
          { label: 'PENDING', value: totalReferrals - totalCompleted, icon: Clock, color: 'text-yellow-400' },
          { label: 'HIGH RISK', value: highRisk, icon: AlertTriangle, color: 'text-spend' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-surface border border-border rounded p-4 flex items-center gap-3">
            <Icon className={`w-4 h-4 ${color} flex-shrink-0`} />
            <div>
              <p className={`font-mono text-lg font-bold ${color}`}>{value}</p>
              <p className="label-caps">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ─── View + Risk Filter ─── */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex gap-1">
          {(['overview', 'detail'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${view === v ? 'bg-primary/20 border border-primary/30 text-primary' : 'bg-surface border border-border text-foreground-muted hover:text-foreground'}`}>
              {v === 'overview' ? 'REFERRER OVERVIEW' : 'ALL REFERRALS'}
            </button>
          ))}
        </div>
        {view === 'overview' && (
          <div className="flex gap-1 ml-auto">
            <span className="label-caps self-center mr-1">RISK:</span>
            {(['all', 'clean', 'medium', 'high'] as const).map(r => (
              <button key={r} onClick={() => setRiskFilter(r)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${riskFilter === r ? 'bg-primary/20 border border-primary/30 text-primary' : 'bg-surface border border-border text-foreground-muted hover:text-foreground'}`}>
                {r.toUpperCase()}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ─── OVERVIEW TABLE ─── */}
      {view === 'overview' && (
        <div className="bg-surface border border-border rounded overflow-hidden overflow-x-auto">
          <div className="grid grid-cols-[2fr_1.5fr_60px_70px_70px_120px] gap-3 px-5 py-2.5 bg-surface-elevated border-b border-border min-w-[620px]">
            {['REFERRER', 'EMAIL', 'TOTAL', 'SUCCESS', 'PENDING', 'RISK'].map(h => <span key={h} className="label-caps">{h}</span>)}
          </div>
          {filtered.map(row => (
            <div key={row.referrer_id}
              onClick={() => { setSelectedReferrer(row.referrer_id); setView('detail'); }}
              className="grid grid-cols-[2fr_1.5fr_60px_70px_70px_120px] gap-3 px-5 py-3 border-b border-border-subtle last:border-0 hover:bg-surface-elevated transition-colors items-center cursor-pointer min-w-[620px]">
              <span className="text-xs text-foreground font-medium truncate">{row.referrer_name}</span>
              <span className="text-xs text-foreground-muted font-mono truncate">{row.referrer_email}</span>
              <span className="font-mono text-xs text-foreground">{row.total}</span>
              <span className="font-mono text-xs text-earn">{row.completed}</span>
              <span className="font-mono text-xs text-yellow-400">{row.pending}</span>
              <div className="flex flex-col gap-0.5">
                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border w-fit ${RISK_BG[row.risk]} ${RISK_COLORS[row.risk]}`}>
                  {row.risk === 'high' && <AlertTriangle className="w-2.5 h-2.5" />}
                  {row.risk === 'clean' && <Shield className="w-2.5 h-2.5" />}
                  {row.risk.toUpperCase()}
                </span>
                {row.riskReasons.length > 0 && (
                  <span className="text-[9px] text-foreground-dim truncate max-w-[110px]">{row.riskReasons[0]}</span>
                )}
              </div>
            </div>
          ))}
          {filtered.length === 0 && <p className="p-6 text-sm text-foreground-muted text-center">No referrals match the filter</p>}
        </div>
      )}

      {/* ─── DETAIL TABLE ─── */}
      {view === 'detail' && (
        <div className="space-y-3">
          {selectedReferrer && (
            <div className="flex items-center justify-between">
              <button onClick={() => { setView('overview'); setSelectedReferrer(null); }} className="text-xs text-primary hover:underline">
                ← Back to overview
              </button>
              <span className="label-caps">{detailRows.length} REFERRALS</span>
            </div>
          )}
          <div className="bg-surface border border-border rounded overflow-hidden overflow-x-auto">
            <div className="grid grid-cols-[2fr_2fr_90px_70px_80px_80px_90px] gap-2 px-5 py-2.5 bg-surface-elevated border-b border-border min-w-[700px]">
              {['REFERRER', 'REFERRED', 'DATE', 'SIGNUP', 'FIRST TASK', 'REWARD', 'RISK'].map(h => <span key={h} className="label-caps">{h}</span>)}
            </div>
            {detailRows.map(r => {
              const sameIP = r.referrer_ip && r.referred_ip && r.referrer_ip === r.referred_ip;
              const sameFP = r.referrer_fingerprint && r.referred_fingerprint && r.referrer_fingerprint === r.referred_fingerprint;
              const rowRisk: RiskLevel = (sameIP || sameFP) ? 'high' : 'clean';
              return (
                <div key={r.id} className={`grid grid-cols-[2fr_2fr_90px_70px_80px_80px_90px] gap-2 px-5 py-3 border-b border-border-subtle last:border-0 hover:bg-surface-elevated items-center min-w-[700px] ${rowRisk === 'high' ? 'bg-spend/5' : ''}`}>
                  <div>
                    <p className="text-xs text-foreground truncate">{r.referrer_name ?? r.referrer_id.substring(0, 12) + '…'}</p>
                    <p className="text-[10px] text-foreground-dim font-mono">{r.referrer_email ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-foreground truncate">{r.referred_name ?? r.referred_id.substring(0, 12) + '…'}</p>
                    <p className="text-[10px] text-foreground-dim font-mono">{r.referred_email ?? '—'}</p>
                  </div>
                  <span className="font-mono text-[10px] text-foreground-muted">{new Date(r.created_at).toLocaleDateString()}</span>
                  <span className={`label-caps ${r.signup_reward_paid ? 'text-earn' : 'text-foreground-dim'}`}>{r.signup_reward_paid ? 'PAID' : 'NO'}</span>
                  <span className={`label-caps ${r.first_task_completed ? 'text-earn' : 'text-yellow-400'}`}>{r.first_task_completed ? 'DONE' : 'PENDING'}</span>
                  <span className={`label-caps ${r.first_task_reward_paid ? 'text-earn' : 'text-foreground-dim'}`}>{r.first_task_reward_paid ? 'PAID' : 'NO'}</span>
                  <div className="flex flex-col gap-0.5">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border w-fit ${RISK_BG[rowRisk]} ${RISK_COLORS[rowRisk]}`}>
                      {rowRisk === 'high' ? <AlertTriangle className="w-2.5 h-2.5" /> : <Shield className="w-2.5 h-2.5" />}
                      {rowRisk.toUpperCase()}
                    </span>
                    {sameIP && <span className="text-[9px] text-spend">⚠ Same IP</span>}
                    {sameFP && <span className="text-[9px] text-spend">⚠ Same Device</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
