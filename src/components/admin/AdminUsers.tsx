import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { Search, ChevronDown, ChevronUp } from 'lucide-react';

type Profile = Tables<'profiles'>;

interface AdminUsersProps {
  logAction: (action: string, targetType: string, targetId: string, details?: Record<string, unknown>) => void;
}

export default function AdminUsers({ logAction }: AdminUsersProps) {
  const [users, setUsers] = useState<Profile[]>([]);
  const [filtered, setFiltered] = useState<Profile[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pointsInput, setPointsInput] = useState<Record<string, string>>({});

  const fetchUsers = useCallback(async () => {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(500);
    if (data) { setUsers(data); setFiltered(data); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(q ? users.filter(u => u.email.toLowerCase().includes(q) || u.name.toLowerCase().includes(q)) : users);
  }, [search, users]);

  const handleBan = async (userId: string, ban: boolean) => {
    await supabase.from('profiles').update({ is_banned: ban, ban_reason: ban ? 'Banned by admin' : null }).eq('user_id', userId);
    setUsers(u => u.map(p => p.user_id === userId ? { ...p, is_banned: ban } : p));
    logAction(ban ? 'ban_user' : 'unban_user', 'user', userId);
  };

  const handlePremium = async (userId: string, isPremium: boolean) => {
    await supabase.from('profiles').update({ is_premium: isPremium }).eq('user_id', userId);
    setUsers(u => u.map(p => p.user_id === userId ? { ...p, is_premium: isPremium } : p));
    logAction(isPremium ? 'grant_premium' : 'revoke_premium', 'user', userId);
  };

  const handleAdjustPoints = async (userId: string, current: number, delta: number) => {
    const newBalance = Math.max(0, current + delta);
    await supabase.from('profiles').update({ points_balance: newBalance }).eq('user_id', userId);

    // log wallet transaction
    await supabase.from('wallet_transactions').insert({
      user_id: userId,
      transaction_type: delta > 0 ? 'bonus' : 'spent',
      points: Math.abs(delta),
      balance_after: newBalance,
      description: `Admin ${delta > 0 ? 'added' : 'removed'} ${Math.abs(delta)} points`,
    });

    setUsers(u => u.map(p => p.user_id === userId ? { ...p, points_balance: newBalance } : p));
    logAction('adjust_points', 'user', userId, { delta, newBalance });
  };

  const handleSetPoints = async (userId: string, current: number) => {
    const val = parseInt(pointsInput[userId] ?? '');
    if (isNaN(val) || val < 0) return;
    const delta = val - current;
    await handleAdjustPoints(userId, current, delta);
    setPointsInput(p => ({ ...p, [userId]: '' }));
  };

  if (loading) return <p className="label-caps animate-pulse p-6">LOADING USERS...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground-dim" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by email or name..."
            className="w-full pl-8 pr-3 py-2 bg-surface border border-border rounded text-xs text-foreground placeholder:text-foreground-dim focus:outline-none focus:border-primary/60"
          />
        </div>
        <span className="label-caps">{filtered.length} USERS</span>
      </div>

      <div className="bg-surface border border-border rounded overflow-hidden overflow-x-auto">
        <div className="grid grid-cols-[1fr_1.2fr_70px_60px_70px_60px_160px] gap-2 px-4 py-2.5 bg-surface-elevated border-b border-border min-w-[750px]">
          {['NAME', 'EMAIL', 'BALANCE', 'TRUST', 'STATUS', 'PLAN', 'ACTIONS'].map(h => <span key={h} className="label-caps">{h}</span>)}
        </div>
        {filtered.map(u => (
          <React.Fragment key={u.id}>
            <div className="grid grid-cols-[1fr_1.2fr_70px_60px_70px_60px_160px] gap-2 px-4 py-3 border-b border-border-subtle hover:bg-surface-elevated transition-colors items-center min-w-[750px]">
              <button onClick={() => setExpandedId(expandedId === u.id ? null : u.id)} className="flex items-center gap-1.5 text-left">
                {expandedId === u.id ? <ChevronUp className="w-3 h-3 text-foreground-dim flex-shrink-0" /> : <ChevronDown className="w-3 h-3 text-foreground-dim flex-shrink-0" />}
                <span className="text-xs text-foreground truncate font-medium">{u.name}</span>
              </button>
              <span className="text-xs text-foreground-muted font-mono truncate">{u.email}</span>
              <span className="font-mono text-xs value-earn">{u.points_balance}</span>
              <span className={`font-mono text-xs ${Number(u.trust_score) >= 80 ? 'text-earn' : Number(u.trust_score) >= 50 ? 'text-yellow-400' : 'text-spend'}`}>{Number(u.trust_score).toFixed(0)}</span>
              <span className={`label-caps ${u.is_banned ? 'text-spend' : 'text-earn'}`}>{u.is_banned ? 'BANNED' : 'ACTIVE'}</span>
              <span className={`label-caps ${u.is_premium ? 'text-yellow-400' : 'text-foreground-muted'}`}>{u.is_premium ? 'PRO' : 'FREE'}</span>
              <div className="flex gap-1 flex-wrap">
                <button onClick={() => handlePremium(u.user_id, !u.is_premium)}
                  className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${u.is_premium ? 'bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 hover:bg-yellow-400/20' : 'bg-surface-elevated border border-border text-foreground-muted hover:text-foreground'}`}>
                  {u.is_premium ? 'Revoke' : 'Pro'}
                </button>
                <button onClick={() => handleBan(u.user_id, !u.is_banned)}
                  className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${u.is_banned ? 'bg-earn/10 border border-earn/20 text-earn hover:bg-earn/20' : 'bg-spend/10 border border-spend/20 text-spend hover:bg-spend/20'}`}>
                  {u.is_banned ? 'Unban' : 'Ban'}
                </button>
              </div>
            </div>

            {expandedId === u.id && (
              <div className="px-6 py-4 bg-background border-b border-border min-w-[750px]">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  {[
                    { label: 'USER ID', value: u.user_id.substring(0, 16) + '…' },
                    { label: 'JOINED', value: new Date(u.created_at).toLocaleDateString() },
                    { label: 'REFERRAL CODE', value: u.referral_code },
                    { label: 'REFERRED BY', value: u.referred_by ? u.referred_by.substring(0, 12) + '…' : 'Direct' },
                    { label: 'TASKS SUBMITTED', value: String(u.tasks_submitted) },
                    { label: 'TASKS COMPLETED', value: String(u.tasks_completed) },
                    { label: 'POINTS EARNED', value: String(u.points_earned) },
                    { label: 'POINTS SPENT', value: String(u.points_spent) },
                  ].map(item => (
                    <div key={item.label}>
                      <p className="label-caps mb-0.5">{item.label}</p>
                      <p className="font-mono text-xs text-foreground">{item.value}</p>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 mt-3">
                  <p className="label-caps">ADJUST POINTS:</p>
                  <button onClick={() => handleAdjustPoints(u.user_id, u.points_balance, -10)} className="px-2.5 py-1 bg-spend/10 border border-spend/20 rounded text-xs text-spend hover:bg-spend/20 transition-colors font-mono">−10</button>
                  <button onClick={() => handleAdjustPoints(u.user_id, u.points_balance, -50)} className="px-2.5 py-1 bg-spend/10 border border-spend/20 rounded text-xs text-spend hover:bg-spend/20 transition-colors font-mono">−50</button>
                  <button onClick={() => handleAdjustPoints(u.user_id, u.points_balance, 50)} className="px-2.5 py-1 bg-earn/10 border border-earn/20 rounded text-xs text-earn hover:bg-earn/20 transition-colors font-mono">+50</button>
                  <button onClick={() => handleAdjustPoints(u.user_id, u.points_balance, 100)} className="px-2.5 py-1 bg-earn/10 border border-earn/20 rounded text-xs text-earn hover:bg-earn/20 transition-colors font-mono">+100</button>
                  <div className="flex items-center gap-1.5 ml-2">
                    <input
                      type="number"
                      placeholder="Set exact"
                      value={pointsInput[u.user_id] ?? ''}
                      onChange={e => setPointsInput(p => ({ ...p, [u.user_id]: e.target.value }))}
                      className="w-24 px-2 py-1 bg-surface border border-border rounded text-xs font-mono text-foreground focus:outline-none focus:border-primary/60"
                    />
                    <button onClick={() => handleSetPoints(u.user_id, u.points_balance)} className="px-2.5 py-1 bg-primary/10 border border-primary/20 rounded text-xs text-primary hover:bg-primary/20 transition-colors">Set</button>
                  </div>
                </div>

                {u.ip_address && (
                  <p className="mt-2 text-xs text-foreground-muted font-mono">IP: {u.ip_address} {u.device_fingerprint ? `· FP: ${u.device_fingerprint.substring(0, 12)}…` : ''}</p>
                )}
                {u.ban_reason && (
                  <p className="mt-1 text-xs text-spend">Ban reason: {u.ban_reason}</p>
                )}
              </div>
            )}
          </React.Fragment>
        ))}
        {filtered.length === 0 && <p className="p-6 text-sm text-foreground-muted text-center">No users found</p>}
      </div>
    </div>
  );
}
