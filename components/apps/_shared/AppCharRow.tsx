/**
 * AppCharRow — character chips + upload chip + clear button.
 *
 * Used in HeadshotPro, Reimaginar, Sesión de Fotos. Mutually exclusive with
 * customBaseFile: tapping a character clears the upload, tapping upload clears
 * the selected character.
 */
import React from 'react';
import { Upload, X } from 'lucide-react';
import type { AppMood } from './types';
import { APP_EASE } from './types';
import { hapticLight } from '../../../services/nativeService';

interface CharRowItem {
  id: string;
  name: string;
  thumbnail?: string;
}

interface Props {
  mood: AppMood;
  characters: CharRowItem[];
  selectedCharId: string | null;
  onSelectChar: (id: string) => void;
  customBaseFile: File | null;
  customBaseUrl: string | null;
  onUploadClick: () => void;
  onClearCustomBase: () => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
}

export function AppCharRow({
  mood,
  characters,
  selectedCharId,
  onSelectChar,
  customBaseFile,
  customBaseUrl,
  onUploadClick,
  onClearCustomBase,
  onFileChange,
  fileInputRef,
}: Props) {
  const customSelected = customBaseFile && customBaseUrl;

  return (
    <div
      className="vist-app-charrow"
      style={{
        '--app-bg-card': mood.bgCard,
        '--app-paper': mood.paper,
        '--app-line': mood.line,
        '--app-ink-0': mood.ink0,
        '--app-ink-1': mood.ink1,
        '--app-accent': mood.accent,
        '--app-accent-deep': mood.accentDeep,
      } as React.CSSProperties}
    >
      <style>{CHARROW_STYLES}</style>

      {customSelected ? (
        <div className="vist-app-charrow__chip is-active vist-app-charrow__chip--upload">
          <span className="vist-app-charrow__thumb" style={{ backgroundImage: `url(${customBaseUrl})` }} />
          <span className="vist-app-charrow__name">Mi foto</span>
          <button
            className="vist-app-charrow__x"
            onClick={onClearCustomBase}
            aria-label="Quitar mi foto"
          >
            <X size={11} />
          </button>
        </div>
      ) : (
        <button
          className="vist-app-charrow__chip vist-app-charrow__chip--upload-btn"
          onClick={onUploadClick}
        >
          <span className="vist-app-charrow__thumb vist-app-charrow__thumb--upload">
            <Upload size={13} />
          </span>
          <span className="vist-app-charrow__name">Subir foto</span>
        </button>
      )}

      {characters.map(c => (
        <button
          key={c.id}
          className={`vist-app-charrow__chip ${selectedCharId === c.id && !customBaseFile ? 'is-active' : ''}`}
          onClick={() => {
            hapticLight();
            onSelectChar(c.id);
          }}
        >
          <span
            className="vist-app-charrow__thumb"
            style={c.thumbnail ? { backgroundImage: `url(${c.thumbnail})` } : undefined}
          />
          <span className="vist-app-charrow__name">{c.name}</span>
        </button>
      ))}

      <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={onFileChange} />
    </div>
  );
}

const CHARROW_STYLES = `
.vist-app-charrow {
  display: flex; gap: 8px;
  margin: 18px 20px 0;
  overflow-x: auto;
  scrollbar-width: none;
  padding-bottom: 4px;
}
.vist-app-charrow::-webkit-scrollbar { display: none; }
.vist-app-charrow__chip {
  flex-shrink: 0;
  display: flex; align-items: center; gap: 8px;
  padding: 6px 12px 6px 6px;
  background: var(--app-bg-card);
  border: 1px solid var(--app-line);
  border-radius: 999px;
  cursor: pointer;
  transition: all 0.3s ${APP_EASE};
  font-family: inherit;
  -webkit-tap-highlight-color: transparent;
}
.vist-app-charrow__chip:active { transform: scale(0.96); }
.vist-app-charrow__chip.is-active {
  background: var(--app-ink-0);
  border-color: var(--app-ink-0);
}
.vist-app-charrow__chip.is-active .vist-app-charrow__name {
  color: var(--app-bg-card);
}
.vist-app-charrow__thumb {
  width: 26px; height: 26px;
  border-radius: 50%;
  background-color: var(--app-paper);
  background-size: cover; background-position: center;
  flex-shrink: 0;
}
.vist-app-charrow__name {
  font-size: 12px; font-weight: 500;
  color: var(--app-ink-1);
}
.vist-app-charrow__chip--upload-btn {
  border-style: dashed !important;
  border-color: var(--app-accent) !important;
  color: var(--app-accent-deep);
}
.vist-app-charrow__chip--upload-btn .vist-app-charrow__name {
  color: var(--app-accent-deep);
  font-weight: 600;
}
.vist-app-charrow__thumb--upload {
  background-color: var(--app-paper) !important;
  display: flex; align-items: center; justify-content: center;
  color: var(--app-accent);
}
.vist-app-charrow__chip--upload {
  position: relative;
  padding-right: 32px;
}
.vist-app-charrow__x {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  width: 20px; height: 20px;
  border-radius: 50%;
  background: rgba(255,255,255,0.18);
  border: none;
  color: var(--app-bg-card);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  font-family: inherit;
}
`;
