import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, AlertCircle, Loader2, TrendingUp } from 'lucide-react';

export default function AuthConfirmPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const hash = window.location.hash.substring(1); // strip leading #
    const params = new URLSearchParams(hash);

    const errorCode = params.get('error_code');
    const errorDescription = params.get('error_description');
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    // Hash contains an error from Supabase's /verify redirect
    if (errorCode || errorDescription) {
      setStatus('error');
      setMessage(
        errorDescription
          ? decodeURIComponent(errorDescription.replace(/\+/g, ' '))
          : 'Verification failed. The link may have expired.'
      );
      return;
    }

    // Hash contains a session — implicit flow success
    if (accessToken && refreshToken) {
      supabase.auth
        .setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ error }) => {
          if (error) {
            setStatus('error');
            setMessage(error.message || 'Could not establish session. Please try signing in.');
          } else {
            setStatus('success');
            setMessage('Email verified! Setting up your account…');
            setTimeout(() => navigate('/choose-plan'), 2000);
          }
        });
      return;
    }

    // No recognised params at all
    setStatus('error');
    setMessage('Invalid verification link. Please request a new verification email.');
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="w-full max-w-sm text-center space-y-6">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-7 h-7 bg-primary rounded-sm flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-mono text-sm font-semibold tracking-wider text-foreground uppercase">
            EngageExchange
          </span>
        </div>

        {status === 'loading' && (
          <div className="space-y-4">
            <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto" />
            <p className="text-foreground-muted text-sm">Verifying your email…</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4">
            <div className="w-16 h-16 rounded-full bg-earn-dim border border-earn/30 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-earn" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">Email verified!</h2>
            <p className="text-foreground-muted text-sm leading-relaxed">{message}</p>
            <p className="text-xs text-earn font-mono">+50 bonus points added to your wallet</p>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <div className="w-16 h-16 rounded-full bg-spend-dim border border-spend/30 flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8 text-spend" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">Verification failed</h2>
            <p className="text-foreground-muted text-sm leading-relaxed">{message}</p>
            <button
              onClick={() => navigate('/auth')}
              className="w-full bg-primary text-primary-foreground font-semibold text-sm py-2.5 rounded hover:opacity-90 transition-opacity"
            >
              Back to Sign In
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
