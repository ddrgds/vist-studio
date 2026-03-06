// Supabase Edge Function — Deno runtime
// Handles all Lemon Squeezy webhook events → keeps profiles in sync.
//
// Deploy: supabase functions deploy lemon-webhook
//
// Register in LS Dashboard → Settings → Webhooks:
//   URL: https://<project>.supabase.co/functions/v1/lemon-webhook
//   Events: order_created, subscription_created, subscription_updated,
//           subscription_cancelled, subscription_expired

import { createHmac, timingSafeEqual } from 'node:crypto';
import { createClient } from 'npm:@supabase/supabase-js@2';

// ── Credit allocations per plan ───────────────────────────────────────────────
const PLAN_CREDITS: Record<string, number> = {
  pro:    2000,
  studio: 8000,
  brand:  999999, // treated as unlimited in frontend
};

// ── Map LS variant ID → plan name ─────────────────────────────────────────────
const buildVariantMap = (): Record<string, string> => ({
  [Deno.env.get('LEMONSQUEEZY_PRO_MONTHLY_VARIANT_ID')    ?? '']: 'pro',
  [Deno.env.get('LEMONSQUEEZY_PRO_ANNUAL_VARIANT_ID')     ?? '']: 'pro',
  [Deno.env.get('LEMONSQUEEZY_STUDIO_MONTHLY_VARIANT_ID') ?? '']: 'studio',
  [Deno.env.get('LEMONSQUEEZY_STUDIO_ANNUAL_VARIANT_ID')  ?? '']: 'studio',
  [Deno.env.get('LEMONSQUEEZY_BRAND_MONTHLY_VARIANT_ID')  ?? '']: 'brand',
  [Deno.env.get('LEMONSQUEEZY_BRAND_ANNUAL_VARIANT_ID')   ?? '']: 'brand',
});

// ── Webhook payload types ─────────────────────────────────────────────────────
interface LsEvent {
  meta: {
    event_name: string;
    custom_data?: { user_id?: string };
  };
  data: {
    id: string;
    attributes: {
      status:              string;
      customer_id:         number;
      variant_id:          number;
      first_subscription_item?: {
        subscription_id: number;
        variant_id:      number;
      };
      renews_at?: string;
      ends_at?:   string | null;
    };
  };
}

Deno.serve(async (req) => {
  const rawBody = await req.text();

  // ── Verify HMAC-SHA256 signature ─────────────────────────────────────────
  const secret    = Deno.env.get('LEMONSQUEEZY_WEBHOOK_SECRET') ?? '';
  const sigHeader = req.headers.get('x-signature') ?? '';
  const digest    = createHmac('sha256', secret).update(rawBody).digest('hex');

  const enc     = new TextEncoder();
  const isValid =
    digest.length === sigHeader.length &&
    timingSafeEqual(enc.encode(digest), enc.encode(sigHeader));

  if (!isValid) return new Response('Invalid signature', { status: 401 });

  let event: LsEvent;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const { event_name, custom_data } = event.meta;
  const attrs    = event.data.attributes;
  const userId   = custom_data?.user_id;
  const variantMap = buildVariantMap();

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // ── order_created / subscription_created ─────────────────────────────────
  // Initial purchase — activate plan + assign credits.
  if (event_name === 'order_created' || event_name === 'subscription_created') {
    if (!userId) return new Response('ok'); // can't match without user_id

    const variantId = String(attrs.variant_id ?? attrs.first_subscription_item?.variant_id ?? '');
    const plan      = variantMap[variantId] ?? 'starter';
    const credits   = PLAN_CREDITS[plan] ?? 100;
    const renewsAt  = attrs.renews_at ?? null;

    await supabase.from('profiles').update({
      subscription_plan:              plan,
      subscription_status:            'active',
      lemon_squeezy_customer_id:      String(attrs.customer_id),
      lemon_squeezy_subscription_id:  event.data.id,
      credits_remaining:              credits,
      subscription_renews_at:         renewsAt,
    }).eq('id', userId);
  }

  // ── subscription_updated ─────────────────────────────────────────────────
  // Plan change (upgrade/downgrade) or renewal.
  if (event_name === 'subscription_updated') {
    if (!userId) return new Response('ok');

    const variantId = String(attrs.variant_id ?? '');
    const newPlan   = variantMap[variantId];
    const renewsAt  = attrs.renews_at ?? null;

    if (newPlan) {
      // Plan changed — reset credits to new plan allocation
      const credits = PLAN_CREDITS[newPlan] ?? 100;
      await supabase.from('profiles').update({
        subscription_plan:      newPlan,
        subscription_status:    attrs.status === 'active' ? 'active' : attrs.status,
        credits_remaining:      credits,
        subscription_renews_at: renewsAt,
      }).eq('id', userId);
    } else if (attrs.status === 'expired' || attrs.status === 'cancelled') {
      await supabase.from('profiles').update({
        subscription_plan:      'starter',
        subscription_status:    'free',
        credits_remaining:      100,
        subscription_renews_at: null,
      }).eq('id', userId);
    } else {
      // Just a renewal — refresh renews_at
      await supabase.from('profiles').update({
        subscription_renews_at: renewsAt,
        subscription_status: 'active',
      }).eq('id', userId);
    }
  }

  // ── subscription_cancelled ───────────────────────────────────────────────
  // User cancelled — keep active until period ends (ends_at).
  if (event_name === 'subscription_cancelled') {
    if (!userId) return new Response('ok');
    await supabase.from('profiles').update({
      subscription_status:    'cancelled',
      subscription_renews_at: attrs.ends_at ?? null,
    }).eq('id', userId);
  }

  // ── subscription_expired ─────────────────────────────────────────────────
  // Billing cycle ended with no renewal — downgrade to starter.
  if (event_name === 'subscription_expired') {
    if (!userId) return new Response('ok');
    await supabase.from('profiles').update({
      subscription_plan:      'starter',
      subscription_status:    'free',
      credits_remaining:      100,
      subscription_renews_at: null,
    }).eq('id', userId);
  }

  return new Response('ok', { status: 200 });
});
