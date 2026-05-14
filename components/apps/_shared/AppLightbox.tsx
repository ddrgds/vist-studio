import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface Props {
  /** When non-null, the lightbox renders. */
  src: string | null;
  /** Optional alt text. Defaults to a generic accessible label. */
  alt?: string;
  onClose: () => void;
}

/**
 * AppLightbox — fullscreen image viewer used across the mobile apps when
 * the user taps a result image, history thumbnail, or any preview that
 * benefits from a zoomed view.
 *
 *   - Tap anywhere outside the image (or the X button) to close.
 *   - Locks body scroll while open.
 *   - Esc closes (desktop QA).
 *   - Respects safe-area-top so the X button doesn't hide under the notch.
 *
 * Usage:
 *   const [lightbox, setLightbox] = useState<string | null>(null);
 *   ...
 *   <img onClick={() => setLightbox(url)} ... />
 *   <AppLightbox src={lightbox} onClose={() => setLightbox(null)} />
 */
export function AppLightbox({ src, alt, onClose }: Props) {
  useEffect(() => {
    if (!src) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [src, onClose]);

  if (!src) return null;

  return (
    <div
      className="vist-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="Vista ampliada"
      onClick={onClose}
    >
      <style>{LIGHTBOX_STYLES}</style>
      <button
        className="vist-lightbox__close"
        onClick={onClose}
        aria-label="Cerrar"
      >
        <X size={18} />
      </button>
      <img
        src={src}
        alt={alt || 'Vista ampliada'}
        className="vist-lightbox__img"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

const LIGHTBOX_STYLES = `
.vist-lightbox {
  position: fixed; inset: 0; z-index: 200;
  background: rgba(8, 7, 12, 0.94);
  backdrop-filter: blur(14px);
  display: flex; align-items: center; justify-content: center;
  padding: max(20px, env(safe-area-inset-top, 0px)) 16px
           max(20px, env(safe-area-inset-bottom, 0px)) 16px;
  animation: vist-lightbox-in 0.2s ease-out;
}
@keyframes vist-lightbox-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
.vist-lightbox__img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: 8px;
  /* Subtle scale-in to feel native. */
  animation: vist-lightbox-zoom 0.22s cubic-bezier(0.32, 0.72, 0, 1);
}
@keyframes vist-lightbox-zoom {
  from { transform: scale(0.94); opacity: 0; }
  to   { transform: scale(1);    opacity: 1; }
}
.vist-lightbox__close {
  position: absolute;
  top: max(14px, env(safe-area-inset-top, 0px));
  right: 14px;
  width: 44px; height: 44px;
  border-radius: 50%;
  background: rgba(255, 252, 245, 0.14);
  border: 1px solid rgba(255, 252, 245, 0.18);
  color: rgba(255, 252, 245, 0.94);
  display: inline-flex; align-items: center; justify-content: center;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  z-index: 1;
}
.vist-lightbox__close:active { transform: scale(0.9); }
`;
