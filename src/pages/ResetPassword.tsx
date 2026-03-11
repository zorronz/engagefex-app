import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, AlertCircle, CheckCircle, Eye, EyeOff, ShieldCheck } from 'lucide-react';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState('');

  useEffect(() => {
    // Supabase redirects with the token in the URL hash as type=recovery
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true);
      }
    });

    // Also check current session in case the event already fired
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true);
    });

    // Detect missing/invalid token after a short delay
    const timer = setTimeout(() => {
      if (!sessionReady) {
        setSessionError('This reset link is invalid or has expired. Please request a new one.');
      }
    }, 3000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setError(error.message);
      } else {
        setSuccess(true);
        // Sign out so they log in fresh with new password
        await supabase.auth.signOut();
      }
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = (() => {
    if (!password) return null;
    if (password.length < 8) return { label: 'Too short', cls: 'text-spend', w: 'w-1/4' };
    if (password.length < 10) return { label: 'Weak', cls: 'text-yellow-400', w: 'w-1/2' };
    if (/[A-Z]/.test(password) && /[0-9]/.test(password)) return { label: 'Strong', cls: 'text-earn', w: 'w-full' };
    return { label: 'Moderate', cls: 'text-primary', w: 'w-3/4' };
  })();

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 border-r border-border bg-surface relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="grid grid-cols-8 gap-px h-full">
            {Array.from({ length: 64 }).map((_, i) => (
              <div key={i} className="border border-border-subtle" />
            ))}
          </div>
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-16">
            <div className="w-7 h-7 bg-primary rounded-sm flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-mono text-sm font-semibold tracking-wider text-foreground uppercase">EngageExchange</span>
          </div>
          <div className="space-y-4">
            <h1 className="text-3xl font-semibold text-foreground leading-tight">
              Set a new password
            </h1>
            <p className="text-foreground-muted text-sm leading-relaxed max-w-xs">
              Choose a strong password to keep your account secure.
            </p>
          </div>
        </div>
        <div className="relative z-10 space-y-2">
          {[
            'At least 8 characters',
            'Mix of uppercase and lowercase',
            'Include numbers or symbols',
          ].map(tip => (
            <div key={tip} className="flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-primary flex-shrink-0" />
              <p className="text-xs text-foreground-muted">{tip}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-6 h-6 bg-primary rounded-sm flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <span className="font-mono text-xs font-semibold tracking-wider uppercase">EngageExchange</span>
          </div>

          {success ? (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-earn-dim border border-earn/30 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-5 h-5 text-earn" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Password updated</h2>
                  <p className="text-foreground-muted text-sm">Your account is secure</p>
                </div>
              </div>

              <div className="bg-earn-dim border border-earn/30 rounded p-4">
                <p className="text-sm text-foreground">
                  Your password has been successfully updated. You can now log in with your new password.
                </p>
              </div>

              <Link
                to="/auth"
                className="block w-full text-center bg-primary text-primary-foreground font-semibold text-sm py-2.5 rounded hover:opacity-90 transition-opacity"
              >
                Go to Login
              </Link>
            </div>
          ) : sessionError ? (
            <div className="space-y-6">
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-foreground mb-1">Link expired</h2>
                <p className="text-foreground-muted text-sm">This reset link is no longer valid.</p>
              </div>
              <div className="flex items-start gap-2.5 p-3 bg-spend-dim border border-spend/30 rounded text-sm text-foreground">
                <AlertCircle className="w-4 h-4 text-spend mt-0.5 flex-shrink-0" />
                <span>{sessionError}</span>
              </div>
              <Link
                to="/forgot-password"
                className="block w-full text-center bg-primary text-primary-foreground font-semibold text-sm py-2.5 rounded hover:opacity-90 transition-opacity"
              >
                Request New Link
              </Link>
              <div className="text-center">
                <Link to="/auth" className="text-xs text-foreground-muted hover:text-foreground transition-colors">
                  Back to Sign In
                </Link>
              </div>
            </div>
          ) : !sessionReady ? (
            <div className="text-center space-y-4">
              <div className="font-mono text-xs text-foreground-muted animate-pulse">VERIFYING RESET LINK...</div>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-foreground mb-1">Reset Password</h2>
                <p className="text-foreground-muted text-sm">
                  Enter your new password below.
                </p>
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
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      autoFocus
                      className="w-full bg-surface border border-border rounded px-3 py-2.5 text-sm text-foreground placeholder:text-foreground-dim focus:outline-none focus:border-primary/60 font-sans transition-colors pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-dim hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {passwordStrength && (
                    <div className="mt-2 space-y-1">
                      <div className="h-0.5 bg-border rounded overflow-hidden">
                        <div className={`h-full ${passwordStrength.w} bg-current ${passwordStrength.cls} transition-all duration-300`} />
                      </div>
                      <p className={`text-xs font-mono ${passwordStrength.cls}`}>{passwordStrength.label}</p>
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
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-dim hover:text-foreground"
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {confirm && password && confirm !== password && (
                    <p className="text-xs text-spend mt-1.5 font-mono">Passwords do not match</p>
                  )}
                  {confirm && password && confirm === password && (
                    <p className="text-xs text-earn mt-1.5 font-mono">✓ Passwords match</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || !password || !confirm}
                  className="w-full bg-primary text-primary-foreground font-semibold text-sm py-2.5 rounded transition-opacity disabled:opacity-50 hover:opacity-90 mt-2"
                >
                  {loading ? 'Updating...' : 'Reset Password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
