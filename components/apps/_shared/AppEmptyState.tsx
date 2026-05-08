/**
 * AppEmptyState — full-screen empty state with icon, serif title, sub, and
 * dual CTAs (typically "Subir foto" / "Crear personaje").
 */
import React from 'react';
import type { AppMood } from './types';
import { APP_EASE } from './types';

interface CTAItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  /** 'primary' = filled with accent gradient. 'ghost' = outline. Default: primary */
  variant?: 'primary' | 'ghost';
}

interface Props {
  mood: AppMood;
  /** Icon JSX rendered inside the round dashed circle */
  icon: React.ReactNode;
  /** Title supports `<em>...</em>` segment for accent italic */
  title: React.ReactNode;
  sub: string;
  ctas: CTAItem[];
}

export function AppEmptyState({ mood, icon, title, sub, ctas }: Props) {
  return (
    <div
      className="vist-app-empty"
      style={{
        '--app-bg-card': mood.bgCard,
        '--app-line': mood.line,
        '--app-ink-0': mood.ink0,
        '--app-ink-1': mood.ink1,
        '--app-ink-2': mood.ink2,
        '--app-accent': mood.accent,
        '--app-accent-deep': mood.accentDeep,
      } as React.CSSProperties}
    >
      <style>{EMPTY_STYLES}</style>
      <div className="vist-app-empty__icon">{icon}</div>
      <h2 className="vist-app-empty__title">{title}</h2>
      <p className="vist-app-empty__sub">{sub}</p>
      <div className="vist-app-empty__ctas">
        {ctas.map((c, i) => (
          <button
            key={i}
            className={`vist-app-empty__cta vist-app-empty__cta--${c.variant ?? 'primary'}`}
            onClick={c.onClick}
          >
            {c.icon}
            <span>{c.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

const EMPTY_STYLES = `
.vist-app-empty {
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  text-align: center;
  padding: 60px 32px;
  gap: 14px;
}
.vist-app-empty__icon {
  width: 72px; height: 72px;
  border-radius: 50%;
  background: var(--app-bg-card);
  border: 1.5px dashed var(--app-line);
  display: flex; align-items: center; justify-content: center;
  color: var(--app-accent);
  margin-bottom: 4px;
}
.vist-app-empty__title {
  font-family: 'Instrument Serif', 'Playfair Display', serif;
  font-size: 28px; line-height: 1.05;
  color: var(--app-ink-0); font-weight: 400;
  margin: 0;
}
.vist-app-empty__title em {
  font-style: italic;
  color: var(--app-accent);
}
.vist-app-empty__sub {
  font-size: 13px; color: var(--app-ink-2);
  max-width: 280px; line-height: 1.5;
  margin: 0;
}
.vist-app-empty__ctas {
  display: flex; gap: 8px;
  margin-top: 4px;
  flex-wrap: wrap;
  justify-content: center;
}
.vist-app-empty__cta {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 11px 20px;
  border: none;
  border-radius: 999px;
  font-size: 13px; font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: transform 0.3s ${APP_EASE};
  -webkit-tap-highlight-color: transparent;
}
.vist-app-empty__cta:active { transform: scale(0.96); }
.vist-app-empty__cta--primary {
  background: linear-gradient(135deg, var(--app-accent) 0%, var(--app-accent-deep) 100%);
  color: #FFFCF5;
  box-shadow: 0 8px 18px -8px var(--app-accent-deep);
}
.vist-app-empty__cta--ghost {
  background: transparent;
  color: var(--app-ink-1);
  border: 1px solid var(--app-line);
}
`;
