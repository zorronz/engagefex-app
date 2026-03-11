import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface LogRow {
  id: string;
  admin_id: string;
  action: string;
  target_type: string;
  target_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export default function AdminLogs() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('admin_activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
      .then(({ data }) => {
        if (data) setLogs(data as LogRow[]);
        setLoading(false);
      });
  }, []);

  const ACTION_COLORS: Record<string, string> = {
    ban_user: 'text-spend',
    unban_user: 'text-earn',
    grant_premium: 'text-yellow-400',
    revoke_premium: 'text-foreground-muted',
    adjust_points: 'text-primary',
    task_deleted: 'text-spend',
    task_paused: 'text-yellow-400',
    task_active: 'text-earn',
    payout_approved: 'text-earn',
    payout_rejected: 'text-spend',
    update_economy: 'text-primary',
  };

  if (loading) return <p className="label-caps animate-pulse p-6">LOADING LOGS...</p>;

  return (
    <div className="bg-surface border border-border rounded overflow-hidden overflow-x-auto">
      <div className="grid grid-cols-[100px_150px_100px_1fr_200px] gap-3 px-5 py-2.5 bg-surface-elevated border-b border-border min-w-[600px]">
        {['TIME', 'ACTION', 'TARGET', 'DETAILS', 'ADMIN ID'].map(h => <span key={h} className="label-caps">{h}</span>)}
      </div>
      {logs.length === 0 ? (
        <p className="p-6 text-sm text-foreground-muted text-center">No admin activity yet</p>
      ) : logs.map(log => (
        <div key={log.id} className="grid grid-cols-[100px_150px_100px_1fr_200px] gap-3 px-5 py-3 border-b border-border-subtle last:border-0 hover:bg-surface-elevated items-center min-w-[600px]">
          <span className="font-mono text-[10px] text-foreground-dim">{new Date(log.created_at).toLocaleTimeString()}</span>
          <span className={`text-xs font-mono font-medium ${ACTION_COLORS[log.action] ?? 'text-foreground'}`}>{log.action}</span>
          <span className="label-caps">{log.target_type}</span>
          <span className="font-mono text-[10px] text-foreground-muted truncate">
            {log.details ? JSON.stringify(log.details).substring(0, 60) : log.target_id?.substring(0, 20) ?? '—'}
          </span>
          <span className="font-mono text-[10px] text-foreground-dim truncate">{log.admin_id.substring(0, 18)}…</span>
        </div>
      ))}
    </div>
  );
}
