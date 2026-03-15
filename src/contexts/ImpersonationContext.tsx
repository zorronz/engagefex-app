import React, { createContext, useContext, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface ImpersonationTarget {
  userId: string;
  name: string;
  email: string;
}

interface ImpersonationContextType {
  isImpersonating: boolean;
  target: ImpersonationTarget | null;
  startImpersonation: (target: ImpersonationTarget) => void;
  stopImpersonation: () => void;
}

const ImpersonationContext = createContext<ImpersonationContextType | null>(null);

const STORAGE_KEY = 'engagefex_impersonation';

export const ImpersonationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [target, setTarget] = useState<ImpersonationTarget | null>(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const navigate = useNavigate();

  const startImpersonation = useCallback(async (t: ImpersonationTarget) => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(t));
    setTarget(t);
    // Log to admin activity logs
    try {
      await supabase.from('admin_activity_logs').insert({
        action: 'impersonate_user',
        target_type: 'user',
        target_id: t.userId,
        details: { name: t.name, email: t.email },
        admin_id: (await supabase.auth.getUser()).data.user?.id ?? '',
      });
    } catch { /* non-blocking */ }
    navigate('/dashboard');
  }, [navigate]);

  const stopImpersonation = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    setTarget(null);
    navigate('/admin');
  }, [navigate]);

  return (
    <ImpersonationContext.Provider value={{
      isImpersonating: !!target,
      target,
      startImpersonation,
      stopImpersonation,
    }}>
      {children}
    </ImpersonationContext.Provider>
  );
};

export const useImpersonation = () => {
  const ctx = useContext(ImpersonationContext);
  if (!ctx) throw new Error('useImpersonation must be used within ImpersonationProvider');
  return ctx;
};
