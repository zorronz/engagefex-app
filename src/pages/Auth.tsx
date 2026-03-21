import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const REFERRAL_STORAGE_KEY = 'engagefex_ref';

export default function AuthPage() {
  const [searchParams] = useSearchParams();
  const { code: routeCode } = useParams<{ code?: string }>();
  const [mode, setMode] = useState<'login' | 'signup'>(
    searchParams.get('mode') === 'signup' ? 'signup' : 'login'
  );
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Priority: route param (/ref/:code) > query param (?ref=) > localStorage
  const resolveRef = () =>
    routeCode || searchParams.get('ref') || localStorage.getItem(REFERRAL_STORAGE_KEY) || '';

  const [referralCode, setReferralCode] = useState(resolveRef);
  const [referrerName, setReferrerName] = useState<string | null>(null);
  const [loadingReferrer, setLoadingReferrer] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  // Persist ref code to localStorage whenever it is resolved from URL/route
  useEffect(() => {
    const code = routeCode || searchParams.get('ref');
    if (code) {
      localStorage.setItem(REFERRAL_STORAGE_KEY, code);
      setReferralCode(code);
      // If visiting /ref/:code, switch to signup mode
      if (routeCode) setMode('signup');
    }
  }, [routeCode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch referrer name whenever a referral code is present (regardless of mode)
  useEffect(() => {
    const code = referralCode.trim();
    console.log("Referral code detected:", code);
    if (!code) { setReferrerName(null); setLoadingReferrer(false); return; }
    let cancelled = false;
    setLoadingReferrer(true);
    supabase
      .from('profiles')
      .select('name')
      .eq('referral_code', code)
      .maybeSingle()
      .then(({ data, error }) => {
        console.log("Referrer lookup result:", data, "error:", error);
        console.log("Referrer name:", data?.name);
        if (!cancelled) {
          setReferrerName(data?.name ?? null);
          setLoadingReferrer(false);
        }
      });
    return () => { cancelled = true; };
  }, [referralCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) {
          setError(error.message);
        } else {
          navigate('/dashboard');
        }
      } else {
        if (!name.trim()) { setError('Name is required'); setLoading(false); return; }
        if (password.length < 8) { setError('Password must be at least 8 characters'); setLoading(false); return; }
        const { error } = await signUp(email, password, name.trim(), referralCode || undefined);
        if (error) {
          setError(error.message);
        } else {
          // Clear stored referral code after successful signup
          localStorage.removeItem(REFERRAL_STORAGE_KEY);
          setSuccess('Account created! Check your inbox for a verification email and click the link to activate your account.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel - branding */}
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
            <span className="font-mono text-sm font-semibold tracking-wider text-foreground">EngagefeX</span>
          </div>
          <div className="space-y-6">
            <span className="inline-block text-[10px] font-semibold tracking-widest uppercase text-primary border border-primary/30 bg-primary/10 rounded px-2 py-1">
              Organic Growth Accelerator for Creators &amp; Marketers
            </span>
            <h1 className="text-3xl font-semibold text-foreground leading-tight">
              Turn Organic Posts Into Lead Generation Machines
            </h1>
            <p className="text-foreground-muted text-sm leading-relaxed max-w-xs">
              EngagefeX helps creators and marketers generate the early engagement their posts need so social media algorithms push their content to more people — resulting in more reach, followers, leads, and sales.
            </p>
          </div>
        </div>
        <div className="relative z-10 space-y-3">
          {[
            { label: 'IG Like', earn: '+2', cost: '4' },
            { label: 'YT Subscribe', earn: '+12', cost: '18' },
            { label: 'Comment', earn: '+8', cost: '12' },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between py-2.5 border-b border-border-subtle">
              <span className="font-mono text-xs text-foreground-muted">{item.label}</span>
              <div className="flex items-center gap-4">
                <span className="font-mono text-xs value-earn">{item.earn} pts</span>
                <span className="font-mono text-xs value-spend">{item.cost} pts</span>
              </div>
            </div>
          ))}
          <p className="label-caps mt-4">EARN / COST PER ACTION</p>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-6 h-6 bg-primary rounded-sm flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <span className="font-mono text-xs font-semibold tracking-wider">EngagefeX</span>
          </div>

          {mode === 'signup' && referralCode.trim() && (
            <div className="flex items-center gap-2 mb-6 px-3 py-2.5 bg-earn-dim border border-earn/30 rounded text-sm text-foreground-muted">
              <span className="text-base">👋</span>
              {loadingReferrer ? (
                <span>A friend invited you to EngagefeX</span>
              ) : referrerName ? (
                <span>You are invited to EngagefeX by <span className="text-earn font-semibold">{referrerName}</span></span>
              ) : (
                <span>A friend invited you to EngagefeX</span>
              )}
            </div>
          )}

          <div className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-1">
              {mode === 'login' ? 'Sign in to your account' : 'Create account'}
            </h2>
            <p className="text-foreground-muted text-sm">
              {mode === 'login'
                ? "New user? "
                : "Already have an account? "}
              <button
                onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setSuccess(''); }}
                className="text-primary hover:underline font-medium"
              >
                {mode === 'login' ? 'Create account' : 'Sign in'}
              </button>
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2.5 p-3 mb-4 bg-spend-dim border border-spend/30 rounded text-sm text-foreground">
              <AlertCircle className="w-4 h-4 text-spend mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="flex items-start gap-2.5 p-3 mb-4 bg-earn-dim border border-earn/30 rounded text-sm text-foreground">
              <CheckCircle className="w-4 h-4 text-earn mt-0.5 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="label-caps block mb-1.5">FULL NAME</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="John Doe"
                  required
                  className="w-full bg-surface border border-border rounded px-3 py-2.5 text-sm text-foreground placeholder:text-foreground-dim focus:outline-none focus:border-primary/60 font-sans transition-colors"
                />
              </div>
            )}
            <div>
              <label className="label-caps block mb-1.5">EMAIL ADDRESS</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full bg-surface border border-border rounded px-3 py-2.5 text-sm text-foreground placeholder:text-foreground-dim focus:outline-none focus:border-primary/60 font-sans transition-colors"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="label-caps">PASSWORD</label>
                {mode === 'login' && (
                  <Link to="/forgot-password" className="text-xs text-foreground-muted hover:text-primary transition-colors">
                    Forgot Password?
                  </Link>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
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
            </div>
            {mode === 'signup' && (
              <div>
                <label className="label-caps block mb-1.5">REFERRAL CODE <span className="text-foreground-dim normal-case">(optional)</span></label>
                <input
                  type="text"
                  value={referralCode}
                  onChange={e => setReferralCode(e.target.value)}
                  placeholder="abc12345"
                  className="w-full bg-surface border border-border rounded px-3 py-2.5 text-sm text-foreground placeholder:text-foreground-dim focus:outline-none focus:border-primary/60 font-mono transition-colors"
                />
                {referralCode && <p className="text-xs text-earn mt-1.5 font-mono">+50 bonus points on signup</p>}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground font-semibold text-sm py-2.5 rounded transition-opacity disabled:opacity-50 hover:opacity-90 mt-2"
            >
              {loading ? 'Processing...' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          {mode === 'signup' && (
            <p className="text-xs text-foreground-dim mt-4 text-center leading-relaxed">
              New accounts receive <span className="text-earn font-mono">50 bonus points</span>. One account per email address.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
