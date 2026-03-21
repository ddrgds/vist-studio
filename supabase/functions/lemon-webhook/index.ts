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

// ── Map LS variant ID → plan name (subscriptions) ────────────────────────────
const buildVariantMap = (): Record<string, string> => {
  const raw: Record<string, string> = {
    [Deno.env.get('LEMONSQUEEZY_PRO_MONTHLY_VARIANT_ID')    ?? '']: 'pro',
    [Deno.env.get('LEMONSQUEEZY_PRO_ANNUAL_VARIANT_ID')     ?? '']: 'pro',
    [Deno.env.get('LEMONSQUEEZY_STUDIO_MONTHLY_VARIANT_ID') ?? '']: 'studio',
    [Deno.env.get('LEMONSQUEEZY_STUDIO_ANNUAL_VARIANT_ID')  ?? '']: 'studio',
    [Deno.env.get('LEMONSQUEEZY_BRAND_MONTHLY_VARIANT_ID')  ?? '']: 'brand',
    [Deno.env.get('LEMONSQUEEZY_BRAND_ANNUAL_VARIANT_ID')   ?? '']: 'brand',
  };
  // BUG #6 — filter out empty string keys (missing env vars)
  const filtered: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (k) filtered[k] = v;
  }
  if (Object.keys(filtered).length === 0) {
    console.error('lemon-webhook: variant map is empty — all LEMONSQUEEZY_*_VARIANT_ID env vars are missing');
  }
  return filtered;
};

// ── Map LS variant ID → credit pack amount (one-time purchases) ──────────────
const buildCreditPackMap = (): Record<string, number> => {
  const raw: Record<string, number> = {
    [Deno.env.get('LEMONSQUEEZY_CREDITS_200_VARIANT_ID')  ?? '']: 200,
    [Deno.env.get('LEMONSQUEEZY_CREDITS_750_VARIANT_ID')  ?? '']: 750,
    [Deno.env.get('LEMONSQUEEZY_CREDITS_3000_VARIANT_ID') ?? '']: 3000,
  };
  const filtered: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (k) filtered[k] = v;
  }
  return filtered;
};

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
  const variantMap    = buildVariantMap();
  const creditPackMap = buildCreditPackMap();

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // ── BUG #4 — Idempotency check ──────────────────────────────────────────
  const eventId = `${event_name}:${event.data.id}`;
  const { data: existing } = await supabase
    .from('webhook_events')
    .select('event_id')
    .eq('event_id', eventId)
    .maybeSingle();

  if (existing) {
    // Already processed — return 200 without re-processing
    return new Response('ok (duplicate)', { status: 200 });
  }

  // ── BUG #5 — Missing user_id ────────────────────────────────────────────
  if (!userId) {
    console.error(`lemon-webhook: missing user_id in custom_data for event ${event_name}, data.id=${event.data.id}`);
    return new Response('error: missing user_id', { status: 400 });
  }

  // ── BUG #6 — Empty variant map ──────────────────────────────────────────
  if (Object.keys(variantMap).length === 0) {
    console.error('lemon-webhook: cannot process — variant map is empty');
    return new Response('error: variant map empty', { status: 500 });
  }

  // ── order_created / subscription_created ─────────────────────────────────
  if (event_name === 'order_created' || event_name === 'subscription_created') {
    const variantId = String(attrs.variant_id ?? attrs.first_subscription_item?.variant_id ?? '');
    const creditPackAmount = creditPackMap[variantId];

    if (creditPackAmount) {
      // ── Credit pack (one-time purchase) — ADD credits to existing balance ──
      const { error } = await supabase.rpc('add_credits', {
        p_user_id: userId,
        p_amount: creditPackAmount,
        p_reason: `Credit pack purchase: ${creditPackAmount} credits`,
      });

      if (error) {
        console.error('lemon-webhook: add_credits failed for credit pack', error);
        return new Response('error: credit pack failed', { status: 500 });
      }
    } else {
      // ── Subscription purchase — activate plan + set credits ────────────────
      const plan     = variantMap[variantId] ?? 'starter';
      const credits  = PLAN_CREDITS[plan] ?? 100;
      const renewsAt = attrs.renews_at ?? null;

      const { error } = await supabase.from('profiles').update({
        subscription_plan:              plan,
        subscription_status:            'active',
        lemon_squeezy_customer_id:      String(attrs.customer_id),
        lemon_squeezy_subscription_id:  event.data.id,
        credits_remaining:              credits,
        subscription_renews_at:         renewsAt,
      }).eq('id', userId);

      // BUG #3 — Return 500 on DB error so Lemon Squeezy retries
      if (error) {
        console.error('lemon-webhook: DB update failed for order/subscription_created', error);
        return new Response('error: db update failed', { status: 500 });
      }
    }
  }

  // ── subscription_updated ─────────────────────────────────────────────────
  // Plan change (upgrade/downgrade) or renewal.
  if (event_name === 'subscription_updated') {
    const variantId = String(attrs.variant_id ?? '');
    const newPlan   = variantMap[variantId];
    const renewsAt  = attrs.renews_at ?? null;
    let updateError: any = null;

    if (newPlan) {
      // Plan changed — reset credits to new plan allocation
      const credits = PLAN_CREDITS[newPlan] ?? 100;
      const { error } = await supabase.from('profiles').update({
        subscription_plan:      newPlan,
        subscription_status:    attrs.status === 'active' ? 'active' : attrs.status,
        credits_remaining:      credits,
        subscription_renews_at: renewsAt,
      }).eq('id', userId);
      updateError = error;
    } else if (attrs.status === 'expired' || attrs.status === 'cancelled') {
      const { error } = await supabase.from('profiles').update({
        subscription_plan:      'starter',
        subscription_status:    'free',
        credits_remaining:      100,
        subscription_renews_at: null,
      }).eq('id', userId);
      updateError = error;
    } else {
      // Just a renewal — refresh renews_at
      const { error } = await supabase.from('profiles').update({
        subscription_renews_at: renewsAt,
        subscription_status: 'active',
      }).eq('id', userId);
      updateError = error;
    }

    if (updateError) {
      console.error('lemon-webhook: DB update failed for subscription_updated', updateError);
      return new Response('error: db update failed', { status: 500 });
    }
  }

  // ── subscription_cancelled ───────────────────────────────────────────────
  // User cancelled — keep active until period ends (ends_at).
  if (event_name === 'subscription_cancelled') {
    const { error } = await supabase.from('profiles').update({
      subscription_status:    'cancelled',
      subscription_renews_at: attrs.ends_at ?? null,
    }).eq('id', userId);

    if (error) {
      console.error('lemon-webhook: DB update failed for subscription_cancelled', error);
      return new Response('error: db update failed', { status: 500 });
    }
  }

  // ── subscription_expired ─────────────────────────────────────────────────
  // Billing cycle ended with no renewal — downgrade to starter.
  if (event_name === 'subscription_expired') {
    const { error } = await supabase.from('profiles').update({
      subscription_plan:      'starter',
      subscription_status:    'free',
      credits_remaining:      100,
      subscription_renews_at: null,
    }).eq('id', userId);

    if (error) {
      console.error('lemon-webhook: DB update failed for subscription_expired', error);
      return new Response('error: db update failed', { status: 500 });
    }
  }

  // ── BUG #4 — Record event for idempotency ───────────────────────────────
  await supabase.from('webhook_events').insert({ event_id: eventId });

  return new Response('ok', { status: 200 });
});
