import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { MessageCircle, HelpCircle } from 'lucide-react';

export default function Support() {
  const [widgetConfigured, setWidgetConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('platform_settings')
        .select('value')
        .eq('key', 'support_widget_script')
        .maybeSingle();
      const script = data?.value?.trim();
      setWidgetConfigured(!!script);
      // Attempt to trigger widget open if available (Tawk.to / Crisp APIs)
      if (script) {
        try {
          // Tawk.to
          if ((window as Record<string, unknown>).Tawk_API) {
            ((window as Record<string, unknown>).Tawk_API as { maximize?: () => void }).maximize?.();
          }
          // Crisp
          if ((window as Record<string, unknown>).$crisp) {
            ((window as Record<string, unknown>).$crisp as { push: (args: unknown[]) => void }).push(['do', 'chat:open']);
          }
        } catch { /* widget not ready */ }
      }
    })();
  }, []);

  return (
    <DashboardLayout>
      <div className="p-6 max-w-lg mx-auto mt-12 space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center">
            <HelpCircle className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground font-mono">Support</h1>
            <p className="label-caps">GET HELP FROM OUR TEAM</p>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-lg p-6 space-y-4 text-center">
          {widgetConfigured === null ? (
            <p className="text-xs text-foreground-muted animate-pulse font-mono">Loading...</p>
          ) : widgetConfigured ? (
            <>
              <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <MessageCircle className="w-7 h-7 text-primary" />
              </div>
              <div className="space-y-2">
                <p className="font-semibold text-foreground">Need help?</p>
                <p className="text-sm text-foreground-muted leading-relaxed">
                  Click the chat bubble in the bottom right to send us a message.
                </p>
                <p className="text-sm text-foreground-muted">
                  Our team will respond by email.
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="w-14 h-14 bg-surface-elevated rounded-full flex items-center justify-center mx-auto">
                <MessageCircle className="w-7 h-7 text-foreground-dim" />
              </div>
              <p className="text-sm text-foreground-muted">
                Support is not configured yet. Please contact the administrator.
              </p>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
