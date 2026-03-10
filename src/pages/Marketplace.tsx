import React, { useEffect, useState, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { PlatformBadge, TaskTypeBadge } from '@/components/ui/DataComponents';
import TaskCompletionModal from '@/components/TaskCompletionModal';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Database } from '@/lib/database.types';
import { Search, SlidersHorizontal, Zap, ExternalLink, ChevronUp, ChevronDown } from 'lucide-react';

type Task = Database['public']['Tables']['tasks']['Row'];
type Platform = 'instagram' | 'facebook' | 'youtube' | 'all';
type TaskTypeFilter = 'like' | 'comment' | 'subscribe' | 'all';

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

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('tasks')
      .select('*')
      .eq('status', 'active')
      .neq('owner_id', user?.id ?? '')
      .order('is_boosted', { ascending: false })
      .order(sortField, { ascending: sortDir === 'asc' });

    if (platformFilter !== 'all') query = query.eq('platform', platformFilter);
    if (typeFilter !== 'all') query = query.eq('task_type', typeFilter);

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
    if (data) setCompletedTaskIds(new Set(data.map(c => c.task_id)));
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
  }, [fetchTasks, fetchCompletions, fetchActiveCampaigns]);

  const handleStartTask = (task: Task) => {
    setSelectedTask(task);
  };

  const handleComplete = async (commentText?: string) => {
    if (!selectedTask || !user?.id) return;

    // Insert completion
    const { error: insertError } = await supabase.from('task_completions').insert({
      task_id: selectedTask.id,
      user_id: user.id,
      status: 'pending',
      comment_text: commentText || null,
      completed_at: new Date().toISOString(),
    });

    if (insertError) throw new Error(insertError.message);

    // Update completed task set
    setCompletedTaskIds(prev => new Set([...prev, selectedTask.id]));
  };

  const toggleSort = (field: 'reward_points' | 'created_at') => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const filteredTasks = tasks.filter(t => {
    if (!search) return true;
    return t.post_url.toLowerCase().includes(search.toLowerCase()) ||
      (t.title ?? '').toLowerCase().includes(search.toLowerCase());
  });

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <ChevronUp className="w-3 h-3 text-foreground-dim" />;
    return sortDir === 'desc'
      ? <ChevronDown className="w-3 h-3 text-foreground-muted" />
      : <ChevronUp className="w-3 h-3 text-foreground-muted" />;
  };

  const maxTasks = profile?.is_premium ? 200 : 30;
  const tasksToday = 0; // Could track this separately

  const rightPanel = (
    <div className="p-4">
      <div className="space-y-3 mb-6">
        <div className="flex justify-between items-center py-2 border-b border-border-subtle">
          <span className="label-caps">DAILY LIMIT</span>
          <span className="font-mono text-xs text-foreground">{tasksToday}/{maxTasks}</span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-border-subtle">
          <span className="label-caps">ACTIVE CAMPAIGNS</span>
          <span className="font-mono text-xs text-foreground">{activeCampaignCount}/{profile?.is_premium ? 20 : 2}</span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-border-subtle">
          <span className="label-caps">YOUR BALANCE</span>
          <span className="font-mono text-xs value-earn font-semibold">{profile?.points_balance?.toLocaleString() ?? 0} pts</span>
        </div>
        <div className="flex justify-between items-center py-2">
          <span className="label-caps">TRUST SCORE</span>
          <span className="font-mono text-xs text-foreground">{profile?.trust_score?.toFixed(0) ?? '—'}</span>
        </div>
      </div>

      <p className="label-caps mb-3">FILTERS</p>
      <div className="space-y-3">
        <div>
          <p className="label-caps mb-2 text-foreground-dim">PLATFORM</p>
          <div className="flex flex-wrap gap-1.5">
            {(['all', 'instagram', 'facebook', 'youtube'] as Platform[]).map(p => (
              <button
                key={p}
                onClick={() => setPlatformFilter(p)}
                className={`px-2 py-1 rounded text-xs font-mono transition-colors ${
                  platformFilter === p
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-accent text-foreground-muted hover:text-foreground'
                }`}
              >
                {p === 'all' ? 'All' : p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="label-caps mb-2 text-foreground-dim">TASK TYPE</p>
          <div className="flex flex-wrap gap-1.5">
            {(['all', 'like', 'comment', 'subscribe'] as TaskTypeFilter[]).map(t => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-2 py-1 rounded text-xs font-mono transition-colors ${
                  typeFilter === t
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-accent text-foreground-muted hover:text-foreground'
                }`}
              >
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
            <h1 className="text-sm font-semibold text-foreground">Task Marketplace</h1>
            <p className="text-xs text-foreground-muted mt-0.5 font-mono">{filteredTasks.length} active tasks</p>
          </div>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-foreground-dim absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search tasks..."
              className="pl-8 pr-3 py-2 bg-background border border-border rounded text-xs text-foreground placeholder:text-foreground-dim focus:outline-none focus:border-primary/60 font-sans w-48"
            />
          </div>
        </div>

        {/* Table header */}
        <div className="grid grid-cols-[2fr_1fr_1fr_80px_100px] gap-3 px-6 py-2 bg-surface-elevated border-b border-border text-left">
          <span className="label-caps">POST / URL</span>
          <span className="label-caps">PLATFORM</span>
          <span className="label-caps">TYPE</span>
          <button
            onClick={() => toggleSort('reward_points')}
            className="flex items-center gap-1 label-caps hover:text-foreground transition-colors"
          >
            REWARD <SortIcon field="reward_points" />
          </button>
          <span className="label-caps text-right">ACTION</span>
        </div>

        {/* Table body */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="space-y-0">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                <div key={i} className="grid grid-cols-[2fr_1fr_1fr_80px_100px] gap-3 px-6 py-3.5 border-b border-border-subtle animate-pulse">
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
              <p className="text-sm text-foreground-muted">No tasks match your filters</p>
              <p className="text-xs text-foreground-dim mt-1">Try adjusting the filters or check back later</p>
            </div>
          ) : (
            filteredTasks.map(task => {
              const isCompleted = completedTaskIds.has(task.id);
              const isOwn = task.owner_id === user?.id;

              return (
                <div
                  key={task.id}
                  className={`ticker-row grid grid-cols-[2fr_1fr_1fr_80px_100px] gap-3 px-6 py-3.5 ${task.is_boosted ? 'bg-primary/5' : ''}`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {task.is_boosted && <Zap className="w-3 h-3 text-yellow-400 flex-shrink-0" />}
                    <div className="min-w-0">
                      <p className="text-xs text-foreground truncate">{task.title || 'Untitled task'}</p>
                      <a
                        href={task.post_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-foreground-dim hover:text-primary transition-colors font-mono truncate max-w-xs"
                      >
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
                  <div className="flex items-center justify-end">
                    {isOwn ? (
                      <span className="label-caps text-foreground-dim">YOUR TASK</span>
                    ) : isCompleted ? (
                      <span className="label-caps text-earn">SUBMITTED</span>
                    ) : (
                      <button
                        onClick={() => handleStartTask(task)}
                        className="px-3 py-1.5 bg-primary text-primary-foreground rounded text-xs font-semibold hover:opacity-90 transition-opacity shadow-cta"
                      >
                        Start Task
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {selectedTask && (
        <TaskCompletionModal
          task={selectedTask}
          onComplete={handleComplete}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </DashboardLayout>
  );
}
