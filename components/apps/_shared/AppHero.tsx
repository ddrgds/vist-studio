/**
 * AppHero — editorial hero block with eyebrow + Instrument Serif h1 + sub.
 *
 * Title supports a single `<em>...</em>` segment for the italic accent color.
 * Pass it as JSX so callers can split the line however they want.
 *
 * Example:
 *   <AppHero
 *     mood={mood}
 *     eyebrow="App #02 · Editorial"
 *     title={<>Mismo personaje,<br /><em>otro mundo.</em></>}
 *     sub="500+ estéticas..."
 *   />
 */
import React from 'react';
import type { AppMood } from './types';

interface Props {
  mood: AppMood;
  eyebrow: string;
  title: React.ReactNode;
  sub?: string;
}

export function AppHero({ mood, eyebrow, title, sub }: Props) {
  return (
    <section
      className="vist-app-hero"
      style={{
        '--app-ink-0': mood.ink0,
        '--app-ink-2': mood.ink2,
        '--app-ink-3': mood.ink3,
        '--app-accent': mood.accent,
      } as React.CSSProperties}
    >
      <style>{HERO_STYLES}</style>
      <div className="vist-app-hero__eyebrow">{eyebrow}</div>
      <h1 className="vist-app-hero__title">{title}</h1>
      {sub && <p className="vist-app-hero__sub">{sub}</p>}
    </section>
  );
}

const HERO_STYLES = `
.vist-app-hero { padding: 6px 20px 0; }
.vist-app-hero__eyebrow {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px; letter-spacing: 0.22em;
  text-transform: uppercase; color: var(--app-ink-3);
  margin-bottom: 8px;
}
.vist-app-hero__title {
  font-family: 'Instrument Serif', 'Playfair Display', serif;
  font-size: 40px; line-height: 0.95;
  letter-spacing: -0.02em; color: var(--app-ink-0);
  font-weight: 400;
  margin: 0;
}
.vist-app-hero__title em {
  font-style: italic;
  color: var(--app-accent);
}
.vist-app-hero__sub {
  margin: 12px 0 0;
  font-size: 13px; line-height: 1.55;
  color: var(--app-ink-2); max-width: 320px;
}
`;
