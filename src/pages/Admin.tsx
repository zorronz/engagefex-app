import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { supabase } from '@/lib/supabase';
import { Database } from '@/lib/database.types';
import { Shield, Users, FileText, DollarSign, TrendingUp } from 'lucide-react';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

type Profile = Database['public']['Tables']['profiles']['Row'];
type Report = Database['public']['Tables']['reports']['Row'];
type Payout = Database['public']['Tables']['payout_requests']['Row'];
type Economy = Database['public']['Tables']['point_economy']['Row'];

export default function Admin() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [economy, setEconomy] = useState<Economy[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'reports' | 'payouts' | 'economy'>('users');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      db.from('profiles').select('*').order('created_at', { ascending: false }).limit(100),
      db.from('reports').select('*').order('created_at', { ascending: false }).limit(50),
      db.from('payout_requests').select('*').order('created_at', { ascending: false }).limit(50),
      db.from('point_economy').select('*').order('platform'),
    ]).then(([u, r, p, e]: [{ data: Profile[] }, { data: Report[] }, { data: Payout[] }, { data: Economy[] }]) => {
      if (u.data) setUsers(u.data);
      if (r.data) setReports(r.data);
      if (p.data) setPayouts(p.data);
      if (e.data) setEconomy(e.data);
      setLoading(false);
    });
  }, []);

  const handleBanUser = async (userId: string, ban: boolean) => {
    await db.from('profiles').update({ is_banned: ban }).eq('user_id', userId);
    setUsers(u => u.map(p => p.user_id === userId ? { ...p, is_banned: ban } : p));
  };
  const handleEditPoints = async (userId: string, current: number) => {
    const pts = prompt(`New points balance (current: ${current}):`);
    if (!pts || isNaN(+pts)) return;
    await db.from('profiles').update({ points_balance: +pts }).eq('user_id', userId);
    setUsers(u => u.map(p => p.user_id === userId ? { ...p, points_balance: +pts } : p));
  };
  const handleResolveReport = async (id: string) => {
    await db.from('reports').update({ status: 'resolved' }).eq('id', id);
    setReports(r => r.map(x => x.id === id ? { ...x, status: 'resolved' } : x));
  };
  const handlePayoutAction = async (id: string, status: string) => {
    await db.from('payout_requests').update({ status }).eq('id', id);
    setPayouts(p => p.map(x => x.id === id ? { ...x, status } : x));
  };
  const handleUpdateEconomy = async (id: string, field: 'earn_points' | 'cost_points', value: number) => {
    await db.from('point_economy').update({ [field]: value }).eq('id', id);
    setEconomy(e => e.map(x => x.id === id ? { ...x, [field]: value } : x));
  };

  const tabs = [
    { key: 'users', icon: Users, label: 'Users', count: users.length },
    { key: 'reports', icon: FileText, label: 'Reports', count: reports.filter(r => r.status === 'open').length },
    { key: 'payouts', icon: DollarSign, label: 'Payouts', count: payouts.filter(p => p.status === 'pending').length },
    { key: 'economy', icon: TrendingUp, label: 'Economy', count: economy.length },
  ] as const;

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-yellow-400" />
          <h1 className="text-lg font-semibold text-foreground">Admin Panel</h1>
        </div>
        <div className="flex gap-1 border-b border-border">
          {tabs.map(({ key, icon: Icon, label, count }) => (
            <button key={key} onClick={() => setActiveTab(key)} className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${activeTab === key ? 'border-primary text-primary' : 'border-transparent text-foreground-muted hover:text-foreground'}`}>
              <Icon className="w-3.5 h-3.5" />{label}
              {count > 0 && <span className="font-mono text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded">{count}</span>}
            </button>
          ))}
        </div>

        {loading ? <p className="label-caps animate-pulse">LOADING...</p> : (
          <>
            {activeTab === 'users' && (
              <div className="bg-surface border border-border rounded overflow-hidden">
                <div className="grid grid-cols-[2fr_1fr_80px_80px_80px_140px] gap-3 px-5 py-2.5 bg-surface-elevated border-b border-border">
                  {['USER', 'EMAIL', 'BALANCE', 'TRUST', 'STATUS', 'ACTIONS'].map(h => <span key={h} className="label-caps">{h}</span>)}
                </div>
                {users.map(u => (
                  <div key={u.id} className="grid grid-cols-[2fr_1fr_80px_80px_80px_140px] gap-3 px-5 py-3 border-b border-border-subtle last:border-0 hover:bg-surface-elevated transition-colors items-center">
                    <span className="text-xs text-foreground truncate">{u.name}</span>
                    <span className="text-xs text-foreground-muted font-mono truncate">{u.email}</span>
                    <span className="font-mono text-xs value-earn">{u.points_balance}</span>
                    <span className="font-mono text-xs text-foreground">{Number(u.trust_score).toFixed(0)}</span>
                    <span className={`label-caps ${u.is_banned ? 'text-spend' : 'text-earn'}`}>{u.is_banned ? 'BANNED' : 'ACTIVE'}</span>
                    <div className="flex gap-1.5">
                      <button onClick={() => handleEditPoints(u.user_id, u.points_balance)} className="px-2 py-1 bg-primary/10 border border-primary/20 rounded text-xs text-primary hover:bg-primary/20 transition-colors">PTS</button>
                      <button onClick={() => handleBanUser(u.user_id, !u.is_banned)} className={`px-2 py-1 rounded text-xs transition-colors ${u.is_banned ? 'bg-earn/10 border border-earn/20 text-earn hover:bg-earn/20' : 'bg-spend/10 border border-spend/20 text-spend hover:bg-spend/20'}`}>{u.is_banned ? 'Unban' : 'Ban'}</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {activeTab === 'reports' && (
              <div className="bg-surface border border-border rounded overflow-hidden">
                <div className="grid grid-cols-[2fr_1fr_80px_100px] gap-3 px-5 py-2.5 bg-surface-elevated border-b border-border">
                  {['REASON', 'DATE', 'STATUS', 'ACTION'].map(h => <span key={h} className="label-caps">{h}</span>)}
                </div>
                {reports.length === 0 ? <p className="p-6 text-sm text-foreground-muted text-center">No reports</p> : reports.map(r => (
                  <div key={r.id} className="grid grid-cols-[2fr_1fr_80px_100px] gap-3 px-5 py-3 border-b border-border-subtle last:border-0 hover:bg-surface-elevated items-center">
                    <span className="text-xs text-foreground truncate">{r.reason}</span>
                    <span className="font-mono text-xs text-foreground-muted">{new Date(r.created_at).toLocaleDateString()}</span>
                    <span className={`label-caps ${r.status === 'open' ? 'text-yellow-400' : 'text-earn'}`}>{r.status.toUpperCase()}</span>
                    {r.status === 'open' && <button onClick={() => handleResolveReport(r.id)} className="px-2 py-1 bg-earn/10 border border-earn/20 rounded text-xs text-earn hover:bg-earn/20 transition-colors">Resolve</button>}
                  </div>
                ))}
              </div>
            )}
            {activeTab === 'payouts' && (
              <div className="bg-surface border border-border rounded overflow-hidden">
                <div className="grid grid-cols-[1fr_80px_80px_80px_140px] gap-3 px-5 py-2.5 bg-surface-elevated border-b border-border">
                  {['USER', 'AMOUNT', 'METHOD', 'STATUS', 'ACTIONS'].map(h => <span key={h} className="label-caps">{h}</span>)}
                </div>
                {payouts.length === 0 ? <p className="p-6 text-sm text-foreground-muted text-center">No payout requests</p> : payouts.map(p => (
                  <div key={p.id} className="grid grid-cols-[1fr_80px_80px_80px_140px] gap-3 px-5 py-3 border-b border-border-subtle last:border-0 hover:bg-surface-elevated items-center">
                    <span className="font-mono text-xs text-foreground-muted truncate">{p.user_id.substring(0, 12)}...</span>
                    <span className="font-mono text-xs value-spend">₹{p.amount}</span>
                    <span className="label-caps">{p.method.toUpperCase()}</span>
                    <span className={`label-caps ${p.status === 'pending' ? 'text-yellow-400' : p.status === 'approved' ? 'text-earn' : 'text-spend'}`}>{p.status.toUpperCase()}</span>
                    {p.status === 'pending' && (
                      <div className="flex gap-1.5">
                        <button onClick={() => handlePayoutAction(p.id, 'approved')} className="px-2 py-1 bg-earn/10 border border-earn/20 rounded text-xs text-earn hover:bg-earn/20 transition-colors">Approve</button>
                        <button onClick={() => handlePayoutAction(p.id, 'rejected')} className="px-2 py-1 bg-spend/10 border border-spend/20 rounded text-xs text-spend hover:bg-spend/20 transition-colors">Reject</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {activeTab === 'economy' && (
              <div className="bg-surface border border-border rounded overflow-hidden">
                <div className="grid grid-cols-4 gap-3 px-5 py-2.5 bg-surface-elevated border-b border-border">
                  {['PLATFORM', 'TASK', 'EARN PTS', 'COST PTS'].map(h => <span key={h} className="label-caps">{h}</span>)}
                </div>
                {economy.map(row => (
                  <div key={row.id} className="grid grid-cols-4 gap-3 px-5 py-3 border-b border-border-subtle last:border-0 hover:bg-surface-elevated items-center">
                    <span className="text-xs text-foreground capitalize">{row.platform}</span>
                    <span className="text-xs text-foreground capitalize">{row.task_type}</span>
                    <input type="number" value={row.earn_points} onChange={e => handleUpdateEconomy(row.id, 'earn_points', +e.target.value)} className="w-16 bg-background border border-border rounded px-2 py-1 font-mono text-xs text-earn focus:outline-none focus:border-primary/60" />
                    <input type="number" value={row.cost_points} onChange={e => handleUpdateEconomy(row.id, 'cost_points', +e.target.value)} className="w-16 bg-background border border-border rounded px-2 py-1 font-mono text-xs text-spend focus:outline-none focus:border-primary/60" />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
