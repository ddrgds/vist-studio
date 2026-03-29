import React, { useState } from 'react';
import { editImageWithAI } from '../services/geminiService';
import { editImageWithSeedream5Lite } from '../services/falService';
import { GeminiImageModel, CREDIT_COSTS } from '../types';
import { useToast } from '../contexts/ToastContext';
import { useProfile } from '../contexts/ProfileContext';
import ProgressBar from './ProgressBar';

interface SkinEnhancerModalProps {
  targetItem: { id: string; url: string; type: string };
  onClose: () => void;
  onSave: (dataUrl: string, sourceItemId: string) => Promise<void>;
}

type Intensity = 'light' | 'medium' | 'strong';

const INTENSITY_OPTIONS: { value: Intensity; label: string; desc: string; prompt: string }[] = [
  {
    value: 'light',
    label: 'Sutil',
    desc: 'Apenas perceptible — fresco y natural',
    prompt: 'barely noticeable subtle retouching. Only reduce the most obvious imperfections. Result should look completely natural, as if no editing was done.',
  },
  {
    value: 'medium',
    label: 'Profesional',
    desc: 'Calidad profesional — pulido pero realista',
    prompt: 'professional beauty retouching. Smooth skin texture, remove blemishes, even out skin tone, add soft natural luminosity. Result should look like a professional photoshoot — clearly enhanced but fully realistic.',
  },
  {
    value: 'strong',
    label: 'Editorial',
    desc: 'Alta moda — impecable, calidad revista',
    prompt: 'editorial high-fashion retouching. Flawlessly smooth skin, luminous glowing complexion, complete blemish removal, maximally even tone. Result should look like a magazine cover — flawless but avoid plastic or artificial look.',
  },
];

const SkinEnhancerModal: React.FC<SkinEnhancerModalProps> = ({ targetItem, onClose, onSave }) => {
  const toast = useToast();
  const { decrementCredits, restoreCredits } = useProfile();
  const [intensity, setIntensity] = useState<Intensity>('medium');
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleGenerate = async () => {
    const cost = CREDIT_COSTS['realistic-skin'];
    const hasCredits = await decrementCredits(cost);
    if (!hasCredits) { toast.error('Créditos insuficientes'); return; }

    setLoading(true);
    setProgress(0);
    setResult(null);
    try {
      const resp = await fetch(targetItem.url);
      const blob = await resp.blob();
      const targetFile = new File([blob], `target-${targetItem.id}.png`, { type: blob.type || 'image/png' });

      const selected = INTENSITY_OPTIONS.find(o => o.value === intensity)!;
      const instruction = `SKIN RETOUCH (overrides preservation rule for skin): SKIN ENHANCEMENT TASK — ${intensity.toUpperCase()} intensity

Retouch ONLY the skin in this portrait. Apply ${selected.prompt}

RETOUCH THESE ONLY:
- Skin texture: smooth pores and surface irregularities
- Blemishes: remove spots, redness, temporary imperfections
- Skin tone: even out splotchy or uneven patches
- Luminosity: add subtle glow and natural radiance

PRESERVE ABSOLUTELY EVERYTHING ELSE:
- Face structure, bone structure, proportions — NO morphing or reshaping
- Eye color, iris detail, eyebrows, lashes
- Lip shape and natural color
- All intentional makeup exactly as applied
- Hair, clothing, accessories, background, lighting
- Natural skin color and ethnic skin tone

OUTPUT: Return the complete photograph. Only the skin quality changes.`;

      // NB2 first, fallback to Seedream if NB2 fails
      let results: string[];
      try {
        results = await editImageWithAI(
          { baseImage: targetFile, instruction, model: GeminiImageModel.Flash2 },
          setProgress,
        );
      } catch (nb2Err) {
        console.warn('NB2 skin enhance failed, trying Seedream:', nb2Err);
        results = await editImageWithSeedream5Lite(targetFile, instruction, setProgress);
      }
      if (results.length === 0) throw new Error('No image returned.');
      setResult(results[0]);
    } catch (err: any) {
      restoreCredits(cost);
      toast.error(err?.message || 'Error al mejorar la piel');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!result) return;
    try {
      await onSave(result, targetItem.id);
      toast.success('Imagen guardada en galería');
      onClose();
    } catch {
      toast.error('Error saving');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex animate-in fade-in duration-300">

      {/* ─── Center Canvas ─── */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 relative bg-zinc-950">
        <button onClick={onClose} className="absolute top-6 left-6 flex items-center gap-2 text-zinc-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl backdrop-blur-md border border-white/5 z-10">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></svg>
          Back to Canvas
        </button>

        <div className="w-full max-w-3xl aspect-square rounded-2xl overflow-hidden shadow-2xl relative flex items-center justify-center bg-black border border-white/5">
          {result ? (
            <img src={result} alt="Enhanced" className="w-full h-full object-contain" />
          ) : (
            <img src={targetItem.url} alt="Original" className="w-full h-full object-contain" />
          )}

          {loading && (
            <div className="absolute inset-0 bg-black/70 backdrop-blur-md flex flex-col items-center justify-center z-20">
              <svg className="animate-spin text-white mb-6" xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
              <div className="w-72">
                <ProgressBar progress={progress} label="Enhancing skin..." />
              </div>
            </div>
          )}

          {result && !loading && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
              <span className="text-[11px] text-zinc-400">Original</span>
              <div className="w-px h-3 bg-zinc-600" />
              <span className="text-[11px] text-emerald-400 font-medium">Enhanced ✓</span>
            </div>
          )}
        </div>
      </div>

      {/* ─── Right Inspector Panel ─── */}
      <aside className="w-[420px] bg-white/95 backdrop-blur-3xl border-l border-black/5 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-6 pb-5 border-b border-gray-200 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">✨</span>
              <h2 className="text-lg font-bold text-gray-900 tracking-wide">Skin Enhancer</h2>
            </div>
            <span className="text-[10px] text-gray-500 bg-gray-100 px-2 py-1 rounded border border-gray-200 uppercase tracking-widest">Inspector</span>
          </div>
          <p className="text-xs text-gray-400 font-light">NB2 · Gemini Flash 2 · Portrait Retouching</p>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-6 custom-scrollbar">

          {/* Intensity */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
              Intensity
            </label>
            <div className="space-y-2">
              {INTENSITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setIntensity(opt.value)}
                  className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                    intensity === opt.value
                      ? 'bg-gray-100 border-gray-400 text-gray-900'
                      : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  <div className={`w-3.5 h-3.5 rounded-full border-2 mt-0.5 flex-none transition-all ${
                    intensity === opt.value ? 'border-gray-900 bg-gray-900' : 'border-gray-300'
                  }`} />
                  <div>
                    <p className="text-[12px] font-semibold leading-none mb-1">{opt.label}</p>
                    <p className="text-[11px] text-gray-400 leading-relaxed">{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* What changes */}
          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">What changes</p>
            <div className="space-y-1.5">
              {['Skin texture & pores', 'Blemishes & redness', 'Skin tone evenness', 'Natural luminosity'].map(item => (
                <div key={item} className="flex items-center gap-2 text-[11px] text-gray-500">
                  <span className="text-emerald-500 text-[10px]">✓</span>{item}
                </div>
              ))}
            </div>
            <div className="mt-2 pt-2 border-t border-gray-200 space-y-1.5">
              {['Face structure & shape', 'Makeup & styling', 'Hair & clothing', 'Background & lighting'].map(item => (
                <div key={item} className="flex items-center gap-2 text-[11px] text-gray-400">
                  <span className="text-[10px]">🔒</span>{item}
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-gray-200 flex flex-col gap-3">
            {result ? (
              <div className="flex gap-3">
                <button
                  onClick={handleGenerate}
                  disabled={loading}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-all"
                >
                  Retry
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-sm font-bold tracking-wide transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] active:scale-[0.98]"
                >
                  Save to Gallery
                </button>
              </div>
            ) : (
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:from-gray-200 disabled:to-gray-200 disabled:text-gray-400 disabled:shadow-none text-white rounded-xl text-sm font-bold tracking-wide transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] active:scale-[0.98]"
              >
                ENHANCE SKIN
              </button>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
};

export default SkinEnhancerModal;
