/**
 * AppFloatingCTA — fixed-bottom dual button row.
 *
 * Layout: [secondary 50px square] [primary stretched]
 * Primary has shimmer animation when enabled. Both respect safe-area-inset.
 */
import React from 'react';
import type { AppMood } from './types';
import { APP_EASE } from './types';

interface Props {
  mood: AppMood;
  /** Secondary button content (icon usually) — pass null to hide */
  secondaryIcon?: React.ReactNode;
  secondaryAriaLabel?: string;
  onSecondary?: () => void;
  /** Primary button label, e.g. "Generar retrato" */
  primaryLabel: string;
  /** Cost label, mono uppercase, e.g. "10 cr · 1 retrato" */
  primaryCost: string;
  onPrimary: () => void;
  primaryDisabled?: boolean;
  secondaryDisabled?: boolean;
}

export function AppFloatingCTA({
  mood,
  secondaryIcon,
  secondaryAriaLabel,
  onSecondary,
  primaryLabel,
  primaryCost,
  onPrimary,
  primaryDisabled,
  secondaryDisabled,
}: Props) {
  return (
    <div
      className="vist-app-cta"
      style={{
        '--app-bg-0': mood.bg0,
        '--app-bg-card': mood.bgCard,
        '--app-line': mood.line,
        '--app-ink-1': mood.ink1,
        '--app-accent': mood.accent,
        '--app-accent-deep': mood.accentDeep,
      } as React.CSSProperties}
    >
      <style>{CTA_STYLES}</style>
      <div className="vist-app-cta__row">
        {secondaryIcon && (
          <button
            className="vist-app-cta__secondary"
            onClick={onSecondary}
            disabled={secondaryDisabled}
            aria-label={secondaryAriaLabel}
          >
            {secondaryIcon}
          </button>
        )}
        <button
          className="vist-app-cta__primary"
          onClick={onPrimary}
          disabled={primaryDisabled}
        >
          <span className="vist-app-cta__cost">{primaryCost}</span>
          <span className="vist-app-cta__label">{primaryLabel}</span>
          <span className="vist-app-cta__arrow">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </span>
        </button>
      </div>
    </div>
  );
}

const CTA_STYLES = `
.vist-app-cta {
  position: fixed;
  bottom: 0; left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 480px;
  padding: 14px 20px calc(20px + env(safe-area-inset-bottom));
  background: linear-gradient(180deg, transparent 0%, var(--app-bg-0) 30%);
  z-index: 40;
  pointer-events: none;
}
.vist-app-cta__row { display: flex; gap: 10px; pointer-events: auto; }
.vist-app-cta__secondary {
  width: 50px; height: 56px;
  border-radius: 16px;
  background: var(--app-bg-card);
  border: 1px solid var(--app-line);
  display: flex; align-items: center; justify-content: center;
  color: var(--app-ink-1);
  cursor: pointer;
  font-family: inherit;
  transition: all 0.3s ${APP_EASE};
  -webkit-tap-highlight-color: transparent;
}
.vist-app-cta__secondary:disabled { opacity: 0.4; cursor: not-allowed; }
.vist-app-cta__secondary:not(:disabled):active {
  transform: scale(0.94);
  border-color: var(--app-accent);
  color: var(--app-accent-deep);
}
.vist-app-cta__primary {
  flex: 1;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  border-radius: 16px;
  background: linear-gradient(135deg, var(--app-accent) 0%, var(--app-accent-deep) 100%);
  color: #FFFCF5;
  border: none;
  cursor: pointer;
  font-family: inherit;
  font-size: 14px; font-weight: 600;
  position: relative;
  overflow: hidden;
  transition: transform 0.3s ${APP_EASE};
  box-shadow: 0 10px 24px -8px var(--app-accent-deep);
  -webkit-tap-highlight-color: transparent;
}
.vist-app-cta__primary:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  box-shadow: none;
}
.vist-app-cta__primary:not(:disabled):active { transform: scale(0.98); }
.vist-app-cta__primary::before {
  content: '';
  position: absolute; inset: 0;
  background: linear-gradient(120deg, transparent 30%, rgba(255,255,255,0.18) 50%, transparent 70%);
  transform: translateX(-100%);
  animation: vist-app-cta-shimmer 3s ${APP_EASE} infinite;
}
.vist-app-cta__primary:disabled::before { animation: none; }
@keyframes vist-app-cta-shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
.vist-app-cta__cost {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px; letter-spacing: 0.18em;
  opacity: 0.78; text-transform: uppercase;
}
.vist-app-cta__label {
  font-family: 'Instrument Serif', 'Playfair Display', serif;
  font-size: 18px; font-style: italic;
}
.vist-app-cta__arrow {
  width: 28px; height: 28px;
  border-radius: 50%;
  background: rgba(255, 252, 245, 0.18);
  display: flex; align-items: center; justify-content: center;
}
`;
