import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const REWARD_MAP: Record<number, number> = {
  1: 500,
  2: 300,
  3: 200,
  4: 100, 5: 100, 6: 100, 7: 100, 8: 100, 9: 100, 10: 100,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Fetch all approved completions from this week
    const { data: completions, error: compError } = await supabase
      .from("task_completions")
      .select("user_id, points_awarded")
      .eq("status", "approved")
      .gte("approved_at", weekAgo);

    if (compError) throw compError;
    if (!completions || completions.length === 0) {
      return new Response(JSON.stringify({ distributed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Aggregate per user
    const map = new Map<string, { tasks: number; earned: number }>();
    for (const row of completions) {
      const existing = map.get(row.user_id) ?? { tasks: 0, earned: 0 };
      map.set(row.user_id, {
        tasks: existing.tasks + 1,
        earned: existing.earned + (row.points_awarded ?? 0),
      });
    }

    const sorted = Array.from(map.entries())
      .map(([user_id, v]) => ({ user_id, tasks: v.tasks, earned: v.earned }))
      .sort((a, b) => b.tasks - a.tasks || b.earned - a.earned)
      .slice(0, 10);

    let distributed = 0;

    for (let i = 0; i < sorted.length; i++) {
      const rank = i + 1;
      const reward = REWARD_MAP[rank];
      if (!reward) continue;

      const { user_id } = sorted[i];

      // Fetch current balance
      const { data: prof } = await supabase
        .from("profiles")
        .select("points_balance, points_earned")
        .eq("user_id", user_id)
        .single();

      if (!prof) continue;

      const newBalance = (prof.points_balance ?? 0) + reward;

      await supabase.from("profiles").update({
        points_balance: newBalance,
        points_earned: (prof.points_earned ?? 0) + reward,
        updated_at: new Date().toISOString(),
      }).eq("user_id", user_id);

      await supabase.from("wallet_transactions").insert({
        user_id,
        transaction_type: "bonus",
        points: reward,
        balance_after: newBalance,
        description: `Leaderboard Reward — Rank #${rank}`,
        reference_type: "leaderboard_reward",
      });

      distributed++;
    }

    return new Response(JSON.stringify({ distributed, top: sorted.length }), {
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
