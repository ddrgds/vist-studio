/// <reference types="vite/client" />
import { supabase } from './supabaseService';

// ─────────────────────────────────────────────
// Checkout
// ─────────────────────────────────────────────

/**
 * Calls the `create-checkout` Edge Function to create a Lemon Squeezy
 * hosted checkout session. Returns the URL to redirect the user to.
 * The API key never leaves the server.
 */
export const createCheckoutSession = async (variantId: string): Promise<string> => {
  const { data, error } = await supabase.functions.invoke('create-checkout', {
    body: { variantId },
  });

  if (error) throw new Error(error.message ?? 'Checkout failed');

  const url = (data as { checkoutUrl?: string }).checkoutUrl;
  if (!url) throw new Error('No checkout URL returned');
  return url;
};

// ─────────────────────────────────────────────
// Customer portal
// ─────────────────────────────────────────────

/**
 * Opens the Lemon Squeezy customer portal for the given subscription.
 * Users can cancel, change plan, or update payment method there.
 */
export const getCustomerPortalUrl = async (subscriptionId: string): Promise<string> => {
  const { data, error } = await supabase.functions.invoke('customer-portal', {
    body: { subscriptionId },
  });

  if (error) throw new Error(error.message ?? 'Portal failed');

  const url = (data as { portalUrl?: string }).portalUrl;
  if (!url) throw new Error('No portal URL returned');
  return url;
};
