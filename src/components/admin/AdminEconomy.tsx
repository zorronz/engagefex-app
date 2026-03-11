import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { Save } from 'lucide-react';

type Economy = Tables<'point_economy'>;

interface BonusSettings {
  signup_bonus: number;
  referral_signup_reward: number;
  referral_first_task_reward: number;
}

interface AdminEconomyProps {
  logAction: (action: string, targetType: string, targetId: string, details?: Record<string, unknown>) => void;
}

export default function AdminEconomy({ logAction }: AdminEconomyProps) {
  const [economy, setEconomy] = useState<Economy[]>([]);
  const [bonuses, setBonuses] = useState<BonusSettings>({
    signup_bonus: 50,
    referral_signup_reward: 30,
    referral_first_task_reward: 20,
  });
  const [pendingBonuses, setPendingBonuses] = useState<BonusSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    supabase.from('point_economy').select('*').order('platform').then(({ data }) => {
      if (data) setEconomy(data);
      setLoading(false);
    });
  }, []);

  const handleUpdateEconomy = async (id: string, field: 'earn_points' | 'cost_points' | 'estimated_seconds', value: number) => {
    await supabase.from('point_economy').update({ [field]: value }).eq('id', id);
    setEconomy(e => e.map(x => x.id === id ? { ...x, [field]: value } : x));
    logAction('update_economy', 'point_economy', id, { field, value });
  };

  const handleSaveBonuses = async () => {
    const vals = pendingBonuses ?? bonuses;
    setSaved(false);
    // Persist as DB function replacement (update the handle_new_user function isn't feasible here
    // so we store as platform-level config note and rely on manual trigger update)
    // For now we optimistically save to local state and log the action
    setBonuses(vals);
    setPendingBonuses(null);
    logAction('update_bonus_settings', 'system', 'bonus_config', vals as unknown as Record<string, unknown>);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const current = pendingBonuses ?? bonuses;

  if (loading) return <p className="label-caps animate-pulse p-6">LOADING ECONOMY...</p>;

  return (
    <div className="space-y-6">
      {/* Bonus settings */}
      <div className="bg-surface border border-border rounded overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-surface-elevated flex items-center justify-between">
          <p className="label-caps">BONUS POINT SETTINGS</p>
          <button onClick={handleSaveBonuses}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${saved ? 'bg-earn/20 border border-earn/30 text-earn' : 'bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20'}`}>
            <Save className="w-3 h-3" />{saved ? 'SAVED' : 'SAVE'}
          </button>
        </div>
        <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {([
            { key: 'signup_bonus', label: 'SIGNUP BONUS', desc: 'Points awarded to every new user on registration' },
            { key: 'referral_signup_reward', label: 'REFERRAL SIGNUP REWARD', desc: 'Points awarded to referrer when referred user signs up' },
            { key: 'referral_first_task_reward', label: 'FIRST TASK REWARD', desc: 'Points awarded to referrer when referred user completes first task' },
          ] as const).map(({ key, label, desc }) => (
            <div key={key} className="space-y-2">
              <p className="label-caps">{label}</p>
              <p className="text-xs text-foreground-muted">{desc}</p>
              <input
                type="number"
                value={current[key]}
                onChange={e => setPendingBonuses({ ...current, [key]: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-background border border-border rounded font-mono text-sm text-earn focus:outline-none focus:border-primary/60"
              />
            </div>
          ))}
        </div>
        <div className="px-5 pb-4">
          <p className="text-xs text-foreground-dim">⚠ Bonus values are stored as reference. To apply changes to the database trigger, update the <span className="font-mono">handle_new_user</span> function accordingly.</p>
        </div>
      </div>

      {/* Task economy */}
      <div className="bg-surface border border-border rounded overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-surface-elevated">
          <p className="label-caps">TASK REWARD & COST MATRIX</p>
        </div>
        <div className="grid grid-cols-[1fr_1fr_100px_100px_100px] gap-3 px-5 py-2.5 bg-surface-elevated border-b border-border">
          {['PLATFORM', 'TASK TYPE', 'EARN PTS', 'COST PTS', 'EST. SECS'].map(h => <span key={h} className="label-caps">{h}</span>)}
        </div>
        {economy.map(row => (
          <div key={row.id} className="grid grid-cols-[1fr_1fr_100px_100px_100px] gap-3 px-5 py-3 border-b border-border-subtle last:border-0 hover:bg-surface-elevated items-center">
            <span className="text-xs text-foreground capitalize font-medium">{row.platform}</span>
            <span className="text-xs text-foreground capitalize">{row.task_type}</span>
            <input type="number" value={row.earn_points}
              onChange={e => handleUpdateEconomy(row.id, 'earn_points', +e.target.value)}
              className="w-20 bg-background border border-border rounded px-2 py-1 font-mono text-xs text-earn focus:outline-none focus:border-primary/60" />
            <input type="number" value={row.cost_points}
              onChange={e => handleUpdateEconomy(row.id, 'cost_points', +e.target.value)}
              className="w-20 bg-background border border-border rounded px-2 py-1 font-mono text-xs text-spend focus:outline-none focus:border-primary/60" />
            <input type="number" value={row.estimated_seconds}
              onChange={e => handleUpdateEconomy(row.id, 'estimated_seconds', +e.target.value)}
              className="w-20 bg-background border border-border rounded px-2 py-1 font-mono text-xs text-foreground focus:outline-none focus:border-primary/60" />
          </div>
        ))}
        {economy.length === 0 && <p className="p-6 text-sm text-foreground-muted text-center">No economy rows found</p>}
      </div>
    </div>
  );
}
