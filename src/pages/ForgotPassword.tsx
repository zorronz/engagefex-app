import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, AlertCircle, CheckCircle, ArrowLeft, Mail } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      // Always show success to avoid revealing if email exists
      if (error && error.message !== 'For security purposes, you can only request this after 60 seconds.') {
        // Only surface rate-limit errors; swallow all others
        if (error.message.toLowerCase().includes('rate') || error.message.toLowerCase().includes('second')) {
          setError(error.message);
        }
      }
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

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
              Account recovery
            </h1>
            <p className="text-foreground-muted text-sm leading-relaxed max-w-xs">
              Enter your email and we'll send you a secure link to reset your password.
            </p>
          </div>
        </div>
        <div className="relative z-10 p-4 bg-surface-elevated rounded border border-border">
          <p className="text-xs text-foreground-muted leading-relaxed">
            Reset links expire after <span className="text-foreground font-mono font-semibold">60 minutes</span> and can only be used once.
          </p>
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

          <Link
            to="/auth"
            className="inline-flex items-center gap-1.5 text-xs text-foreground-muted hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Sign In
          </Link>

          {sent ? (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-earn-dim border border-earn/30 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-5 h-5 text-earn" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Check your inbox</h2>
                  <p className="text-foreground-muted text-sm">Reset link sent</p>
                </div>
              </div>

              <div className="bg-earn-dim border border-earn/30 rounded p-4">
                <div className="flex items-start gap-2.5">
                  <CheckCircle className="w-4 h-4 text-earn mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-foreground">
                    If <span className="font-mono font-semibold">{email}</span> is registered, you'll receive a password reset link shortly.
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-xs text-foreground-muted">
                <p>• Check your spam folder if you don't see it</p>
                <p>• The link expires in 60 minutes</p>
                <p>• The link can only be used once</p>
              </div>

              <button
                onClick={() => { setSent(false); setEmail(''); setError(''); }}
                className="text-sm text-primary hover:underline"
              >
                Try a different email
              </button>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-foreground mb-1">Forgot Password</h2>
                <p className="text-foreground-muted text-sm">
                  Enter your email address and we will send you a password reset link.
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
                  <label className="label-caps block mb-1.5">EMAIL ADDRESS</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    autoFocus
                    className="w-full bg-surface border border-border rounded px-3 py-2.5 text-sm text-foreground placeholder:text-foreground-dim focus:outline-none focus:border-primary/60 font-sans transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary text-primary-foreground font-semibold text-sm py-2.5 rounded transition-opacity disabled:opacity-50 hover:opacity-90"
                >
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
