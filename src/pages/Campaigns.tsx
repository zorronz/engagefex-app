import React, { useEffect, useState, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { PlatformBadge, TaskTypeBadge } from '@/components/ui/DataComponents';
import type { Tables } from '@/integrations/supabase/types';
import { Plus, Zap, AlertCircle, CheckCircle2, XCircle, ChevronDown, ChevronUp, ExternalLink, Clock } from 'lucide-react';

type Task = Tables<'tasks'>;
type Completion = Tables<'task_completions'> & { profiles?: { name: string; email: string; trust_score: number } | null };

export default function Campaigns() {
  const { user, profile, refreshProfile } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ platform: 'instagram', task_type: 'like', post_url: '', title: '', total_actions: 10, reward_points: 4 });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Approval panel
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [completions, setCompletions] = useState<Record<string, Completion[]>>({});
  const [loadingCompletions, setLoadingCompletions] = useState<Record<string, boolean>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase.from('tasks').select('*').eq('owner_id', user.id).order('created_at', { ascending: false });
    if (data) setTasks(data);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const totalCost = form.reward_points * form.total_actions;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!user?.id || !profile) return;
    if (profile.points_balance < totalCost) { setError('Insufficient points balance'); return; }
    const maxCampaigns = profile.is_premium ? 20 : 2;
    if (tasks.filter(t => t.status === 'active').length >= maxCampaigns) { setError(`Max ${maxCampaigns} active campaigns`); return; }
    setSubmitting(true);
    try {
      const { error: taskError } = await supabase.from('tasks').insert({
        owner_id: user.id,
        platform: form.platform as 'instagram' | 'facebook' | 'youtube',
        task_type: form.task_type as 'like' | 'comment' | 'subscribe',
        post_url: form.post_url,
        title: form.title || null,
        reward_points: form.reward_points,
        total_actions: form.total_actions,
      });
      if (taskError) throw new Error(taskError.message);

      await supabase.from('profiles').update({
        points_balance: profile.points_balance - totalCost,
        points_spent: (profile.points_spent || 0) + totalCost,
        tasks_submitted: (profile.tasks_submitted || 0) + 1,
      }).eq('user_id', user.id);

      await supabase.from('wallet_transactions').insert({
        user_id: user.id,
        transaction_type: 'spent',
        points: -totalCost,
        balance_after: profile.points_balance - totalCost,
        description: `Campaign: ${form.title || form.post_url.substring(0, 30)}`,
      });

      await refreshProfile();
      setShowForm(false);
      fetchTasks();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBoost = async (task: Task) => {
    if (!profile) return;
    const boostCost = Math.round(task.reward_points * task.total_actions * 0.3);
    if (profile.points_balance < boostCost) { alert(`Insufficient points for boost (cost: ${boostCost} pts)`); return; }
    await supabase.from('tasks').update({
      is_boosted: true,
      boost_expires_at: new Date(Date.now() + 7 * 86400000).toISOString()
    }).eq('id', task.id);
    fetchTasks();
  };

  const toggleExpand = async (taskId: string) => {
    if (expandedTask === taskId) { setExpandedTask(null); return; }
    setExpandedTask(taskId);
    if (completions[taskId]) return;
    setLoadingCompletions(prev => ({ ...prev, [taskId]: true }));
    const { data } = await supabase
      .from('task_completions')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false });
    setCompletions(prev => ({ ...prev, [taskId]: (data ?? []) as Completion[] }));
    setLoadingCompletions(prev => ({ ...prev, [taskId]: false }));
  };

  const handleApproval = async (completionId: string, taskId: string, action: 'approved' | 'rejected', rejectionReason?: string) => {
    setProcessingId(completionId);
    const { error } = await supabase.from('task_completions').update({
      status: action,
      rejection_reason: rejectionReason || null,
    }).eq('id', completionId);

    if (!error) {
      // Refresh completions for this task
      const { data } = await supabase.from('task_completions').select('*').eq('task_id', taskId).order('created_at', { ascending: false });
      setCompletions(prev => ({ ...prev, [taskId]: (data ?? []) as Completion[] }));
      // Refresh tasks to see updated progress
      fetchTasks();
      await refreshProfile();
    }
    setProcessingId(null);
  };

  const pendingCount = (taskId: string) => (completions[taskId] ?? []).filter(c => c.status === 'pending').length;

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Campaigns</h1>
            <p className="text-xs text-foreground-muted mt-0.5 font-mono">
              {tasks.filter(t => t.status === 'active').length} active · {profile?.is_premium ? 20 : 2} max
            </p>
          </div>
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded text-sm font-semibold hover:opacity-90 transition-opacity shadow-cta">
            <Plus className="w-4 h-4" /> New Campaign
          </button>
        </div>

        {/* Create form */}
        {showForm && (
          <div className="bg-surface border border-border rounded p-5">
            <p className="label-caps mb-4">CREATE CAMPAIGN</p>
            {error && (
              <div className="flex items-center gap-2 p-2.5 mb-3 bg-spend-dim border border-spend/20 rounded text-sm text-spend">
                <AlertCircle className="w-3.5 h-3.5" />{error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-caps block mb-1.5">PLATFORM</label>
                  <select value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}
                    className="w-full bg-background border border-border rounded px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/60 font-mono">
                    <option value="instagram">Instagram</option>
                    <option value="facebook">Facebook</option>
                    <option value="youtube">YouTube</option>
                  </select>
                </div>
                <div>
                  <label className="label-caps block mb-1.5">TASK TYPE</label>
                  <select value={form.task_type} onChange={e => setForm(f => ({ ...f, task_type: e.target.value }))}
                    className="w-full bg-background border border-border rounded px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/60 font-mono">
                    <option value="like">Like</option>
                    <option value="comment">Comment</option>
                    <option value="subscribe">Subscribe</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label-caps block mb-1.5">POST URL</label>
                <input type="url" value={form.post_url} onChange={e => setForm(f => ({ ...f, post_url: e.target.value }))} required placeholder="https://..."
                  className="w-full bg-background border border-border rounded px-3 py-2.5 text-sm text-foreground placeholder:text-foreground-dim focus:outline-none focus:border-primary/60 font-mono" />
              </div>
              <div>
                <label className="label-caps block mb-1.5">TITLE <span className="text-foreground-dim normal-case">(optional)</span></label>
                <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Campaign description"
                  className="w-full bg-background border border-border rounded px-3 py-2.5 text-sm text-foreground placeholder:text-foreground-dim focus:outline-none focus:border-primary/60" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-caps block mb-1.5">REWARD / ACTION</label>
                  <input type="number" min={1} value={form.reward_points} onChange={e => setForm(f => ({ ...f, reward_points: +e.target.value }))}
                    className="w-full bg-background border border-border rounded px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/60 font-mono" />
                </div>
                <div>
                  <label className="label-caps block mb-1.5">TOTAL ACTIONS</label>
                  <input type="number" min={1} max={1000} value={form.total_actions} onChange={e => setForm(f => ({ ...f, total_actions: +e.target.value }))}
                    className="w-full bg-background border border-border rounded px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/60 font-mono" />
                </div>
              </div>
              <div className="flex items-center justify-between py-2 border-t border-border">
                <div><span className="label-caps">TOTAL COST: </span><span className="font-mono text-sm value-spend font-semibold">{totalCost} pts</span></div>
                <span className="label-caps">BALANCE: <span className="font-mono text-earn">{profile?.points_balance ?? 0}</span></span>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 border border-border rounded text-sm text-foreground-muted hover:text-foreground transition-colors">Cancel</button>
                <button type="submit" disabled={submitting || (profile?.points_balance ?? 0) < totalCost}
                  className="flex-1 py-2.5 bg-primary text-primary-foreground rounded text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity">
                  {submitting ? 'Creating...' : 'Create Campaign'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Campaign list */}
        <div className="bg-surface border border-border rounded overflow-hidden">
          <div className="grid grid-cols-[2fr_1fr_1fr_100px_80px_120px] gap-3 px-5 py-2.5 bg-surface-elevated border-b border-border">
            {['TITLE', 'PLATFORM', 'TYPE', 'PROGRESS', 'STATUS', 'ACTIONS'].map(h => <span key={h} className="label-caps">{h}</span>)}
          </div>
          {loading ? (
            <div className="p-8 text-center"><p className="label-caps animate-pulse">LOADING...</p></div>
          ) : tasks.length === 0 ? (
            <div className="p-8 text-center"><p className="text-sm text-foreground-muted">No campaigns yet. Create your first campaign above.</p></div>
          ) : tasks.map(task => {
            const expanded = expandedTask === task.id;
            const pCount = pendingCount(task.id);
            return (
              <div key={task.id}>
                <div className="grid grid-cols-[2fr_1fr_1fr_100px_80px_120px] gap-3 px-5 py-3.5 border-b border-border-subtle hover:bg-surface-elevated transition-colors items-center">
                  <div className="min-w-0">
                    <p className="text-xs text-foreground truncate">{task.title || task.post_url.substring(0, 35)}</p>
                    {task.is_boosted && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <Zap className="w-3 h-3 text-yellow-400" />
                        <span className="label-caps text-yellow-400">BOOSTED</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center"><PlatformBadge platform={task.platform as 'instagram' | 'facebook' | 'youtube'} /></div>
                  <div className="flex items-center"><TaskTypeBadge taskType={task.task_type as 'like' | 'comment' | 'subscribe'} /></div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-foreground">{task.completed_actions}/{task.total_actions}</span>
                    <div className="flex-1 h-1 bg-border rounded-full overflow-hidden">
                      <div className="h-full bg-earn rounded-full" style={{ width: `${Math.min(100, (task.completed_actions / task.total_actions) * 100)}%` }} />
                    </div>
                  </div>
                  <div className="flex items-center">
                    <span className={`status-dot ${task.status} mr-1.5`} />
                    <span className="label-caps">{task.status.toUpperCase()}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {!task.is_boosted && task.status === 'active' && (
                      <button onClick={() => handleBoost(task)}
                        className="flex items-center gap-1 px-2 py-1 bg-yellow-400/10 border border-yellow-400/20 rounded text-xs text-yellow-400 hover:bg-yellow-400/20 transition-colors">
                        <Zap className="w-3 h-3" />Boost
                      </button>
                    )}
                    <button onClick={() => toggleExpand(task.id)}
                      className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${pCount > 0 ? 'bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20' : 'bg-accent text-foreground-muted hover:text-foreground'}`}>
                      {pCount > 0 && <span className="w-4 h-4 bg-primary text-primary-foreground rounded-full text-xs flex items-center justify-center font-mono">{pCount}</span>}
                      {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                {/* Expanded completions panel */}
                {expanded && (
                  <div className="border-b border-border-subtle bg-background">
                    <div className="px-5 py-2.5 border-b border-border-subtle bg-surface-elevated">
                      <p className="label-caps">COMPLETION SUBMISSIONS</p>
                    </div>
                    {loadingCompletions[task.id] ? (
                      <div className="p-6 text-center"><p className="label-caps animate-pulse">LOADING...</p></div>
                    ) : (completions[task.id] ?? []).length === 0 ? (
                      <div className="p-6 text-center flex items-center justify-center gap-2 text-foreground-muted">
                        <Clock className="w-4 h-4" />
                        <p className="text-sm">No submissions yet.</p>
                      </div>
                    ) : (
                      <div>
                        {(completions[task.id] ?? []).map(c => (
                          <div key={c.id} className="grid grid-cols-[1fr_200px_100px_140px] gap-3 px-5 py-3.5 border-b border-border-subtle last:border-0 items-start hover:bg-surface-elevated/50 transition-colors">
                            <div className="min-w-0">
                              <p className="font-mono text-xs text-foreground-muted">{c.user_id.substring(0, 14)}…</p>
                              {c.comment_text && (
                                <p className="text-xs text-foreground mt-1 bg-surface-elevated px-2 py-1.5 rounded font-sans leading-relaxed">"{c.comment_text}"</p>
                              )}
                              <a href={task.post_url} target="_blank" rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-foreground-dim hover:text-primary mt-1">
                                <ExternalLink className="w-3 h-3" /> Verify post
                              </a>
                            </div>
                            <div>
                              <p className="label-caps">{new Date(c.created_at).toLocaleString()}</p>
                              {c.rejection_reason && <p className="text-xs text-spend mt-1">{c.rejection_reason}</p>}
                            </div>
                            <div className="flex items-center">
                              <span className={`status-dot ${c.status} mr-1.5`} />
                              <span className="label-caps">{c.status.toUpperCase()}</span>
                            </div>
                            <div>
                              {c.status === 'pending' && (
                                <div className="flex gap-1.5">
                                  <button onClick={() => handleApproval(c.id, task.id, 'approved')} disabled={processingId === c.id}
                                    className="flex items-center gap-1 px-2.5 py-1.5 bg-earn/10 border border-earn/20 rounded text-xs text-earn hover:bg-earn/20 transition-colors disabled:opacity-50">
                                    <CheckCircle2 className="w-3 h-3" />Approve
                                  </button>
                                  <button onClick={() => handleApproval(c.id, task.id, 'rejected', 'Did not complete task')} disabled={processingId === c.id}
                                    className="flex items-center gap-1 px-2.5 py-1.5 bg-spend/10 border border-spend/20 rounded text-xs text-spend hover:bg-spend/20 transition-colors disabled:opacity-50">
                                    <XCircle className="w-3 h-3" />Reject
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
