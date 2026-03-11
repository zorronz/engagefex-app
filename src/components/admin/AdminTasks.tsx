import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import type { Enums } from '@/integrations/supabase/types';

type Task = Tables<'tasks'>;
type Platform = Enums<'platform_type'> | 'all';
type TaskStatus = Enums<'task_status'> | 'all';

interface AdminTasksProps {
  logAction: (action: string, targetType: string, targetId: string, details?: Record<string, unknown>) => void;
}

const PLATFORM_COLORS: Record<string, string> = {
  instagram: 'text-pink-400',
  facebook: 'text-blue-400',
  youtube: 'text-red-400',
  linkedin: 'text-sky-400',
};

export default function AdminTasks({ logAction }: AdminTasksProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filtered, setFiltered] = useState<Task[]>([]);
  const [platform, setPlatform] = useState<Platform>('all');
  const [status, setStatus] = useState<TaskStatus>('all');
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    const { data } = await supabase.from('tasks').select('*').order('created_at', { ascending: false }).limit(300);
    if (data) { setTasks(data); setFiltered(data); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  useEffect(() => {
    setFiltered(tasks.filter(t =>
      (platform === 'all' || t.platform === platform) &&
      (status === 'all' || t.status === status)
    ));
  }, [platform, status, tasks]);

  const handleUpdateStatus = async (taskId: string, newStatus: Enums<'task_status'>) => {
    await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId);
    setTasks(t => t.map(x => x.id === taskId ? { ...x, status: newStatus } : x));
    logAction(`task_${newStatus}`, 'task', taskId);
  };

  if (loading) return <p className="label-caps animate-pulse p-6">LOADING TASKS...</p>;

  const platforms: Platform[] = ['all', 'instagram', 'facebook', 'youtube'];
  const statuses: TaskStatus[] = ['all', 'active', 'paused', 'completed', 'expired', 'deleted'];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <span className="label-caps">PLATFORM:</span>
          {platforms.map(p => (
            <button key={p} onClick={() => setPlatform(p)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${platform === p ? 'bg-primary/20 border border-primary/30 text-primary' : 'bg-surface border border-border text-foreground-muted hover:text-foreground'}`}>
              {p.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="label-caps">STATUS:</span>
          {statuses.map(s => (
            <button key={s} onClick={() => setStatus(s)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${status === s ? 'bg-primary/20 border border-primary/30 text-primary' : 'bg-surface border border-border text-foreground-muted hover:text-foreground'}`}>
              {s.toUpperCase()}
            </button>
          ))}
        </div>
        <span className="label-caps ml-auto self-center">{filtered.length} TASKS</span>
      </div>

      <div className="bg-surface border border-border rounded overflow-hidden overflow-x-auto">
        <div className="grid grid-cols-[2fr_80px_80px_80px_70px_70px_160px] gap-2 px-4 py-2.5 bg-surface-elevated border-b border-border min-w-[700px]">
          {['TASK / URL', 'PLATFORM', 'TYPE', 'PROGRESS', 'REWARD', 'STATUS', 'ACTIONS'].map(h => <span key={h} className="label-caps">{h}</span>)}
        </div>
        {filtered.map(t => (
          <div key={t.id} className="grid grid-cols-[2fr_80px_80px_80px_70px_70px_160px] gap-2 px-4 py-3 border-b border-border-subtle last:border-0 hover:bg-surface-elevated transition-colors items-center min-w-[700px]">
            <div className="min-w-0">
              {t.title && <p className="text-xs font-medium text-foreground truncate">{t.title}</p>}
              <p className="text-[10px] text-foreground-muted font-mono truncate">{t.post_url.substring(0, 40)}…</p>
              <p className="text-[10px] text-foreground-dim font-mono">{t.owner_id.substring(0, 12)}…</p>
            </div>
            <span className={`text-xs font-medium capitalize ${PLATFORM_COLORS[t.platform] ?? 'text-foreground'}`}>{t.platform}</span>
            <span className="label-caps">{t.task_type}</span>
            <span className="font-mono text-xs text-foreground">{t.completed_actions}/{t.total_actions}</span>
            <span className="font-mono text-xs value-earn">{t.reward_points}</span>
            <span className={`label-caps ${
              t.status === 'active' ? 'text-earn' :
              t.status === 'paused' ? 'text-yellow-400' :
              t.status === 'completed' ? 'text-primary' :
              'text-foreground-dim'
            }`}>{t.status.toUpperCase()}</span>
            <div className="flex gap-1 flex-wrap">
              {t.status === 'active' && (
                <button onClick={() => handleUpdateStatus(t.id, 'paused')} className="px-2 py-1 bg-yellow-400/10 border border-yellow-400/20 rounded text-[10px] text-yellow-400 hover:bg-yellow-400/20 transition-colors">Pause</button>
              )}
              {t.status === 'paused' && (
                <button onClick={() => handleUpdateStatus(t.id, 'active')} className="px-2 py-1 bg-earn/10 border border-earn/20 rounded text-[10px] text-earn hover:bg-earn/20 transition-colors">Resume</button>
              )}
              {(t.status === 'active' || t.status === 'paused') && (
                <button onClick={() => handleUpdateStatus(t.id, 'deleted')} className="px-2 py-1 bg-spend/10 border border-spend/20 rounded text-[10px] text-spend hover:bg-spend/20 transition-colors">Delete</button>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="p-6 text-sm text-foreground-muted text-center">No tasks found</p>}
      </div>
    </div>
  );
}
