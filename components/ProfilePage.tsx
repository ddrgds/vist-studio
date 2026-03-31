import React, { useState, useRef, useEffect } from 'react';
import { Camera, LogOut, Check, User, Zap, Star, Building2, Pencil, ExternalLink, Infinity } from 'lucide-react';
import { useProfile } from '../contexts/ProfileContext';
import { useAuth } from '../contexts/AuthContext';
import { useGalleryStore } from '../stores/galleryStore';
import { useCharacterStore } from '../stores/characterStore';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '../hooks/useSubscription';
import { getCustomerPortalUrl } from '../services/lemonSqueezyService';
import { SubscriptionPlan } from '../types';

// ─────────────────────────────────────────────
// Plan badge
// ─────────────────────────────────────────────

const PLAN_STYLES: Record<SubscriptionPlan, { label: string; icon: React.ReactNode; color: string; bg: string; border: string }> = {
  starter: { label: 'Starter', icon: <User  className="w-3 h-3" />, color: 'var(--joi-text-2)',  bg: 'var(--joi-bg-2)', border: 'var(--joi-border)' },
  pro:     { label: 'Pro',     icon: <Zap   className="w-3 h-3" />, color: 'var(--joi-violet)',  bg: 'var(--joi-bg-2)', border: 'var(--joi-border)' },
  studio:  { label: 'Studio',  icon: <Star  className="w-3 h-3" />, color: 'var(--joi-pink)',    bg: 'var(--joi-bg-2)', border: 'var(--joi-border)' },
  brand:   { label: 'Brand',   icon: <Building2 className="w-3 h-3" />, color: 'var(--joi-text-1)', bg: 'var(--joi-bg-3)', border: 'var(--joi-border-h)' },
};

const PlanBadge: React.FC<{ plan: SubscriptionPlan }> = ({ plan }) => {
  const s = PLAN_STYLES[plan];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-jet tracking-wide"
      style={{ color: s.color, background: s.bg, border: `1px solid ${s.border}` }}
    >
      {s.icon} {s.label}
    </span>
  );
};

// ─────────────────────────────────────────────
// Stat card
// ─────────────────────────────────────────────

const StatCard: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <div
    className="flex flex-col items-center gap-1 px-6 py-4 rounded-2xl"
    style={{ background: 'var(--joi-bg-2)', border: '1px solid var(--joi-border)' }}
  >
    <span className="text-2xl font-bold font-display" style={{ color: 'var(--joi-pink)' }}>{value}</span>
    <span className="text-xs font-jet" style={{ color: 'var(--joi-text-3)' }}>{label}</span>
  </div>
);

// ─────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────

const ProfilePage: React.FC = () => {
  const { profile, isLoading, updateProfile, uploadAvatar } = useProfile();
  const { user, signOut } = useAuth();
  const galleryItems = useGalleryStore((s) => s.items);
  const characters = useCharacterStore((s) => s.characters);
  const navigate = useNavigate();
  const sub = useSubscription();

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Sync form state from loaded profile
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName);
      setBio(profile.bio);
    }
  }, [profile]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({ displayName, bio });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const handleManageSubscription = async () => {
    if (!sub.lsSubscriptionId) return;
    setPortalLoading(true);
    try {
      const url = await getCustomerPortalUrl(sub.lsSubscriptionId);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.error('Customer portal error', err);
    } finally {
      setPortalLoading(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      await uploadAvatar(file);
    } finally {
      setAvatarUploading(false);
      e.target.value = '';
    }
  };

  const initials = (displayName || user?.email || 'U')
    .split(/[\s@]/)
    .filter(Boolean)
    .slice(0, 2)
    .map(s => s[0].toUpperCase())
    .join('');

  const memberSince = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('es-MX', { month: 'short', year: 'numeric' })
    : '—';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full" style={{ color: 'var(--joi-text-3)' }}>
        <span className="animate-pulse text-sm font-jet">Cargando perfil…</span>
      </div>
    );
  }

  return (
    <div
      className="min-h-full overflow-y-auto pb-20 lg:pb-12 custom-scrollbar"
      style={{ background: 'var(--joi-bg-0)' }}
    >
      <div className="max-w-xl mx-auto px-4 sm:px-6 pt-10 pb-12 space-y-8">

        {/* ── Avatar + identity header ── */}
        <div className="flex flex-col items-center gap-4 text-center">

          {/* Avatar ring */}
          <div className="relative group">
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center overflow-hidden"
              style={{ background: 'var(--joi-bg-2)', border: '2px solid var(--joi-border-h)' }}
            >
              {profile?.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt="avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-3xl font-bold font-display" style={{ color: 'var(--joi-pink)' }}>
                  {initials}
                </span>
              )}
              {avatarUploading && (
                <div className="absolute inset-0 flex items-center justify-center rounded-full" style={{ background: 'rgba(8,7,12,0.75)' }}>
                  <span className="animate-spin text-xl">⏳</span>
                </div>
              )}
            </div>

            {/* Upload overlay */}
            <button
              onClick={() => avatarInputRef.current?.click()}
              disabled={avatarUploading}
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
              style={{ background: 'linear-gradient(135deg, var(--joi-pink), var(--joi-violet))', boxShadow: '0 2px 8px rgba(255,107,157,0.5)' }}
              title="Cambiar avatar"
            >
              <Camera className="w-3.5 h-3.5 text-white" />
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>

          <div className="space-y-1">
            <p className="text-lg font-bold font-display text-white">
              {profile?.displayName || user?.email?.split('@')[0] || 'Tu nombre'}
            </p>
            <p className="text-sm font-jet" style={{ color: 'var(--joi-text-3)' }}>{user?.email}</p>
            <div className="flex items-center justify-center gap-2 mt-2">
              <PlanBadge plan={sub.plan} />
              {sub.plan === 'starter' && (
                <button
                  onClick={() => navigate('/pricing')}
                  className="text-xs font-jet font-semibold transition-colors"
                  style={{ color: 'var(--joi-pink)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--joi-violet)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--joi-pink)')}
                >
                  Mejorar Plan →
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Personajes" value={characters.length} />
          <StatCard label="Generaciones" value={galleryItems.length} />
          <StatCard label="Miembro desde" value={memberSince} />
        </div>

        {/* ── Subscription & Credits ── */}
        <div
          className="rounded-2xl p-6 space-y-4"
          style={{ background: 'var(--joi-bg-2)', border: '1px solid var(--joi-border)' }}
        >
          <h2
            className="text-xs font-jet font-semibold tracking-widest uppercase"
            style={{ color: 'var(--joi-text-3)' }}
          >
            Suscripción
          </h2>

          {/* Credits bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-jet">
              <span style={{ color: 'var(--joi-text-2)' }}>Créditos restantes</span>
              <span className="font-bold" style={{ color: 'var(--joi-violet)' }}>
                {sub.isUnlimited
                  ? <span className="flex items-center gap-1"><Infinity className="w-3 h-3" /> Ilimitados</span>
                  : sub.credits.toLocaleString('en-US')
                }
              </span>
            </div>
            {!sub.isUnlimited && (
              <div
                className="w-full h-1.5 rounded-full overflow-hidden"
                style={{ background: 'var(--joi-bg-3)' }}
              >
                {(() => {
                  const max = sub.plan === 'brand' ? 8000 : sub.plan === 'studio' ? 1500 : sub.plan === 'pro' ? 500 : 50;
                  const pct = Math.min(100, Math.round((sub.credits / max) * 100));
                  return (
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        background: pct > 30 ? 'linear-gradient(90deg, var(--joi-pink), var(--joi-violet))' : '#ff4444',
                      }}
                    />
                  );
                })()}
              </div>
            )}
          </div>

          {/* Renewal info */}
          {sub.renewsAt && (
            <p className="text-xs font-jet" style={{ color: 'var(--joi-text-3)' }}>
              {sub.status === 'cancelled' ? 'Acceso hasta' : 'Se renueva el'}{' '}
              {new Date(sub.renewsAt).toLocaleDateString('es-MX', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          )}

          {/* CTA buttons */}
          <div className="flex gap-2 pt-1">
            {sub.plan === 'starter' ? (
              <button
                onClick={() => navigate('/pricing')}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
                style={{
                  background: 'linear-gradient(135deg, var(--joi-pink), var(--joi-violet))',
                  boxShadow: '0 2px 12px rgba(255,107,157,0.3)',
                  fontFamily: 'var(--font-display)',
                }}
              >
                Mejorar plan
              </button>
            ) : (
              <>
                <button
                  onClick={() => navigate('/pricing')}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                  style={{ background: 'var(--joi-bg-1)', border: '1px solid var(--joi-border)', color: 'var(--joi-text-2)', fontFamily: 'var(--font-display)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--joi-border-h)'; (e.currentTarget as HTMLElement).style.color = 'var(--joi-pink)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--joi-border)'; (e.currentTarget as HTMLElement).style.color = 'var(--joi-text-2)'; }}
                >
                  Cambiar plan
                </button>
                {sub.lsSubscriptionId && (
                  <button
                    onClick={handleManageSubscription}
                    disabled={portalLoading}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2"
                    style={{ background: 'var(--joi-bg-1)', border: '1px solid var(--joi-border)', color: 'var(--joi-text-2)', fontFamily: 'var(--font-display)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--joi-border-h)'; (e.currentTarget as HTMLElement).style.color = 'var(--joi-pink)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--joi-border)'; (e.currentTarget as HTMLElement).style.color = 'var(--joi-text-2)'; }}
                  >
                    {portalLoading ? '…' : <><ExternalLink className="w-3.5 h-3.5" /> Administrar</>}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── Edit form ── */}
        <div
          className="rounded-2xl p-6 space-y-5"
          style={{ background: 'var(--joi-bg-2)', border: '1px solid var(--joi-border)' }}
        >
          <h2
            className="text-xs font-jet font-semibold tracking-widest uppercase"
            style={{ color: 'var(--joi-text-3)' }}
          >
            Perfil
          </h2>

          {/* Display name */}
          <div className="space-y-1.5">
            <label className="text-xs font-jet" style={{ color: 'var(--joi-text-2)' }}>Nombre visible</label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Tu nombre"
              maxLength={50}
              className="w-full px-4 py-2.5 rounded-xl text-sm text-white outline-none transition-all"
              style={{ background: 'var(--joi-bg-1)', border: '1px solid var(--joi-border)', fontFamily: 'var(--font-body)' }}
              onFocus={e => (e.currentTarget.style.borderColor = 'var(--joi-border-h)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'var(--joi-border)')}
            />
          </div>

          {/* Bio */}
          <div className="space-y-1.5">
            <label className="text-xs font-jet" style={{ color: 'var(--joi-text-2)' }}>Biografía</label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="Cuéntale al mundo sobre tu visión creativa…"
              maxLength={200}
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl text-sm text-white outline-none transition-all resize-none"
              style={{ background: 'var(--joi-bg-1)', border: '1px solid var(--joi-border)', fontFamily: 'var(--font-body)' }}
              onFocus={e => (e.currentTarget.style.borderColor = 'var(--joi-border-h)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'var(--joi-border)')}
            />
            <p className="text-right text-[10px] font-jet" style={{ color: 'var(--joi-text-3)' }}>
              {bio.length}/200
            </p>
          </div>

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saving || saved}
            className="w-full py-2.5 rounded-xl text-sm font-bold text-white transition-all flex items-center justify-center gap-2"
            style={{
              background: saved
                ? 'linear-gradient(135deg, #16a34a, #22c55e)'
                : 'linear-gradient(135deg, var(--joi-pink), var(--joi-violet))',
              opacity: saving ? 0.7 : 1,
              fontFamily: 'var(--font-display)',
              boxShadow: '0 2px 12px rgba(255,107,157,0.3)',
            }}
          >
            {saved ? (
              <><Check className="w-4 h-4" /> Guardado</>
            ) : saving ? (
              'Guardando…'
            ) : (
              <><Pencil className="w-4 h-4" /> Guardar cambios</>
            )}
          </button>
        </div>

        {/* ── Account / Danger zone ── */}
        <div
          className="rounded-2xl p-6 space-y-3"
          style={{ background: 'var(--joi-bg-2)', border: '1px solid var(--joi-border)' }}
        >
          <h2
            className="text-xs font-jet font-semibold tracking-widest uppercase"
            style={{ color: 'var(--joi-text-3)' }}
          >
            Cuenta
          </h2>

          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all"
            style={{ background: 'var(--joi-bg-1)', border: '1px solid var(--joi-border)', color: 'var(--joi-text-2)' }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.color = '#ff6b6b';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,107,107,0.3)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.color = 'var(--joi-text-2)';
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--joi-border)';
            }}
          >
            <LogOut className="w-4 h-4" />
            Cerrar Sesión
          </button>
        </div>

      </div>
    </div>
  );
};

export default ProfilePage;
