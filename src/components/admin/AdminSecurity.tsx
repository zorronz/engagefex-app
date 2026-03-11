import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, Eye } from 'lucide-react';

interface ProfileRow {
  user_id: string;
  name: string;
  email: string;
  ip_address: string | null;
  device_fingerprint: string | null;
  is_banned: boolean;
  trust_score: number;
  created_at: string;
}

interface IPGroup {
  ip: string;
  users: ProfileRow[];
}

export default function AdminSecurity() {
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [ipGroups, setIpGroups] = useState<IPGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('profiles')
      .select('user_id, name, email, ip_address, device_fingerprint, is_banned, trust_score, created_at')
      .order('created_at', { ascending: false })
      .limit(500)
      .then(({ data }) => {
        if (!data) { setLoading(false); return; }
        setProfiles(data as ProfileRow[]);

        // Group by IP
        const byIP: Record<string, ProfileRow[]> = {};
        (data as ProfileRow[]).forEach(p => {
          if (!p.ip_address) return;
          if (!byIP[p.ip_address]) byIP[p.ip_address] = [];
          byIP[p.ip_address].push(p);
        });

        // Only include IPs with multiple accounts (suspicious)
        const groups = Object.entries(byIP)
          .filter(([, users]) => users.length > 1)
          .map(([ip, users]) => ({ ip, users }))
          .sort((a, b) => b.users.length - a.users.length);

        setIpGroups(groups);
        setLoading(false);
      });
  }, []);

  const lowTrust = profiles.filter(p => Number(p.trust_score) < 50 && !p.is_banned);
  const banned = profiles.filter(p => p.is_banned);

  if (loading) return <p className="label-caps animate-pulse p-6">LOADING SECURITY DATA...</p>;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'SHARED IP CLUSTERS', value: ipGroups.length, color: 'text-spend' },
          { label: 'LOW TRUST USERS', value: lowTrust.length, color: 'text-yellow-400' },
          { label: 'BANNED USERS', value: banned.length, color: 'text-spend' },
        ].map(s => (
          <div key={s.label} className="bg-surface border border-border rounded p-4">
            <p className="label-caps mb-2">{s.label}</p>
            <p className={`font-mono text-2xl font-semibold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Shared IP clusters */}
      <div className="bg-surface border border-border rounded overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-surface-elevated flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-spend" />
          <p className="label-caps">SHARED IP ADDRESS CLUSTERS</p>
        </div>
        {ipGroups.length === 0 ? (
          <p className="p-6 text-sm text-foreground-muted text-center">No shared IPs detected</p>
        ) : (
          <div className="divide-y divide-border-subtle">
            {ipGroups.map(group => (
              <div key={group.ip} className="px-5 py-3">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-3 h-3 text-spend" />
                  <span className="font-mono text-xs text-spend font-semibold">{group.ip}</span>
                  <span className="label-caps text-spend">{group.users.length} ACCOUNTS</span>
                </div>
                <div className="space-y-1 pl-5">
                  {group.users.map(u => (
                    <div key={u.user_id} className="flex items-center gap-3">
                      <span className={`status-dot ${u.is_banned ? 'rejected' : 'active'}`} />
                      <span className="text-xs text-foreground">{u.name}</span>
                      <span className="text-xs text-foreground-muted font-mono">{u.email}</span>
                      <span className={`font-mono text-xs ${Number(u.trust_score) < 50 ? 'text-spend' : 'text-foreground-dim'}`}>T:{Number(u.trust_score).toFixed(0)}</span>
                      {u.is_banned && <span className="label-caps text-spend">BANNED</span>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Low trust accounts */}
      <div className="bg-surface border border-border rounded overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-surface-elevated flex items-center gap-2">
          <Eye className="w-3.5 h-3.5 text-yellow-400" />
          <p className="label-caps">LOW TRUST ACCOUNTS (&lt;50)</p>
        </div>
        {lowTrust.length === 0 ? (
          <p className="p-6 text-sm text-foreground-muted text-center">No low trust accounts</p>
        ) : (
          <div className="grid grid-cols-[2fr_1.5fr_60px_1fr] gap-3 divide-y divide-border-subtle">
            <div className="col-span-4 grid grid-cols-[2fr_1.5fr_60px_1fr] gap-3 px-5 py-2 bg-surface-elevated">
              {['NAME', 'EMAIL', 'TRUST', 'JOINED'].map(h => <span key={h} className="label-caps">{h}</span>)}
            </div>
            {lowTrust.map(u => (
              <React.Fragment key={u.user_id}>
                <span className="px-5 py-2.5 text-xs text-foreground">{u.name}</span>
                <span className="py-2.5 text-xs text-foreground-muted font-mono truncate">{u.email}</span>
                <span className="py-2.5 font-mono text-xs text-spend">{Number(u.trust_score).toFixed(0)}</span>
                <span className="py-2.5 font-mono text-xs text-foreground-dim">{new Date(u.created_at).toLocaleDateString()}</span>
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
