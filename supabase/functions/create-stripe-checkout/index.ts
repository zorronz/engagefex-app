import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Stripe price IDs — map plan keys to real Stripe price IDs
const STRIPE_PRICES: Record<string, string> = {
  pro_monthly:     "price_1TAFLjPPIQmBAiD8ZuNgFYN5",
  pro_yearly:      "price_1TAFM3PPIQmBAiD81sAvMMJx",
  agency_monthly:  "price_1TAFMTPPIQmBAiD8b87sgxjH",
  agency_yearly:   "price_1TAFMlPPIQmBAiD8KI2VPyoE",
};

const logStep = (step: string, details?: unknown) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CREATE-STRIPE-CHECKOUT] ${step}${d}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user?.email) throw new Error("Not authenticated");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { plan, pack_name, price_usd } = await req.json();
    logStep("Request params", { plan, pack_name, price_usd });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Upsert Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId = customers.data[0]?.id;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email });
      customerId = customer.id;
      logStep("Created Stripe customer", { customerId });
    } else {
      logStep("Found existing customer", { customerId });
    }

    const origin = req.headers.get("origin") || "https://xengage.lovable.app";

    // Subscription checkout
    if (plan) {
      const priceId = STRIPE_PRICES[plan];
      if (!priceId) throw new Error(`Unknown plan: ${plan}`);

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        line_items: [{ price: priceId, quantity: 1 }],
        mode: "subscription",
        success_url: `${origin}/wallet?stripe_success=1&plan=${plan}`,
        cancel_url: `${origin}/wallet?stripe_cancel=1`,
        metadata: { user_id: user.id, plan },
      });
      logStep("Subscription session created", { sessionId: session.id });
      return new Response(JSON.stringify({ url: session.url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // One-time credit pack checkout
    if (pack_name && price_usd) {
      const priceKey = pack_name.toLowerCase().replace(/\s+/g, "_");
      const priceId = STRIPE_PRICES[priceKey];

      let lineItem;
      if (priceId) {
        lineItem = { price: priceId, quantity: 1 };
      } else {
        // Fallback: use price_data for packs not yet in Stripe catalog
        lineItem = {
          price_data: {
            currency: "usd",
            unit_amount: Math.round(price_usd * 100),
            product_data: { name: pack_name },
          },
          quantity: 1,
        };
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        line_items: [lineItem as Parameters<typeof stripe.checkout.sessions.create>[0]["line_items"][0]],
        mode: "payment",
        success_url: `${origin}/wallet?stripe_pack_success=1&pack=${encodeURIComponent(pack_name)}`,
        cancel_url: `${origin}/wallet?stripe_cancel=1`,
        metadata: { user_id: user.id, pack_name },
      });
      logStep("Pack session created", { sessionId: session.id });
      return new Response(JSON.stringify({ url: session.url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Must provide plan or pack_name");
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
