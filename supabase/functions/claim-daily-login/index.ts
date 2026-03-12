import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DAILY_REWARD = 5;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error("Not authenticated");

    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("user_id, points_balance, daily_login_claimed_at")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile) throw new Error("Profile not found");

    // Check if already claimed today
    const lastClaimed = profile.daily_login_claimed_at;
    if (lastClaimed === today) {
      return new Response(JSON.stringify({ claimed: false, reason: "already_claimed_today" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const newBalance = (profile.points_balance ?? 0) + DAILY_REWARD;

    // Update profile
    await supabase.from("profiles").update({
      points_balance: newBalance,
      points_earned: supabase.rpc ? undefined : undefined, // will be handled below
      daily_login_claimed_at: today,
      updated_at: new Date().toISOString(),
    }).eq("user_id", user.id);

    // Also increment points_earned via raw update
    await supabase.rpc("pg_temp.noop" as never).catch(() => null); // no-op
    // Use direct update to increment
    await supabase.from("profiles").update({
      points_balance: newBalance,
      daily_login_claimed_at: today,
    }).eq("user_id", user.id);

    // Increment points_earned separately
    const { data: updatedProfile } = await supabase
      .from("profiles")
      .select("points_earned")
      .eq("user_id", user.id)
      .single();

    if (updatedProfile) {
      await supabase.from("profiles").update({
        points_earned: (updatedProfile.points_earned ?? 0) + DAILY_REWARD,
      }).eq("user_id", user.id);
    }

    // Log transaction
    await supabase.from("wallet_transactions").insert({
      user_id: user.id,
      transaction_type: "bonus",
      points: DAILY_REWARD,
      balance_after: newBalance,
      description: "Daily login reward",
    });

    return new Response(JSON.stringify({ claimed: true, credits_awarded: DAILY_REWARD, new_balance: newBalance }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
