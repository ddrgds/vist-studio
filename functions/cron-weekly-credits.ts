/**
 * Cloudflare Worker scheduled trigger — runs every Monday 00:01 UTC to
 * grant 25cr to all free-tier users via Supabase RPC.
 *
 * Setup steps (user-side, do once):
 *
 *   1. Apply SQL migration `supabase/migrations/003_free_tier_credits.sql`
 *      in Supabase SQL editor.
 *
 *   2. Deploy this as a separate Cloudflare Worker (NOT a Pages Function —
 *      Pages Functions don't support cron triggers; only Workers do):
 *
 *        wrangler deploy --name vist-cron-credits functions/cron-weekly-credits.ts
 *
 *      Then in Cloudflare dashboard for that Worker:
 *      - Triggers → Cron Triggers → Add: `1 0 * * 1` (Mon 00:01 UTC)
 *      - Variables → Add (Encrypted):
 *          SUPABASE_URL = https://<your-ref>.supabase.co
 *          SUPABASE_SERVICE_KEY = <service_role key from Supabase dashboard>
 *
 *   3. Test manually first via the Worker's "Trigger Cron" UI button.
 *
 * Why a separate Worker (not Pages Function)?
 *   Cloudflare Pages Functions are HTTP-only — no scheduled triggers.
 *   The minimum Worker plan supports cron triggers free up to 1000/day.
 *
 * Why service_role key?
 *   The function bypasses RLS to update all free-tier rows atomically.
 *   This key MUST stay server-side (encrypted env var only, never client).
 */

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_KEY: string;
}

export default {
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext) {
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
      console.error('Missing Supabase env vars')
      return
    }
    try {
      const res = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/grant_weekly_free_credits`, {
        method: 'POST',
        headers: {
          'apikey': env.SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({ p_amount: 25 }),
      })
      if (!res.ok) {
        const text = await res.text()
        console.error(`Grant failed (${res.status}): ${text}`)
        return
      }
      const granted = await res.json()
      console.log(`Weekly free credits granted to ${granted} users at ${new Date().toISOString()}`)
    } catch (err) {
      console.error('Cron grant error:', err)
    }
  },

  // Optional manual HTTP trigger for testing
  async fetch(_req: Request, env: Env): Promise<Response> {
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
      return new Response('Missing env vars', { status: 500 })
    }
    const res = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/grant_weekly_free_credits`, {
      method: 'POST',
      headers: {
        'apikey': env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_amount: 25 }),
    })
    const result = await res.text()
    return new Response(`Status ${res.status}: ${result}`, {
      headers: { 'Content-Type': 'text/plain' },
    })
  },
}
