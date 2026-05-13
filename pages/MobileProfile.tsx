/**
 * MobileProfile — Native-feel account screen.
 *
 *   Hero: avatar (tap to change) + displayName + plan badge + email.
 *   Stat row: créditos, personajes, fotos.
 *   Plan card: current tier + renew + "Mejorar plan" CTA.
 *   Editable: displayName.
 *   Toggle: Modo Creator (sensual editorial) — opt-in confirm flow.
 *   Comunidad: Discord deep link.
 *   Legal: Términos / Privacidad.
 *   Sign out: red destructive at bottom.
 *
 * Mood: Atelier (cream + terracotta + clay).
 */
import React, { useRef, useState } from 'react';
import {
  ChevronLeft, Star, LogOut, Edit2, Check, X, ExternalLink, Shield,
  FileText, MessageCircle, Camera, Sparkles, Lock, Crown,
} from 'lucide-react';
import type { Page } from '../App';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../contexts/ProfileContext';
import { useCharacterStore } from '../stores/characterStore';
import { useGalleryStore } from '../stores/galleryStore';
import { useToast } from '../contexts/ToastContext';
import { hapticLight, hapticMedium, hapticSuccess, hapticError } from '../services/nativeService';

interface Props {
  onNav: (p: Page) => void;
}

const PLAN_LABELS: Record<string, { label: string; tagline: string; tier: number; cta: string | null }> = {
  starter: { label: 'Free',          tagline: '50 cr al registro · 25 cr/sem',          tier: 0, cta: 'Mejorar plan' },
  mini:    { label: 'Mini',          tagline: '250 créditos al mes · $5',               tier: 1, cta: 'Cambiar plan' },
  pro:     { label: 'Side Project',  tagline: '800 créditos al mes · $19',              tier: 2, cta: 'Cambiar plan' },
  studio:  { label: 'Negocio',       tagline: '4,000 créditos al mes · $79',            tier: 3, cta: 'Cambiar plan' },
  brand:   { label: 'Pro Agency',    tagline: '12,000 créditos al mes · $199',          tier: 4, cta: 'Cambiar plan' },
};

const DISCORD_URL = 'https://discord.gg/vist-studio';

export default function MobileProfile({ onNav }: Props) {
  const { user, signOut } = useAuth();
  const { profile, updateProfile, setContentMode, uploadAvatar } = useProfile();
  const characters = useCharacterStore(s => s.characters);
  const galleryItems = useGalleryStore(s => s.items);
  const toast = useToast();

  // ─── State ────────────────────────────────────────
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(profile?.displayName ?? '');
  const [showCreatorConfirm, setShowCreatorConfirm] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // ─── Loading state ───────────────────────────────
  if (!profile) {
    return (
      <div className="mp-shell">
        <style>{MP_STYLES}</style>
        <div className="mp-loader">
          <div className="mp-loader-dot" />
          <div className="mp-loader-dot" />
          <div className="mp-loader-dot" />
        </div>
      </div>
    );
  }

  const planInfo = PLAN_LABELS[profile.subscriptionPlan] ?? PLAN_LABELS.starter;
  const credits = profile.creditsRemaining;
  const unlimited = credits >= 999999;
  const photoCount = galleryItems.filter(i => !i.tags?.includes('sheet')).length;

  // ─── Member since (locale-friendly) ──────────────
  const memberDate = profile.createdAt ? new Date(profile.createdAt) : null;
  const memberSince = memberDate
    ? `${['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'][memberDate.getMonth()]} ${memberDate.getFullYear()}`
    : '—';

  const initials = (profile.displayName || user?.email || 'V')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0].toUpperCase())
    .join('') || 'V';

  // ─── Handlers ────────────────────────────────────
  const handleSaveName = async () => {
    const trimmed = draftName.trim();
    if (!trimmed) {
      toast.error('El nombre no puede estar vacío');
      return;
    }
    if (trimmed === profile.displayName) {
      setEditingName(false);
      return;
    }
    try {
      await updateProfile({ displayName: trimmed });
      hapticSuccess();
      toast.success('Nombre actualizado');
      setEditingName(false);
    } catch {
      hapticError();
      toast.error('No se pudo guardar');
    }
  };

  const handleToggleCreatorMode = () => {
    if (profile.contentMode === 'creator') {
      // Always-allow downgrade to standard
      setContentMode('standard');
      hapticLight();
      toast.success('Modo Creator desactivado');
    } else {
      // Confirm upgrade to creator
      setShowCreatorConfirm(true);
    }
  };

  const confirmCreatorMode = async () => {
    try {
      await setContentMode('creator');
      hapticSuccess();
      toast.success('Modo Creator activado');
      setShowCreatorConfirm(false);
    } catch {
      hapticError();
      toast.error('No se pudo activar');
    }
  };

  const handleAvatarPick = () => {
    avatarInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Solo imágenes');
      e.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Máximo 5 MB');
      e.target.value = '';
      return;
    }
    try {
      hapticLight();
      await uploadAvatar(file);
      hapticSuccess();
      toast.success('Foto de perfil actualizada');
    } catch (err) {
      hapticError();
      toast.error('No se pudo subir');
    } finally {
      e.target.value = '';
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      hapticSuccess();
      // No nav — Auth provider will redirect to auth screen
    } catch {
      hapticError();
      toast.error('Error al cerrar sesión');
    }
  };

  return (
    <div className="mp-shell">
      <style>{MP_STYLES}</style>

      {/* Top bar */}
      <div className="mp-topbar">
        <button className="mp-back" onClick={() => onNav('home' as Page)} aria-label="Volver">
          <ChevronLeft size={18} />
        </button>
        <span className="mp-topbar-title">
          <span className="mp-topbar-dot" />
          Perfil · Atelier
        </span>
        <div className="mp-topbar-spacer" />
      </div>

      {/* Hero zone */}
      <section className="mp-hero">
        <button className="mp-avatar-btn" onClick={handleAvatarPick} aria-label="Cambiar foto de perfil">
          <div
            className="mp-avatar"
            style={profile.avatarUrl ? { backgroundImage: `url(${profile.avatarUrl})` } : undefined}
          >
            {!profile.avatarUrl && <span className="mp-avatar-initials">{initials}</span>}
            <div className="mp-avatar-edit">
              <Camera size={13} />
            </div>
          </div>
        </button>
        <input
          ref={avatarInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleAvatarChange}
        />

        {editingName ? (
          <div className="mp-name-edit">
            <input
              className="mp-name-input"
              value={draftName}
              onChange={e => setDraftName(e.target.value)}
              autoFocus
              maxLength={32}
              onKeyDown={e => {
                if (e.key === 'Enter') handleSaveName();
                if (e.key === 'Escape') setEditingName(false);
              }}
            />
            <button className="mp-name-action mp-name-save" onClick={handleSaveName} aria-label="Guardar">
              <Check size={16} />
            </button>
            <button className="mp-name-action" onClick={() => { setEditingName(false); setDraftName(profile.displayName); }} aria-label="Cancelar">
              <X size={16} />
            </button>
          </div>
        ) : (
          <button className="mp-name-display" onClick={() => { setEditingName(true); setDraftName(profile.displayName); }}>
            <span className="mp-name-text">{profile.displayName || 'Sin nombre'}</span>
            <Edit2 size={12} className="mp-name-edit-icon" />
          </button>
        )}

        {user?.email && <div className="mp-email">{user.email}</div>}

        <div className="mp-plan-badge">
          {planInfo.tier >= 2 && <Crown size={11} />}
          {planInfo.tier === 1 && <Sparkles size={11} />}
          <span>{planInfo.label}</span>
        </div>
      </section>

      {/* Stat row */}
      <section className="mp-stats">
        <div className="mp-stat">
          <div className="mp-stat-num">{unlimited ? '∞' : credits.toLocaleString()}</div>
          <div className="mp-stat-label">Créditos</div>
        </div>
        <div className="mp-stat-divider" />
        <div className="mp-stat">
          <div className="mp-stat-num">{characters.length}</div>
          <div className="mp-stat-label">Modelos</div>
        </div>
        <div className="mp-stat-divider" />
        <div className="mp-stat">
          <div className="mp-stat-num">{photoCount}</div>
          <div className="mp-stat-label">Fotos</div>
        </div>
      </section>

      {/* Plan card */}
      <section className="mp-section">
        <div className="mp-section-head">
          <span className="mp-eyebrow">Tu plan</span>
        </div>
        <div className="mp-card mp-plan-card">
          <div className="mp-plan-head">
            <div className="mp-plan-meta">
              <span className="mp-plan-name">{planInfo.label}</span>
              <span className="mp-plan-tag">{planInfo.tagline}</span>
            </div>
            {planInfo.tier >= 2 ? (
              <Crown size={20} className="mp-plan-crown" />
            ) : (
              <Sparkles size={18} className="mp-plan-crown" />
            )}
          </div>
          {profile.subscriptionRenewsAt && (
            <div className="mp-plan-renew">
              Próximo cobro: {new Date(profile.subscriptionRenewsAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
            </div>
          )}
          {planInfo.cta && (
            <button
              className="mp-plan-cta"
              onClick={() => { hapticLight(); onNav('pricing' as Page); }}
            >
              {planInfo.cta}
              <ExternalLink size={12} />
            </button>
          )}
        </div>
      </section>

      {/* Modo Creator toggle */}
      <section className="mp-section">
        <div className="mp-section-head">
          <span className="mp-eyebrow">Contenido</span>
        </div>
        <button
          className={`mp-card mp-toggle-card ${profile.contentMode === 'creator' ? 'is-on' : ''}`}
          onClick={handleToggleCreatorMode}
        >
          <div className="mp-toggle-info">
            <div className="mp-toggle-name">
              {profile.contentMode === 'creator' ? (
                <><Star size={14} fill="currentColor" /> Modo Creator</>
              ) : (
                <><Lock size={14} /> Modo Standard</>
              )}
            </div>
            <div className="mp-toggle-desc">
              {profile.contentMode === 'creator'
                ? 'Acceso a presets editoriales sensuales (lencería, boudoir, beach Brazilian). Solo +18.'
                : 'Solo presets editoriales clásicos. Activa Modo Creator para sensual editorial.'}
            </div>
          </div>
          <div className={`mp-toggle-switch ${profile.contentMode === 'creator' ? 'is-on' : ''}`}>
            <div className="mp-toggle-knob" />
          </div>
        </button>
      </section>

      {/* Cuenta */}
      <section className="mp-section">
        <div className="mp-section-head">
          <span className="mp-eyebrow">Cuenta</span>
        </div>
        <div className="mp-card mp-list-card">
          <div className="mp-row">
            <span className="mp-row-label">Miembro desde</span>
            <span className="mp-row-value">{memberSince}</span>
          </div>
          <div className="mp-row-divider" />
          <div className="mp-row">
            <span className="mp-row-label">ID</span>
            <span className="mp-row-value mp-row-mono">
              {user?.id ? `${user.id.slice(0, 8)}…` : '—'}
            </span>
          </div>
        </div>
      </section>

      {/* Comunidad */}
      <section className="mp-section">
        <div className="mp-section-head">
          <span className="mp-eyebrow">Comunidad</span>
        </div>
        <a
          href={DISCORD_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mp-card mp-link-card"
          onClick={() => hapticLight()}
        >
          <MessageCircle size={18} />
          <div className="mp-link-info">
            <div className="mp-link-name">Discord</div>
            <div className="mp-link-desc">Tips, drops y soporte directo</div>
          </div>
          <ExternalLink size={14} className="mp-link-arrow" />
        </a>
      </section>

      {/* Legal */}
      <section className="mp-section">
        <div className="mp-section-head">
          <span className="mp-eyebrow">Legal</span>
        </div>
        <div className="mp-card mp-list-card">
          <a
            href="https://vistudio.app/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="mp-row mp-row-link"
            onClick={() => hapticLight()}
          >
            <FileText size={14} />
            <span className="mp-row-label">Términos de uso</span>
            <ExternalLink size={12} className="mp-row-arrow" />
          </a>
          <div className="mp-row-divider" />
          <a
            href="https://vistudio.app/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="mp-row mp-row-link"
            onClick={() => hapticLight()}
          >
            <Shield size={14} />
            <span className="mp-row-label">Privacidad</span>
            <ExternalLink size={12} className="mp-row-arrow" />
          </a>
        </div>
      </section>

      {/* Sign out */}
      <section className="mp-section mp-section-last">
        <button
          className="mp-signout"
          onClick={() => { hapticError(); setShowSignOutConfirm(true); }}
        >
          <LogOut size={14} />
          Cerrar sesión
        </button>
      </section>

      <div className="mp-version">VIST · v1.0</div>
      <div className="mp-bottom-pad" />

      {/* Modo Creator confirm modal */}
      {showCreatorConfirm && (
        <div className="mp-modal-backdrop" onClick={() => setShowCreatorConfirm(false)}>
          <div className="mp-modal" onClick={e => e.stopPropagation()}>
            <div className="mp-modal-icon"><Star size={22} fill="currentColor" /></div>
            <h3 className="mp-modal-title">Activar Modo Creator</h3>
            <p className="mp-modal-text">
              Vas a desbloquear presets sensuales editoriales: lencería, boudoir, beach Brazilian.
              Confirmas que <strong>tienes 18+</strong> y entiendes que el contenido es para uso editorial profesional.
            </p>
            <div className="mp-modal-disclaimer">
              <Shield size={11} />
              <span>Tu contenido sigue moderado por el classifier NSFW. No se permite contenido sexual explícito.</span>
            </div>
            <div className="mp-modal-actions">
              <button className="mp-modal-cancel" onClick={() => setShowCreatorConfirm(false)}>
                Cancelar
              </button>
              <button className="mp-modal-primary" onClick={confirmCreatorMode}>
                Confirmar 18+
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sign out confirm modal */}
      {showSignOutConfirm && (
        <div className="mp-modal-backdrop" onClick={() => setShowSignOutConfirm(false)}>
          <div className="mp-modal" onClick={e => e.stopPropagation()}>
            <h3 className="mp-modal-title">Cerrar sesión</h3>
            <p className="mp-modal-text">
              Vas a salir de tu cuenta. Tus personajes y fotos quedan guardados en la nube.
            </p>
            <div className="mp-modal-actions">
              <button className="mp-modal-cancel" onClick={() => setShowSignOutConfirm(false)}>
                Cancelar
              </button>
              <button className="mp-modal-danger" onClick={handleSignOut}>
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────

const MP_STYLES = `
.mp-shell {
  --mp-bg-0: #F5EBDB;
  --mp-bg-card: #FFFCF5;
  --mp-paper: #F8EFDD;
  --mp-ink-0: #1F1A14;
  --mp-ink-1: #3D332A;
  --mp-ink-2: #6F5E4C;
  --mp-ink-3: #A8957D;
  --mp-line: rgba(31, 26, 20, 0.10);
  --mp-accent: #C9785C;
  --mp-accent-deep: #8E5640;
  --mp-gold: #D4A85F;
  --mp-rose: #B86060;
  --mp-mint: #7DA66B;
  --mp-ease: cubic-bezier(0.32, 0.72, 0, 1);

  min-height: 100%;
  background: var(--mp-bg-0);
  color: var(--mp-ink-0);
  font-family: 'DM Sans', sans-serif;
  -webkit-font-smoothing: antialiased;
  padding-bottom: 110px;
  background-image:
    radial-gradient(circle at 25% 8%, rgba(31,26,20,0.022) 1px, transparent 1px),
    radial-gradient(circle at 78% 60%, rgba(31,26,20,0.018) 1px, transparent 1px);
  background-size: 30px 30px, 48px 48px;
}

/* Top bar */
.mp-shell .mp-topbar {
  position: sticky; top: 0; z-index: 30;
  display: flex; align-items: center; justify-content: space-between;
  padding: max(14px, env(safe-area-inset-top)) 16px 10px;
  background: linear-gradient(180deg, var(--mp-bg-0) 0%, var(--mp-bg-0) 80%, transparent 100%);
  backdrop-filter: blur(8px);
}
.mp-shell .mp-back {
  width: 36px; height: 36px;
  border-radius: 50%;
  background: var(--mp-bg-card);
  border: 1px solid var(--mp-line);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: var(--mp-ink-1);
  -webkit-tap-highlight-color: transparent;
}
.mp-shell .mp-back:active { transform: scale(0.92); }
.mp-shell .mp-topbar-title {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px; letter-spacing: 0.22em;
  text-transform: uppercase; color: var(--mp-ink-2);
  display: flex; align-items: center; gap: 8px;
}
.mp-shell .mp-topbar-dot {
  width: 6px; height: 6px;
  background: var(--mp-accent);
  border-radius: 50%;
}
.mp-shell .mp-topbar-spacer { width: 36px; }

/* Hero */
.mp-shell .mp-hero {
  display: flex; flex-direction: column;
  align-items: center;
  padding: 14px 20px 22px;
  text-align: center;
}
.mp-shell .mp-avatar-btn {
  background: transparent;
  border: none;
  padding: 0;
  margin-bottom: 14px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.mp-shell .mp-avatar {
  position: relative;
  width: 88px; height: 88px;
  border-radius: 50%;
  background: var(--mp-paper);
  background-size: cover; background-position: center;
  border: 2px solid var(--mp-bg-card);
  box-shadow: 0 0 0 1px var(--mp-line), 0 4px 16px rgba(31, 26, 20, 0.08);
  display: flex; align-items: center; justify-content: center;
  transition: transform 0.3s var(--mp-ease);
}
.mp-shell .mp-avatar-btn:active .mp-avatar { transform: scale(0.96); }
.mp-shell .mp-avatar-initials {
  font-family: 'Instrument Serif', 'Playfair Display', serif;
  font-size: 36px;
  color: var(--mp-ink-2);
  font-weight: 400;
}
.mp-shell .mp-avatar-edit {
  position: absolute;
  bottom: 0; right: 0;
  width: 26px; height: 26px;
  background: var(--mp-ink-0);
  color: var(--mp-bg-card);
  border-radius: 50%;
  border: 2px solid var(--mp-bg-0);
  display: flex; align-items: center; justify-content: center;
}
.mp-shell .mp-name-display {
  display: inline-flex; align-items: center; gap: 8px;
  background: transparent;
  border: none;
  font-family: 'Instrument Serif', 'Playfair Display', serif;
  font-size: 28px; font-weight: 400;
  letter-spacing: -0.01em;
  color: var(--mp-ink-0);
  cursor: pointer;
  padding: 0;
  margin-bottom: 4px;
  -webkit-tap-highlight-color: transparent;
}
.mp-shell .mp-name-text { line-height: 1; }
.mp-shell .mp-name-edit-icon { color: var(--mp-ink-3); }
.mp-shell .mp-name-edit {
  display: flex; align-items: center; gap: 6px;
  margin-bottom: 4px;
}
.mp-shell .mp-name-input {
  background: var(--mp-bg-card);
  border: 1px solid var(--mp-accent);
  border-radius: 12px;
  padding: 10px 14px;
  font-family: 'Instrument Serif', 'Playfair Display', serif;
  font-size: 22px;
  color: var(--mp-ink-0);
  text-align: center;
  outline: none;
  max-width: 220px;
  min-width: 140px;
}
.mp-shell .mp-name-action {
  width: 36px; height: 36px;
  border-radius: 50%;
  background: var(--mp-bg-card);
  border: 1px solid var(--mp-line);
  color: var(--mp-ink-1);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
}
.mp-shell .mp-name-save {
  background: var(--mp-ink-0);
  border-color: var(--mp-ink-0);
  color: var(--mp-bg-card);
}
.mp-shell .mp-email {
  font-size: 12px;
  color: var(--mp-ink-2);
  margin-bottom: 14px;
  font-family: 'JetBrains Mono', monospace;
}
.mp-shell .mp-plan-badge {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 5px 11px;
  background: var(--mp-bg-card);
  border: 1px solid var(--mp-line);
  border-radius: 999px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px; letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--mp-ink-1);
}

/* Stats row */
.mp-shell .mp-stats {
  display: flex; align-items: center;
  background: var(--mp-bg-card);
  margin: 0 20px 18px;
  padding: 16px 14px;
  border-radius: 16px;
  border: 1px solid var(--mp-line);
}
.mp-shell .mp-stat {
  flex: 1;
  text-align: center;
}
.mp-shell .mp-stat-num {
  font-family: 'Instrument Serif', 'Playfair Display', serif;
  font-size: 22px;
  font-weight: 400;
  color: var(--mp-ink-0);
  line-height: 1;
}
.mp-shell .mp-stat-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px; letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--mp-ink-3);
  margin-top: 6px;
}
.mp-shell .mp-stat-divider {
  width: 1px;
  height: 28px;
  background: var(--mp-line);
}

/* Sections */
.mp-shell .mp-section {
  padding: 0 20px 18px;
}
.mp-shell .mp-section-last { padding-bottom: 8px; }
.mp-shell .mp-section-head {
  padding-bottom: 8px;
}
.mp-shell .mp-eyebrow {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px; letter-spacing: 0.22em;
  text-transform: uppercase; color: var(--mp-ink-3);
}

/* Cards */
.mp-shell .mp-card {
  background: var(--mp-bg-card);
  border: 1px solid var(--mp-line);
  border-radius: 16px;
}

/* Plan card */
.mp-shell .mp-plan-card {
  padding: 16px;
}
.mp-shell .mp-plan-head {
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px;
}
.mp-shell .mp-plan-meta { flex: 1; }
.mp-shell .mp-plan-name {
  display: block;
  font-family: 'Instrument Serif', 'Playfair Display', serif;
  font-size: 22px;
  font-weight: 400;
  color: var(--mp-ink-0);
  letter-spacing: -0.01em;
}
.mp-shell .mp-plan-tag {
  display: block;
  font-size: 12px;
  color: var(--mp-ink-2);
  margin-top: 2px;
}
.mp-shell .mp-plan-crown {
  color: var(--mp-gold);
  flex-shrink: 0;
}
.mp-shell .mp-plan-renew {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--mp-line);
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px; letter-spacing: 0.1em;
  color: var(--mp-ink-2);
  text-transform: uppercase;
}
.mp-shell .mp-plan-cta {
  margin-top: 14px;
  width: 100%;
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  padding: 11px 14px;
  background: var(--mp-ink-0);
  color: var(--mp-bg-card);
  border: none;
  border-radius: 999px;
  font-family: inherit;
  font-size: 13px; font-weight: 600;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: transform 0.2s var(--mp-ease);
}
.mp-shell .mp-plan-cta:active { transform: scale(0.98); }

/* Toggle card */
.mp-shell .mp-toggle-card {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 16px;
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  width: 100%;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.2s var(--mp-ease);
}
.mp-shell .mp-toggle-card.is-on {
  background: linear-gradient(180deg, var(--mp-bg-card) 0%, #FAF0DD 100%);
  border-color: var(--mp-accent);
}
.mp-shell .mp-toggle-info { flex: 1; min-width: 0; }
.mp-shell .mp-toggle-name {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 14px; font-weight: 600;
  color: var(--mp-ink-0);
  margin-bottom: 3px;
}
.mp-shell .mp-toggle-card.is-on .mp-toggle-name {
  color: var(--mp-accent-deep);
}
.mp-shell .mp-toggle-desc {
  font-size: 12px;
  line-height: 1.4;
  color: var(--mp-ink-2);
}
.mp-shell .mp-toggle-switch {
  width: 44px; height: 26px;
  background: var(--mp-ink-3);
  border-radius: 999px;
  position: relative;
  transition: background 0.2s var(--mp-ease);
  flex-shrink: 0;
}
.mp-shell .mp-toggle-switch.is-on {
  background: var(--mp-accent);
}
.mp-shell .mp-toggle-knob {
  position: absolute;
  top: 3px; left: 3px;
  width: 20px; height: 20px;
  background: white;
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0,0,0,0.15);
  transition: transform 0.25s var(--mp-ease);
}
.mp-shell .mp-toggle-switch.is-on .mp-toggle-knob {
  transform: translateX(18px);
}

/* List card */
.mp-shell .mp-list-card {
  overflow: hidden;
}
.mp-shell .mp-row {
  display: flex; align-items: center; gap: 12px;
  padding: 13px 16px;
  text-decoration: none;
  color: var(--mp-ink-1);
  font-size: 13px;
  -webkit-tap-highlight-color: transparent;
}
.mp-shell .mp-row-link {
  cursor: pointer;
  transition: background 0.2s var(--mp-ease);
}
.mp-shell .mp-row-link:active { background: var(--mp-paper); }
.mp-shell .mp-row-label {
  flex: 1;
  font-weight: 500;
}
.mp-shell .mp-row-value {
  color: var(--mp-ink-2);
  font-size: 12px;
}
.mp-shell .mp-row-mono {
  font-family: 'JetBrains Mono', monospace;
}
.mp-shell .mp-row-arrow {
  color: var(--mp-ink-3);
}
.mp-shell .mp-row-divider {
  height: 1px;
  background: var(--mp-line);
  margin: 0 16px;
}

/* Link card */
.mp-shell .mp-link-card {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 16px;
  text-decoration: none;
  color: var(--mp-ink-1);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.2s var(--mp-ease);
}
.mp-shell .mp-link-card:active { background: var(--mp-paper); }
.mp-shell .mp-link-info { flex: 1; min-width: 0; }
.mp-shell .mp-link-name {
  font-size: 14px; font-weight: 600;
  color: var(--mp-ink-0);
}
.mp-shell .mp-link-desc {
  font-size: 12px;
  color: var(--mp-ink-2);
  margin-top: 2px;
}
.mp-shell .mp-link-arrow { color: var(--mp-ink-3); }

/* Sign out */
.mp-shell .mp-signout {
  width: 100%;
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  padding: 13px;
  background: var(--mp-bg-card);
  border: 1px solid rgba(184, 96, 96, 0.3);
  color: var(--mp-rose);
  border-radius: 14px;
  font-family: inherit;
  font-size: 13px; font-weight: 600;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.2s var(--mp-ease);
}
.mp-shell .mp-signout:active {
  background: rgba(184, 96, 96, 0.08);
}

/* Version */
.mp-shell .mp-version {
  text-align: center;
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px; letter-spacing: 0.2em;
  color: var(--mp-ink-3);
  text-transform: uppercase;
  padding: 14px 0 24px;
}
.mp-shell .mp-bottom-pad { height: 20px; }

/* Modal */
.mp-shell .mp-modal-backdrop {
  position: fixed; inset: 0;
  background: rgba(20, 16, 14, 0.55);
  backdrop-filter: blur(8px);
  z-index: 100;
  display: flex; align-items: flex-end;
  animation: mp-fade-in 0.2s var(--mp-ease);
}
.mp-shell .mp-modal {
  width: 100%;
  background: var(--mp-bg-card);
  border-radius: 22px 22px 0 0;
  padding: 22px 20px max(22px, env(safe-area-inset-bottom));
  animation: mp-slide-up 0.25s var(--mp-ease);
  text-align: center;
}
.mp-shell .mp-modal-icon {
  width: 48px; height: 48px;
  border-radius: 50%;
  background: var(--mp-accent);
  color: var(--mp-bg-card);
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 12px;
}
.mp-shell .mp-modal-title {
  font-family: 'Instrument Serif', 'Playfair Display', serif;
  font-size: 22px;
  font-weight: 400;
  margin: 0 0 8px;
  color: var(--mp-ink-0);
}
.mp-shell .mp-modal-text {
  font-size: 13px;
  color: var(--mp-ink-1);
  line-height: 1.55;
  margin: 0 0 14px;
}
.mp-shell .mp-modal-text strong {
  color: var(--mp-ink-0);
  font-weight: 600;
}
.mp-shell .mp-modal-disclaimer {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 12px;
  background: var(--mp-paper);
  border-radius: 10px;
  font-size: 11px;
  color: var(--mp-ink-2);
  text-align: left;
  margin-bottom: 14px;
}
.mp-shell .mp-modal-disclaimer svg { flex-shrink: 0; color: var(--mp-mint); }
.mp-shell .mp-modal-actions {
  display: flex; gap: 8px;
  margin-top: 6px;
}
.mp-shell .mp-modal-cancel,
.mp-shell .mp-modal-primary,
.mp-shell .mp-modal-danger {
  flex: 1;
  padding: 12px;
  border-radius: 12px;
  border: none;
  font-family: inherit;
  font-size: 14px; font-weight: 600;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.mp-shell .mp-modal-cancel {
  background: var(--mp-paper);
  color: var(--mp-ink-1);
  border: 1px solid var(--mp-line);
}
.mp-shell .mp-modal-primary {
  background: var(--mp-ink-0);
  color: var(--mp-bg-card);
}
.mp-shell .mp-modal-danger {
  background: var(--mp-rose);
  color: var(--mp-bg-card);
}

/* Loader */
.mp-shell .mp-loader {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 60vh;
}
.mp-shell .mp-loader-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: var(--mp-ink-2);
  animation: mp-pulse 1.4s ease-in-out infinite;
}
.mp-shell .mp-loader-dot:nth-child(2) { animation-delay: 0.2s; }
.mp-shell .mp-loader-dot:nth-child(3) { animation-delay: 0.4s; }
@keyframes mp-pulse {
  0%, 80%, 100% { opacity: 0.3; transform: scale(0.85); }
  40% { opacity: 1; transform: scale(1); }
}
@keyframes mp-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes mp-slide-up {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
`;
