Design system tokens, font choices, and architecture constraints for EngageExchange

## Design tokens (index.css)
- bg: --background 222 14% 6%, --surface 222 13% 10%, --surface-elevated 222 12% 13%
- text: --foreground 220 14% 88%, --foreground-muted 220 8% 55%, --foreground-dim 220 8% 35%
- earn (green): --earn 152 100% 43% → class `value-earn`, `text-earn`, `bg-earn-dim`
- spend (red): --spend 0 100% 63% → class `value-spend`, `text-spend`, `bg-spend-dim`
- primary (blue): --primary 214 100% 62%
- sidebar: --sidebar-background 222 16% 8%

## Fonts
- Display/mono: Roboto Mono (font-mono class)
- Body: Inter (default sans)

## Architecture
- Supabase client: ALWAYS import from `@/integrations/supabase/client` (NOT @/lib/supabase)
- Types: import `Tables<'tablename'>` from `@/integrations/supabase/types`
- Auth: `useAuth()` from `@/contexts/AuthContext` — includes `stripeSubscription`, `checkStripeSubscription`, daily login auto-claim
- Layout: `<DashboardLayout>` with optional rightPanel/rightPanelTitle props

## Payment Gateways
- Stripe: `create-stripe-checkout` (subscriptions + packs), `check-stripe-subscription`
- Razorpay: `create-razorpay-order`, `verify-razorpay-payment` (kept for INR)
- Stripe plan keys: pro_monthly, pro_yearly, agency_monthly, agency_yearly
- Pricing: Pro $5/mo or $50/yr, Agency $15/mo or $150/yr

## DB triggers
- `on_completion_status_change` — awards/refunds points when approval status changes
- `on_task_status_change` — refunds unused points on task expiry/deletion
- `handle_new_user` — creates profile, assigns role, grants 120 bonus credits + early adopter bonus (first 500 users get +100)

## Rewards
- Signup bonus: 120 credits
- Early adopter bonus: 100 credits (first 500 users, auto-disabled after)
- Daily login reward: 5 credits (claimed via `claim-daily-login` edge fn, tracked in `daily_login_claimed_at` on profiles)
- All rewards logged in wallet_transactions
