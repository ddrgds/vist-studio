// Supabase Edge Function — Deno runtime
// Returns the Lemon Squeezy customer portal URL for a subscription.
// Deploy: supabase functions deploy customer-portal

import { lemonSqueezySetup, getSubscription } from 'npm:@lemonsqueezy/lemonsqueezy.js';
import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    // ── Authenticate ──────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response('Unauthorized', { status: 401, headers: CORS });

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: authErr } = await supabaseUser.auth.getUser();
    if (authErr || !user) return new Response('Unauthorized', { status: 401, headers: CORS });

    const { subscriptionId } = await req.json() as { subscriptionId: string };
    if (!subscriptionId) return new Response('Missing subscriptionId', { status: 400, headers: CORS });

    // ── Get subscription from LS SDK ──────────────────────────────────────
    lemonSqueezySetup({ apiKey: Deno.env.get('LEMONSQUEEZY_API_KEY')! });

    const { data, error } = await getSubscription(subscriptionId);
    if (error) throw new Error(error.message);

    const portalUrl = (data as any)?.data?.attributes?.urls?.customer_portal as string;
    if (!portalUrl) throw new Error('No customer portal URL found for this subscription');

    return new Response(JSON.stringify({ portalUrl }), {
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
