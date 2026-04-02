import React, { useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AdminOverview from '@/components/admin/AdminOverview';
import AdminUsers from '@/components/admin/AdminUsers';
import AdminTasks from '@/components/admin/AdminTasks';
import AdminReferrals from '@/components/admin/AdminReferrals';
import AdminPayments from '@/components/admin/AdminPayments';
import AdminEconomy from '@/components/admin/AdminEconomy';
import AdminSecurity from '@/components/admin/AdminSecurity';
import AdminLogs from '@/components/admin/AdminLogs';
import AdminPlatformSettings from '@/components/admin/AdminPlatformSettings';
import AdminPricing from '@/components/admin/AdminPricing';
import AdminAffiliatePayouts from '@/components/admin/AdminAffiliatePayouts';
import AdminTrainingVideos from '@/components/admin/AdminTrainingVideos';
import {
  Shield,
  LayoutDashboard,
  Users,
  ListTodo,
  GitBranch,
  CreditCard,
  TrendingUp,
  Lock,
  ScrollText,
  Settings,
  DollarSign,
  Handshake,
  Video,
} from 'lucide-react';

type Tab = 'overview' | 'users' | 'tasks' | 'referrals' | 'payments' | 'economy' | 'security' | 'logs' | 'platform' | 'pricing' | 'affiliate-payouts' | 'training-videos';

export default function Admin() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = React.useState<Tab>('overview');

  const logAction = useCallback(async (
    action: string,
    targetType: string,
    targetId: string,
    details?: Record<string, unknown>
  ) => {
    if (!user) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('admin_activity_logs') as any).insert({
      admin_id: user.id,
      action,
      target_type: targetType,
      target_id: targetId,
      details: details ?? null,
    });
  }, [user]);

  const tabs: { key: Tab; icon: React.ElementType; label: string }[] = [
    { key: 'overview',          icon: LayoutDashboard, label: 'Overview' },
    { key: 'users',             icon: Users,           label: 'Users' },
    { key: 'tasks',             icon: ListTodo,        label: 'Tasks' },
    { key: 'referrals',         icon: GitBranch,       label: 'Referrals' },
    { key: 'payments',          icon: CreditCard,      label: 'Payments' },
    { key: 'economy',           icon: TrendingUp,      label: 'Economy' },
    { key: 'security',          icon: Lock,            label: 'Security' },
    { key: 'logs',              icon: ScrollText,      label: 'Activity Logs' },
    { key: 'pricing',           icon: DollarSign,      label: 'Pricing' },
    { key: 'affiliate-payouts', icon: Handshake,       label: 'Affiliate Payouts' },
    { key: 'platform',          icon: Settings,        label: 'Platform Settings' },
    { key: 'training-videos',   icon: Video,           label: 'Training Videos' },
  ];

  return (
    <DashboardLayout>
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded bg-yellow-400/15 border border-yellow-400/25 flex items-center justify-center">
            <Shield className="w-4 h-4 text-yellow-400" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-foreground">Super Admin</h1>
            <p className="text-xs text-foreground-muted">Platform management & monitoring</p>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-0.5 border-b border-border overflow-x-auto">
          {tabs.map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-foreground-muted hover:text-foreground hover:border-border'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'overview'          && <AdminOverview />}
        {activeTab === 'users'             && <AdminUsers logAction={logAction} />}
        {activeTab === 'tasks'             && <AdminTasks logAction={logAction} />}
        {activeTab === 'referrals'         && <AdminReferrals />}
        {activeTab === 'payments'          && <AdminPayments logAction={logAction} />}
        {activeTab === 'economy'           && <AdminEconomy logAction={logAction} />}
        {activeTab === 'security'          && <AdminSecurity />}
        {activeTab === 'logs'             && <AdminLogs />}
        {activeTab === 'pricing'           && <AdminPricing />}
        {activeTab === 'affiliate-payouts' && <AdminAffiliatePayouts />}
        {activeTab === 'platform'          && <AdminPlatformSettings />}
      </div>
    </DashboardLayout>
  );
}
