/**
 * HeroProSwitch — tiny iOS-style toggle for Premium tier (NB Pro → Flux 2 Max).
 *
 * Drop into any app's topbar. Mood-aware: accepts AppMood for accent color.
 * Cost (+15cr) is shown as part of the title attribute. Active state shows
 * gold accent + filled track + thumb shifted right.
 *
 * Usage:
 *   <HeroProSwitch
 *     active={premiumTier}
 *     disabled={generating}
 *     onChange={setPremiumTier}
 *     extraCost={PREMIUM_EXTRA}
 *     mood={ATELIER_MOOD}
 *   />
 */
import React from 'react';
import { hapticLight } from '../../../services/nativeService';
import type { AppMood } from './types';

interface Props {
  active: boolean;
  disabled?: boolean;
  onChange: (active: boolean) => void;
  extraCost?: number; // for tooltip
  mood?: AppMood;
}

export function HeroProSwitch({ active, disabled, onChange, extraCost = 15, mood }: Props) {
  const accent = mood?.gold || '#D4A85F';
  const line = mood?.line || 'rgba(31, 26, 20, 0.10)';
  const inkMid = mood?.ink2 || '#6F5E4C';
  const card = mood?.bgCard || '#FFFCF5';

  return (
    <>
      <button
        type="button"
        className={`hps ${active ? 'hps-active' : ''}`}
        onClick={() => { if (!disabled) { hapticLight(); onChange(!active); } }}
        disabled={disabled}
        title={`Hero Pro · NB Pro + Flux 2 Max · +${extraCost}cr`}
        aria-label={`Hero Pro ${active ? 'activado' : 'desactivado'}`}
        aria-pressed={active}
        style={{
          '--hps-accent': accent,
          '--hps-line': line,
          '--hps-ink-mid': inkMid,
          '--hps-card': card,
        } as React.CSSProperties}
      >
        <span className="hps-label">Hero</span>
        <span className="hps-track"><span className="hps-thumb" /></span>
      </button>
      <style>{`
        .hps {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 6px 4px 9px;
          background: transparent;
          border: 1px solid var(--hps-line);
          border-radius: 999px;
          cursor: pointer;
          font-family: inherit;
          transition: background 0.2s, border-color 0.2s, transform 0.1s;
          -webkit-tap-highlight-color: transparent;
        }
        .hps:active { transform: scale(0.96); }
        .hps:disabled { opacity: 0.45; cursor: not-allowed; }
        .hps-active {
          background: color-mix(in srgb, var(--hps-accent) 12%, transparent);
          border-color: var(--hps-accent);
        }
        .hps-label {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.06em;
          color: var(--hps-ink-mid);
          text-transform: uppercase;
          transition: color 0.2s;
        }
        .hps-active .hps-label { color: var(--hps-accent); }
        .hps-track {
          position: relative;
          width: 22px; height: 13px;
          border-radius: 999px;
          background: var(--hps-line);
          transition: background 0.2s;
          flex-shrink: 0;
        }
        .hps-active .hps-track { background: var(--hps-accent); }
        .hps-thumb {
          position: absolute;
          top: 1px; left: 1px;
          width: 11px; height: 11px;
          border-radius: 50%;
          background: var(--hps-card);
          box-shadow: 0 1px 2px rgba(0,0,0,0.15);
          transition: transform 0.2s;
        }
        .hps-active .hps-thumb { transform: translateX(9px); }
      `}</style>
    </>
  );
}

export const HERO_PRO_EXTRA_COST = 15;
