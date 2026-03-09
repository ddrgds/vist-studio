import React, { useState } from 'react';
import { Sparkles, Users, Zap, ArrowRight, X } from 'lucide-react';

const ONBOARDING_KEY = 'vist_onboarding_seen';

interface WelcomeModalProps {
  onClose: () => void;
  onNavigate: (workspace: string, mode?: string) => void;
}

const SLIDES = [
  {
    icon: <Sparkles className="w-7 h-7" />,
    accent: '#FF5C35',
    title: 'Create with AI',
    subtitle: 'Start here',
    description: 'Type a prompt and generate images instantly. Toggle Face, Outfit, or Scene pills to add character consistency, outfits, and camera settings.',
    cta: { label: 'Start Creating', workspace: 'create', mode: 'create' },
  },
  {
    icon: <Zap className="w-7 h-7" />,
    accent: '#FFB347',
    title: 'Library & Tools',
    subtitle: 'Organize & enhance',
    description: 'Save characters to your library, browse generated images, and use AI tools like Try-On, Face Swap, Relight, and Upscale.',
    cta: { label: 'Explore', workspace: 'characters' },
  },
];

const WelcomeModal: React.FC<WelcomeModalProps> = ({ onClose, onNavigate }) => {
  const [slide, setSlide] = useState(0);
  const current = SLIDES[slide];
  const isLast = slide === SLIDES.length - 1;

  const dismiss = () => {
    localStorage.setItem(ONBOARDING_KEY, '1');
    onClose();
  };

  const handleCta = () => {
    dismiss();
    onNavigate(current.cta.workspace, current.cta.mode);
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.8)' }}
      onClick={dismiss}
    >
      <div
        className="relative w-full max-w-md rounded-2xl overflow-hidden"
        style={{ background: '#0D0A0A', border: '1px solid #1A1210' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={dismiss}
          className="absolute top-3 right-3 p-1.5 rounded-full transition-colors z-10"
          style={{ color: '#4A3A36' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#B8A9A5'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#4A3A36'; }}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header accent bar */}
        <div className="h-1" style={{ background: `linear-gradient(90deg, ${current.accent}, ${current.accent}80)` }} />

        {/* Content */}
        <div className="px-6 pt-8 pb-6">
          {/* Icon */}
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
            style={{ background: `${current.accent}15`, color: current.accent }}
          >
            {current.icon}
          </div>

          {/* Tag */}
          <p className="text-[10px] font-jet font-bold uppercase tracking-widest mb-2" style={{ color: current.accent }}>
            {current.subtitle}
          </p>

          {/* Title */}
          <h2 className="text-xl font-black tracking-tight mb-3" style={{ color: '#F5EDE8' }}>
            {current.title}
          </h2>

          {/* Description */}
          <p className="text-sm leading-relaxed mb-6" style={{ color: '#6B5A56' }}>
            {current.description}
          </p>

          {/* Actions */}
          <div className="flex items-center justify-between gap-3">
            {/* Dots */}
            <div className="flex items-center gap-1.5">
              {SLIDES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setSlide(i)}
                  className="rounded-full transition-all"
                  style={{
                    width: i === slide ? 16 : 6,
                    height: 6,
                    background: i === slide ? current.accent : '#2A1F1C',
                  }}
                />
              ))}
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-2">
              {!isLast && (
                <button
                  onClick={() => setSlide(s => s + 1)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold transition-all hover:scale-[1.02]"
                  style={{ color: '#6B5A56', border: '1px solid #1A1210' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#2A1F1C'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#1A1210'; }}
                >
                  Next
                </button>
              )}
              <button
                onClick={handleCta}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all hover:scale-[1.02] active:scale-95"
                style={{ background: `linear-gradient(135deg, ${current.accent}, ${current.accent}CC)` }}
              >
                {current.cta.label}
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Skip link */}
        <div className="px-6 pb-4 text-center">
          <button
            onClick={dismiss}
            className="text-[10px] font-jet transition-colors"
            style={{ color: '#2A1F1C' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#4A3A36'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#2A1F1C'; }}
          >
            Skip tour
          </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomeModal;
export { ONBOARDING_KEY };
