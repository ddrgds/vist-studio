import React, { useState } from 'react';
import { generateCaption, CaptionResult } from '../services/geminiService';
import { useToast } from '../contexts/ToastContext';

interface CaptionModalProps {
  imageUrl: string;
  onClose: () => void;
}

type Platform = 'instagram' | 'tiktok' | 'x';
type Language = 'es' | 'en';

const PLATFORM_INFO: Record<Platform, { label: string; icon: string }> = {
  instagram: { label: 'Instagram', icon: '\uD83D\uDCF8' },
  tiktok: { label: 'TikTok', icon: '\uD83C\uDFB5' },
  x: { label: 'X / Twitter', icon: '\uD835\uDD4F' },
};

const CaptionModal: React.FC<CaptionModalProps> = ({ imageUrl, onClose }) => {
  const { addToast } = useToast();
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
      addToast(err?.message || 'Error al generar la descripción', 'error');
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
      addToast('Copiado al portapapeles', 'success');
    } catch {
      addToast('No se pudo copiar', 'error');
    }
  };

  const hashtagsText = result ? result.hashtags.map(h => `#${h}`).join(' ') : '';

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4"
      style={{ background: 'rgba(6,4,14,0.85)', backdropFilter: 'blur(12px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-lg flex flex-col max-h-[90vh] rounded-2xl overflow-hidden"
        style={{
          background: 'var(--joi-bg-1)',
          border: '1px solid var(--joi-border)',
          boxShadow: '0 25px 60px rgba(0,0,0,.5), 0 0 40px rgba(167,139,250,.06)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: '1px solid var(--joi-border)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
              style={{ background: 'rgba(255,107,157,.08)', border: '1px solid rgba(255,107,157,.15)' }}>
              {'\u270D\uFE0F'}
            </div>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--joi-text-1)' }}>Generador de Descripción</h2>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:scale-110"
            style={{ background: 'var(--joi-bg-3)', color: 'var(--joi-text-3)' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4 joi-scroll">
          {/* Image preview */}
          <div className="w-full aspect-[4/3] rounded-xl overflow-hidden"
            style={{ border: '1px solid var(--joi-border)' }}>
            <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
          </div>

          {/* Platform selector */}
          <div>
            <div className="joi-label mb-2" style={{ color: 'var(--joi-text-3)' }}>Plataforma</div>
            <div className="grid grid-cols-3 gap-2">
              {(Object.entries(PLATFORM_INFO) as [Platform, typeof PLATFORM_INFO[Platform]][]).map(([key, info]) => (
                <button
                  key={key}
                  onClick={() => setPlatform(key)}
                  className="py-2.5 px-3 rounded-xl text-sm font-medium transition-all flex flex-col items-center gap-1.5 hover:scale-[1.02]"
                  style={{
                    background: platform === key ? 'rgba(255,107,157,.08)' : 'var(--joi-bg-3)',
                    border: `1px solid ${platform === key ? 'rgba(255,107,157,.2)' : 'var(--joi-border)'}`,
                    color: platform === key ? 'var(--joi-pink)' : 'var(--joi-text-2)',
                  }}
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
              <div className="joi-label mb-2" style={{ color: 'var(--joi-text-3)' }}>Idioma</div>
              <div className="grid grid-cols-2 gap-1.5">
                {(['es', 'en'] as Language[]).map(lang => (
                  <button
                    key={lang}
                    onClick={() => setLanguage(lang)}
                    className="py-2 rounded-lg text-xs font-medium transition-all"
                    style={{
                      background: language === lang ? 'rgba(167,139,250,.1)' : 'var(--joi-bg-3)',
                      border: `1px solid ${language === lang ? 'rgba(167,139,250,.2)' : 'var(--joi-border)'}`,
                      color: language === lang ? 'var(--joi-violet)' : 'var(--joi-text-2)',
                    }}
                  >
                    {lang === 'es' ? '\uD83C\uDDEA\uD83C\uDDF8 ES' : '\uD83C\uDDEC\uD83C\uDDE7 EN'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="joi-label mb-2" style={{ color: 'var(--joi-text-3)' }}>Tema / Contexto</div>
              <input
                type="text"
                value={contextHint}
                onChange={e => setContextHint(e.target.value)}
                placeholder="ej. nueva colección, verano..."
                className="w-full rounded-lg px-3 py-2 text-xs outline-none transition-colors"
                style={{
                  background: 'var(--joi-bg-3)',
                  border: '1px solid var(--joi-border)',
                  color: 'var(--joi-text-1)',
                }}
                onFocus={e => (e.target.style.borderColor = 'rgba(167,139,250,.3)')}
                onBlur={e => (e.target.style.borderColor = 'var(--joi-border)')}
              />
            </div>
          </div>

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="joi-btn-solid w-full py-3 rounded-xl font-semibold text-sm transition-all active:scale-[0.98]"
            style={{ opacity: loading ? 0.6 : 1 }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                Generando...
              </span>
            ) : (
              <span>{'\u2726'} Generar Descripción</span>
            )}
          </button>

          {/* Result */}
          {result && (
            <div className="space-y-3">
              {/* Caption */}
              <div className="rounded-xl p-4" style={{ background: 'var(--joi-bg-3)', border: '1px solid var(--joi-border)' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="joi-label" style={{ color: 'var(--joi-text-3)' }}>Descripción</span>
                  <button
                    onClick={() => copyToClipboard(result.caption, 'caption')}
                    className="text-[10px] px-2.5 py-1 rounded-lg transition-all hover:scale-105"
                    style={{
                      background: copiedCaption ? 'rgba(80,216,160,.1)' : 'rgba(255,255,255,.04)',
                      color: copiedCaption ? '#50d8a0' : 'var(--joi-text-3)',
                      border: `1px solid ${copiedCaption ? 'rgba(80,216,160,.2)' : 'var(--joi-border)'}`,
                    }}
                  >
                    {copiedCaption ? '\u2713 Copiado' : 'Copiar'}
                  </button>
                </div>
                <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--joi-text-1)' }}>{result.caption}</p>
              </div>

              {/* Hashtags */}
              {result.hashtags.length > 0 && (
                <div className="rounded-xl p-4" style={{ background: 'var(--joi-bg-3)', border: '1px solid var(--joi-border)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="joi-label" style={{ color: 'var(--joi-text-3)' }}>
                      Hashtags ({result.hashtags.length})
                    </span>
                    <button
                      onClick={() => copyToClipboard(hashtagsText, 'hashtags')}
                      className="text-[10px] px-2.5 py-1 rounded-lg transition-all hover:scale-105"
                      style={{
                        background: copiedHashtags ? 'rgba(80,216,160,.1)' : 'rgba(255,255,255,.04)',
                        color: copiedHashtags ? '#50d8a0' : 'var(--joi-text-3)',
                        border: `1px solid ${copiedHashtags ? 'rgba(80,216,160,.2)' : 'var(--joi-border)'}`,
                      }}
                    >
                      {copiedHashtags ? '\u2713 Copiado' : 'Copiar'}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {result.hashtags.map((tag, i) => (
                      <span key={`${tag}-${i}`}
                        className="text-[11px] px-2.5 py-0.5 rounded-full"
                        style={{
                          color: 'var(--joi-violet)',
                          background: 'rgba(167,139,250,.08)',
                          border: '1px solid rgba(167,139,250,.15)',
                        }}>
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
