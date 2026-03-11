import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const adminEmail = "admin@platform.com";
    const adminPassword = "Admin123!";

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existing = existingUsers?.users?.find((u) => u.email === adminEmail);

    let userId: string;

    if (existing) {
      userId = existing.id;
      console.log("Super admin user already exists:", userId);
    } else {
      // Create the user with email confirmed
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true,
        user_metadata: { name: "Super Admin" },
      });

      if (createError) {
        throw new Error(`Failed to create user: ${createError.message}`);
      }

      userId = newUser.user.id;
      console.log("Created super admin user:", userId);
    }

    // Wait briefly for profile trigger to fire
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Ensure profile exists (trigger may have already created it)
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("user_id")
      .eq("user_id", userId)
      .single();

    if (!profile) {
      await supabaseAdmin.from("profiles").insert({
        user_id: userId,
        name: "Super Admin",
        email: adminEmail,
        points_balance: 0,
        points_earned: 0,
        must_change_password: true,
      });
    } else {
      // Flag must change password
      await supabaseAdmin
        .from("profiles")
        .update({ must_change_password: true })
        .eq("user_id", userId);
    }

    // Remove any existing roles for this user then assign super_admin
    await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: "super_admin" });

    if (roleError) {
      throw new Error(`Failed to assign super_admin role: ${roleError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Super admin account ready",
        email: adminEmail,
        userId,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("setup-super-admin error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
