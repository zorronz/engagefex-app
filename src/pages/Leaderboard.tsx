import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Trophy, Medal, Star, Crown } from 'lucide-react';

interface LeaderboardEntry {
  user_id: string;
  name: string;
  tasks_completed: number;
  points_earned: number;
}

const RANK_CONFIG = [
  { icon: Crown, color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/30' },
  { icon: Medal, color: 'text-slate-300', bg: 'bg-slate-300/10 border-slate-300/30' },
  { icon: Medal, color: 'text-amber-600', bg: 'bg-amber-600/10 border-amber-600/30' },
];

const REWARD_MAP: Record<number, number> = {
  1: 500,
  2: 300,
  3: 200,
};

export default function Leaderboard() {
  const { profile } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      // Fetch weekly completions grouped by user — approved only
      const { data, error } = await supabase
        .from('task_completions')
        .select('user_id, points_awarded, profiles!task_completions_user_id_fkey(name)')
        .eq('status', 'approved')
        .gte('approved_at', weekAgo);

      if (error || !data) {
        setLoading(false);
        return;
      }

      // Aggregate per user
      const map = new Map<string, { name: string; tasks: number; earned: number }>();
      for (const row of data) {
        const profile = row.profiles as { name: string } | null;
        if (!profile) continue;
        const existing = map.get(row.user_id) ?? { name: profile.name, tasks: 0, earned: 0 };
        map.set(row.user_id, {
          name: existing.name,
          tasks: existing.tasks + 1,
          earned: existing.earned + (row.points_awarded ?? 0),
        });
      }

      const sorted = Array.from(map.entries())
        .map(([user_id, v]) => ({ user_id, name: v.name, tasks_completed: v.tasks, points_earned: v.earned }))
        .sort((a, b) => b.tasks_completed - a.tasks_completed || b.points_earned - a.points_earned)
        .slice(0, 10);

      setEntries(sorted);
      setLoading(false);
    };

    fetchLeaderboard();
  }, []);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-yellow-400/10 border border-yellow-400/25 rounded flex items-center justify-center">
            <Trophy className="w-5 h-5 text-yellow-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Leaderboard</h1>
            <p className="text-xs text-foreground-muted font-mono mt-0.5">Top Engagers · This Week</p>
          </div>
        </div>

        {/* Reward info */}
        <div className="bg-surface border border-border rounded p-4">
          <p className="label-caps mb-3">WEEKLY REWARD POOL</p>
          <div className="grid grid-cols-4 gap-2">
            {[
              { rank: '#1', reward: '500 cr', color: 'text-yellow-400' },
              { rank: '#2', reward: '300 cr', color: 'text-slate-300' },
              { rank: '#3', reward: '200 cr', color: 'text-amber-600' },
              { rank: '#4–10', reward: '100 cr', color: 'text-foreground-muted' },
            ].map(r => (
              <div key={r.rank} className="bg-background rounded p-2.5 text-center">
                <p className={`font-mono text-sm font-bold ${r.color}`}>{r.rank}</p>
                <p className="label-caps mt-1">{r.reward}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-foreground-dim mt-3">Rewards are automatically distributed every Sunday at midnight UTC and appear in your wallet.</p>
        </div>

        {/* Leaderboard table */}
        <div className="bg-surface border border-border rounded overflow-hidden">
          <div className="grid grid-cols-[48px_1fr_80px_80px_60px] gap-3 px-4 py-2.5 bg-surface-elevated border-b border-border">
            <span className="label-caps">#</span>
            <span className="label-caps">ENGAGER</span>
            <span className="label-caps text-right">TASKS</span>
            <span className="label-caps text-right">EARNED</span>
            <span className="label-caps text-center">PRIZE</span>
          </div>

          {loading ? (
            <div className="space-y-px">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-14 bg-surface animate-pulse border-b border-border-subtle last:border-0" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="p-10 text-center">
              <Star className="w-6 h-6 text-foreground-dim mx-auto mb-2" />
              <p className="text-sm text-foreground-muted">No activity this week yet.</p>
              <p className="text-xs text-foreground-dim mt-1">Complete engagement tasks to appear on the leaderboard.</p>
            </div>
          ) : entries.map((entry, idx) => {
            const rank = idx + 1;
            const rankCfg = RANK_CONFIG[idx];
            const prize = REWARD_MAP[rank] ?? (rank <= 10 ? 100 : 0);
            const isCurrentUser = entry.user_id === profile?.user_id;

            return (
              <div
                key={entry.user_id}
                className={`grid grid-cols-[48px_1fr_80px_80px_60px] gap-3 px-4 py-3.5 border-b border-border-subtle last:border-0 items-center transition-colors
                  ${isCurrentUser ? 'bg-primary/5 border-primary/20' : 'hover:bg-surface-elevated'}`}
              >
                {/* Rank */}
                <div className="flex items-center justify-center">
                  {rankCfg ? (
                    <div className={`w-7 h-7 rounded-full border flex items-center justify-center ${rankCfg.bg}`}>
                      <rankCfg.icon className={`w-3.5 h-3.5 ${rankCfg.color}`} />
                    </div>
                  ) : (
                    <span className="font-mono text-sm text-foreground-muted font-semibold w-7 text-center">{rank}</span>
                  )}
                </div>

                {/* Name */}
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-primary font-mono">{entry.name[0]?.toUpperCase()}</span>
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-medium truncate ${isCurrentUser ? 'text-primary' : 'text-foreground'}`}>
                      {entry.name}{isCurrentUser && <span className="label-caps ml-1.5 text-primary">YOU</span>}
                    </p>
                  </div>
                </div>

                {/* Tasks */}
                <p className="font-mono text-sm font-semibold text-foreground text-right">{entry.tasks_completed}</p>

                {/* Earned */}
                <p className="font-mono text-sm font-semibold value-earn text-right">+{entry.points_earned}</p>

                {/* Prize */}
                <p className={`font-mono text-xs font-semibold text-center ${rank <= 3 ? 'text-yellow-400' : 'text-foreground-muted'}`}>
                  {prize} cr
                </p>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-foreground-dim text-center">Leaderboard updates in real-time · Resets every Monday at 00:00 UTC</p>
      </div>
    </DashboardLayout>
  );
}
