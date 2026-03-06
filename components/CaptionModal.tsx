import React, { useState } from 'react';
import { generateCaption, CaptionResult } from '../services/geminiService';
import { useToast } from '../contexts/ToastContext';

interface CaptionModalProps {
  imageUrl: string;
  onClose: () => void;
}

type Platform = 'instagram' | 'tiktok' | 'x';
type Language = 'es' | 'en';

const PLATFORM_INFO: Record<Platform, { label: string; icon: string; color: string }> = {
  instagram: { label: 'Instagram', icon: '📸', color: 'from-pink-600 to-purple-600' },
  tiktok: { label: 'TikTok', icon: '🎵', color: 'from-zinc-800 to-zinc-700' },
  x: { label: 'X / Twitter', icon: '𝕏', color: 'from-zinc-800 to-zinc-700' },
};

const CaptionModal: React.FC<CaptionModalProps> = ({ imageUrl, onClose }) => {
  const toast = useToast();
  const [platform, setPlatform] = useState<Platform>('instagram');
  const [language, setLanguage] = useState<Language>('es');
  const [contextHint, setContextHint] = useState('');
  const [result, setResult] = useState<CaptionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [copiedHashtags, setCopiedHashtags] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await generateCaption(imageUrl, platform, language, contextHint || undefined);
      setResult(res);
    } catch (err: any) {
      toast.error(err?.message || 'Error al generar el caption');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, type: 'caption' | 'hashtags') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'caption') {
        setCopiedCaption(true);
        setTimeout(() => setCopiedCaption(false), 2000);
      } else {
        setCopiedHashtags(true);
        setTimeout(() => setCopiedHashtags(false), 2000);
      }
      toast.success('Copiado al portapapeles');
    } catch {
      toast.error('No se pudo copiar');
    }
  };

  const hashtagsText = result ? result.hashtags.map(h => `#${h}`).join(' ') : '';

  return (
    <div
      className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-lg">✍️</span>
            <h2 className="text-base font-semibold text-white">Generador de Caption</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {/* Image preview */}
          <div className="w-full aspect-[4/3] rounded-xl overflow-hidden border border-zinc-800">
            <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
          </div>

          {/* Platform selector */}
          <div>
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Plataforma</label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.entries(PLATFORM_INFO) as [Platform, typeof PLATFORM_INFO[Platform]][]).map(([key, info]) => (
                <button
                  key={key}
                  onClick={() => setPlatform(key)}
                  className={`py-2 px-3 rounded-xl border text-sm font-medium transition-all flex flex-col items-center gap-1 ${
                    platform === key
                      ? 'bg-purple-600 border-purple-500 text-white'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-white'
                  }`}
                >
                  <span className="text-base">{info.icon}</span>
                  <span className="text-[11px]">{info.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Language + context hint */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Idioma</label>
              <div className="grid grid-cols-2 gap-1">
                {(['es', 'en'] as Language[]).map(lang => (
                  <button
                    key={lang}
                    onClick={() => setLanguage(lang)}
                    className={`py-2 rounded-lg text-xs font-medium transition-all ${
                      language === lang
                        ? 'bg-purple-600 text-white'
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
                    }`}
                  >
                    {lang === 'es' ? '🇪🇸 Español' : '🇬🇧 English'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Tema / Contexto</label>
              <input
                type="text"
                value={contextHint}
                onChange={e => setContextHint(e.target.value)}
                placeholder="Ej: nueva colección, verano..."
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-600 outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:from-zinc-700 disabled:to-zinc-700 text-white rounded-xl font-semibold transition-all active:scale-[0.98]"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                Generando...
              </span>
            ) : '✨ Generar Caption'}
          </button>

          {/* Result */}
          {result && (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {/* Caption */}
              <div className="bg-zinc-800/60 border border-zinc-700 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Caption</span>
                  <button
                    onClick={() => copyToClipboard(result.caption, 'caption')}
                    className="text-[10px] text-zinc-400 hover:text-white bg-zinc-700 hover:bg-zinc-600 px-2 py-1 rounded-lg transition-colors flex items-center gap-1"
                  >
                    {copiedCaption ? '✓ Copiado' : '📋 Copiar'}
                  </button>
                </div>
                <p className="text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed">{result.caption}</p>
              </div>

              {/* Hashtags */}
              {result.hashtags.length > 0 && (
                <div className="bg-zinc-800/60 border border-zinc-700 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                      Hashtags ({result.hashtags.length})
                    </span>
                    <button
                      onClick={() => copyToClipboard(hashtagsText, 'hashtags')}
                      className="text-[10px] text-zinc-400 hover:text-white bg-zinc-700 hover:bg-zinc-600 px-2 py-1 rounded-lg transition-colors flex items-center gap-1"
                    >
                      {copiedHashtags ? '✓ Copiado' : '📋 Copiar'}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {result.hashtags.map((tag, i) => (
                      <span key={`${tag}-${i}`} className="text-[11px] text-purple-300 bg-purple-900/30 border border-purple-800/40 px-2 py-0.5 rounded-full">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CaptionModal;
