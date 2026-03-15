import React from 'react';
import { ShieldAlert, LogOut } from 'lucide-react';
import { useImpersonation } from '@/contexts/ImpersonationContext';

export default function ImpersonationBanner() {
  const { isImpersonating, target, stopImpersonation } = useImpersonation();

  if (!isImpersonating || !target) return null;

  return (
    <div className="sticky top-0 z-50 w-full bg-yellow-400/10 border-b border-yellow-400/30 px-4 py-2 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <ShieldAlert className="w-4 h-4 text-yellow-400 flex-shrink-0" />
        <span className="text-xs text-yellow-400 font-mono font-medium">
          ADMIN VIEWING USER ACCOUNT — {target.name} ({target.email})
        </span>
      </div>
      <button
        onClick={stopImpersonation}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-400/20 border border-yellow-400/40 text-yellow-400 rounded text-xs font-medium hover:bg-yellow-400/30 transition-colors flex-shrink-0"
      >
        <LogOut className="w-3 h-3" />
        Return to Admin
      </button>
    </div>
  );
}
