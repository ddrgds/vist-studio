import React, { useState, useRef, useCallback } from 'react';
import { Plus, Trash2, Pencil, ChevronRight, X, Check, Search, Image, Users, Download, Play, LayoutGrid } from 'lucide-react';
import { useCharacterLibrary } from '../contexts/CharacterLibraryContext';
import { useGallery } from '../contexts/GalleryContext';
import { SavedCharacter, GeneratedContent } from '../types';
import StoryboardView from './StoryboardView';

interface CharactersPageProps {
  onLoadCharacter?: (char: SavedCharacter) => void;
  onNewCharacter?: () => void;
  onNavigate?: (ws: string) => void;
  storyboardCount?: number;
}

// ─── Soul ID Status Badge ─────────────────────────────────────────────────────

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
        {trainingProgress > 0 ? `${trainingProgress}%` : 'Training…'}
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
      style={{ background: 'rgba(255,92,53,0.10)', color: '#FF5C35', border: '1px solid rgba(255,92,53,0.22)' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,92,53,0.18)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,92,53,0.10)'; }}
    >
      ✦ Train
    </button>
  );
};

// ─── Character Card ───────────────────────────────────────────────────────────

interface CardProps {
  char: SavedCharacter;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onLoadCharacter?: (char: SavedCharacter) => void;
  onTrainSoulId: (id: string) => void;
  trainingProgress: number;
}

const CharacterCard: React.FC<CardProps> = ({
  char, onDelete, onRename, onLoadCharacter, onTrainSoulId, trainingProgress,
}) => {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameVal, setRenameVal] = useState(char.name);
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
    setTimeout(() => renameRef.current?.select(), 30);
  };

  const formattedDate = new Date(char.updatedAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
  });

  const isReady = char.loraTrainingStatus === 'ready';

  return (
    <div
      className="group relative rounded-2xl overflow-hidden transition-all duration-200"
      style={{
        background: '#0D0A0A',
        border: isReady ? '1px solid rgba(52,211,153,0.2)' : '1px solid #1A1210',
        boxShadow: isReady ? '0 0 0 0 rgba(52,211,153,0)' : undefined,
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = isReady ? 'rgba(52,211,153,0.35)' : '#2A1F1C';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = isReady ? 'rgba(52,211,153,0.2)' : '#1A1210';
      }}
    >
      {/* Thumbnail */}
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

        {/* Hover overlay — "Open in Create" */}
        {onLoadCharacter && (
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-3"
            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)' }}>
            <button
              onClick={() => onLoadCharacter(char)}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all hover:scale-[1.02] active:scale-95"
              style={{ background: '#fff', color: '#000' }}
            >
              Open in Create <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Soul ID badge — top-right */}
        <div className="absolute top-2 right-2">
          <SoulIdBadge char={char} trainingProgress={trainingProgress} onTrain={() => onTrainSoulId(char.id)} />
        </div>
      </div>

      {/* Info row */}
      <div className="px-3 py-2.5">
        {isRenaming ? (
          <div className="flex items-center gap-1">
            <input
              ref={renameRef}
              value={renameVal}
              onChange={e => setRenameVal(e.target.value)}
              onKeyDown={handleRenameKeyDown}
              onBlur={commitRename}
              className="flex-1 rounded px-2 py-0.5 text-sm outline-none min-w-0"
              style={{ background: '#1A1210', border: '1px solid #2A1F1C', color: '#F5EDE8' }}
              autoFocus
            />
            <button onClick={commitRename} className="p-0.5 transition-colors" style={{ color: '#34d399' }}>
              <Check className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => { setRenameVal(char.name); setIsRenaming(false); }}
              className="p-0.5 transition-colors" style={{ color: '#4A3A36' }}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-1 min-w-0">
            <span className="text-sm font-semibold truncate" style={{ color: '#F5EDE8' }}>{char.name}</span>
            <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={startRename} title="Rename"
                className="p-1 rounded transition-colors"
                style={{ color: '#4A3A36' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#B8A9A5'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#4A3A36'; }}>
                <Pencil className="w-3 h-3" />
              </button>
              <button onClick={() => onDelete(char.id)} title="Delete"
                className="p-1 rounded transition-colors"
                style={{ color: '#4A3A36' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#f87171'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#4A3A36'; }}>
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] font-jet" style={{ color: '#4A3A36' }}>
            {char.usageCount > 0 ? `${char.usageCount} uses` : 'unused'}
          </span>
          <span className="text-[10px]" style={{ color: '#2A1F1C' }}>·</span>
          <span className="text-[10px] font-jet" style={{ color: '#4A3A36' }}>{formattedDate}</span>
        </div>
      </div>
    </div>
  );
};

// ─── New Character CTA Card ───────────────────────────────────────────────────

const NewCharacterCard: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    onClick={onClick}
    className="group aspect-[3/4] flex flex-col items-center justify-center gap-3 rounded-2xl transition-all duration-200"
    style={{ background: 'transparent', border: '1px dashed #1A1210' }}
    onMouseEnter={e => {
      (e.currentTarget as HTMLElement).style.background = 'rgba(255,92,53,0.03)';
      (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,92,53,0.22)';
    }}
    onMouseLeave={e => {
      (e.currentTarget as HTMLElement).style.background = 'transparent';
      (e.currentTarget as HTMLElement).style.borderColor = '#1A1210';
    }}
  >
    <div
      className="w-10 h-10 rounded-full flex items-center justify-center transition-transform group-hover:scale-110"
      style={{ border: '1.5px solid #2A1F1C', color: '#4A3A36' }}
    >
      <Plus className="w-5 h-5" />
    </div>
    <span className="text-xs font-semibold tracking-wide" style={{ color: '#4A3A36' }}>New Character</span>
  </button>
);

// ─── Empty State ──────────────────────────────────────────────────────────────

const EmptyState: React.FC<{ onNewCharacter?: () => void }> = ({ onNewCharacter }) => (
  <div className="flex flex-col items-center justify-center py-24 gap-6 text-center">
    <div
      className="w-20 h-20 rounded-2xl flex items-center justify-center"
      style={{ background: 'rgba(255,92,53,0.06)', border: '1px dashed rgba(255,92,53,0.18)' }}
    >
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#FF5C35" strokeWidth="1.4"
        strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
        <circle cx="12" cy="8" r="4"/>
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
      </svg>
    </div>
    <div>
      <h2 className="text-xl font-bold mb-2" style={{ color: '#F5EDE8' }}>No characters yet</h2>
      <p className="text-sm max-w-sm leading-relaxed" style={{ color: '#4A3A36' }}>
        Go to Create, upload face references and fill in characteristics, then save your character to the library.
      </p>
    </div>
    {onNewCharacter && (
      <button
        onClick={onNewCharacter}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:scale-[1.02] active:scale-95"
        style={{ background: 'linear-gradient(135deg,#FF5C35,#FFB347)' }}
      >
        <Plus className="w-4 h-4" /> Create your first character
      </button>
    )}
  </div>
);

// ─── Stat Chip ────────────────────────────────────────────────────────────────

const StatChip: React.FC<{ value: string | number; label: string; accent?: boolean }> = ({ value, label, accent }) => (
  <div
    className="flex items-center gap-2 px-3 py-1.5 rounded-full"
    style={{
      background: accent ? 'rgba(255,92,53,0.08)' : '#0D0A0A',
      border: accent ? '1px solid rgba(255,92,53,0.2)' : '1px solid #1A1210',
    }}
  >
    <span className="text-[13px] font-bold font-jet" style={{ color: accent ? '#FF5C35' : '#B8A9A5' }}>{value}</span>
    <span className="text-[10px] font-jet" style={{ color: '#4A3A36' }}>{label}</span>
  </div>
);

// ─── Image Card ──────────────────────────────────────────────────────────────

const ImageCard: React.FC<{
  item: GeneratedContent;
  onDelete: (id: string) => void;
  onPreview: (item: GeneratedContent) => void;
}> = ({ item, onDelete, onPreview }) => {
  const isVideo = item.type === 'video';
  const date = new Date(item.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const provider = item.aiProvider ?? '';
  const source = item.source === 'generate' ? 'Create' : 'Create';

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
      style={{ background: '#0D0A0A', border: '1px solid #1A1210' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#2A1F1C'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#1A1210'; }}
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

        {/* Hover overlay */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-3"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)' }}>
          <div className="flex items-center gap-1.5">
            <button onClick={handleDownload}
              className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs font-bold transition-all hover:scale-[1.02] active:scale-95"
              style={{ background: '#fff', color: '#000' }}>
              <Download className="w-3 h-3" /> Save
            </button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
              className="p-2 rounded-lg transition-all hover:scale-[1.02] active:scale-95"
              style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-jet px-1.5 py-0.5 rounded-full"
            style={{ background: 'rgba(255,92,53,0.08)', color: '#FF5C35' }}>
            {source}
          </span>
          {provider && (
            <span className="text-[10px] font-jet capitalize" style={{ color: '#4A3A36' }}>
              {provider}
            </span>
          )}
        </div>
        <span className="text-[10px] font-jet block mt-1" style={{ color: '#2A1F1C' }}>{date}</span>
      </div>
    </div>
  );
};

// ─── Images Empty State ──────────────────────────────────────────────────────

const ImagesEmptyState: React.FC = () => (
  <div className="flex flex-col items-center justify-center py-24 gap-6 text-center">
    <div className="w-20 h-20 rounded-2xl flex items-center justify-center"
      style={{ background: 'rgba(255,92,53,0.06)', border: '1px dashed rgba(255,92,53,0.18)' }}>
      <Image className="w-8 h-8" style={{ color: '#FF5C35', opacity: 0.5 }} />
    </div>
    <div>
      <h2 className="text-xl font-bold mb-2" style={{ color: '#F5EDE8' }}>No images yet</h2>
      <p className="text-sm max-w-sm leading-relaxed" style={{ color: '#4A3A36' }}>
        Generate images in Create — they'll appear here automatically.
      </p>
    </div>
  </div>
);

// ─── Main Page ────────────────────────────────────────────────────────────────

type LibraryTab = 'characters' | 'images' | 'storyboard';

const CharactersPage: React.FC<CharactersPageProps> = ({ onLoadCharacter, onNewCharacter, onNavigate, storyboardCount }) => {
  const { savedCharacters, deleteCharacter, renameCharacter, trainSoulId } = useCharacterLibrary();
  const { generatedHistory, deleteItem } = useGallery();

  const [activeTab, setActiveTab] = useState<LibraryTab>('characters');
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});
  const abortRefs = useRef<Record<string, AbortController>>({});
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'trained' | 'untrained'>('all');
  const [imageQuery, setImageQuery] = useState('');
  const [imageFilter, setImageFilter] = useState<'all' | 'images' | 'videos'>('all');
  const [previewItem, setPreviewItem] = useState<GeneratedContent | null>(null);

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

  const readyCount = savedCharacters.filter(c => c.loraTrainingStatus === 'ready').length;
  const trainingCount = savedCharacters.filter(c => c.loraTrainingStatus === 'training').length;
  const totalUses = savedCharacters.reduce((sum, c) => sum + (c.usageCount || 0), 0);
  const hasUntrained = savedCharacters.some(c => !c.loraTrainingStatus || c.loraTrainingStatus === 'idle');

  // Filter + search
  const visible = savedCharacters
    .filter(c => {
      if (filter === 'trained') return c.loraTrainingStatus === 'ready';
      if (filter === 'untrained') return !c.loraTrainingStatus || c.loraTrainingStatus === 'idle';
      return true;
    })
    .filter(c => !query || c.name.toLowerCase().includes(query.toLowerCase()));

  // Images filter + search
  const imageCount = generatedHistory.filter(i => i.type !== 'video').length;
  const videoCount = generatedHistory.filter(i => i.type === 'video').length;
  const visibleImages = generatedHistory
    .filter(i => {
      if (imageFilter === 'images') return i.type !== 'video';
      if (imageFilter === 'videos') return i.type === 'video';
      return true;
    })
    .filter(i => {
      if (!imageQuery) return true;
      const q = imageQuery.toLowerCase();
      return (i.aiProvider ?? '').toLowerCase().includes(q)
        || (i.source ?? '').toLowerCase().includes(q)
        || (i.type ?? '').toLowerCase().includes(q);
    });

  return (
    <div className="w-full h-full overflow-y-auto pb-16 lg:pb-0" style={{ background: '#080605' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 pb-24">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <p className="text-[11px] font-jet uppercase tracking-widest mb-2" style={{ color: '#FF5C35' }}>
              Library
            </p>
            <h1 className="text-2xl font-black tracking-tight" style={{ color: '#F5EDE8' }}>
              {activeTab === 'characters' ? 'Your Cast' : activeTab === 'images' ? 'Your Images' : 'Your Storyboard'}
            </h1>
            <p className="text-sm mt-1" style={{ color: '#4A3A36' }}>
              {activeTab === 'characters'
                ? 'Save face references, outfit, and identity — reuse forever.'
                : activeTab === 'images'
                  ? 'All generated images and videos in one place.'
                  : `${storyboardCount ?? 0} frames in your sequence`}
            </p>
          </div>

          {activeTab === 'characters' && onNewCharacter && savedCharacters.length > 0 && (
            <button
              onClick={onNewCharacter}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all hover:scale-[1.02] active:scale-95 text-white shrink-0"
              style={{ background: 'linear-gradient(135deg,#FF5C35,#FFB347)' }}
            >
              <Plus className="w-3.5 h-3.5" /> New Character
            </button>
          )}
        </div>

        {/* ── Tabs ── */}
        <div className="flex items-center gap-1 mb-6 p-1 rounded-xl w-fit" style={{ background: '#0D0A0A', border: '1px solid #1A1210' }}>
          {([
            { key: 'characters' as LibraryTab, label: 'Characters', icon: Users, count: savedCharacters.length },
            { key: 'images' as LibraryTab, label: 'Images', icon: Image, count: generatedHistory.length },
            { key: 'storyboard' as LibraryTab, label: 'Storyboard', icon: LayoutGrid, count: storyboardCount ?? 0 },
          ]).map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
                style={isActive
                  ? { background: '#FF5C35', color: '#fff' }
                  : { color: '#4A3A36' }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.color = '#B8A9A5'; }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.color = '#4A3A36'; }}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
                <span className="text-[10px] font-jet ml-0.5 opacity-70">{tab.count}</span>
              </button>
            );
          })}
        </div>

        {/* ══════════ CHARACTERS TAB ══════════ */}
        {activeTab === 'characters' && (
          <>
            {/* Stats row */}
            {savedCharacters.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                <StatChip value={savedCharacters.length} label="characters" accent />
                {readyCount > 0 && <StatChip value={readyCount} label="Soul ID ready" />}
                {trainingCount > 0 && <StatChip value={trainingCount} label="training" />}
                {totalUses > 0 && <StatChip value={totalUses} label="total uses" />}
              </div>
            )}

            {/* Soul ID banner */}
            {savedCharacters.length > 0 && hasUntrained && (
              <div
                className="mb-6 p-4 rounded-xl flex items-start gap-3"
                style={{ background: 'rgba(255,92,53,0.04)', border: '1px solid rgba(255,92,53,0.14)' }}
              >
                <span style={{ color: '#FF5C35', fontSize: 18, lineHeight: 1, marginTop: 2 }}>✦</span>
                <div>
                  <p className="text-sm font-semibold mb-0.5" style={{ color: '#FF5C35' }}>
                    Train Soul ID for identity-consistent generation
                  </p>
                  <p className="text-xs leading-relaxed" style={{ color: '#6B5A56' }}>
                    Soul ID trains a personal LoRA on your character's face references, enabling perfect identity replication across any style, outfit, or scene. Click "Train" on any character to start.
                  </p>
                </div>
              </div>
            )}

            {/* Search + filter bar */}
            {savedCharacters.length > 0 && (
              <div className="flex items-center gap-2 mb-6">
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: '#4A3A36' }} />
                  <input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Search characters…"
                    className="w-full pl-8 pr-3 py-2 rounded-xl text-[12px] outline-none"
                    style={{ background: '#0D0A0A', border: '1px solid #1A1210', color: '#F5EDE8' }}
                    onFocus={e => { (e.currentTarget as HTMLElement).style.borderColor = '#2A1F1C'; }}
                    onBlur={e => { (e.currentTarget as HTMLElement).style.borderColor = '#1A1210'; }}
                  />
                </div>
                {(['all', 'trained', 'untrained'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className="text-[10px] px-2.5 py-1.5 rounded-full font-jet transition-all capitalize"
                    style={filter === f
                      ? { background: '#FF5C35', color: '#fff' }
                      : { color: '#4A3A36', border: '1px solid #1A1210' }}
                  >
                    {f === 'all' ? 'All' : f === 'trained' ? '✦ Soul ID' : 'Untrained'}
                  </button>
                ))}
              </div>
            )}

            {/* Grid or empty state */}
            {savedCharacters.length === 0 ? (
              <EmptyState onNewCharacter={onNewCharacter} />
            ) : visible.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-sm" style={{ color: '#4A3A36' }}>No characters match "{query}"</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                {visible.map(char => (
                  <CharacterCard
                    key={char.id}
                    char={char}
                    onDelete={deleteCharacter}
                    onRename={renameCharacter}
                    onLoadCharacter={onLoadCharacter}
                    onTrainSoulId={handleTrainSoulId}
                    trainingProgress={progressMap[char.id] ?? 0}
                  />
                ))}
                {onNewCharacter && !query && filter === 'all' && (
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
              <div className="flex flex-wrap gap-2 mb-6">
                <StatChip value={generatedHistory.length} label="total" accent />
                {imageCount > 0 && <StatChip value={imageCount} label="images" />}
                {videoCount > 0 && <StatChip value={videoCount} label="videos" />}
              </div>
            )}

            {/* Search + filter bar */}
            {generatedHistory.length > 0 && (
              <div className="flex items-center gap-2 mb-6">
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: '#4A3A36' }} />
                  <input
                    value={imageQuery}
                    onChange={e => setImageQuery(e.target.value)}
                    placeholder="Search by provider, source…"
                    className="w-full pl-8 pr-3 py-2 rounded-xl text-[12px] outline-none"
                    style={{ background: '#0D0A0A', border: '1px solid #1A1210', color: '#F5EDE8' }}
                    onFocus={e => { (e.currentTarget as HTMLElement).style.borderColor = '#2A1F1C'; }}
                    onBlur={e => { (e.currentTarget as HTMLElement).style.borderColor = '#1A1210'; }}
                  />
                </div>
                {(['all', 'images', 'videos'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setImageFilter(f)}
                    className="text-[10px] px-2.5 py-1.5 rounded-full font-jet transition-all capitalize"
                    style={imageFilter === f
                      ? { background: '#FF5C35', color: '#fff' }
                      : { color: '#4A3A36', border: '1px solid #1A1210' }}
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
                <p className="text-sm" style={{ color: '#4A3A36' }}>No results match your search</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                {visibleImages.map(item => (
                  <ImageCard key={item.id} item={item} onDelete={deleteItem} onPreview={setPreviewItem} />
                ))}
              </div>
            )}
          </>
        )}

        {/* ══════════ STORYBOARD TAB ══════════ */}
        {activeTab === 'storyboard' && (
          <div className="flex-1 overflow-y-auto">
            {(storyboardCount ?? 0) > 0 ? (
              <div className="p-6">
                <StoryboardView onOpenMobileMenu={() => {}} />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <h3 className="text-lg font-bold mb-2" style={{ color: '#F5EDE8' }}>No frames yet</h3>
                <p className="text-sm mb-4" style={{ color: '#8C7570' }}>
                  Generate images in Create, then add them to your storyboard
                </p>
                <button
                  onClick={() => onNavigate?.('create')}
                  className="px-5 py-2 rounded-xl text-sm font-bold text-white transition-all hover:scale-[1.02]"
                  style={{ background: 'linear-gradient(135deg, #FF5C35, #FFB347)' }}
                >
                  Start Creating
                </button>
              </div>
            )}
          </div>
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
            style={{ color: '#6B5A56' }}
            onClick={() => setPreviewItem(null)}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#fff'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#6B5A56'; }}
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
                <span className="text-[10px] font-jet px-1.5 py-0.5 rounded-full"
                  style={{ background: 'rgba(255,92,53,0.15)', color: '#FF5C35' }}>
                  {previewItem.source === 'generate' ? 'Create' : 'Create'}
                </span>
                {previewItem.aiProvider && (
                  <span className="text-[10px] font-jet capitalize" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    {previewItem.aiProvider}
                  </span>
                )}
              </div>
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
      )}
    </div>
  );
};

export default CharactersPage;
