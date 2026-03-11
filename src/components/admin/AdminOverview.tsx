import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Users, CheckCircle, TrendingUp, Zap, UserCheck, ListTodo } from 'lucide-react';

interface OverviewStats {
  totalUsers: number;
  newUsersToday: number;
  activeUsersToday: number;
  tasksCreatedToday: number;
  tasksCompletedToday: number;
  totalPointsDistributed: number;
}

interface TopUser {
  name: string;
  email: string;
  points_balance: number;
  tasks_completed: number;
  trust_score: number;
}

export default function AdminOverview() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    Promise.all([
      supabase.from('profiles').select('user_id, created_at, last_seen_at', { count: 'exact' }),
      supabase.from('tasks').select('id, created_at', { count: 'exact' }).gte('created_at', todayISO),
      supabase.from('task_completions').select('id, created_at, status', { count: 'exact' }).gte('created_at', todayISO).eq('status', 'approved'),
      supabase.from('wallet_transactions').select('points').eq('transaction_type', 'earned'),
      supabase.from('profiles').select('name, email, points_balance, tasks_completed, trust_score').order('tasks_completed', { ascending: false }).limit(10),
    ]).then(([allUsers, tasksToday, completionsToday, transactions, top]) => {
      const now = new Date();
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      const newToday = (allUsers.data ?? []).filter(u => new Date(u.created_at) >= todayStart).length;
      const activeToday = (allUsers.data ?? []).filter(u => u.last_seen_at && new Date(u.last_seen_at) >= todayStart).length;
      const totalPts = (transactions.data ?? []).reduce((sum, t) => sum + (t.points ?? 0), 0);

      setStats({
        totalUsers: allUsers.count ?? 0,
        newUsersToday: newToday,
        activeUsersToday: activeToday,
        tasksCreatedToday: tasksToday.count ?? 0,
        tasksCompletedToday: completionsToday.count ?? 0,
        totalPointsDistributed: totalPts,
      });
      setTopUsers((top.data ?? []) as TopUser[]);
      setLoading(false);
    });
  }, []);

  const statCards = stats ? [
    { label: 'TOTAL USERS', value: stats.totalUsers.toLocaleString(), icon: Users, color: 'text-primary' },
    { label: 'NEW TODAY', value: stats.newUsersToday.toLocaleString(), icon: UserCheck, color: 'text-earn' },
    { label: 'ACTIVE TODAY', value: stats.activeUsersToday.toLocaleString(), icon: Zap, color: 'text-yellow-400' },
    { label: 'TASKS CREATED', value: stats.tasksCreatedToday.toLocaleString(), icon: ListTodo, color: 'text-primary' },
    { label: 'TASKS COMPLETED', value: stats.tasksCompletedToday.toLocaleString(), icon: CheckCircle, color: 'text-earn' },
    { label: 'POINTS DISTRIBUTED', value: stats.totalPointsDistributed.toLocaleString(), icon: TrendingUp, color: 'text-yellow-400' },
  ] : [];

  if (loading) return <p className="label-caps animate-pulse p-6">LOADING OVERVIEW...</p>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map(s => (
          <div key={s.label} className="bg-surface border border-border rounded p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="label-caps">{s.label}</p>
              <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
            </div>
            <p className={`font-mono text-xl font-semibold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-surface border border-border rounded overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-surface-elevated">
          <p className="label-caps">TOP ACTIVE USERS</p>
        </div>
        <div className="grid grid-cols-[2fr_1.5fr_80px_80px_80px] gap-3 px-5 py-2.5 bg-surface-elevated border-b border-border">
          {['NAME', 'EMAIL', 'BALANCE', 'TASKS', 'TRUST'].map(h => <span key={h} className="label-caps">{h}</span>)}
        </div>
        {topUsers.map((u, i) => (
          <div key={i} className="grid grid-cols-[2fr_1.5fr_80px_80px_80px] gap-3 px-5 py-3 border-b border-border-subtle last:border-0 hover:bg-surface-elevated transition-colors items-center">
            <span className="text-xs text-foreground truncate font-medium">{u.name}</span>
            <span className="text-xs text-foreground-muted font-mono truncate">{u.email}</span>
            <span className="font-mono text-xs value-earn">{u.points_balance}</span>
            <span className="font-mono text-xs text-foreground">{u.tasks_completed}</span>
            <span className={`font-mono text-xs ${Number(u.trust_score) >= 80 ? 'text-earn' : Number(u.trust_score) >= 50 ? 'text-yellow-400' : 'text-spend'}`}>{Number(u.trust_score).toFixed(0)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
