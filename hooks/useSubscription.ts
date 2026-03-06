import { useProfile } from '../contexts/ProfileContext';
import { SubscriptionPlan, SubscriptionStatus } from '../types';

export interface SubscriptionState {
  plan:    SubscriptionPlan;
  status:  SubscriptionStatus;
  credits: number;
  // Computed helpers
  isUnlimited:     boolean;  // brand plan
  isProOrAbove:    boolean;
  isStudioOrAbove: boolean;
  isBrand:         boolean;
  isActive:        boolean;  // status === 'active'
  renewsAt:        string | null;
  lsSubscriptionId: string | null;
}

/**
 * Thin hook that reads subscription state from ProfileContext and exposes
 * convenient computed booleans used throughout the app.
 */
export const useSubscription = (): SubscriptionState => {
  const { profile } = useProfile();

  const plan   = profile?.subscriptionPlan   ?? 'starter';
  const status = profile?.subscriptionStatus ?? 'free';
  const credits = profile?.creditsRemaining  ?? 0;

  return {
    plan,
    status,
    credits,
    isUnlimited:     credits >= 999999,
    isActive:        status === 'active',
    isProOrAbove:    ['pro', 'studio', 'brand'].includes(plan),
    isStudioOrAbove: ['studio', 'brand'].includes(plan),
    isBrand:         plan === 'brand',
    renewsAt:        profile?.subscriptionRenewsAt ?? null,
    lsSubscriptionId: profile?.lemonSqueezySubscriptionId ?? null,
  };
};
