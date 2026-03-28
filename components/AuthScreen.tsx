/// <reference types="vite/client" />
import React, { useState } from 'react';
import { signInWithEmail, signUpWithEmail, supabase } from '../services/supabaseService';

const CONTEXT_BANNERS: Record<string, string> = {
  director: 'Sign in to access Director Studio',
  generate: 'Sign in to generate AI images',
  characters: 'Sign in to manage your character library',
  storyboard: 'Sign in to create storyboards',
  profile: 'Sign in to view your profile',
};

interface AuthScreenProps {
  onAuthenticated?: () => void;
  onClose?: () => void;
  intendedWorkspace?: string;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthenticated, onClose, intendedWorkspace }) => {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // ─── Clear error when user starts typing ────
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (error) setError(null);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (error) setError(null);
  };

  const switchMode = (next: 'login' | 'register' | 'forgot') => {
    setMode(next);
    setError(null);
    setSuccessMessage(null);
    // Don't carry password between modes for security
    if (next !== mode) setPassword('');
  };

  // ─── Submit ─────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      if (mode === 'forgot') {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });
        if (resetError) throw resetError;
        setSuccessMessage('Done! Check your email for the recovery link.');
        setMode('login');
      } else if (mode === 'login') {
        await signInWithEmail(email, password);
        onAuthenticated?.();
        onClose?.();
      } else {
        await signUpWithEmail(email, password);
        setSuccessMessage('Account created! Check your email to confirm your account, then sign in.');
        setMode('login');
      }
    } catch (err: any) {
      const msg = err?.message || 'Unknown error';
      if (msg.includes('Invalid login credentials')) {
        setError('Incorrect email or password.');
      } else if (msg.includes('User already registered')) {
        setError('This email is already registered. Sign in instead.');
        setMode('login');
      } else if (msg.includes('Password should be at least')) {
        setError('Password must be at least 6 characters.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const formContent = (
    <>
      {onClose && (
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 16, right: 16,
            background: 'none', border: 'none', color: 'var(--joi-text-3)',
            cursor: 'pointer', fontSize: 20,
          }}
        >&#x2715;</button>
      )}

      {/* Logo / title */}
      <div className="mb-6 text-center">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--joi-pink)', boxShadow: 'none' }}>
          <span className="text-white font-bold text-lg">V</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: "'Instrument Serif', serif", color: 'var(--joi-text-1)' }}>VIST</h1>
        <p style={{ color: 'var(--joi-text-3)', fontSize: 13, marginTop: 4 }}>AI Studio</p>
      </div>

      {/* Context banner */}
      {intendedWorkspace && CONTEXT_BANNERS[intendedWorkspace] && (
        <div className="w-full mb-3 px-4 py-3 rounded-xl text-[13px] text-center"
          style={{ background: 'var(--joi-bg-2)', border: '1px solid var(--joi-border)', color: 'var(--joi-text-2)' }}>
          {CONTEXT_BANNERS[intendedWorkspace]}
        </div>
      )}

        {mode === 'forgot' ? (
          /* ── Forgot password view ── */
          <>
            <div className="mb-6">
              <button
                onClick={() => switchMode('login')}
                className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors mb-4"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6" /></svg>
                Back to sign in
              </button>
              <h2 className="text-lg font-semibold text-white">Reset password</h2>
              <p className="text-xs text-zinc-500 mt-1">Enter your email and we'll send you a link.</p>
            </div>

            {error && (
              <div role="alert" className="mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}
            {successMessage && (
              <div role="status" className="mb-4 p-3 bg-green-900/20 border border-green-500/30 rounded-lg text-green-400 text-sm">
                {successMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="auth-email-forgot" className="block text-xs font-medium text-zinc-400 mb-1.5">Email</label>
                <input
                  id="auth-email-forgot"
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  required
                  autoComplete="email"
                  placeholder="you@email.com"
                  className="w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-all" style={{ background: 'var(--joi-bg-2)', border: '1px solid var(--joi-border)', color: 'var(--joi-text-1)' }}
                />
              </div>
              <button
                type="submit"
                disabled={loading || !email}
                className="w-full py-2.5 font-semibold text-sm rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed" style={{ background: 'var(--joi-pink)', color: 'var(--joi-bg-0)', border: 'none' }}
              >
                {loading ? (
                  <>
                    <svg aria-hidden="true" className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Sending...
                  </>
                ) : 'Send recovery link'}
              </button>
            </form>
          </>
        ) : (
          /* ── Login / Register view ── */
          <>
            {/* Tabs */}
            <div className="flex rounded-xl p-1 mb-6" style={{ background: 'var(--joi-bg-3)' }} role="tablist">
              <button
                role="tab"
                aria-selected={mode === 'login'}
                onClick={() => switchMode('login')}
                className="flex-1 py-2 text-sm font-semibold rounded-lg transition-all" style={{ background: mode === 'login' ? 'var(--joi-bg-0)' : 'transparent', color: mode === 'login' ? 'var(--joi-text-1)' : 'var(--joi-text-3)', boxShadow: mode === 'login' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
              >
                Sign in
              </button>
              <button
                role="tab"
                aria-selected={mode === 'register'}
                onClick={() => switchMode('register')}
                className="flex-1 py-2 text-sm font-semibold rounded-lg transition-all" style={{ background: mode === 'register' ? 'var(--joi-bg-0)' : 'transparent', color: mode === 'register' ? 'var(--joi-text-1)' : 'var(--joi-text-3)', boxShadow: mode === 'register' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
              >
                Create account
              </button>
            </div>

            {/* Messages */}
            {error && (
              <div role="alert" className="mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}
            {successMessage && (
              <div role="status" className="mb-4 p-3 bg-green-900/20 border border-green-500/30 rounded-lg text-green-400 text-sm">
                {successMessage}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="auth-email" className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Email
                </label>
                <input
                  id="auth-email"
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  required
                  autoComplete="email"
                  placeholder="you@email.com"
                  className="w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-all" style={{ background: 'var(--joi-bg-2)', border: '1px solid var(--joi-border)', color: 'var(--joi-text-1)' }}
                />
              </div>

              <div>
                <label htmlFor="auth-password" className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={handlePasswordChange}
                    required
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    placeholder={mode === 'register' ? 'Minimum 6 characters' : '••••••••'}
                    className="w-full rounded-lg px-3 py-2.5 pr-10 text-sm outline-none transition-all" style={{ background: 'var(--joi-bg-2)', border: '1px solid var(--joi-border)', color: 'var(--joi-text-1)' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Forgot password (login only) */}
              {mode === 'login' && (
                <div className="text-right -mt-1">
                  <button
                    type="button"
                    onClick={() => switchMode('forgot')}
                    className="text-xs text-zinc-500 hover:text-pink-400 transition-colors"
                  >
                    Forgot your password?
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !email || !password}
                aria-busy={loading}
                className="w-full py-2.5 font-semibold text-sm rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed" style={{ background: 'var(--joi-pink)', color: 'var(--joi-bg-0)', border: 'none' }}
              >
                {loading ? (
                  <>
                    <svg aria-hidden="true" className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    {mode === 'login' ? 'Signing in...' : 'Creating account...'}
                  </>
                ) : (
                  mode === 'login' ? 'Sign in' : 'Create account'
                )}
              </button>

              {/* Bypass for Development Testing */}
              {import.meta.env.DEV && (
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); onAuthenticated?.(); onClose?.(); }}
                  className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-medium text-xs rounded-lg transition-colors border border-zinc-700 mt-2"
                >
                  [DEV] Skip Login
                </button>
              )}
            </form>
          </>
        )}
    </>
  );

  // Modal mode: no full-page wrapper
  if (onClose) {
    return (
      <div style={{
        background: 'var(--joi-bg-glass)',
        border: '1px solid var(--joi-border)',
        backdropFilter: 'blur(24px)',
        borderRadius: 20,
        padding: '40px 32px',
        maxWidth: 420,
        width: '100%',
        position: 'relative',
      }}>
        {formContent}
      </div>
    );
  }

  // Standalone page mode
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 p-4">
      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
        {formContent}
      </div>
      <p className="mt-6 text-xs text-zinc-600 text-center">
        Your images and presets are securely saved in the cloud.
      </p>
    </div>
  );
};

export default AuthScreen;
