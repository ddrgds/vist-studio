import React, { useState, useRef, useCallback } from 'react';
import { Camera, Download, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import type { AppPage } from './SidebarNav';
import { useCharacterLibrary } from '../contexts/CharacterLibraryContext';
import { useProfile } from '../contexts/ProfileContext';
import { useGallery } from '../contexts/GalleryContext';
import { useToast } from '../contexts/ToastContext';
import { generatePhotoSession } from '../services/geminiService';
import { generatePhotoSessionWithGrok } from '../services/falService';
import { OPERATION_CREDIT_COSTS, type GeneratedContent, type InfluencerParams } from '../types';

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const COLORS = {
  bg: '#0D0A0A',
  card: '#0F0C0C',
  cardHover: '#141010',
  border: '#1A1210',
  borderActive: '#FF5C35',
  accent: '#FF5C35',
  text: '#F5EDE8',
  textSec: '#B8A9A5',
  textMuted: '#6B5A56',
};

interface StylePreset {
  id: string;
  emoji: string;
  label: string;
  description: string;
  scenario: string;
}

const STYLE_PRESETS: StylePreset[] = [
  { id: 'selfies', emoji: '📱', label: 'Selfies', description: 'Close-up self-portrait, natural lighting', scenario: 'casual selfie, natural lighting, phone camera perspective' },
  { id: 'grwm', emoji: '💄', label: 'GRWM', description: 'Get Ready With Me mirror shots', scenario: 'getting ready in front of mirror, vanity setup, warm indoor lighting' },
  { id: 'stories', emoji: '📖', label: 'Stories', description: 'Instagram story format shots', scenario: 'vertical format, candid moments, social media aesthetic' },
  { id: 'editorial', emoji: '📸', label: 'Editorial', description: 'High fashion magazine spread', scenario: 'high fashion editorial, professional studio lighting, magazine quality' },
  { id: 'portrait', emoji: '🖼️', label: 'Portrait', description: 'Classic portrait photography', scenario: 'classic portrait photography, shallow depth of field, soft background' },
  { id: 'street', emoji: '🏙️', label: 'Street Style', description: 'Urban outdoor fashion', scenario: 'urban street style, city environment, natural daylight' },
  { id: 'creator', emoji: '🎬', label: 'Creator', description: 'Content creator behind the scenes', scenario: 'content creator setup, ring light, desk or studio background' },
  { id: 'lifestyle', emoji: '☕', label: 'Lifestyle', description: 'Casual everyday moments', scenario: 'casual lifestyle, everyday activities, warm natural tones' },
  { id: 'fitness', emoji: '💪', label: 'Fitness', description: 'Athletic and workout shots', scenario: 'fitness photoshoot, athletic wear, gym or outdoor workout setting' },
  { id: 'nightout', emoji: '🌙', label: 'Night Out', description: 'Evening and party photos', scenario: 'night out, evening lighting, neon and ambient glow, glamorous' },
  { id: 'fotodump', emoji: '📷', label: 'Foto Dump', description: 'Candid mixed collection', scenario: 'candid photo dump, mixed angles and moments, authentic and spontaneous' },
];

type EngineChoice = 'nb2' | 'grok';

const ENGINE_OPTIONS: { id: EngineChoice; label: string; cost: number; speed: string }[] = [
  { id: 'nb2', label: 'Gemini NB2', cost: OPERATION_CREDIT_COSTS.photoSession, speed: 'Fast' },
  { id: 'grok', label: 'Grok', cost: 10, speed: 'Quality' },
];

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

interface PhotoSessionPageProps {
  onNavigate: (page: AppPage) => void;
}

const PhotoSessionPage: React.FC<PhotoSessionPageProps> = ({ onNavigate }) => {
  const { savedCharacters, isLoading: charsLoading } = useCharacterLibrary();
  const { profile, decrementCredits, restoreCredits } = useProfile();
  const { addItems } = useGallery();
  const toast = useToast();

  // State
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [photoCount, setPhotoCount] = useState(4);
  const [engine, setEngine] = useState<EngineChoice>('nb2');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<{ url: string; poseIndex: number }[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const selectedChar = savedCharacters.find(c => c.id === selectedCharId) ?? null;
  const selectedPreset = STYLE_PRESETS.find(s => s.id === selectedStyle) ?? null;
  const costPerPhoto = ENGINE_OPTIONS.find(e => e.id === engine)!.cost;
  const totalCost = photoCount * costPerPhoto;

  const canShoot = selectedChar && selectedPreset && !isGenerating;

  // ─── Shoot session ──────────────────────────
  const handleShoot = useCallback(async () => {
    if (!selectedChar || !selectedPreset) return;

    // Need at least one model image as reference
    if (selectedChar.modelImageBlobs.length === 0) {
      toast.warning('This character has no face reference photos. Add photos in the Library first.');
      return;
    }

    // Deduct credits
    const ok = await decrementCredits(totalCost);
    if (!ok) {
      toast.error(`Not enough credits. You need ${totalCost} credits for ${photoCount} photos.`);
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setResults([]);
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      // Build reference file from first model image blob
      const refBlob = selectedChar.modelImageBlobs[0];
      const refFile = new File([refBlob], 'reference.jpg', { type: refBlob.type || 'image/jpeg' });

      let sessionResults: { url: string; poseIndex: number }[];

      if (engine === 'nb2') {
        sessionResults = await generatePhotoSession(
          refFile,
          photoCount,
          { scenario: selectedPreset.scenario, lighting: 'natural cinematic' },
          (p) => setProgress(p),
          ctrl.signal,
        );
      } else {
        sessionResults = await generatePhotoSessionWithGrok(
          refFile,
          photoCount,
          {},
          (p) => setProgress(p),
          ctrl.signal,
        );
      }

      setResults(sessionResults);

      // Save to gallery
      const galleryItems: GeneratedContent[] = sessionResults.map((r, i) => ({
        id: crypto.randomUUID(),
        url: r.url,
        params: {
          characteristics: selectedChar.characteristics,
          scenario: selectedPreset.scenario,
          characters: [],
          lighting: '',
          imageSize: '' as any,
          aspectRatio: '' as any,
        } as InfluencerParams,
        timestamp: Date.now() - (sessionResults.length - i),
        type: 'create' as const,
        source: 'director' as const,
      }));

      await addItems(galleryItems);
      toast.success(`Photo session complete! ${sessionResults.length} photos generated.`);
    } catch (err: any) {
      if (ctrl.signal.aborted) {
        toast.info('Photo session cancelled.');
      } else {
        toast.error(err?.message || 'Photo session failed.');
      }
      restoreCredits(totalCost);
    } finally {
      setIsGenerating(false);
      abortRef.current = null;
    }
  }, [selectedChar, selectedPreset, engine, photoCount, totalCost, decrementCredits, restoreCredits, addItems, toast]);

  const handleCancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const handleDownload = useCallback((url: string, index: number) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `vist-session-${index + 1}.jpg`;
    a.click();
  }, []);

  // ─── Render ─────────────────────────────────
  return (
    <div style={{ display: 'flex', height: '100%', background: COLORS.bg, color: COLORS.text }}>
      {/* ──── LEFT SIDEBAR ──── */}
      <div style={{
        width: 320,
        minWidth: 320,
        borderRight: `1px solid ${COLORS.border}`,
        overflowY: 'auto',
        padding: '24px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
      }}>
        {/* Header */}
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: COLORS.text, margin: 0 }}>Photo Session</h1>
          <p style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 4 }}>Multi-angle shoots from a single character</p>
        </div>

        {/* ── Character Selector ── */}
        <Section title="Character">
          {charsLoading ? (
            <p style={{ fontSize: 13, color: COLORS.textMuted }}>Loading characters...</p>
          ) : savedCharacters.length === 0 ? (
            <div style={{ fontSize: 13, color: COLORS.textMuted }}>
              No characters saved.{' '}
              <button
                onClick={() => onNavigate('gallery')}
                style={{ color: COLORS.accent, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontSize: 13, padding: 0 }}
              >
                Create one in Library
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {savedCharacters.map(ch => (
                <button
                  key={ch.id}
                  onClick={() => setSelectedCharId(ch.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 10px',
                    background: selectedCharId === ch.id ? 'rgba(255,92,53,0.12)' : COLORS.card,
                    border: `1px solid ${selectedCharId === ch.id ? COLORS.borderActive : COLORS.border}`,
                    borderRadius: 10,
                    cursor: 'pointer',
                    color: COLORS.text,
                    fontSize: 13,
                    textAlign: 'left',
                    width: '100%',
                    transition: 'all 150ms ease',
                  }}
                >
                  {ch.thumbnail ? (
                    <img
                      src={ch.thumbnail}
                      alt={ch.name}
                      style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
                    />
                  ) : (
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: COLORS.border, flexShrink: 0 }} />
                  )}
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ch.name}</div>
                    <div style={{ fontSize: 11, color: COLORS.textMuted }}>{ch.modelImageBlobs.length} photo{ch.modelImageBlobs.length !== 1 ? 's' : ''}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Section>

        {/* ── Style Presets ── */}
        <Section title="Style">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {STYLE_PRESETS.map(preset => (
              <button
                key={preset.id}
                onClick={() => setSelectedStyle(preset.id)}
                title={preset.description}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 10px',
                  background: selectedStyle === preset.id ? 'rgba(255,92,53,0.12)' : COLORS.card,
                  border: `1px solid ${selectedStyle === preset.id ? COLORS.borderActive : COLORS.border}`,
                  borderRadius: 10,
                  cursor: 'pointer',
                  color: selectedStyle === preset.id ? COLORS.accent : COLORS.textSec,
                  fontSize: 12,
                  fontWeight: selectedStyle === preset.id ? 600 : 400,
                  textAlign: 'left',
                  transition: 'all 150ms ease',
                }}
              >
                <span style={{ fontSize: 16 }}>{preset.emoji}</span>
                <span>{preset.label}</span>
              </button>
            ))}
          </div>
        </Section>

        {/* ── Photo Count ── */}
        <Section title="Photos to shoot">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => setPhotoCount(Math.max(2, photoCount - 1))}
              disabled={photoCount <= 2}
              style={stepperBtnStyle(photoCount <= 2)}
            >
              <ChevronDown size={14} />
            </button>
            <span style={{ fontSize: 20, fontWeight: 700, minWidth: 32, textAlign: 'center' }}>{photoCount}</span>
            <button
              onClick={() => setPhotoCount(Math.min(8, photoCount + 1))}
              disabled={photoCount >= 8}
              style={stepperBtnStyle(photoCount >= 8)}
            >
              <ChevronUp size={14} />
            </button>
          </div>
        </Section>

        {/* ── Engine ── */}
        <Section title="Engine">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {ENGINE_OPTIONS.map(opt => (
              <button
                key={opt.id}
                onClick={() => setEngine(opt.id)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 12px',
                  background: engine === opt.id ? 'rgba(255,92,53,0.12)' : COLORS.card,
                  border: `1px solid ${engine === opt.id ? COLORS.borderActive : COLORS.border}`,
                  borderRadius: 10,
                  cursor: 'pointer',
                  color: engine === opt.id ? COLORS.text : COLORS.textSec,
                  fontSize: 13,
                  fontWeight: engine === opt.id ? 600 : 400,
                  transition: 'all 150ms ease',
                  width: '100%',
                }}
              >
                <span>{opt.label}</span>
                <span style={{ fontSize: 12, color: COLORS.textMuted }}>
                  {opt.speed} · <span style={{ color: COLORS.accent }}>⚡{opt.cost}</span>/photo
                </span>
              </button>
            ))}
          </div>
          <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 8 }}>
            Total: <span style={{ color: COLORS.accent, fontWeight: 600 }}>⚡{totalCost}</span> for {photoCount} photos
          </div>
        </Section>

        {/* ── Shoot Button ── */}
        <div style={{ marginTop: 'auto', paddingTop: 16 }}>
          {isGenerating ? (
            <button
              onClick={handleCancel}
              style={{
                width: '100%',
                padding: '14px 0',
                borderRadius: 12,
                border: `1px solid ${COLORS.border}`,
                background: COLORS.card,
                color: COLORS.textSec,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
              Generating... {Math.round(progress)}% — Cancel
            </button>
          ) : (
            <button
              onClick={handleShoot}
              disabled={!canShoot}
              style={{
                width: '100%',
                padding: '14px 0',
                borderRadius: 12,
                border: 'none',
                background: canShoot ? COLORS.accent : COLORS.border,
                color: canShoot ? '#fff' : COLORS.textMuted,
                fontSize: 14,
                fontWeight: 700,
                cursor: canShoot ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                opacity: canShoot ? 1 : 0.5,
                transition: 'all 150ms ease',
              }}
            >
              <Camera size={16} />
              Shoot Session · ⚡{totalCost}
            </button>
          )}
        </div>
      </div>

      {/* ──── RIGHT AREA — Results ──── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        {results.length === 0 && !isGenerating ? (
          /* Empty state */
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            gap: 12,
          }}>
            <Camera size={48} style={{ color: COLORS.textMuted, opacity: 0.4 }} />
            <h2 style={{ fontSize: 18, fontWeight: 600, color: COLORS.textSec, margin: 0 }}>
              {!selectedChar ? 'Select a character' : !selectedPreset ? 'Choose a style' : 'Ready to shoot'}
            </h2>
            <p style={{ fontSize: 13, color: COLORS.textMuted, margin: 0, maxWidth: 320, textAlign: 'center' }}>
              {!selectedChar
                ? 'Pick a character from your library to start a photo session.'
                : !selectedPreset
                ? 'Choose a style preset to define the look of your session.'
                : 'Hit "Shoot Session" to generate multi-angle photos of your character.'}
            </p>
          </div>
        ) : isGenerating && results.length === 0 ? (
          /* Loading skeletons */
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: COLORS.textSec, marginBottom: 16 }}>
              Generating {photoCount} photos...
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
              {Array.from({ length: photoCount }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    aspectRatio: '3/4',
                    borderRadius: 12,
                    background: `linear-gradient(135deg, ${COLORS.card}, ${COLORS.border})`,
                    animation: 'pulse 1.5s ease-in-out infinite',
                    animationDelay: `${i * 200}ms`,
                  }}
                />
              ))}
            </div>
          </div>
        ) : (
          /* Results grid */
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: COLORS.textSec, margin: 0 }}>
                {selectedPreset?.label} Session — {results.length} photos
              </h2>
              {isGenerating && (
                <span style={{ fontSize: 12, color: COLORS.textMuted }}>
                  <Loader2 size={12} style={{ display: 'inline', verticalAlign: 'middle', animation: 'spin 1s linear infinite', marginRight: 4 }} />
                  {Math.round(progress)}%
                </span>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
              {results.map((r, i) => (
                <div
                  key={i}
                  style={{
                    position: 'relative',
                    borderRadius: 12,
                    overflow: 'hidden',
                    border: `1px solid ${COLORS.border}`,
                    background: COLORS.card,
                  }}
                  className="group"
                >
                  <img
                    src={r.url}
                    alt={`Session photo ${i + 1}`}
                    style={{ width: '100%', display: 'block', aspectRatio: '3/4', objectFit: 'cover' }}
                  />
                  {/* Hover overlay */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(0,0,0,0.5)',
                      opacity: 0,
                      display: 'flex',
                      alignItems: 'flex-end',
                      justifyContent: 'center',
                      padding: 12,
                      transition: 'opacity 200ms ease',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
                  >
                    <button
                      onClick={() => handleDownload(r.url, i)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '8px 16px',
                        borderRadius: 8,
                        border: 'none',
                        background: COLORS.accent,
                        color: '#fff',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      <Download size={14} />
                      Download
                    </button>
                  </div>
                  {/* Shot number badge */}
                  <div style={{
                    position: 'absolute',
                    top: 8,
                    left: 8,
                    background: 'rgba(0,0,0,0.6)',
                    borderRadius: 6,
                    padding: '2px 8px',
                    fontSize: 11,
                    fontWeight: 600,
                    color: COLORS.textSec,
                  }}>
                    Shot {i + 1}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Keyframe animations */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes pulse { 0%, 100% { opacity: 0.4 } 50% { opacity: 0.7 } }
      `}</style>
    </div>
  );
};

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div>
    <div style={{
      fontSize: 11,
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      color: COLORS.textMuted,
      marginBottom: 8,
    }}>
      {title}
    </div>
    {children}
  </div>
);

function stepperBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    width: 32,
    height: 32,
    borderRadius: 8,
    border: `1px solid ${COLORS.border}`,
    background: COLORS.card,
    color: disabled ? COLORS.textMuted : COLORS.textSec,
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: disabled ? 0.4 : 1,
    transition: 'all 150ms ease',
  };
}

export default PhotoSessionPage;
