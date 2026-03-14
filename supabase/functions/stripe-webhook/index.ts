import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno&no-check=true";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Map Stripe price IDs to internal plan names
const PRICE_TO_PLAN: Record<string, string> = {
  price_pro_monthly_5:      "pro_monthly",
  price_pro_yearly_50:      "pro_yearly",
  price_agency_monthly_15:  "agency_monthly",
  price_agency_yearly_150:  "agency_yearly",
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[STRIPE-WEBHOOK] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!stripeKey) {
    return new Response(JSON.stringify({ error: "STRIPE_SECRET_KEY not set" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" as never });

  const body = await req.text();
  let event: Stripe.Event;

  // Verify webhook signature if secret is configured
  if (webhookSecret) {
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      logStep("ERROR: Missing stripe-signature header");
      return new Response(JSON.stringify({ error: "Missing stripe-signature" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
      logStep("Webhook signature verified", { type: event.type });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logStep("ERROR: Invalid webhook signature", { msg });
      return new Response(JSON.stringify({ error: `Invalid signature: ${msg}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }
  } else {
    // No secret configured — parse without verification (dev/testing only)
    logStep("WARNING: STRIPE_WEBHOOK_SECRET not set, skipping signature verification");
    try {
      event = JSON.parse(body) as Stripe.Event;
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }
  }

  try {
    switch (event.type) {

      // ── checkout.session.completed ──────────────────────────────────────────
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        logStep("checkout.session.completed", { sessionId: session.id, mode: session.mode });

        if (session.mode === "subscription" && session.customer_email) {
          const customerId = typeof session.customer === "string"
            ? session.customer
            : session.customer?.id ?? null;

          const subscriptionId = typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id ?? null;

          if (subscriptionId && customerId) {
            const sub = await stripe.subscriptions.retrieve(subscriptionId);
            const priceId = sub.items.data[0]?.price?.id ?? "";
            const plan = PRICE_TO_PLAN[priceId] ?? "pro_monthly";

            await supabase
              .from("profiles")
              .update({
                is_premium: true,
                stripe_customer_id: customerId,
                stripe_subscription_id: subscriptionId,
                stripe_plan: plan,
              })
              .eq("email", session.customer_email);

            logStep("Profile updated on checkout.session.completed", { plan });
          }
        }
        break;
      }

      // ── invoice.paid ────────────────────────────────────────────────────────
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("invoice.paid", { invoiceId: invoice.id });

        const customerId = typeof invoice.customer === "string"
          ? invoice.customer
          : invoice.customer?.id ?? null;

        if (!customerId) break;

        const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
        if (!customer.email) break;

        // Fetch active subscription to determine plan
        const subscriptions = await stripe.subscriptions.list({
          customer: customerId,
          status: "active",
          limit: 1,
        });

        if (subscriptions.data.length > 0) {
          const sub = subscriptions.data[0];
          const priceId = sub.items.data[0]?.price?.id ?? "";
          const plan = PRICE_TO_PLAN[priceId] ?? "pro_monthly";

          await supabase
            .from("profiles")
            .update({
              is_premium: true,
              stripe_customer_id: customerId,
              stripe_subscription_id: sub.id,
              stripe_plan: plan,
            })
            .eq("email", customer.email);

          logStep("Profile refreshed on invoice.paid", { plan, email: customer.email });
        }

        // ── Affiliate commission logic (Phase 1) ──────────────────────────────
        // Only process subscription invoices with a real payment amount
        const isSubscriptionInvoice = !!(invoice.subscription);
        const amountPaid = invoice.amount_paid ?? 0;

        if (isSubscriptionInvoice && amountPaid > 0) {
          logStep("Processing affiliate commission", { invoiceId: invoice.id, amountPaid });

          // Look up the paying user by stripe_customer_id
          const { data: payerProfile } = await supabase
            .from("profiles")
            .select("user_id")
            .eq("stripe_customer_id", customerId)
            .maybeSingle();

          if (payerProfile?.user_id) {
            const referredUserId = payerProfile.user_id;

            // Check if this user was referred by someone (uses existing referrals table)
            const { data: referralRow } = await supabase
              .from("referrals")
              .select("referrer_id")
              .eq("referred_id", referredUserId)
              .maybeSingle();

            if (referralRow?.referrer_id) {
              const referrerId = referralRow.referrer_id;

              // Prevent self-referral (safety guard)
              if (referrerId !== referredUserId) {
                const subscriptionId = typeof invoice.subscription === "string"
                  ? invoice.subscription
                  : (invoice.subscription as { id?: string })?.id ?? null;

                const commissionAmount = (amountPaid / 100) * 0.25; // Stripe amounts are in cents

                // Insert commission — UNIQUE constraint on invoice_id prevents duplicates
                const { error: commissionError } = await supabase
                  .from("affiliate_commissions")
                  .insert({
                    referrer_id: referrerId,
                    referred_user_id: referredUserId,
                    subscription_id: subscriptionId,
                    invoice_id: invoice.id,
                    amount: commissionAmount,
                    commission_rate: 0.25,
                    status: "pending",
                  });

                if (commissionError) {
                  // Unique violation = already recorded; all other errors are logged
                  if (!commissionError.message.includes("duplicate") && !commissionError.message.includes("unique")) {
                    logStep("ERROR inserting affiliate commission", { error: commissionError.message });
                  } else {
                    logStep("Duplicate commission skipped (already recorded)", { invoiceId: invoice.id });
                  }
                } else {
                  logStep("Affiliate commission recorded", {
                    referrerId,
                    referredUserId,
                    commissionAmount,
                    invoiceId: invoice.id,
                  });
                }
              }
            } else {
              logStep("No referrer found for user, skipping commission", { referredUserId });
            }
          } else {
            logStep("Could not resolve paying user from stripe_customer_id", { customerId });
          }
        }
        // ─────────────────────────────────────────────────────────────────────

        break;
      }

      // ── invoice.payment_failed ──────────────────────────────────────────────
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("invoice.payment_failed", { invoiceId: invoice.id });

        const customerId = typeof invoice.customer === "string"
          ? invoice.customer
          : invoice.customer?.id ?? null;

        if (!customerId) break;

        const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
        if (!customer.email) break;

        // Do not immediately revoke access — Stripe retries. Just log.
        logStep("Payment failed, not revoking access yet", { email: customer.email });
        break;
      }

      // ── customer.subscription.deleted ──────────────────────────────────────
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        logStep("customer.subscription.deleted", { subId: sub.id });

        const customerId = typeof sub.customer === "string"
          ? sub.customer
          : sub.customer?.id ?? null;

        if (!customerId) break;

        const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
        if (!customer.email) break;

        // Revoke premium access
        await supabase
          .from("profiles")
          .update({
            is_premium: false,
            stripe_plan: null,
            stripe_subscription_id: null,
          })
          .eq("email", customer.email);

        logStep("Premium revoked on subscription cancellation", { email: customer.email });
        break;
      }

      // ── customer.subscription.updated ──────────────────────────────────────
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        logStep("customer.subscription.updated", { subId: sub.id, status: sub.status });

        const customerId = typeof sub.customer === "string"
          ? sub.customer
          : sub.customer?.id ?? null;

        if (!customerId) break;

        const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
        if (!customer.email) break;

        const priceId = sub.items.data[0]?.price?.id ?? "";
        const plan = PRICE_TO_PLAN[priceId] ?? "pro_monthly";
        const isActive = sub.status === "active";

        await supabase
          .from("profiles")
          .update({
            is_premium: isActive,
            stripe_plan: isActive ? plan : null,
            stripe_subscription_id: isActive ? sub.id : null,
          })
          .eq("email", customer.email);

        logStep("Profile updated on subscription change", { plan, isActive });
        break;
      }

      default:
        logStep(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR handling event", { type: event.type, msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
