import React, { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { CreditCard, ExternalLink, Loader2, CheckCircle2 } from 'lucide-react';

export default function Billing() {
  const { stripeSubscription, checkStripeSubscription } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openCustomerPortal = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('create-stripe-checkout', {
        body: { portal: true },
      });
      if (fnError || !data?.url) {
        // Try the dedicated customer-portal function if it exists
        const { data: portalData, error: portalError } = await supabase.functions.invoke('customer-portal');
        if (portalError || !portalData?.url) throw new Error('Unable to open billing portal. Please try again.');
        window.open(portalData.url, '_blank');
      } else {
        window.open(data.url, '_blank');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return null;
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-2xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="font-mono text-lg font-bold tracking-wider uppercase text-foreground">Billing</h1>
          <p className="text-sm text-foreground-muted mt-1">Manage your subscription and payment details.</p>
        </div>

        {/* Subscription status card */}
        <div className="bg-surface border border-border rounded p-5 space-y-4">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-foreground-muted" />
            <p className="label-caps">CURRENT PLAN</p>
          </div>

          {stripeSubscription.subscribed ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-earn" />
                <span className="text-sm font-medium text-foreground">Active Subscription</span>
                {stripeSubscription.plan && (
                  <span className="label-caps px-2 py-0.5 rounded bg-primary/10 text-primary">
                    {stripeSubscription.plan.replace(/_/g, ' ').toUpperCase()}
                  </span>
                )}
              </div>
              {stripeSubscription.subscription_end && (
                <p className="text-xs text-foreground-muted">
                  Renews on <span className="text-foreground font-medium">{formatDate(stripeSubscription.subscription_end)}</span>
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-foreground-muted">
              You do not currently have an active subscription.
            </p>
          )}

          <div className="pt-1 border-t border-border space-y-2">
            <button
              onClick={openCustomerPortal}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ExternalLink className="w-4 h-4" />
              )}
              Manage Subscription
            </button>
            {error && <p className="text-xs text-spend">{error}</p>}
            <p className="text-xs text-foreground-muted">
              You'll be redirected to a secure Stripe portal to update payment methods, download invoices, or cancel your subscription.
            </p>
          </div>
        </div>

        {/* Refresh hint */}
        <button
          onClick={checkStripeSubscription}
          className="mt-4 text-xs text-foreground-muted hover:text-foreground transition-colors underline underline-offset-2"
        >
          Refresh subscription status
        </button>
      </div>
    </DashboardLayout>
  );
}
