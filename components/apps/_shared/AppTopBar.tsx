/**
 * AppTopBar — sticky top bar used by every premium app.
 *
 * Layout: [back] [mono title with accent dot] [credits pill]
 *
 * Mood: each app passes its own colors via the `mood` prop. The bar uses
 * inline CSS variables on its root so each instance is fully self-contained.
 */
import React from 'react';
import { ChevronLeft } from 'lucide-react';
import type { AppMood } from './types';
import { APP_EASE } from './types';

interface Props {
  mood: AppMood;
  /** Mono uppercase title shown next to the dot (e.g. "Headshot · Pro") */
  title: string;
  /** Credits remaining for the credits pill */
  credits: number;
  onBack: () => void;
  /** Avatar override — useful for mobile shell where avatar opens Profile.
   *  Default: nothing rendered next to back. */
  rightSlot?: React.ReactNode;
}

export function AppTopBar({ mood, title, credits, onBack, rightSlot }: Props) {
  return (
    <div
      className="vist-app-topbar"
      style={{
        '--app-bg-0': mood.bg0,
        '--app-bg-card': mood.bgCard,
        '--app-line': mood.line,
        '--app-ink-0': mood.ink0,
        '--app-ink-1': mood.ink1,
        '--app-ink-2': mood.ink2,
        '--app-accent': mood.accent,
        '--app-gold': mood.gold,
      } as React.CSSProperties}
    >
      <style>{TOPBAR_STYLES}</style>
      <button className="vist-app-topbar__back" onClick={onBack} aria-label="Volver">
        <ChevronLeft size={18} />
      </button>
      <span className="vist-app-topbar__title">
        <span className="vist-app-topbar__dot" />
        {title}
      </span>
      {rightSlot ?? (
        <span className="vist-app-topbar__credits">
          <span className="vist-app-topbar__credits-dot" />
          {credits.toLocaleString()}
        </span>
      )}
    </div>
  );
}

const TOPBAR_STYLES = `
.vist-app-topbar {
  position: sticky; top: 0; z-index: 30;
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 20px 10px;
  background: linear-gradient(180deg, var(--app-bg-0) 0%, var(--app-bg-0) 80%, transparent 100%);
  backdrop-filter: blur(8px);
}
.vist-app-topbar__back {
  width: 36px; height: 36px;
  border-radius: 50%;
  background: var(--app-bg-card);
  border: 1px solid var(--app-line);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: var(--app-ink-1);
  transition: transform 0.3s ${APP_EASE};
  -webkit-tap-highlight-color: transparent;
}
.vist-app-topbar__back:active { transform: scale(0.92); }
.vist-app-topbar__title {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px; letter-spacing: 0.22em;
  text-transform: uppercase; color: var(--app-ink-2);
  display: flex; align-items: center; gap: 8px;
}
.vist-app-topbar__dot {
  width: 6px; height: 6px;
  background: var(--app-accent);
  border-radius: 50%;
}
.vist-app-topbar__credits {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 11px;
  background: var(--app-bg-card);
  border-radius: 999px;
  border: 1px solid var(--app-line);
  font-size: 11px;
  font-family: 'JetBrains Mono', monospace;
  color: var(--app-ink-0); font-weight: 500;
}
.vist-app-topbar__credits-dot {
  width: 5px; height: 5px;
  background: var(--app-gold);
  border-radius: 50%;
}
`;
