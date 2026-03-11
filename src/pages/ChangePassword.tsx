import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ShieldCheck, Eye, EyeOff, TrendingUp, CheckCircle, AlertCircle } from 'lucide-react';

export default function ChangePassword() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();

  const strength = (() => {
    if (!password) return 0;
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  })();

  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][strength];
  const strengthColor = ['', 'bg-spend', 'bg-yellow-500', 'bg-blue-500', 'bg-earn'][strength];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (strength < 2) { setError('Please choose a stronger password.'); return; }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) { setError(updateError.message); return; }

      // Clear the must_change_password flag
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('profiles').update({ must_change_password: false }).eq('user_id', user.id);
      }

      await refreshProfile();
      setSuccess(true);
      setTimeout(() => navigate('/admin'), 2000);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-12 h-12 rounded-full bg-earn-dim flex items-center justify-center mx-auto">
            <CheckCircle className="w-6 h-6 text-earn" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">Password updated</h2>
          <p className="text-sm text-foreground-muted">Redirecting to admin dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-10">
          <div className="w-7 h-7 bg-primary rounded-sm flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-mono text-sm font-semibold tracking-wider text-foreground uppercase">EngageExchange</span>
        </div>

        {/* Header */}
        <div className="flex items-start gap-3 mb-8 p-4 bg-surface border border-primary/30 rounded">
          <ShieldCheck className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-foreground mb-0.5">Security requirement</p>
            <p className="text-xs text-foreground-muted leading-relaxed">
              You are using a default password. Please set a new secure password before continuing.
            </p>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 p-3 mb-4 bg-spend-dim border border-spend/30 rounded text-sm text-foreground">
            <AlertCircle className="w-4 h-4 text-spend mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label-caps block mb-1.5">NEW PASSWORD</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-surface border border-border rounded px-3 py-2.5 text-sm text-foreground placeholder:text-foreground-dim focus:outline-none focus:border-primary/60 font-sans transition-colors pr-10"
              />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-dim hover:text-foreground">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {password && (
              <div className="mt-2 space-y-1">
                <div className="flex gap-1">
                  {[1,2,3,4].map(i => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= strength ? strengthColor : 'bg-border'}`} />
                  ))}
                </div>
                <p className={`text-xs font-mono ${strength >= 3 ? 'text-earn' : strength === 2 ? 'text-yellow-500' : 'text-spend'}`}>{strengthLabel}</p>
              </div>
            )}
          </div>

          <div>
            <label className="label-caps block mb-1.5">CONFIRM PASSWORD</label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-surface border border-border rounded px-3 py-2.5 text-sm text-foreground placeholder:text-foreground-dim focus:outline-none focus:border-primary/60 font-sans transition-colors pr-10"
              />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-dim hover:text-foreground">
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {confirm && password !== confirm && (
              <p className="text-xs text-spend mt-1 font-mono">Passwords do not match</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground font-semibold text-sm py-2.5 rounded transition-opacity disabled:opacity-50 hover:opacity-90 mt-2"
          >
            {loading ? 'Updating…' : 'Set New Password'}
          </button>
        </form>

        <button
          onClick={async () => { await signOut(); navigate('/auth'); }}
          className="w-full text-center text-xs text-foreground-dim hover:text-foreground mt-6 transition-colors"
        >
          Sign out instead
        </button>
      </div>
    </div>
  );
}
