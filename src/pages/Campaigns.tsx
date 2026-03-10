import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { PlatformBadge, TaskTypeBadge } from '@/components/ui/DataComponents';
import { Database } from '@/lib/database.types';
import { Plus, Zap, AlertCircle } from 'lucide-react';

type Task = Database['public']['Tables']['tasks']['Row'];

export default function Campaigns() {
  const { user, profile } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [economy, setEconomy] = useState<Database['public']['Tables']['point_economy']['Row'][]>([]);
  const [form, setForm] = useState({ platform: 'instagram', task_type: 'like', post_url: '', title: '', total_actions: 10, reward_points: 4 });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchTasks = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase.from('tasks').select('*').eq('owner_id', user.id).order('created_at', { ascending: false });
    if (data) setTasks(data);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    fetchTasks();
    supabase.from('point_economy').select('*').then(({ data }) => { if (data) setEconomy(data); });
  }, [fetchTasks]);

  const totalCost = form.reward_points * form.total_actions;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!user?.id || !profile) return;
    if (profile.points_balance < totalCost) { setError('Insufficient points balance'); return; }
    const maxCampaigns = profile.is_premium ? 20 : 2;
    const activeTasks = tasks.filter(t => t.status === 'active');
    if (activeTasks.length >= maxCampaigns) { setError(`Max ${maxCampaigns} active campaigns (${profile.is_premium ? 'Premium' : 'Free'})`); return; }
    setSubmitting(true);
    try {
      const { error: taskError } = await supabase.from('tasks').insert({
        owner_id: user.id, platform: form.platform as 'instagram' | 'facebook' | 'youtube',
        task_type: form.task_type as 'like' | 'comment' | 'subscribe',
        post_url: form.post_url, title: form.title || null,
        reward_points: form.reward_points, total_actions: form.total_actions,
      });
      if (taskError) throw new Error(taskError.message);
      await supabase.from('profiles').update({ points_balance: profile.points_balance - totalCost, points_spent: (profile.points_spent || 0) + totalCost, tasks_submitted: (profile.tasks_submitted || 0) + 1 }).eq('user_id', user.id);
      await supabase.from('wallet_transactions').insert({ user_id: user.id, transaction_type: 'spent', points: -totalCost, balance_after: profile.points_balance - totalCost, description: `Campaign: ${form.title || form.post_url.substring(0, 30)}` });
      setShowForm(false);
      fetchTasks();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed to create campaign'); }
    finally { setSubmitting(false); }
  };

  const handleBoost = async (task: Task) => {
    if (!profile) return;
    const boostCost = Math.round(task.reward_points * task.total_actions * 0.3);
    if (profile.points_balance < boostCost) { alert('Insufficient points for boost'); return; }
    await supabase.from('tasks').update({ is_boosted: true, boost_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() }).eq('id', task.id);
    fetchTasks();
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-lg font-semibold text-foreground">Campaigns</h1><p className="text-xs text-foreground-muted mt-0.5 font-mono">{tasks.filter(t => t.status === 'active').length} active · {profile?.is_premium ? 20 : 2} max</p></div>
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded text-sm font-semibold hover:opacity-90 transition-opacity shadow-cta">
            <Plus className="w-4 h-4" /> New Campaign
          </button>
        </div>

        {showForm && (
          <div className="bg-surface border border-border rounded p-5">
            <p className="label-caps mb-4">CREATE CAMPAIGN</p>
            {error && <div className="flex items-center gap-2 p-2.5 mb-3 bg-spend-dim border border-spend/20 rounded text-sm text-spend"><AlertCircle className="w-3.5 h-3.5" />{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label-caps block mb-1.5">PLATFORM</label>
                  <select value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))} className="w-full bg-background border border-border rounded px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/60 font-mono">
                    <option value="instagram">Instagram</option><option value="facebook">Facebook</option><option value="youtube">YouTube</option>
                  </select></div>
                <div><label className="label-caps block mb-1.5">TASK TYPE</label>
                  <select value={form.task_type} onChange={e => setForm(f => ({ ...f, task_type: e.target.value }))} className="w-full bg-background border border-border rounded px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/60 font-mono">
                    <option value="like">Like</option><option value="comment">Comment</option><option value="subscribe">Subscribe</option>
                  </select></div>
              </div>
              <div><label className="label-caps block mb-1.5">POST URL</label>
                <input type="url" value={form.post_url} onChange={e => setForm(f => ({ ...f, post_url: e.target.value }))} required placeholder="https://..." className="w-full bg-background border border-border rounded px-3 py-2.5 text-sm text-foreground placeholder:text-foreground-dim focus:outline-none focus:border-primary/60 font-mono" /></div>
              <div><label className="label-caps block mb-1.5">TITLE <span className="text-foreground-dim normal-case">(optional)</span></label>
                <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Campaign description" className="w-full bg-background border border-border rounded px-3 py-2.5 text-sm text-foreground placeholder:text-foreground-dim focus:outline-none focus:border-primary/60" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label-caps block mb-1.5">REWARD PER ACTION</label>
                  <input type="number" min={1} value={form.reward_points} onChange={e => setForm(f => ({ ...f, reward_points: +e.target.value }))} className="w-full bg-background border border-border rounded px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/60 font-mono" /></div>
                <div><label className="label-caps block mb-1.5">TOTAL ACTIONS</label>
                  <input type="number" min={1} max={1000} value={form.total_actions} onChange={e => setForm(f => ({ ...f, total_actions: +e.target.value }))} className="w-full bg-background border border-border rounded px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/60 font-mono" /></div>
              </div>
              <div className="flex items-center justify-between py-2 border-t border-border">
                <div><span className="label-caps">TOTAL COST: </span><span className="font-mono text-sm value-spend font-semibold">{totalCost} pts</span></div>
                <span className="label-caps">YOUR BALANCE: <span className="text-earn font-mono">{profile?.points_balance ?? 0}</span></span>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 border border-border rounded text-sm text-foreground-muted hover:text-foreground transition-colors">Cancel</button>
                <button type="submit" disabled={submitting || (profile?.points_balance ?? 0) < totalCost} className="flex-1 py-2.5 bg-primary text-primary-foreground rounded text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">{submitting ? 'Creating...' : 'Create Campaign'}</button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-surface border border-border rounded overflow-hidden">
          <div className="grid grid-cols-[2fr_1fr_1fr_80px_80px_100px] gap-3 px-5 py-2.5 bg-surface-elevated border-b border-border">
            {['TITLE', 'PLATFORM', 'TYPE', 'PROGRESS', 'STATUS', 'ACTIONS'].map(h => <span key={h} className="label-caps">{h}</span>)}
          </div>
          {loading ? (
            <div className="p-8 text-center"><p className="label-caps animate-pulse">LOADING...</p></div>
          ) : tasks.length === 0 ? (
            <div className="p-8 text-center"><p className="text-sm text-foreground-muted">No campaigns yet.</p></div>
          ) : tasks.map(task => (
            <div key={task.id} className="grid grid-cols-[2fr_1fr_1fr_80px_80px_100px] gap-3 px-5 py-3.5 border-b border-border-subtle last:border-0 hover:bg-surface-elevated transition-colors">
              <div className="min-w-0">
                <p className="text-xs text-foreground truncate">{task.title || task.post_url.substring(0, 35)}</p>
                {task.is_boosted && <div className="flex items-center gap-1 mt-0.5"><Zap className="w-3 h-3 text-yellow-400" /><span className="label-caps text-yellow-400">BOOSTED</span></div>}
              </div>
              <div className="flex items-center"><PlatformBadge platform={task.platform as 'instagram' | 'facebook' | 'youtube'} /></div>
              <div className="flex items-center"><TaskTypeBadge taskType={task.task_type as 'like' | 'comment' | 'subscribe'} /></div>
              <div className="flex items-center"><span className="font-mono text-xs text-foreground">{task.completed_actions}/{task.total_actions}</span></div>
              <div className="flex items-center"><span className={`status-dot ${task.status} mr-1.5`} /><span className="label-caps">{task.status.toUpperCase()}</span></div>
              <div className="flex items-center gap-2">
                {!task.is_boosted && task.status === 'active' && (
                  <button onClick={() => handleBoost(task)} className="flex items-center gap-1 px-2 py-1 bg-yellow-400/10 border border-yellow-400/20 rounded text-xs text-yellow-400 hover:bg-yellow-400/20 transition-colors">
                    <Zap className="w-3 h-3" />Boost
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
