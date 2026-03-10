import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  Plus, Trash2, Pencil, ChevronRight, X, Check, Search, Image, Users,
  Download, Play, Heart, MoreHorizontal, Upload, ArrowUpDown, Eye,
} from 'lucide-react';
import { useCharacterLibrary } from '../contexts/CharacterLibraryContext';
import { useGallery } from '../contexts/GalleryContext';
import { SavedCharacter, GeneratedContent } from '../types';

// ─── Color Tokens ────────────────────────────────────────────────────────────

const C = {
  bg: '#080605',
  card: '#0D0A0A',
  cardHover: '#111',
  border: '#1A1210',
  borderHover: '#2A1F1C',
  accent: '#FF5C35',
  accentGlow: 'rgba(255,92,53,0.22)',
  text: '#F5EDE8',
  textSec: '#B8A9A5',
  textMuted: '#6B5A56',
  textFaint: '#4A3A36',
  statusActive: '#22C55E',
  statusEditing: '#FFB347',
  statusDraft: '#6B5A56',
} as const;

// ─── Props ───────────────────────────────────────────────────────────────────

interface CharactersPageProps {
  onLoadCharacter?: (char: SavedCharacter) => void;
  onNewCharacter?: () => void;
  onNavigate?: (page: string) => void;
  onUploadToStudio?: (file: File) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

type CharacterStatus = 'active' | 'editing' | 'draft';

function getCharacterStatus(char: SavedCharacter): CharacterStatus {
  if (char.loraTrainingStatus === 'training') return 'editing';
  if (char.loraTrainingStatus === 'ready' || char.usageCount > 0) return 'active';
  return 'draft';
}

const STATUS_META: Record<CharacterStatus, { label: string; color: string; bg: string }> = {
  active: { label: 'Active', color: C.statusActive, bg: 'rgba(34,197,94,0.12)' },
  editing: { label: 'Editing', color: C.statusEditing, bg: 'rgba(255,179,71,0.12)' },
  draft: { label: 'Draft', color: C.statusDraft, bg: 'rgba(107,90,86,0.12)' },
};

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function extractNiche(char: SavedCharacter): string[] {
  const tags: string[] = [];
  const chars = (char.characteristics || '').toLowerCase();
  const outfit = (char.outfitDescription || '').toLowerCase();
  const combined = chars + ' ' + outfit;

  const NICHES: [string, string[]][] = [
    ['Fashion', ['fashion', 'outfit', 'style', 'dress', 'couture', 'streetwear', 'wear']],
    ['Luxury', ['luxury', 'elegant', 'premium', 'glamour', 'high-end']],
    ['Fitness', ['fitness', 'athletic', 'sport', 'gym', 'workout']],
    ['Lifestyle', ['lifestyle', 'casual', 'everyday', 'daily']],
    ['Beauty', ['beauty', 'makeup', 'skincare', 'cosmetic']],
    ['Travel', ['travel', 'adventure', 'outdoor', 'explore']],
    ['Tech', ['tech', 'digital', 'futuristic', 'cyber']],
  ];

  for (const [label, keywords] of NICHES) {
    if (keywords.some(kw => combined.includes(kw))) tags.push(label);
    if (tags.length >= 2) break;
  }

  if (tags.length === 0) tags.push('Creative');
  return tags;
}

// ─── Soul ID Status Badge ────────────────────────────────────────────────────

const SoulIdBadge: React.FC<{
  char: SavedCharacter;
  trainingProgress: number;
  onTrain: () => void;
}> = ({ char, trainingProgress, onTrain }) => {
  const status = char.loraTrainingStatus ?? 'idle';

  if (status === 'ready') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
        style={{ background: 'rgba(52,211,153,0.12)', color: '#34d399', border: '1px solid rgba(52,211,153,0.25)' }}>
        ✦ Soul ID
      </span>
    );
  }

  if (status === 'training') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold"
        style={{ background: 'rgba(255,179,71,0.12)', color: '#FFB347', border: '1px solid rgba(255,179,71,0.25)' }}>
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        {trainingProgress > 0 ? `${trainingProgress}%` : 'Training\u2026'}
      </span>
    );
  }

  if (status === 'failed') {
    return (
      <button onClick={onTrain}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors"
        style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.22)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.12)'; }}
      >
        ✕ Retry
      </button>
    );
  }

  // idle — train CTA
  return (
    <button onClick={onTrain}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors"
      style={{ background: 'rgba(255,92,53,0.10)', color: C.accent, border: '1px solid rgba(255,92,53,0.22)' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,92,53,0.18)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,92,53,0.10)'; }}
    >
      ✦ Train
    </button>
  );
};

// ─── Status Badge ────────────────────────────────────────────────────────────

const StatusBadge: React.FC<{ status: CharacterStatus }> = ({ status }) => {
  const meta = STATUS_META[status];
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
      style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.color}33` }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.color }} />
      {meta.label}
    </span>
  );
};

// ─── Character Card (Figma overlay style) ────────────────────────────────────

interface CardProps {
  char: SavedCharacter;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onLoadCharacter?: (char: SavedCharacter) => void;
  onTrainSoulId: (id: string) => void;
  trainingProgress: number;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
}

const CharacterCard: React.FC<CardProps> = ({
  char, onDelete, onRename, onLoadCharacter, onTrainSoulId, trainingProgress,
  isFavorite, onToggleFavorite,
}) => {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameVal, setRenameVal] = useState(char.name);
  const [showMenu, setShowMenu] = useState(false);
  const renameRef = useRef<HTMLInputElement>(null);

  const commitRename = () => {
    const trimmed = renameVal.trim();
    if (trimmed && trimmed !== char.name) onRename(char.id, trimmed);
    setIsRenaming(false);
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commitRename();
    if (e.key === 'Escape') { setRenameVal(char.name); setIsRenaming(false); }
  };

  const startRename = () => {
    setRenameVal(char.name);
    setIsRenaming(true);
    setShowMenu(false);
    setTimeout(() => renameRef.current?.select(), 30);
  };

  const status = getCharacterStatus(char);
  const niches = extractNiche(char);

  return (
    <div
      className="group relative rounded-2xl overflow-hidden transition-all duration-200"
      style={{ background: C.card, border: `1px solid ${C.border}` }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = C.borderHover; }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = C.border;
        setShowMenu(false);
      }}
    >
      {/* Image area */}
      <div className="relative aspect-[3/4] overflow-hidden" style={{ background: '#161110' }}>
        {char.thumbnail ? (
          <img src={char.thumbnail} alt={char.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-5xl font-black select-none" style={{ color: '#2A1F1C' }}>
              {char.name[0]?.toUpperCase()}
            </span>
          </div>
        )}

        {/* Name + niche overlay at bottom of image */}
        <div className="absolute bottom-0 left-0 right-0 px-3 pb-2.5 pt-10 pointer-events-none"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)' }}>
          <p className="text-sm font-bold truncate" style={{ color: C.text }}>{char.name}</p>
          <p className="text-[10px] truncate" style={{ color: C.textMuted }}>
            {niches.join(' \u00B7 ')}
          </p>
        </div>

        {/* Status badge — top-left */}
        <div className="absolute top-2 left-2 z-10">
          <StatusBadge status={status} />
        </div>

        {/* Heart + menu — top-right (visible on hover) */}
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(char.id); }}
            className="w-7 h-7 rounded-full flex items-center justify-center transition-all"
            style={{ background: 'rgba(0,0,0,0.5)', color: isFavorite ? '#f87171' : 'rgba(255,255,255,0.6)' }}
            title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Heart className="w-3.5 h-3.5" fill={isFavorite ? '#f87171' : 'none'} />
          </button>
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
              className="w-7 h-7 rounded-full flex items-center justify-center transition-all"
              style={{ background: 'rgba(0,0,0,0.5)', color: 'rgba(255,255,255,0.6)' }}
              title="More options"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
            {showMenu && (
              <div
                className="absolute right-0 top-8 w-36 rounded-xl py-1 z-50 shadow-xl"
                style={{ background: '#1A1210', border: `1px solid ${C.borderHover}` }}
              >
                <button onClick={startRename}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors text-left"
                  style={{ color: C.textSec }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  <Pencil className="w-3 h-3" /> Rename
                </button>
                <button onClick={() => { onTrainSoulId(char.id); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors text-left"
                  style={{ color: C.accent }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  <span className="text-[10px]">✦</span> Train Soul ID
                </button>
                <div className="my-1" style={{ borderTop: `1px solid ${C.border}` }} />
                <button onClick={() => { onDelete(char.id); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors text-left"
                  style={{ color: '#f87171' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.08)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Hover overlay — Edit in Studio */}
        {onLoadCharacter && (
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.45)' }}>
            <button
              onClick={() => onLoadCharacter(char)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all hover:scale-[1.03] active:scale-95"
              style={{ background: C.accent, color: '#fff' }}
            >
              Edit <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Soul ID badge — below status */}
        {(char.loraTrainingStatus === 'ready' || char.loraTrainingStatus === 'training') && (
          <div className="absolute top-8 left-2 z-10 mt-1">
            <SoulIdBadge char={char} trainingProgress={trainingProgress} onTrain={() => onTrainSoulId(char.id)} />
          </div>
        )}
      </div>

      {/* Rename inline */}
      {isRenaming && (
        <div className="px-3 py-2 flex items-center gap-1" style={{ background: C.card }}>
          <input
            ref={renameRef}
            value={renameVal}
            onChange={e => setRenameVal(e.target.value)}
            onKeyDown={handleRenameKeyDown}
            onBlur={commitRename}
            className="flex-1 rounded px-2 py-1 text-xs outline-none min-w-0"
            style={{ background: '#1A1210', border: '1px solid #2A1F1C', color: C.text }}
            autoFocus
          />
          <button onClick={commitRename} className="p-1 transition-colors" style={{ color: '#34d399' }}>
            <Check className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => { setRenameVal(char.name); setIsRenaming(false); }}
            className="p-1 transition-colors" style={{ color: C.textFaint }}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Stats row */}
      {!isRenaming && (
        <div className="px-3 py-2.5" style={{ borderTop: `1px solid ${C.border}` }}>
          <div className="flex items-center justify-between text-[10px]" style={{ color: C.textMuted }}>
            <span>{formatCount(char.usageCount || 0)} uses</span>
            <span>{char.loraTrainingStatus === 'ready' ? '✦ Soul ID' : ''}</span>
          </div>
          {/* Niche tags */}
          <div className="flex items-center gap-1 mt-1.5">
            {niches.map(tag => (
              <span key={tag} className="px-2 py-0.5 rounded-full text-[9px] font-medium"
                style={{ background: 'rgba(255,92,53,0.06)', color: C.textMuted, border: `1px solid ${C.border}` }}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── New Character CTA Card ──────────────────────────────────────────────────

const NewCharacterCard: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    onClick={onClick}
    className="group flex flex-col items-center justify-center gap-3 rounded-2xl transition-all duration-200"
    style={{ background: 'transparent', border: `2px dashed ${C.border}`, aspectRatio: '3/4' }}
    onMouseEnter={e => {
      (e.currentTarget as HTMLElement).style.background = 'rgba(255,92,53,0.03)';
      (e.currentTarget as HTMLElement).style.borderColor = C.accentGlow;
    }}
    onMouseLeave={e => {
      (e.currentTarget as HTMLElement).style.background = 'transparent';
      (e.currentTarget as HTMLElement).style.borderColor = C.border;
    }}
  >
    <div
      className="w-12 h-12 rounded-full flex items-center justify-center transition-transform group-hover:scale-110"
      style={{ background: 'rgba(255,92,53,0.08)', border: `1px solid ${C.accentGlow}`, color: C.accent }}
    >
      <Plus className="w-5 h-5" />
    </div>
    <div className="text-center">
      <p className="text-xs font-semibold" style={{ color: C.textMuted }}>New Character</p>
      <p className="text-[10px] mt-0.5" style={{ color: C.textFaint }}>Generate with AI</p>
    </div>
  </button>
);

// ─── Characters Empty State ──────────────────────────────────────────────────

const EmptyState: React.FC<{ onNewCharacter?: () => void }> = ({ onNewCharacter }) => (
  <div className="flex flex-col items-center justify-center py-24 gap-6 text-center">
    <div
      className="w-20 h-20 rounded-2xl flex items-center justify-center"
      style={{ background: 'rgba(255,92,53,0.06)', border: '1px dashed rgba(255,92,53,0.18)' }}
    >
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="1.4"
        strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
        <circle cx="12" cy="8" r="4"/>
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
      </svg>
    </div>
    <div>
      <h2 className="text-xl font-bold mb-2" style={{ color: C.text }}>No characters yet</h2>
      <p className="text-sm max-w-sm leading-relaxed" style={{ color: C.textFaint }}>
        Go to Director Studio, upload face references, then save your character to the library.
      </p>
    </div>
    {onNewCharacter && (
      <button
        onClick={onNewCharacter}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:scale-[1.02] active:scale-95"
        style={{ background: C.accent }}
      >
        <Plus className="w-4 h-4" /> Create your first character
      </button>
    )}
  </div>
);

// ─── Featured Character Banner ───────────────────────────────────────────────

const FeaturedBanner: React.FC<{
  char: SavedCharacter;
  onLoad?: (char: SavedCharacter) => void;
}> = ({ char, onLoad }) => {
  const niches = extractNiche(char);
  const status = getCharacterStatus(char);
  const meta = STATUS_META[status];

  return (
    <div
      className="mb-6 rounded-2xl overflow-hidden flex items-stretch"
      style={{ background: C.card, border: `1px solid ${C.border}`, minHeight: 140 }}
    >
      {/* Thumbnail */}
      <div className="w-28 sm:w-36 shrink-0 relative overflow-hidden">
        {char.thumbnail ? (
          <img src={char.thumbnail} alt={char.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: '#161110' }}>
            <span className="text-4xl font-black" style={{ color: '#2A1F1C' }}>
              {char.name[0]?.toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 p-4 flex flex-col justify-center min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(255,92,53,0.10)', color: C.accent, border: `1px solid rgba(255,92,53,0.2)` }}>
            Featured
          </span>
          <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
            style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.color}33` }}>
            {meta.label}
          </span>
        </div>

        <h3 className="text-lg font-bold truncate" style={{ color: C.text }}>{char.name}</h3>
        <p className="text-xs mt-0.5" style={{ color: C.textMuted }}>
          {niches.join(' \u00B7 ')}
        </p>

        <div className="flex items-center gap-4 mt-3">
          <div>
            <span className="text-sm font-bold" style={{ color: C.text }}>{formatCount(char.usageCount || 0)}</span>
            <span className="text-[10px] ml-1" style={{ color: C.textFaint }}>uses</span>
          </div>
          {char.loraTrainingStatus === 'ready' && (
            <div>
              <span className="text-[10px] font-bold" style={{ color: '#34d399' }}>✦ Soul ID Ready</span>
            </div>
          )}
          {onLoad && (
            <button
              onClick={() => onLoad(char)}
              className="ml-auto flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-[1.02] active:scale-95"
              style={{ background: C.accent, color: '#fff' }}
            >
              Edit <ChevronRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Image Card ──────────────────────────────────────────────────────────────

const ImageCard: React.FC<{
  item: GeneratedContent;
  onDelete: (id: string) => void;
  onPreview: (item: GeneratedContent) => void;
  onOpenInStudio?: (item: GeneratedContent) => void;
}> = ({ item, onDelete, onPreview, onOpenInStudio }) => {
  const isVideo = item.type === 'video';
  const date = new Date(item.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const provider = item.aiProvider ?? '';
  const source = item.source === 'generate' ? 'Freestyle' : 'Director';

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const a = document.createElement('a');
    a.href = item.url;
    a.download = `vist-${item.id}.${isVideo ? 'mp4' : 'png'}`;
    a.click();
  };

  return (
    <div
      className="group relative rounded-2xl overflow-hidden transition-all duration-200 cursor-pointer"
      style={{ background: C.card, border: `1px solid ${C.border}` }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = C.borderHover; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = C.border; }}
      onClick={() => onPreview(item)}
    >
      <div className="relative aspect-[3/4] overflow-hidden" style={{ background: '#161110' }}>
        {isVideo ? (
          <video src={item.url} className="w-full h-full object-cover" muted />
        ) : (
          <img src={item.url} alt="" className="w-full h-full object-cover" loading="lazy" />
        )}

        {isVideo && (
          <div className="absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.6)' }}>
            <Play className="w-3 h-3 text-white fill-white" />
          </div>
        )}

        {/* Source badge — top-left */}
        <div className="absolute top-2 left-2 z-10">
          {!isVideo && (
            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold"
              style={{
                background: source === 'Freestyle' ? 'rgba(255,92,53,0.15)' : 'rgba(52,211,153,0.12)',
                color: source === 'Freestyle' ? C.accent : '#34d399',
              }}>
              {source}
            </span>
          )}
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-3"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)' }}>
          <div className="flex items-center gap-1.5">
            {onOpenInStudio && !isVideo && (
              <button
                onClick={(e) => { e.stopPropagation(); onOpenInStudio(item); }}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs font-bold transition-all hover:scale-[1.02] active:scale-95"
                style={{ background: C.accent, color: '#fff' }}
              >
                <Eye className="w-3 h-3" /> Open in Studio
              </button>
            )}
            <button onClick={handleDownload}
              className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs font-bold transition-all hover:scale-[1.02] active:scale-95"
              style={{ background: '#fff', color: '#000' }}>
              <Download className="w-3 h-3" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
              className="p-2 rounded-lg transition-all hover:scale-[1.02] active:scale-95"
              style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="px-3 py-2.5" style={{ borderTop: `1px solid ${C.border}` }}>
        <div className="flex items-center gap-2">
          <span className="text-[10px] px-1.5 py-0.5 rounded-full"
            style={{ background: 'rgba(255,92,53,0.08)', color: C.accent }}>
            {source}
          </span>
          {provider && (
            <span className="text-[10px] capitalize" style={{ color: C.textFaint }}>
              {provider}
            </span>
          )}
        </div>
        <span className="text-[10px] block mt-1" style={{ color: '#2A1F1C' }}>{date}</span>
      </div>
    </div>
  );
};

// ─── Images Empty State ──────────────────────────────────────────────────────

const ImagesEmptyState: React.FC = () => (
  <div className="flex flex-col items-center justify-center py-24 gap-6 text-center">
    <div className="w-20 h-20 rounded-2xl flex items-center justify-center"
      style={{ background: 'rgba(255,92,53,0.06)', border: '1px dashed rgba(255,92,53,0.18)' }}>
      <Image className="w-8 h-8" style={{ color: C.accent, opacity: 0.5 }} />
    </div>
    <div>
      <h2 className="text-xl font-bold mb-2" style={{ color: C.text }}>No images yet</h2>
      <p className="text-sm max-w-sm leading-relaxed" style={{ color: C.textFaint }}>
        Generate images in Freestyle or Director — they'll appear here automatically.
      </p>
    </div>
  </div>
);

// ─── Main Page ───────────────────────────────────────────────────────────────

type LibraryTab = 'characters' | 'images';
type CharFilter = 'all' | 'active' | 'editing' | 'draft';
type SortMode = 'recent' | 'name' | 'uses';

const CharactersPage: React.FC<CharactersPageProps> = ({
  onLoadCharacter, onNewCharacter, onNavigate, onUploadToStudio,
}) => {
  const { savedCharacters, deleteCharacter, renameCharacter, trainSoulId } = useCharacterLibrary();
  const { generatedHistory, deleteItem } = useGallery();

  const [activeTab, setActiveTab] = useState<LibraryTab>('characters');
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});
  const abortRefs = useRef<Record<string, AbortController>>({});
  const [query, setQuery] = useState('');
  const [charFilter, setCharFilter] = useState<CharFilter>('all');
  const [sortMode, setSortMode] = useState<SortMode>('recent');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('vist_char_favorites');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch { return new Set(); }
  });

  // Images tab state
  const [imageQuery, setImageQuery] = useState('');
  const [imageFilter, setImageFilter] = useState<'all' | 'images' | 'videos'>('all');
  const [previewItem, setPreviewItem] = useState<GeneratedContent | null>(null);

  // Upload ref
  const uploadRef = useRef<HTMLInputElement>(null);

  const handleTrainSoulId = useCallback(async (id: string) => {
    abortRefs.current[id]?.abort();
    const ctrl = new AbortController();
    abortRefs.current[id] = ctrl;
    setProgressMap(prev => ({ ...prev, [id]: 0 }));
    try {
      await trainSoulId(id, (p) => setProgressMap(prev => ({ ...prev, [id]: Math.round(p) })), ctrl.signal);
    } catch {
      // Status updated to 'failed' inside context
    } finally {
      setProgressMap(prev => { const next = { ...prev }; delete next[id]; return next; });
      delete abortRefs.current[id];
    }
  }, [trainSoulId]);

  const toggleFavorite = useCallback((id: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      localStorage.setItem('vist_char_favorites', JSON.stringify([...next]));
      return next;
    });
  }, []);

  const favCount = useMemo(() => {
    return savedCharacters.filter(c => favorites.has(c.id)).length;
  }, [savedCharacters, favorites]);

  // Filter + search + sort characters
  const visible = useMemo(() => {
    let list = savedCharacters.filter(c => {
      if (charFilter === 'active') return getCharacterStatus(c) === 'active';
      if (charFilter === 'editing') return getCharacterStatus(c) === 'editing';
      if (charFilter === 'draft') return getCharacterStatus(c) === 'draft';
      return true;
    });
    if (query) {
      const q = query.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(q) || (c.characteristics || '').toLowerCase().includes(q));
    }
    list = [...list].sort((a, b) => {
      if (sortMode === 'name') return a.name.localeCompare(b.name);
      if (sortMode === 'uses') return (b.usageCount || 0) - (a.usageCount || 0);
      return b.updatedAt - a.updatedAt; // recent
    });
    return list;
  }, [savedCharacters, charFilter, query, sortMode]);

  // Featured character = most used with thumbnail
  const featuredChar = useMemo(() => {
    if (savedCharacters.length < 2) return null;
    const sorted = [...savedCharacters].filter(c => c.thumbnail).sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));
    return sorted[0] || null;
  }, [savedCharacters]);

  // Images filter + search
  const imageCount = generatedHistory.filter(i => i.type !== 'video').length;
  const videoCount = generatedHistory.filter(i => i.type === 'video').length;
  const visibleImages = useMemo(() => {
    let list = generatedHistory;
    if (imageFilter === 'images') list = list.filter(i => i.type !== 'video');
    if (imageFilter === 'videos') list = list.filter(i => i.type === 'video');
    if (imageQuery) {
      const q = imageQuery.toLowerCase();
      list = list.filter(i =>
        (i.aiProvider ?? '').toLowerCase().includes(q)
        || (i.source ?? '').toLowerCase().includes(q)
        || (i.type ?? '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [generatedHistory, imageFilter, imageQuery]);

  const handleUploadClick = () => uploadRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUploadToStudio) {
      onUploadToStudio(file);
    }
    // Reset so the same file can be re-selected
    if (uploadRef.current) uploadRef.current.value = '';
  };

  const handleOpenImageInStudio = (item: GeneratedContent) => {
    if (!onUploadToStudio) return;
    // Convert the image URL to a File and send to studio
    fetch(item.url)
      .then(r => r.blob())
      .then(blob => {
        const file = new File([blob], `vist-${item.id}.png`, { type: blob.type || 'image/png' });
        onUploadToStudio(file);
      })
      .catch(() => {});
  };

  return (
    <div className="w-full h-full overflow-y-auto pb-16 lg:pb-0" style={{ background: C.bg }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 pb-24">

        {/* Hidden upload input */}
        <input
          ref={uploadRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight" style={{ color: C.text }}>
              Character Gallery
            </h1>
            <p className="text-sm mt-1" style={{ color: C.textMuted }}>
              {savedCharacters.length} character{savedCharacters.length !== 1 ? 's' : ''}
              {favCount > 0 ? ` \u00B7 ${favCount} favorite${favCount !== 1 ? 's' : ''}` : ''}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onUploadToStudio && (
              <button
                onClick={handleUploadClick}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all hover:scale-[1.02] active:scale-95"
                style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.textSec }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = C.borderHover; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = C.border; }}
              >
                <Upload className="w-3.5 h-3.5" /> Upload Image
              </button>
            )}
            {onNewCharacter && savedCharacters.length > 0 && (
              <button
                onClick={onNewCharacter}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all hover:scale-[1.02] active:scale-95 text-white shrink-0"
                style={{ background: C.accent }}
              >
                <Plus className="w-3.5 h-3.5" /> New Character
              </button>
            )}
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex items-center gap-1 mb-6 p-1 rounded-xl w-fit" style={{ background: C.card, border: `1px solid ${C.border}` }}>
          {([
            { key: 'characters' as LibraryTab, label: 'Characters', icon: Users, count: savedCharacters.length },
            { key: 'images' as LibraryTab, label: 'Images', icon: Image, count: generatedHistory.length },
          ]).map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
                style={isActive
                  ? { background: C.accent, color: '#fff' }
                  : { color: C.textFaint }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.color = C.textSec; }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.color = C.textFaint; }}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
                <span className="text-[10px] ml-0.5 opacity-70">{tab.count}</span>
              </button>
            );
          })}
        </div>

        {/* ══════════ CHARACTERS TAB ══════════ */}
        {activeTab === 'characters' && (
          <>
            {/* Search bar — full width */}
            {savedCharacters.length > 0 && (
              <div className="relative mb-4">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: C.textFaint }} />
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search characters..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none transition-colors"
                  style={{ background: C.card, border: `1px solid ${C.border}`, color: C.text }}
                  onFocus={e => { (e.currentTarget as HTMLElement).style.borderColor = C.borderHover; }}
                  onBlur={e => { (e.currentTarget as HTMLElement).style.borderColor = C.border; }}
                />
              </div>
            )}

            {/* Filter tabs + sort */}
            {savedCharacters.length > 0 && (
              <div className="flex items-center justify-between gap-3 mb-6">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {(['all', 'active', 'editing', 'draft'] as CharFilter[]).map(f => {
                    const isActive = charFilter === f;
                    const label = f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1);
                    return (
                      <button
                        key={f}
                        onClick={() => setCharFilter(f)}
                        className="text-[11px] px-3 py-1.5 rounded-full font-semibold transition-all"
                        style={isActive
                          ? { background: C.accent, color: '#fff' }
                          : { color: C.textFaint, border: `1px solid ${C.border}` }}
                        onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.borderColor = C.borderHover; }}
                        onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.borderColor = C.border; }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

                {/* Sort dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowSortDropdown(!showSortDropdown)}
                    className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-full font-semibold transition-all"
                    style={{ color: C.textMuted, border: `1px solid ${C.border}` }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = C.borderHover; }}
                    onMouseLeave={e => { if (!showSortDropdown) (e.currentTarget as HTMLElement).style.borderColor = C.border; }}
                  >
                    <ArrowUpDown className="w-3 h-3" />
                    {sortMode === 'recent' ? 'Most Recent' : sortMode === 'name' ? 'Name' : 'Most Used'}
                  </button>
                  {showSortDropdown && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowSortDropdown(false)} />
                      <div
                        className="absolute right-0 top-9 w-36 rounded-xl py-1 z-50 shadow-xl"
                        style={{ background: '#1A1210', border: `1px solid ${C.borderHover}` }}
                      >
                        {([
                          { key: 'recent' as SortMode, label: 'Most Recent' },
                          { key: 'name' as SortMode, label: 'Name' },
                          { key: 'uses' as SortMode, label: 'Most Used' },
                        ]).map(s => (
                          <button
                            key={s.key}
                            onClick={() => { setSortMode(s.key); setShowSortDropdown(false); }}
                            className="w-full text-left px-3 py-2 text-xs transition-colors"
                            style={{
                              color: sortMode === s.key ? C.accent : C.textSec,
                              background: sortMode === s.key ? 'rgba(255,92,53,0.06)' : 'transparent',
                            }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; }}
                            onMouseLeave={e => {
                              (e.currentTarget as HTMLElement).style.background = sortMode === s.key ? 'rgba(255,92,53,0.06)' : 'transparent';
                            }}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Featured banner */}
            {featuredChar && !query && charFilter === 'all' && (
              <FeaturedBanner char={featuredChar} onLoad={onLoadCharacter} />
            )}

            {/* Grid or empty state */}
            {savedCharacters.length === 0 ? (
              <EmptyState onNewCharacter={onNewCharacter} />
            ) : visible.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-sm" style={{ color: C.textFaint }}>No characters match &ldquo;{query}&rdquo;</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                {visible.map(char => (
                  <CharacterCard
                    key={char.id}
                    char={char}
                    onDelete={deleteCharacter}
                    onRename={renameCharacter}
                    onLoadCharacter={onLoadCharacter}
                    onTrainSoulId={handleTrainSoulId}
                    trainingProgress={progressMap[char.id] ?? 0}
                    isFavorite={favorites.has(char.id)}
                    onToggleFavorite={toggleFavorite}
                  />
                ))}
                {onNewCharacter && !query && charFilter === 'all' && (
                  <NewCharacterCard onClick={onNewCharacter} />
                )}
              </div>
            )}
          </>
        )}

        {/* ══════════ IMAGES TAB ══════════ */}
        {activeTab === 'images' && (
          <>
            {/* Stats row */}
            {generatedHistory.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-bold"
                  style={{ background: 'rgba(255,92,53,0.08)', color: C.accent, border: '1px solid rgba(255,92,53,0.2)' }}>
                  {generatedHistory.length} total
                </span>
                {imageCount > 0 && (
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-bold"
                    style={{ background: C.card, color: C.textSec, border: `1px solid ${C.border}` }}>
                    {imageCount} images
                  </span>
                )}
                {videoCount > 0 && (
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-bold"
                    style={{ background: C.card, color: C.textSec, border: `1px solid ${C.border}` }}>
                    {videoCount} videos
                  </span>
                )}
              </div>
            )}

            {/* Search + filter bar */}
            {generatedHistory.length > 0 && (
              <div className="flex items-center gap-2 mb-6">
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: C.textFaint }} />
                  <input
                    value={imageQuery}
                    onChange={e => setImageQuery(e.target.value)}
                    placeholder="Search by provider, source..."
                    className="w-full pl-8 pr-3 py-2 rounded-xl text-[12px] outline-none"
                    style={{ background: C.card, border: `1px solid ${C.border}`, color: C.text }}
                    onFocus={e => { (e.currentTarget as HTMLElement).style.borderColor = C.borderHover; }}
                    onBlur={e => { (e.currentTarget as HTMLElement).style.borderColor = C.border; }}
                  />
                </div>
                {(['all', 'images', 'videos'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setImageFilter(f)}
                    className="text-[11px] px-3 py-1.5 rounded-full font-semibold transition-all capitalize"
                    style={imageFilter === f
                      ? { background: C.accent, color: '#fff' }
                      : { color: C.textFaint, border: `1px solid ${C.border}` }}
                  >
                    {f === 'all' ? 'All' : f === 'images' ? 'Images' : 'Videos'}
                  </button>
                ))}
              </div>
            )}

            {/* Grid or empty */}
            {generatedHistory.length === 0 ? (
              <ImagesEmptyState />
            ) : visibleImages.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-sm" style={{ color: C.textFaint }}>No results match your search</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                {visibleImages.map(item => (
                  <ImageCard
                    key={item.id}
                    item={item}
                    onDelete={deleteItem}
                    onPreview={setPreviewItem}
                    onOpenInStudio={onUploadToStudio ? handleOpenImageInStudio : undefined}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Image Preview Lightbox ── */}
      {previewItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.85)' }}
          onClick={() => setPreviewItem(null)}
        >
          <button
            className="absolute top-4 right-4 p-2 rounded-full transition-colors"
            style={{ color: C.textMuted }}
            onClick={() => setPreviewItem(null)}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#fff'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = C.textMuted; }}
          >
            <X className="w-6 h-6" />
          </button>

          <div className="max-w-4xl max-h-[85vh] relative" onClick={e => e.stopPropagation()}>
            {previewItem.type === 'video' ? (
              <video
                src={previewItem.url}
                className="max-w-full max-h-[85vh] rounded-xl"
                controls
                autoPlay
              />
            ) : (
              <img
                src={previewItem.url}
                alt=""
                className="max-w-full max-h-[85vh] rounded-xl object-contain"
              />
            )}

            {/* Bottom bar */}
            <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between p-3 rounded-b-xl"
              style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }}>
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                  style={{ background: 'rgba(255,92,53,0.15)', color: C.accent }}>
                  {previewItem.source === 'generate' ? 'Freestyle' : 'Director'}
                </span>
                {previewItem.aiProvider && (
                  <span className="text-[10px] capitalize" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    {previewItem.aiProvider}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {onUploadToStudio && previewItem.type !== 'video' && (
                  <button
                    onClick={() => {
                      handleOpenImageInStudio(previewItem);
                      setPreviewItem(null);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-[1.02]"
                    style={{ background: C.accent, color: '#fff' }}
                  >
                    <Eye className="w-3 h-3" /> Open in Studio
                  </button>
                )}
                <button
                  onClick={() => {
                    const a = document.createElement('a');
                    a.href = previewItem.url;
                    a.download = `vist-${previewItem.id}.${previewItem.type === 'video' ? 'mp4' : 'png'}`;
                    a.click();
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-[1.02]"
                  style={{ background: '#fff', color: '#000' }}
                >
                  <Download className="w-3 h-3" /> Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CharactersPage;
