// Supabase Edge Function — Deno runtime
// Creates a Lemon Squeezy hosted checkout session using the official SDK.
// Deploy: supabase functions deploy create-checkout

import { lemonSqueezySetup, createCheckout } from 'npm:@lemonsqueezy/lemonsqueezy.js';
import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    // ── Authenticate user via JWT ───────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response('Unauthorized', { status: 401, headers: CORS });

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: authErr } = await supabaseUser.auth.getUser();
    if (authErr || !user) return new Response('Unauthorized', { status: 401, headers: CORS });

    // ── Parse body ─────────────────────────────────────────────────────────
    const { variantId } = await req.json() as { variantId: string };
    if (!variantId) return new Response('Missing variantId', { status: 400, headers: CORS });

    // ── Setup LS SDK ───────────────────────────────────────────────────────
    lemonSqueezySetup({ apiKey: Deno.env.get('LEMONSQUEEZY_API_KEY')! });

    const storeId = Deno.env.get('LEMONSQUEEZY_STORE_ID')!;
    const appUrl  = Deno.env.get('APP_URL') || 'http://localhost:5173';

    // ── Create checkout ────────────────────────────────────────────────────
    const { data, error } = await createCheckout(storeId, variantId, {
      checkoutOptions: {
        embed: false,
        media:  false,
      },
      checkoutData: {
        email: user.email ?? undefined,
        // user_id passed here is returned in meta.custom_data on every webhook
        custom: { user_id: user.id },
      },
      productOptions: {
        redirectUrl:          `${appUrl}?checkout=success`,
        receiptButtonText:    'Go to VIST Studio',
        receiptThankYouNote:  'Welcome to VIST Studio! Your plan is now active.',
      },
    });

    if (error) throw new Error(error.message);

    const checkoutUrl = (data as any)?.data?.attributes?.url as string;
    if (!checkoutUrl) throw new Error('No checkout URL returned by Lemon Squeezy');

    return new Response(JSON.stringify({ checkoutUrl }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
