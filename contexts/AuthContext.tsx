import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, signOut as supabaseSignOut } from '../services/supabaseService';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface AuthContextValue {
  user: User | null;
  authLoading: boolean;
  signOut: () => Promise<void>;
}

// ─────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ─────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const userIdRef = useRef<string | null>(null);

  // Stable setter — only updates state when user identity actually changes
  const stableSetUser = (newUser: User | null) => {
    const newId = newUser?.id ?? null;
    if (newId !== userIdRef.current) {
      userIdRef.current = newId;
      setUser(newUser);
    }
  };

  useEffect(() => {
    // Hard timeout — if Supabase lock/network takes > 5s, unblock the UI
    let resolved = false;
    const fallback = setTimeout(() => {
      if (!resolved) { resolved = true; setAuthLoading(false); }
    }, 5000);

    // Get current session on mount
    supabase.auth.getSession()
      .then(({ data: { session } }) => stableSetUser(session?.user ?? null))
      .catch(err => console.warn('Failed to restore session:', err))
      .finally(() => {
        if (!resolved) { resolved = true; clearTimeout(fallback); setAuthLoading(false); }
      });

    // Listen for session changes in real time
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      stableSetUser(session?.user ?? null);
    });

    return () => { clearTimeout(fallback); subscription.unsubscribe(); };
  }, []);

  const handleSignOut = async () => {
    await supabaseSignOut();
  };

  return (
    <AuthContext.Provider value={{ user, authLoading, signOut: handleSignOut }}>
      {children}
    </AuthContext.Provider>
  );
};

// ─────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};
