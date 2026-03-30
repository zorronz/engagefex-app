import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { StatCard, PlatformBadge, TaskTypeBadge } from '@/components/ui/DataComponents';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { CheckCircle2, ArrowUpRight, ArrowDownRight, Zap, Clock, ArrowRight, Flame, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import WelcomeVideoCard from '@/components/WelcomeVideoCard';

type Transaction = Tables<'wallet_transactions'>;
type Completion = Tables<'task_completions'> & {
  tasks: Tables<'tasks'>;
};

// 72-hour countdown from account creation
function useUpgradeTimer(createdAt: string | undefined) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!createdAt) return;
    const end = new Date(createdAt).getTime() + 72 * 60 * 60 * 1000;
    const tick = () => {
      const left = end - Date.now();
      setRemaining(left > 0 ? left : 0);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [createdAt]);

  return remaining;
}

function formatCountdown(ms: number) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function Dashboard() {
  const { profile, refreshProfile } = useAuth();
  const [recentTx, setRecentTx] = useState<Transaction[]>([]);
  const [recentCompletions, setRecentCompletions] = useState<Completion[]>([]);
  const [loadingTx, setLoadingTx] = useState(true);
  const [approvedTaskCount, setApprovedTaskCount] = useState(0);

  const remaining = useUpgradeTimer(profile?.created_at);

  // Show timer banner if: account < 72h old, not premium, welcome offer not dismissed via upgrade
  const showTimer = !profile?.is_premium && remaining !== null && remaining > 0;

  // First 5 tasks bonus: show if not yet paid and user has completed < 5
  const first5BonusPaid = (profile as Record<string, unknown>)?.first_5_tasks_bonus_paid as boolean | undefined;
  const showFirst5Banner = !first5BonusPaid && approvedTaskCount < 5;

  // Login streak from profile
  const loginStreak = ((profile as Record<string, unknown>)?.login_streak as number | undefined) ?? 0;

  useEffect(() => {
    refreshProfile();
  }, []);

  useEffect(() => {
    if (!profile?.user_id) return;

    const fetchData = async () => {
      const [txRes, compRes, approvedRes] = await Promise.all([
        supabase
          .from('wallet_transactions')
          .select('*')
          .eq('user_id', profile.user_id)
          .order('created_at', { ascending: false })
          .limit(8),
        supabase
          .from('task_completions')
          .select('*, tasks(*)')
          .eq('user_id', profile.user_id)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('task_completions')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', profile.user_id)
          .eq('status', 'approved'),
      ]);
      if (txRes.data) setRecentTx(txRes.data);
      if (compRes.data) setRecentCompletions(compRes.data as Completion[]);
      if (approvedRes.count !== null) setApprovedTaskCount(approvedRes.count);
      setLoadingTx(false);
    };

    fetchData();
  }, [profile?.user_id]);

  const rightPanel = (
    <div className="p-4 space-y-1">
      {loadingTx ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-10 bg-surface-elevated rounded animate-pulse" />
          ))}
        </div>
      ) : recentTx.length === 0 ? (
        <p className="text-xs text-foreground-dim text-center py-8">No transactions yet</p>
      ) : recentTx.map(tx => (
        <div key={tx.id} className="flex items-center justify-between py-2.5 border-b border-border-subtle last:border-0">
          <div className="min-w-0">
            <p className="text-xs text-foreground truncate">{tx.description}</p>
            <p className="label-caps mt-0.5">{new Date(tx.created_at).toLocaleDateString()}</p>
          </div>
          <div className="flex items-center gap-1 ml-2 flex-shrink-0">
            {tx.points > 0
              ? <ArrowUpRight className="w-3 h-3 text-earn" />
              : <ArrowDownRight className="w-3 h-3 text-spend" />
            }
            <span className={`font-mono text-xs font-semibold ${tx.points > 0 ? 'text-earn' : 'text-spend'}`}>
              {tx.points > 0 ? '+' : ''}{tx.points}
            </span>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <DashboardLayout rightPanel={rightPanel} rightPanelTitle="TRANSACTION HISTORY">
      <div className="p-6 space-y-6 max-w-3xl">

        {/* 72-Hour Upgrade Timer Banner */}
        {showTimer && remaining !== null && (
          <div className="flex items-center justify-between gap-4 px-4 py-3 bg-primary/8 border border-primary/25 rounded-lg">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                <Clock className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground">Limited Welcome Offer</p>
                <p className="text-xs text-foreground-muted">Upgrade within{' '}
                  <span className="font-mono text-primary font-semibold">{formatCountdown(remaining)}</span>
                  {' '}to unlock your special discount
                </p>
              </div>
            </div>
            <Link
              to="/wallet"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded text-xs font-semibold hover:opacity-90 transition-opacity flex-shrink-0 shadow-cta"
            >
              Upgrade <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        )}

        {/* First 5 Tasks Bonus Banner */}
        {showFirst5Banner && (
          <div className="flex items-center justify-between gap-4 px-4 py-3 bg-earn/8 border border-earn/25 rounded-lg">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-full bg-earn/15 flex items-center justify-center flex-shrink-0">
                <Star className="w-4 h-4 text-earn" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground">Starter Bonus</p>
                <p className="text-xs text-foreground-muted">
                  Complete your first 5 engagement tasks and earn{' '}
                  <span className="font-mono text-earn font-semibold">+40 bonus credits</span>.{' '}
                  <span className="font-mono text-foreground-muted">{approvedTaskCount}/5 done</span>
                </p>
              </div>
            </div>
            <Link
              to="/marketplace"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-earn/15 border border-earn/25 text-earn rounded text-xs font-semibold hover:bg-earn/25 transition-colors flex-shrink-0"
            >
              Go <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-foreground">
              {profile?.name ?? 'Dashboard'}
            </h1>
            <p className="text-sm text-foreground-muted mt-0.5 font-mono">
              {profile?.referral_code
                ? `REF: ${window.location.origin}/ref/${profile.referral_code}`
                : 'Loading...'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {loginStreak > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 bg-orange-400/10 border border-orange-400/20 rounded">
                <Flame className="w-3.5 h-3.5 text-orange-400" />
                <span className="font-mono text-xs font-semibold text-orange-400">{loginStreak}</span>
                <span className="label-caps text-orange-400/80">DAY</span>
              </div>
            )}
            {profile?.is_premium && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-yellow-400/10 border border-yellow-400/20 rounded">
                <Zap className="w-3.5 h-3.5 text-yellow-400" />
                <span className="label-caps text-yellow-400">PREMIUM</span>
              </div>
            )}
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="BALANCE" value={profile?.points_balance?.toLocaleString() ?? '—'} subValue="points" type="earn" />
          <StatCard
            label="TRUST SCORE"
            value={profile?.trust_score?.toFixed(0) ?? '—'}
            subValue="/100"
            type={(profile?.trust_score ?? 0) >= 80 ? 'earn' : (profile?.trust_score ?? 0) >= 50 ? 'neutral' : 'spend'}
          />
          <StatCard label="COMPLETED" value={profile?.tasks_completed ?? 0} subValue="tasks" />
          <StatCard label="SUBMITTED" value={profile?.tasks_submitted ?? 0} subValue="campaigns" />
        </div>

        {/* Secondary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="bg-surface border border-border rounded p-4">
            <p className="label-caps mb-2">TOTAL EARNED</p>
            <p className="font-mono text-lg font-semibold value-earn">{profile?.points_earned?.toLocaleString() ?? 0}</p>
          </div>
          <div className="bg-surface border border-border rounded p-4">
            <p className="label-caps mb-2">TOTAL SPENT</p>
            <p className="font-mono text-lg font-semibold value-spend">{profile?.points_spent?.toLocaleString() ?? 0}</p>
          </div>
          <div className="bg-surface border border-border rounded p-4">
            <p className="label-caps mb-2">PURCHASED</p>
            <p className="font-mono text-lg font-semibold data-mono text-foreground">{profile?.points_purchased?.toLocaleString() ?? 0}</p>
          </div>
        </div>

        {/* Welcome Video */}
        <WelcomeVideoCard />

        {/* Recent completions */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="label-caps">RECENT TASK ACTIVITY</p>
          </div>
          {recentCompletions.length === 0 ? (
            <div className="bg-surface border border-border rounded p-8 text-center">
              <CheckCircle2 className="w-6 h-6 text-foreground-dim mx-auto mb-2" />
              <p className="text-sm text-foreground-muted">No tasks completed yet.</p>
              <p className="text-xs text-foreground-dim mt-1">
                Visit the <a href="/marketplace" className="text-primary hover:underline">Marketplace</a> to start earning.
              </p>
            </div>
          ) : (
            <div className="bg-surface border border-border rounded divide-y divide-border-subtle">
              {recentCompletions.map(c => (
                <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <PlatformBadge platform={c.tasks?.platform as 'instagram' | 'facebook' | 'youtube' | 'linkedin'} />
                      <TaskTypeBadge taskType={c.tasks?.task_type as 'like' | 'comment' | 'subscribe'} />
                    </div>
                    <p className="text-xs text-foreground-dim font-mono">
                      {new Date(c.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`status-dot ${c.status}`} />
                    <span className="label-caps">{c.status.toUpperCase()}</span>
                    {c.status === 'approved' && (
                      <span className="font-mono text-xs value-earn font-semibold">+{c.points_awarded}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Point economy reference */}
        <div>
          <p className="label-caps mb-3">POINT ECONOMY REFERENCE</p>
          <div className="bg-surface border border-border rounded overflow-hidden">
            <div className="grid grid-cols-4 px-4 py-2 border-b border-border bg-surface-elevated">
              <span className="label-caps">TASK</span>
              <span className="label-caps">PLATFORM</span>
              <span className="label-caps text-earn">EARN</span>
              <span className="label-caps text-spend">COST</span>
            </div>
            {[
              { platform: 'Instagram', task: 'Like', earn: 2, cost: 4 },
              { platform: 'Instagram', task: 'Comment', earn: 8, cost: 12 },
              { platform: 'Facebook', task: 'Like', earn: 2, cost: 4 },
              { platform: 'Facebook', task: 'Comment', earn: 8, cost: 12 },
              { platform: 'YouTube', task: 'Comment', earn: 10, cost: 15 },
              { platform: 'YouTube', task: 'Subscribe', earn: 12, cost: 18 },
              { platform: 'LinkedIn', task: 'Comment', earn: 10, cost: 15 },
            ].map((r, i) => (
              <div key={i} className="grid grid-cols-4 px-4 py-2.5 border-b border-border-subtle last:border-0 hover:bg-surface-elevated transition-colors">
                <span className="text-xs text-foreground font-mono">{r.task}</span>
                <span className="text-xs text-foreground-muted">{r.platform}</span>
                <span className="font-mono text-xs value-earn font-semibold">+{r.earn}</span>
                <span className="font-mono text-xs value-spend font-semibold">{r.cost}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
