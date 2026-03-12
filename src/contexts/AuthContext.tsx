import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;

interface StripeSubscription {
  subscribed: boolean;
  plan: string | null; // 'pro_monthly' | 'pro_yearly' | 'agency_monthly' | 'agency_yearly' | null
  subscription_end: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  mustChangePassword: boolean;
  loading: boolean;
  stripeSubscription: StripeSubscription;
  signUp: (email: string, password: string, name: string, referralCode?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  checkStripeSubscription: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stripeSubscription, setStripeSubscription] = useState<StripeSubscription>({
    subscribed: false, plan: null, subscription_end: null,
  });

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (data) {
      setProfile(data);
      setMustChangePassword(!!((data as Record<string, unknown>).must_change_password));
    }

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .in('role', ['admin', 'super_admin']);

    const roles = (roleData ?? []).map((r: { role: string }) => r.role);
    const hasSuperAdmin = roles.includes('super_admin');
    setIsAdmin(roles.includes('admin') || hasSuperAdmin);
    setIsSuperAdmin(hasSuperAdmin);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  const checkStripeSubscription = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('check-stripe-subscription');
      if (!error && data) {
        setStripeSubscription({
          subscribed: data.subscribed ?? false,
          plan: data.plan ?? null,
          subscription_end: data.subscription_end ?? null,
        });
      }
    } catch {
      // Silently fail — Stripe not configured yet
    }
  }, []);

  // Claim daily login reward (fire-and-forget)
  const claimDailyLogin = useCallback(async () => {
    try {
      await supabase.functions.invoke('claim-daily-login');
      // Refresh profile to show updated balance
      setTimeout(() => refreshProfile(), 1000);
    } catch {
      // Silently fail
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => fetchProfile(session.user.id), 0);
          // On sign_in events, claim daily reward and check subscription
          if (event === 'SIGNED_IN') {
            setTimeout(() => claimDailyLogin(), 500);
            setTimeout(() => checkStripeSubscription(), 1000);
          }
        } else {
          setProfile(null);
          setIsAdmin(false);
          setIsSuperAdmin(false);
          setMustChangePassword(false);
          setStripeSubscription({ subscribed: false, plan: null, subscription_end: null });
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
        // Check subscription on page load for existing session
        setTimeout(() => checkStripeSubscription(), 500);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const signUp = async (email: string, password: string, name: string, referralCode?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, referral_code: referralCode },
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
      },
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{
      user, session, profile,
      isAdmin, isSuperAdmin, mustChangePassword,
      loading,
      stripeSubscription,
      signUp, signIn, signOut, refreshProfile,
      checkStripeSubscription,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
