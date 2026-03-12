import { createHmac } from "node:crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const HOOK_SECRET = Deno.env.get("SEND_EMAIL_HOOK_SECRET")!;
const FROM_EMAIL = "noreply@send.marketersconnect.com";
const FROM_NAME = "EngageExchange";
const APP_URL = "https://xengage.lovable.app";

// Verify Supabase webhook HMAC-SHA256 signature
function verifySignature(body: string, signature: string | null): boolean {
  if (!signature || !HOOK_SECRET) return false;
  const hmac = createHmac("sha256", HOOK_SECRET);
  hmac.update(body);
  const computed = hmac.digest("hex");
  // Supabase sends "sha256=<hex>"
  const expected = signature.startsWith("sha256=")
    ? signature.slice(7)
    : signature;
  return computed === expected;
}

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: [to],
      subject,
      html,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend error ${res.status}: ${text}`);
  }
  return res.json();
}

function brandedEmail(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#0d0f14;font-family:Inter,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0f14;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#13161d;border:1px solid #1e2330;border-radius:8px;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="padding:28px 32px 20px;border-bottom:1px solid #1e2330;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width:28px;height:28px;background:#3b82f6;border-radius:4px;text-align:center;vertical-align:middle;">
                    <span style="color:#ffffff;font-size:14px;font-weight:bold;line-height:28px;">E</span>
                  </td>
                  <td style="padding-left:8px;">
                    <span style="font-family:'Roboto Mono',monospace,sans-serif;font-size:11px;font-weight:600;letter-spacing:0.08em;color:#e0e4ef;text-transform:uppercase;">EngageExchange</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              ${bodyHtml}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #1e2330;text-align:center;">
              <p style="margin:0;font-size:11px;color:#4b5270;font-family:Inter,Arial,sans-serif;">
                This email was sent by EngageExchange. If you did not request this, you can safely ignore it.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function btnStyle(bg = "#3b82f6") {
  return `display:inline-block;background:${bg};color:#ffffff;font-weight:600;font-size:14px;padding:12px 28px;border-radius:6px;text-decoration:none;letter-spacing:0.02em;`;
}

function buildEmail(
  actionType: string,
  token: string,
  tokenHash: string,
  redirectTo: string,
  email: string,
  newEmail?: string
): { subject: string; html: string } {
  const baseUrl = `${APP_URL}/auth/confirm`;

  switch (actionType) {
    case "signup":
    case "email_verification": {
      // Use the redirect_to origin if provided (handles preview vs production domains)
      const origin = redirectTo ? new URL(redirectTo).origin : APP_URL;
      const confirmUrl = `${origin}/auth/confirm?token_hash=${tokenHash}&type=signup`;
      const subject = "Confirm your EngageExchange account";
      const body = `
        <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#e0e4ef;">Confirm your email</h1>
        <p style="margin:0 0 24px;font-size:14px;color:#8b92a8;line-height:1.6;">
          Welcome to EngageExchange! Click the button below to verify your email address and activate your account. You'll receive <strong style="color:#22c55e;font-family:'Roboto Mono',monospace;">50 bonus points</strong> once you verify.
        </p>
        <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
          <tr>
            <td>
              <a href="${confirmUrl}" style="${btnStyle()}">Confirm Email Address</a>
            </td>
          </tr>
        </table>
        <p style="margin:0;font-size:12px;color:#4b5270;line-height:1.6;">
          Or copy and paste this link:<br/>
          <a href="${confirmUrl}" style="color:#3b82f6;word-break:break-all;">${confirmUrl}</a>
        </p>
        <p style="margin:20px 0 0;font-size:12px;color:#4b5270;">This link expires in 24 hours.</p>
      `;
      return { subject, html: brandedEmail(subject, body) };
    }

    case "recovery": {
      const resetUrl = `${APP_URL}/reset-password?token_hash=${tokenHash}&type=recovery`;
      const subject = "Reset your EngageExchange password";
      const body = `
        <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#e0e4ef;">Reset your password</h1>
        <p style="margin:0 0 24px;font-size:14px;color:#8b92a8;line-height:1.6;">
          We received a request to reset the password for the EngageExchange account associated with <strong style="color:#e0e4ef;">${email}</strong>. Click below to set a new password.
        </p>
        <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
          <tr>
            <td>
              <a href="${resetUrl}" style="${btnStyle()}">Reset Password</a>
            </td>
          </tr>
        </table>
        <p style="margin:0;font-size:12px;color:#4b5270;line-height:1.6;">
          Or copy and paste this link:<br/>
          <a href="${resetUrl}" style="color:#3b82f6;word-break:break-all;">${resetUrl}</a>
        </p>
        <p style="margin:20px 0 0;font-size:12px;color:#4b5270;">This link expires in 1 hour. If you did not request a password reset, ignore this email.</p>
      `;
      return { subject, html: brandedEmail(subject, body) };
    }

    case "invite": {
      const inviteUrl = `${baseUrl}?token_hash=${tokenHash}&type=invite`;
      const subject = "You've been invited to EngageExchange";
      const body = `
        <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#e0e4ef;">You're invited!</h1>
        <p style="margin:0 0 24px;font-size:14px;color:#8b92a8;line-height:1.6;">
          You've been invited to join EngageExchange — the social capital exchange platform. Click below to accept the invitation and create your account.
        </p>
        <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
          <tr>
            <td>
              <a href="${inviteUrl}" style="${btnStyle()}">Accept Invitation</a>
            </td>
          </tr>
        </table>
        <p style="margin:0;font-size:12px;color:#4b5270;">This invitation link expires in 24 hours.</p>
      `;
      return { subject, html: brandedEmail(subject, body) };
    }

    case "email_change": {
      const changeUrl = `${baseUrl}?token_hash=${tokenHash}&type=email_change`;
      const subject = "Confirm your new email address";
      const body = `
        <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#e0e4ef;">Confirm email change</h1>
        <p style="margin:0 0 24px;font-size:14px;color:#8b92a8;line-height:1.6;">
          Click the button below to confirm your new email address: <strong style="color:#e0e4ef;">${newEmail || email}</strong>
        </p>
        <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
          <tr>
            <td>
              <a href="${changeUrl}" style="${btnStyle()}">Confirm New Email</a>
            </td>
          </tr>
        </table>
        <p style="margin:0;font-size:12px;color:#4b5270;">This link expires in 24 hours.</p>
      `;
      return { subject, html: brandedEmail(subject, body) };
    }

    default: {
      const fallbackUrl = `${baseUrl}?token_hash=${tokenHash}&type=${actionType}`;
      const subject = "Action required — EngageExchange";
      const body = `
        <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#e0e4ef;">Action required</h1>
        <p style="margin:0 0 24px;font-size:14px;color:#8b92a8;line-height:1.6;">
          Please click the link below to continue.
        </p>
        <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
          <tr>
            <td>
              <a href="${fallbackUrl}" style="${btnStyle()}">Continue</a>
            </td>
          </tr>
        </table>
      `;
      return { subject, html: brandedEmail(subject, body) };
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-supabase-signature");

    // Early log — before signature check — so we know Supabase reached the hook
    console.log(`[${new Date().toISOString()}] AUTH EMAIL HOOK REACHED → method: ${req.method} → sig_present: ${!!signature}`);

    // Verify HMAC signature from Supabase
    if (!verifySignature(rawBody, signature)) {
      console.error("Invalid webhook signature");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = JSON.parse(rawBody);
    const earlyEmail = payload?.user?.email ?? "unknown";
    const earlyType  = payload?.email_data?.email_action_type ?? "unknown";
    console.log(`[${new Date().toISOString()}] AUTH EMAIL HOOK TRIGGERED → event: ${earlyType} → email: ${earlyEmail}`);
    const { user, email_data } = payload;

    if (!user?.email || !email_data) {
      return new Response(
        JSON.stringify({ error: "Missing user or email_data in payload" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const {
      token,
      token_hash,
      redirect_to,
      email_action_type,
      token_new,
      token_hash_new,
    } = email_data;

    const { subject, html } = buildEmail(
      email_action_type,
      token || token_new || "",
      token_hash || token_hash_new || "",
      redirect_to || APP_URL,
      user.email,
      user.new_email
    );

    await sendEmail(user.email, subject, html);

    console.log(`Auth email sent: type=${email_action_type} to=${user.email}`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("auth-email-hook error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
