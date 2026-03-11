import React, { useState } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  ListTodo,
  PlusCircle,
  Wallet,
  Users,
  Shield,
  TrendingUp,
  LogOut,
  ChevronRight,
  Menu,
  X,
  Zap,
  ArrowUpCircle
} from 'lucide-react';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/marketplace', icon: ListTodo, label: 'Marketplace' },
  { to: '/campaigns', icon: PlusCircle, label: 'Campaigns' },
  { to: '/wallet', icon: Wallet, label: 'Wallet' },
  { to: '/referrals', icon: Users, label: 'Referrals' },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
  rightPanel?: React.ReactNode;
  rightPanelTitle?: string;
}

export default function DashboardLayout({ children, rightPanel, rightPanelTitle }: DashboardLayoutProps) {
  const { profile, isAdmin, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const trustColor = profile?.trust_score
    ? profile.trust_score >= 80 ? 'text-earn' : profile.trust_score >= 50 ? 'text-yellow-400' : 'text-spend'
    : 'text-foreground-muted';

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-background/80 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Left Nav Rail */}
      <aside className={`
        fixed lg:relative z-50 lg:z-auto flex flex-col h-full
        w-56 lg:w-14 xl:w-56
        bg-sidebar border-r border-sidebar-border
        transition-transform duration-200
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 py-4 border-b border-sidebar-border h-14">
          <div className="w-6 h-6 bg-primary rounded-sm flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-3.5 h-3.5 text-primary-foreground" />
          </div>
          <span className="font-mono text-xs font-bold tracking-wider uppercase text-foreground lg:hidden xl:block">
            EngageExch.
          </span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="ml-auto lg:hidden xl:inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-primary/15 text-primary border border-primary/25 cursor-default select-none leading-none">
                  Beta
                </span>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs">
                This platform is currently in beta testing. Features may change and occasional bugs may occur.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <button
            className="ml-auto text-foreground-dim hover:text-foreground lg:hidden"
            onClick={() => setMobileOpen(false)}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Stats */}
        <div className="px-3 py-3 border-b border-sidebar-border lg:hidden xl:block">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="label-caps">BALANCE</span>
              <span className="font-mono text-sm value-earn font-semibold">
                {profile?.points_balance?.toLocaleString() ?? '—'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="label-caps">TRUST</span>
              <span className={`font-mono text-sm font-semibold ${trustColor}`}>
                {profile?.trust_score?.toFixed(0) ?? '—'}
              </span>
            </div>
            {profile?.is_premium && (
              <div className="flex items-center gap-1.5 mt-1">
                <Zap className="w-3 h-3 text-yellow-400" />
                <span className="label-caps text-yellow-400">PREMIUM</span>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-2">
          {navItems.map(({ to, icon: Icon, label }) => {
            const active = location.pathname === to;
            return (
              <NavLink
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                className={`
                  flex items-center gap-2.5 px-3 py-2.5 mx-2 rounded transition-colors group
                  ${active
                    ? 'bg-primary/10 text-primary border-l-2 border-primary pl-2.5'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground'}
                `}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm font-medium lg:hidden xl:block">{label}</span>
                {active && <ChevronRight className="w-3 h-3 ml-auto lg:hidden xl:block" />}
              </NavLink>
            );
          })}
          {isAdmin && (
            <NavLink
              to="/admin"
              onClick={() => setMobileOpen(false)}
              className={`
                flex items-center gap-2.5 px-3 py-2.5 mx-2 rounded transition-colors mt-1
                ${location.pathname === '/admin'
                  ? 'bg-primary/10 text-primary border-l-2 border-primary pl-2.5'
                  : 'text-yellow-400/70 hover:bg-sidebar-accent hover:text-yellow-400'}
              `}
            >
              <Shield className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm font-medium lg:hidden xl:block">Admin</span>
            </NavLink>
          )}
          {/* Upgrade button — shown to non-premium users */}
          {!profile?.is_premium && (
            <NavLink
              to="/wallet"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 mx-2 mt-2 rounded bg-primary/10 border border-primary/25 text-primary hover:bg-primary/20 transition-colors"
            >
              <ArrowUpCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm font-semibold lg:hidden xl:block">Upgrade</span>
            </NavLink>
          )}
        </nav>

        {/* User + signout */}
        <div className="px-3 py-3 border-t border-sidebar-border">
          <div className="flex items-center gap-2.5 mb-2 lg:hidden xl:flex">
            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-primary font-mono">
                {profile?.name?.[0]?.toUpperCase() ?? '?'}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-foreground truncate">{profile?.name ?? 'Loading...'}</p>
              <p className="text-xs text-foreground-dim truncate">{profile?.email ?? ''}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 w-full px-2 py-1.5 text-foreground-dim hover:text-spend transition-colors rounded hover:bg-sidebar-accent text-sm"
          >
            <LogOut className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="lg:hidden xl:block">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 min-w-0 flex-col overflow-hidden">
        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-surface h-14">
          <button onClick={() => setMobileOpen(true)} className="text-foreground-muted">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-primary rounded-sm flex items-center justify-center">
              <TrendingUp className="w-3 h-3 text-primary-foreground" />
            </div>
            <span className="font-mono text-xs font-bold tracking-wider uppercase">EngageExch.</span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-primary/15 text-primary border border-primary/25 select-none leading-none">
              Beta
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="font-mono text-xs value-earn font-semibold">
              {profile?.points_balance?.toLocaleString() ?? '—'} pts
            </span>
          </div>
        </header>

        <div className="flex flex-1 min-h-0">
          {/* Center column */}
          <main className="flex-1 overflow-y-auto min-w-0">
            {children}
          </main>

          {/* Right context panel */}
          {rightPanel && (
            <aside className="hidden xl:flex flex-col w-72 border-l border-border bg-surface overflow-y-auto flex-shrink-0">
              {rightPanelTitle && (
                <div className="px-4 py-3.5 border-b border-border">
                  <p className="label-caps">{rightPanelTitle}</p>
                </div>
              )}
              {rightPanel}
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
