import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Streak reward map: day → credits awarded
const STREAK_REWARDS: Record<number, number> = {
  1: 5,
  2: 5,
  3: 10,
  4: 5,
  5: 20,
  6: 5,
  7: 30,
};

function getStreakReward(streakDay: number): number {
  return STREAK_REWARDS[streakDay] ?? 5;
}

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
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("user_id, points_balance, points_earned, daily_login_claimed_at, login_streak")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile) throw new Error("Profile not found");

    // Check if already claimed today
    const lastClaimed = profile.daily_login_claimed_at;
    if (lastClaimed === today) {
      return new Response(JSON.stringify({ claimed: false, reason: "already_claimed_today", streak: profile.login_streak ?? 1 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Calculate new streak
    const currentStreak = profile.login_streak ?? 0;
    let newStreak: number;
    if (lastClaimed === yesterday) {
      // Consecutive day
      newStreak = Math.min(currentStreak + 1, 7);
    } else {
      // Streak broken or first claim
      newStreak = 1;
    }

    const reward = getStreakReward(newStreak);
    const newBalance = (profile.points_balance ?? 0) + reward;
    const newPointsEarned = (profile.points_earned ?? 0) + reward;

    // Update profile
    await supabase.from("profiles").update({
      points_balance: newBalance,
      points_earned: newPointsEarned,
      daily_login_claimed_at: today,
      login_streak: newStreak,
      updated_at: new Date().toISOString(),
    }).eq("user_id", user.id);

    // Log transaction
    await supabase.from("wallet_transactions").insert({
      user_id: user.id,
      transaction_type: "bonus",
      points: reward,
      balance_after: newBalance,
      description: `Daily login reward — Day ${newStreak} streak`,
      reference_type: "daily_login",
    });

    return new Response(JSON.stringify({
      claimed: true,
      credits_awarded: reward,
      new_balance: newBalance,
      streak: newStreak,
      streak_reset: newStreak === 1 && currentStreak > 1,
    }), {
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
