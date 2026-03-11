import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const {
      payment_id,
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      points,
    } = await req.json();

    const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET');
    if (!RAZORPAY_KEY_SECRET) {
      return new Response(JSON.stringify({ success: false, error: 'Razorpay not configured' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify HMAC signature
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const key = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(RAZORPAY_KEY_SECRET),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const signatureBytes = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
    const computedSignature = Array.from(new Uint8Array(signatureBytes)).map(b => b.toString(16).padStart(2, '0')).join('');

    if (computedSignature !== razorpay_signature) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid signature' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get auth user
    const authHeader = req.headers.get('Authorization');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Get payment record
    const { data: payment, error: payErr } = await supabase
      .from('payments')
      .select('*')
      .eq('id', payment_id)
      .single();

    if (payErr || !payment) {
      return new Response(JSON.stringify({ success: false, error: 'Payment record not found' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update payment status
    await supabase.from('payments').update({
      status: 'completed',
      gateway_payment_id: razorpay_payment_id,
      gateway_order_id: razorpay_order_id,
      gateway_signature: razorpay_signature,
    }).eq('id', payment_id);

    // Add points to user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('points_balance, points_purchased')
      .eq('user_id', payment.user_id)
      .single();

    const newBalance = (profile?.points_balance ?? 0) + points;
    const newPurchased = (profile?.points_purchased ?? 0) + points;

    await supabase.from('profiles').update({
      points_balance: newBalance,
      points_purchased: newPurchased,
    }).eq('user_id', payment.user_id);

    // Log transaction
    await supabase.from('wallet_transactions').insert({
      user_id: payment.user_id,
      transaction_type: 'purchased',
      points: points,
      balance_after: newBalance,
      description: `Purchased ${points} points — ${payment.package_name ?? ''} package`,
      reference_id: payment_id,
      reference_type: 'payment',
    });

    // If user was referred, create commission for referrer
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('referred_by')
      .eq('user_id', payment.user_id)
      .single();

    if (userProfile?.referred_by) {
      const commissionAmount = payment.amount * 0.25; // 25%
      await supabase.from('referral_commissions').insert({
        referrer_id: userProfile.referred_by,
        referred_id: payment.user_id,
        payment_id: payment_id,
        amount: commissionAmount,
        commission_rate: 25,
        status: 'pending',
      });
    }

    return new Response(JSON.stringify({ success: true, points_added: points, new_balance: newBalance }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
