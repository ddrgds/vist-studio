import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import {
  UserProfile,
  loadProfile,
  saveProfile,
  uploadAvatar as uploadAvatarToCloud,
  decrementCreditsInDb,
} from '../services/supabaseProfileService';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface ProfileContextValue {
  profile: UserProfile | null;
  isLoading: boolean;
  updateProfile: (updates: Partial<Pick<UserProfile, 'displayName' | 'bio'>>) => Promise<void>;
  uploadAvatar: (file: File) => Promise<void>;
  refreshProfile: () => Promise<void>;
  /** Deduct `cost` credits. Returns false if insufficient credits. */
  decrementCredits: (cost: number) => Promise<boolean>;
  /** Restore credits after a failed generation. */
  restoreCredits: (cost: number) => void;
}

// ─────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────

const ProfileContext = createContext<ProfileContextValue | null>(null);

// ─────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const lastLoadedUserId = useRef<string | null>(null);
  // Refs so decrementCredits can read current values without stale closure
  const profileRef = useRef<UserProfile | null>(null);
  const isLoadingRef = useRef(true);

  // Keep refs in sync
  useEffect(() => { profileRef.current = profile; }, [profile]);
  useEffect(() => { isLoadingRef.current = isLoading; }, [isLoading]);

  // ─── Load on auth change ────────────────────────────────────────────────
  const refreshProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setIsLoading(false);
      lastLoadedUserId.current = null;
      return;
    }
    // Skip if already loaded for this user (unless forced via explicit call)
    if (lastLoadedUserId.current === user.id && profile) {
      return;
    }
    try {
      setIsLoading(true);
      lastLoadedUserId.current = user.id;
      const data = await loadProfile(user.id);
      if (data) {
        setProfile(data);
      } else {
        // First login — create profile row in Supabase with initial credits
        const defaultProfile: UserProfile = {
          id: user.id,
          displayName: user.email?.split('@')[0] ?? '',
          bio: '',
          avatarUrl: null,
          subscriptionPlan: 'starter',
          subscriptionStatus: 'free',
          creditsRemaining: 150,
          subscriptionRenewsAt: null,
          lemonSqueezySubscriptionId: null,
          createdAt: new Date().toISOString(),
        };
        setProfile(defaultProfile);
        // Persist to DB so credit deductions work
        const { supabase } = await import('../services/supabaseService');
        supabase.from('profiles').upsert({
          id: user.id,
          display_name: defaultProfile.displayName,
          credits_remaining: 150,
          subscription_plan: 'starter',
          subscription_status: 'free',
          created_at: defaultProfile.createdAt,
          updated_at: defaultProfile.createdAt,
        }).then(({ error }) => {
          if (error) console.warn('Failed to create initial profile row:', error.message);
        });
      }
    } catch (err) {
      console.warn('ProfileContext: failed to load profile', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => { refreshProfile(); }, [refreshProfile]);

  // ─── Update scalar fields ───────────────────────────────────────────────
  const updateProfile = useCallback(async (
    updates: Partial<Pick<UserProfile, 'displayName' | 'bio'>>
  ) => {
    if (!user) return;
    setProfile(prev => prev ? { ...prev, ...updates } : null);
    await saveProfile(user.id, updates);
  }, [user]);

  // ─── Upload avatar ──────────────────────────────────────────────────────
  const uploadAvatar = useCallback(async (file: File) => {
    if (!user) return;
    const avatarUrl = await uploadAvatarToCloud(user.id, file);
    setProfile(prev => prev ? { ...prev, avatarUrl } : null);
  }, [user]);

  // ─── Decrement credits (optimistic + atomic DB update) ──────────────────
  const decrementCredits = useCallback(async (cost: number): Promise<boolean> => {
    if (!user) return false; // truly unauthenticated — don't retry

    // If profile is still loading (100-200ms window after auth), wait briefly
    // rather than returning false and showing a misleading "insufficient credits"
    // error to the user.
    if (!profileRef.current && isLoadingRef.current) {
      await new Promise<void>((resolve) => {
        const INTERVAL = 50;
        const MAX_WAIT = 1500;
        let waited = 0;
        const id = setInterval(() => {
          waited += INTERVAL;
          if (profileRef.current || !isLoadingRef.current || waited >= MAX_WAIT) {
            clearInterval(id);
            resolve();
          }
        }, INTERVAL);
      });
    }

    // Re-read from refs after the potential wait
    const currentProfile = profileRef.current;
    if (!currentProfile) return false; // still null after wait — unauthenticated or load failed

    // Brand plan = unlimited
    if (currentProfile.creditsRemaining >= 999999) return true;
    if (currentProfile.creditsRemaining < cost) return false;

    // Optimistic update
    const prevCredits = currentProfile.creditsRemaining;
    setProfile(prev => prev ? { ...prev, creditsRemaining: prev.creditsRemaining - cost } : null);

    try {
      await decrementCreditsInDb(user.id, cost);
      return true;
    } catch {
      // Rollback on DB failure
      setProfile(prev => prev ? { ...prev, creditsRemaining: prevCredits } : null);
      return false;
    }
  }, [user]); // profileRef / isLoadingRef are refs — stable, no need in deps

  // ─── Restore credits (on generation failure) ───────────────────────────
  const restoreCredits = useCallback((cost: number) => {
    setProfile(prev => {
      if (!prev) return null;
      // Don't restore if unlimited
      if (prev.creditsRemaining >= 999999) return prev;
      return { ...prev, creditsRemaining: prev.creditsRemaining + cost };
    });
    // Best-effort DB restore (fire-and-forget)
    if (user) {
      import('../services/supabaseService').then(async ({ supabase }) => {
        const { error } = await supabase.rpc('restore_credits', { p_user_id: user.id, p_amount: cost });
        if (error) console.warn('restoreCredits DB failed', error);
      });
    }
  }, [user]);

  return (
    <ProfileContext.Provider value={{
      profile, isLoading,
      updateProfile, uploadAvatar, refreshProfile,
      decrementCredits, restoreCredits,
    }}>
      {children}
    </ProfileContext.Provider>
  );
};

// ─────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────

export const useProfile = (): ProfileContextValue => {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used inside <ProfileProvider>');
  return ctx;
};
