/// <reference types="vite/client" />
import React, { useState } from 'react';
import { signInWithEmail, signUpWithEmail, supabase } from '../services/supabaseService';

interface AuthScreenProps {
  onAuthenticated: () => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthenticated }) => {
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
        setSuccessMessage('¡Listo! Revisa tu email para el enlace de recuperación.');
        setMode('login');
      } else if (mode === 'login') {
        await signInWithEmail(email, password);
        onAuthenticated();
      } else {
        await signUpWithEmail(email, password);
        setSuccessMessage('¡Cuenta creada! Revisa tu email para confirmar tu cuenta, luego inicia sesión.');
        setMode('login');
      }
    } catch (err: any) {
      const msg = err?.message || 'Error desconocido';
      if (msg.includes('Invalid login credentials')) {
        setError('Email o contraseña incorrectos.');
      } else if (msg.includes('User already registered')) {
        setError('Este email ya está registrado. Inicia sesión.');
        setMode('login');
      } else if (msg.includes('Password should be at least')) {
        setError('La contraseña debe tener al menos 6 caracteres.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 p-4">
      {/* Logo / título */}
      <div className="mb-8 text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-purple-900/40">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight">VIST</h1>
        <p className="text-zinc-500 text-sm mt-1">Virtual Influencer Studio</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">

        {mode === 'forgot' ? (
          /* ── Forgot password view ── */
          <>
            <div className="mb-6">
              <button
                onClick={() => switchMode('login')}
                className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors mb-4"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6" /></svg>
                Volver al inicio de sesión
              </button>
              <h2 className="text-lg font-semibold text-white">Recuperar contraseña</h2>
              <p className="text-xs text-zinc-500 mt-1">Ingresa tu email y te enviaremos un enlace.</p>
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
                  placeholder="tu@email.com"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !email}
                className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:from-zinc-700 disabled:to-zinc-700 disabled:text-zinc-500 text-white font-semibold text-sm rounded-lg transition-all shadow-lg shadow-purple-900/20 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg aria-hidden="true" className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Enviando...
                  </>
                ) : 'Enviar enlace de recuperación'}
              </button>
            </form>
          </>
        ) : (
          /* ── Login / Register view ── */
          <>
            {/* Tabs */}
            <div className="flex rounded-xl bg-zinc-800 p-1 mb-6" role="tablist">
              <button
                role="tab"
                aria-selected={mode === 'login'}
                onClick={() => switchMode('login')}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${mode === 'login' ? 'bg-zinc-700 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
              >
                Iniciar sesión
              </button>
              <button
                role="tab"
                aria-selected={mode === 'register'}
                onClick={() => switchMode('register')}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${mode === 'register' ? 'bg-zinc-700 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
              >
                Crear cuenta
              </button>
            </div>

            {/* Mensajes */}
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

            {/* Formulario */}
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
                  placeholder="tu@email.com"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                />
              </div>

              <div>
                <label htmlFor="auth-password" className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={handlePasswordChange}
                    required
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    placeholder={mode === 'register' ? 'Mínimo 6 caracteres' : '••••••••'}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 pr-10 text-sm text-white placeholder:text-zinc-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
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

              {/* Olvidé mi contraseña (solo en login) */}
              {mode === 'login' && (
                <div className="text-right -mt-1">
                  <button
                    type="button"
                    onClick={() => switchMode('forgot')}
                    className="text-xs text-zinc-500 hover:text-purple-400 transition-colors"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !email || !password}
                aria-busy={loading}
                className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:from-zinc-700 disabled:to-zinc-700 disabled:text-zinc-500 text-white font-semibold text-sm rounded-lg transition-all shadow-lg shadow-purple-900/20 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg aria-hidden="true" className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    {mode === 'login' ? 'Entrando...' : 'Creando cuenta...'}
                  </>
                ) : (
                  mode === 'login' ? 'Entrar' : 'Crear cuenta'
                )}
              </button>

              {/* Bypass for Development Testing */}
              {import.meta.env.DEV && (
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); onAuthenticated(); }}
                  className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-medium text-xs rounded-lg transition-colors border border-zinc-700 mt-2"
                >
                  [DEV] Saltar Login
                </button>
              )}
            </form>
          </>
        )}
      </div>

      <p className="mt-6 text-xs text-zinc-600 text-center">
        Tus imágenes y presets se guardan de forma segura en la nube.
      </p>
    </div>
  );
};

export default AuthScreen;
