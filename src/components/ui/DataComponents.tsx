import React from 'react';
import { Instagram, Facebook, Youtube, ThumbsUp, MessageSquare, Bell, Linkedin } from 'lucide-react';

type Platform = 'instagram' | 'facebook' | 'youtube' | 'linkedin';
type TaskType = 'like' | 'comment' | 'subscribe';

interface PlatformBadgeProps {
  platform: Platform;
  size?: 'sm' | 'md';
}

export function PlatformBadge({ platform, size = 'sm' }: PlatformBadgeProps) {
  const configs: Record<string, { icon: React.ElementType; label: string; className: string }> = {
    instagram: { icon: Instagram, label: 'Instagram', className: 'bg-pink-500/10 text-pink-400 border border-pink-500/20' },
    facebook: { icon: Facebook, label: 'Facebook', className: 'bg-blue-500/10 text-blue-400 border border-blue-500/20' },
    youtube: { icon: Youtube, label: 'YouTube', className: 'bg-red-500/10 text-red-400 border border-red-500/20' },
    linkedin: { icon: Linkedin, label: 'LinkedIn', className: 'bg-sky-500/10 text-sky-400 border border-sky-500/20' },
  };
  const config = configs[platform] ?? { icon: Instagram, label: platform ?? 'Unknown', className: 'bg-muted text-muted-foreground border border-border' };
  const { icon: Icon, label, className } = config;
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5';
  const textSize = size === 'sm' ? 'text-xs' : 'text-xs';

  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-mono ${textSize} ${className}`}>
      <Icon className={iconSize} />
      {label}
    </span>
  );
}

interface TaskTypeBadgeProps {
  taskType: TaskType;
}

export function TaskTypeBadge({ taskType }: TaskTypeBadgeProps) {
  const configs: Record<string, { icon: React.ElementType; label: string; className: string }> = {
    like: { icon: ThumbsUp, label: 'Like', className: 'bg-accent text-foreground-muted border border-border' },
    comment: { icon: MessageSquare, label: 'Comment', className: 'bg-accent text-foreground-muted border border-border' },
    subscribe: { icon: Bell, label: 'Subscribe', className: 'bg-accent text-foreground-muted border border-border' },
  };
  const config = configs[taskType] ?? { icon: ThumbsUp, label: taskType ?? 'Unknown', className: 'bg-accent text-muted-foreground border border-border' };
  const { icon: Icon, label, className } = config;

  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-mono ${className}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  type?: 'default' | 'earn' | 'spend' | 'neutral';
}

export function StatCard({ label, value, subValue, type = 'default' }: StatCardProps) {
  const valueClass = type === 'earn' ? 'value-earn' : type === 'spend' ? 'value-spend' : 'text-foreground data-mono';

  return (
    <div className="bg-surface border border-border rounded p-4">
      <p className="label-caps mb-2">{label}</p>
      <p className={`font-mono text-2xl font-semibold ${valueClass}`}>{value}</p>
      {subValue && <p className="text-xs text-foreground-dim mt-1 font-mono">{subValue}</p>}
    </div>
  );
}
