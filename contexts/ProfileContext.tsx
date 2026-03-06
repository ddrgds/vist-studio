import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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

  // ─── Load on auth change ────────────────────────────────────────────────
  const refreshProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const data = await loadProfile(user.id);
      setProfile(data ?? {
        id: user.id,
        displayName: user.email?.split('@')[0] ?? '',
        bio: '',
        avatarUrl: null,
        subscriptionPlan: 'starter',
        subscriptionStatus: 'free',
        creditsRemaining: 100,
        subscriptionRenewsAt: null,
        lemonSqueezySubscriptionId: null,
        createdAt: new Date().toISOString(),
      });
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
    if (!user || !profile) return false;
    // Brand plan = unlimited
    if (profile.creditsRemaining >= 999999) return true;
    if (profile.creditsRemaining < cost) return false;

    // Optimistic update
    const prevCredits = profile.creditsRemaining;
    setProfile(prev => prev ? { ...prev, creditsRemaining: prev.creditsRemaining - cost } : null);

    try {
      await decrementCreditsInDb(user.id, cost);
      return true;
    } catch {
      // Rollback on DB failure
      setProfile(prev => prev ? { ...prev, creditsRemaining: prevCredits } : null);
      return false;
    }
  }, [user, profile]);

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
