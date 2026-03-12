import React, { useEffect, useState, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { PlatformBadge, TaskTypeBadge } from '@/components/ui/DataComponents';
import TaskCompletionModal from '@/components/TaskCompletionModal';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { Search, SlidersHorizontal, Zap, ExternalLink, ChevronUp, ChevronDown, Flag, X, AlertCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

type Task = Tables<'tasks'>;
type Platform = 'instagram' | 'facebook' | 'youtube' | 'all';
type TaskTypeFilter = 'like' | 'comment' | 'subscribe' | 'all';

const REPORT_REASONS = ['Spam / fake post', 'Broken link', 'Inappropriate content', 'Already completed / duplicate', 'Other'];

/** Returns daily task limit and plan label based on profile */
function getPlanInfo(profile: { is_premium?: boolean; wallet_balance?: number } | null): {
  label: string;
  dailyLimit: number | null; // null = unlimited
} {
  if (!profile) return { label: 'Free', dailyLimit: 30 };
  // Agency: wallet_balance used as proxy for agency plan (>= 15 wallet balance)
  // In practice, distinguish by subscription_plans name stored on profile or monthly_credits
  // For now: is_premium=true AND points_purchased > 5000 → Agency; is_premium=true → Pro
  if ((profile as { is_premium?: boolean; points_purchased?: number }).is_premium) {
    const purchased = (profile as { points_purchased?: number }).points_purchased ?? 0;
    if (purchased >= 8000) return { label: 'Agency', dailyLimit: null };
    return { label: 'Pro', dailyLimit: 100 };
  }
  return { label: 'Free', dailyLimit: 30 };
}

export default function Marketplace() {
  const { profile, user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [platformFilter, setPlatformFilter] = useState<Platform>('all');
  const [typeFilter, setTypeFilter] = useState<TaskTypeFilter>('all');
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<'reward_points' | 'created_at'>('reward_points');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [completedTaskIds, setCompletedTaskIds] = useState<Set<string>>(new Set());
  const [activeCampaignCount, setActiveCampaignCount] = useState(0);
  const [todayCompletedCount, setTodayCompletedCount] = useState(0);

  // Report modal state
  const [reportTask, setReportTask] = useState<Task | null>(null);
  const [reportReason, setReportReason] = useState(REPORT_REASONS[0]);
  const [reportDescription, setReportDescription] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [reportError, setReportError] = useState('');

  const planInfo = getPlanInfo(profile);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('tasks')
      .select('*')
      .eq('status', 'active')
      .neq('owner_id', user?.id ?? '')
      .order('is_boosted', { ascending: false })
      .order(sortField, { ascending: sortDir === 'asc' });

    if (platformFilter !== 'all') query = query.eq('platform', platformFilter as 'instagram' | 'facebook' | 'youtube');
    if (typeFilter !== 'all') query = query.eq('task_type', typeFilter as 'like' | 'comment' | 'subscribe');

    const { data } = await query.limit(100);
    if (data) setTasks(data);
    setLoading(false);
  }, [user?.id, platformFilter, typeFilter, sortField, sortDir]);

  const fetchCompletions = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('task_completions')
      .select('task_id')
      .eq('user_id', user.id);
    if (data) {
      setCompletedTaskIds(new Set(data.map(c => c.task_id)));
    }
  }, [user?.id]);

  const fetchTodayCount = useCallback(async () => {
    if (!user?.id) return;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const { count } = await supabase
      .from('task_completions')
      .select('id', { count: 'exact' })
      .eq('user_id', user.id)
      .gte('created_at', todayStart.toISOString());
    setTodayCompletedCount(count ?? 0);
  }, [user?.id]);

  const fetchActiveCampaigns = useCallback(async () => {
    if (!user?.id) return;
    const { count } = await supabase
      .from('tasks')
      .select('id', { count: 'exact' })
      .eq('owner_id', user.id)
      .eq('status', 'active');
    setActiveCampaignCount(count ?? 0);
  }, [user?.id]);

  useEffect(() => {
    fetchTasks();
    fetchCompletions();
    fetchActiveCampaigns();
    fetchTodayCount();
  }, [fetchTasks, fetchCompletions, fetchActiveCampaigns, fetchTodayCount]);

  const handleComplete = async (commentText?: string) => {
    if (!selectedTask || !user?.id) return;
    const { error } = await supabase.from('task_completions').insert({
      task_id: selectedTask.id,
      user_id: user.id,
      status: 'pending',
      comment_text: commentText || null,
      completed_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
    setCompletedTaskIds(prev => new Set([...prev, selectedTask.id]));
    setTodayCompletedCount(prev => prev + 1);
  };

  const toggleSort = (field: 'reward_points' | 'created_at') => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportTask || !user?.id) return;
    setReportSubmitting(true);
    setReportError('');
    const { error } = await supabase.from('reports').insert({
      reporter_id: user.id,
      task_id: reportTask.id,
      reason: reportReason,
      description: reportDescription || null,
    });
    if (error) { setReportError(error.message); setReportSubmitting(false); return; }
    setReportSuccess(true);
    setReportSubmitting(false);
    setTimeout(() => { setReportTask(null); setReportSuccess(false); setReportDescription(''); setReportReason(REPORT_REASONS[0]); }, 1500);
  };

  const filteredTasks = tasks.filter(t => {
    if (!search) return true;
    return t.post_url.toLowerCase().includes(search.toLowerCase()) ||
      (t.title ?? '').toLowerCase().includes(search.toLowerCase());
  });

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <ChevronUp className="w-3 h-3 text-foreground-dim" />;
    return sortDir === 'desc' ? <ChevronDown className="w-3 h-3 text-foreground-muted" /> : <ChevronUp className="w-3 h-3 text-foreground-muted" />;
  };

  const isAtDailyLimit = planInfo.dailyLimit !== null && todayCompletedCount >= planInfo.dailyLimit;

  const maxCampaigns = profile?.is_premium
    ? ((profile as { points_purchased?: number }).points_purchased ?? 0) >= 8000 ? 50 : 10
    : 2;

  const dailyLimitDisplay = planInfo.dailyLimit === null ? '∞' : planInfo.dailyLimit.toString();

  const rightPanel = (
    <div className="p-4">
      <div className="space-y-3 mb-6">
        <div className="flex justify-between items-center py-2 border-b border-border-subtle">
          <span className="label-caps">DAILY LIMIT</span>
          <span className={`font-mono text-xs ${isAtDailyLimit ? 'text-spend font-semibold' : 'text-foreground'}`}>
            {todayCompletedCount}/{dailyLimitDisplay}
          </span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-border-subtle">
          <span className="label-caps">PLAN</span>
          <span className={`font-mono text-xs font-semibold ${planInfo.label === 'Free' ? 'text-foreground-muted' : 'text-primary'}`}>
            {planInfo.label}
          </span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-border-subtle">
          <span className="label-caps">ACTIVE CAMPAIGNS</span>
          <span className="font-mono text-xs text-foreground">{activeCampaignCount}/{maxCampaigns}</span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-border-subtle">
          <span className="label-caps">YOUR BALANCE</span>
          <span className="font-mono text-xs value-earn font-semibold">{profile?.points_balance?.toLocaleString() ?? 0} credits</span>
        </div>
        <div className="flex justify-between items-center py-2">
          <span className="label-caps">TRUST SCORE</span>
          <span className="font-mono text-xs text-foreground">{profile?.trust_score?.toFixed(0) ?? '—'}</span>
        </div>
      </div>

      {/* Upgrade prompt for free users at limit */}
      {planInfo.label === 'Free' && isAtDailyLimit && (
        <div className="mb-4 p-3 rounded-lg border border-primary/30 bg-primary/5">
          <p className="text-xs text-foreground font-semibold mb-1">Daily limit reached</p>
          <p className="text-xs text-foreground-muted mb-2">Upgrade to Pro for 100 tasks/day or Agency for unlimited.</p>
          <Link to="/choose-plan" className="flex items-center gap-1 text-xs text-primary font-semibold hover:underline">
            Upgrade now <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}

      <p className="label-caps mb-3">FILTERS</p>
      <div className="space-y-3">
        <div>
          <p className="label-caps mb-2 text-foreground-dim">PLATFORM</p>
          <div className="flex flex-wrap gap-1.5">
            {(['all', 'instagram', 'facebook', 'youtube'] as Platform[]).map(p => (
              <button key={p} onClick={() => setPlatformFilter(p)}
                className={`px-2 py-1 rounded text-xs font-mono transition-colors ${platformFilter === p ? 'bg-primary text-primary-foreground' : 'bg-accent text-foreground-muted hover:text-foreground'}`}>
                {p === 'all' ? 'All' : p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="label-caps mb-2 text-foreground-dim">TASK TYPE</p>
          <div className="flex flex-wrap gap-1.5">
            {(['all', 'like', 'comment', 'subscribe'] as TaskTypeFilter[]).map(t => (
              <button key={t} onClick={() => setTypeFilter(t)}
                className={`px-2 py-1 rounded text-xs font-mono transition-colors ${typeFilter === t ? 'bg-primary text-primary-foreground' : 'bg-accent text-foreground-muted hover:text-foreground'}`}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <DashboardLayout rightPanel={rightPanel} rightPanelTitle="FILTERS & STATUS">
      <div className="flex flex-col h-full">
        {/* Header bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface">
          <div>
            <h1 className="text-sm font-semibold text-foreground">Campaign Marketplace</h1>
            <p className="text-xs text-foreground-muted mt-0.5 font-mono">{filteredTasks.length} active engagement tasks</p>
          </div>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-foreground-dim absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks..."
              className="pl-8 pr-3 py-2 bg-background border border-border rounded text-xs text-foreground placeholder:text-foreground-dim focus:outline-none focus:border-primary/60 font-sans w-48" />
          </div>
        </div>

        {/* Daily limit warning bar */}
        {isAtDailyLimit && (
          <div className="px-6 py-2.5 bg-spend-dim border-b border-spend/20 flex items-center justify-between">
            <p className="text-xs text-spend font-semibold">
              Daily limit reached ({todayCompletedCount}/{dailyLimitDisplay} engagement tasks).
              {planInfo.label === 'Free' && ' Upgrade to Pro for 100/day or Agency for unlimited.'}
            </p>
            {planInfo.label === 'Free' && (
              <Link to="/choose-plan" className="text-xs text-primary font-semibold hover:underline flex items-center gap-1">
                Upgrade <ArrowRight className="w-3 h-3" />
              </Link>
            )}
          </div>
        )}

        {/* Table header */}
        <div className="grid grid-cols-[2fr_1fr_1fr_80px_120px] gap-3 px-6 py-2 bg-surface-elevated border-b border-border text-left">
          <span className="label-caps">POST / URL</span>
          <span className="label-caps">PLATFORM</span>
          <span className="label-caps">TYPE</span>
          <button onClick={() => toggleSort('reward_points')} className="flex items-center gap-1 label-caps hover:text-foreground transition-colors">
            REWARD <SortIcon field="reward_points" />
          </button>
          <span className="label-caps text-right">ACTION</span>
        </div>

        {/* Table body */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="space-y-0">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                <div key={i} className="grid grid-cols-[2fr_1fr_1fr_80px_120px] gap-3 px-6 py-3.5 border-b border-border-subtle animate-pulse">
                  <div className="h-4 bg-surface-elevated rounded w-3/4" />
                  <div className="h-4 bg-surface-elevated rounded w-1/2" />
                  <div className="h-4 bg-surface-elevated rounded w-1/2" />
                  <div className="h-4 bg-surface-elevated rounded w-full" />
                  <div className="h-4 bg-surface-elevated rounded w-full" />
                </div>
              ))}
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <SlidersHorizontal className="w-8 h-8 text-foreground-dim mb-3" />
              <p className="text-sm text-foreground-muted">No engagement tasks match your filters</p>
              <p className="text-xs text-foreground-dim mt-1">Try adjusting the filters or check back later</p>
            </div>
          ) : (
            filteredTasks.map(task => {
              const isCompleted = completedTaskIds.has(task.id);
              const isOwn = task.owner_id === user?.id;
              const isBlocked = isAtDailyLimit && !isCompleted && !isOwn;
              return (
                <div key={task.id}
                  className={`ticker-row grid grid-cols-[2fr_1fr_1fr_80px_120px] gap-3 px-6 py-3.5 ${task.is_boosted ? 'bg-primary/5' : ''} ${isBlocked ? 'opacity-50' : ''}`}>
                  <div className="flex items-center gap-2 min-w-0">
                    {task.is_boosted && <Zap className="w-3 h-3 text-yellow-400 flex-shrink-0" />}
                    <div className="min-w-0">
                      <p className="text-xs text-foreground truncate">{task.title || 'Untitled task'}</p>
                      <a href={task.post_url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-foreground-dim hover:text-primary transition-colors font-mono truncate max-w-xs">
                        {task.post_url.substring(0, 40)}…
                        <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
                      </a>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <PlatformBadge platform={task.platform as 'instagram' | 'facebook' | 'youtube'} />
                  </div>
                  <div className="flex items-center">
                    <TaskTypeBadge taskType={task.task_type as 'like' | 'comment' | 'subscribe'} />
                  </div>
                  <div className="flex items-center">
                    <span className="font-mono text-sm value-earn font-semibold">+{task.reward_points}</span>
                  </div>
                  <div className="flex items-center justify-end gap-1.5">
                    {isOwn ? (
                      <span className="label-caps text-foreground-dim">YOUR TASK</span>
                    ) : isCompleted ? (
                      <span className="label-caps text-earn">SUBMITTED</span>
                    ) : isBlocked ? (
                      <span className="label-caps text-foreground-dim">LIMIT REACHED</span>
                    ) : (
                      <>
                        <button onClick={() => setReportTask(task)}
                          className="p-1.5 text-foreground-dim hover:text-spend transition-colors rounded hover:bg-spend/10" title="Report task">
                          <Flag className="w-3 h-3" />
                        </button>
                        <button onClick={() => setSelectedTask(task)}
                          className="px-3 py-1.5 bg-primary text-primary-foreground rounded text-xs font-semibold hover:opacity-90 transition-opacity shadow-cta">
                          Start
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Task completion modal */}
      {selectedTask && (
        <TaskCompletionModal task={selectedTask} onComplete={handleComplete} onClose={() => setSelectedTask(null)} />
      )}

      {/* Report modal */}
      {reportTask && (
        <div className="fixed inset-0 z-50 bg-background/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-surface border border-border rounded shadow-lg">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Flag className="w-3.5 h-3.5 text-spend" />
                <p className="label-caps">REPORT TASK</p>
              </div>
              <button onClick={() => setReportTask(null)} className="text-foreground-dim hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            {reportSuccess ? (
              <div className="p-8 text-center">
                <p className="font-mono text-sm value-earn">Report submitted.</p>
                <p className="text-xs text-foreground-muted mt-1">Thank you for keeping the marketplace clean.</p>
              </div>
            ) : (
              <form onSubmit={handleReportSubmit} className="p-5 space-y-4">
                <div>
                  <label className="label-caps block mb-1.5">REASON</label>
                  <select value={reportReason} onChange={e => setReportReason(e.target.value)}
                    className="w-full bg-background border border-border rounded px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/60 font-sans">
                    {REPORT_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label-caps block mb-1.5">DETAILS <span className="text-foreground-dim normal-case">(optional)</span></label>
                  <textarea value={reportDescription} onChange={e => setReportDescription(e.target.value)}
                    placeholder="Describe the issue..." rows={3} className="w-full bg-background border border-border rounded px-3 py-2.5 text-sm text-foreground placeholder:text-foreground-dim focus:outline-none focus:border-primary/60 resize-none" />
                </div>
                {reportError && (
                  <div className="flex items-center gap-2 p-2.5 bg-spend-dim border border-spend/20 rounded text-xs text-spend">
                    <AlertCircle className="w-3.5 h-3.5" />{reportError}
                  </div>
                )}
                <div className="flex gap-3">
                  <button type="button" onClick={() => setReportTask(null)} className="flex-1 py-2.5 border border-border rounded text-sm text-foreground-muted hover:text-foreground transition-colors">Cancel</button>
                  <button type="submit" disabled={reportSubmitting} className="flex-1 py-2.5 bg-spend text-spend-foreground rounded text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
                    {reportSubmitting ? 'Submitting...' : 'Submit Report'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
