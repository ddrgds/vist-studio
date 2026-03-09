import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useToast } from '../../contexts/ToastContext';
import { GeneratedContent, InfluencerParams, PoseModificationParams, VideoParams, ImageSize, AspectRatio, AIProvider } from '../../types';
import { useGallery } from '../../contexts/GalleryContext';
import { useForm } from '../../contexts/FormContext';
import { useProfile } from '../../contexts/ProfileContext';
import CompareSliderModal from '../CompareSliderModal';

// ─────────────────────────────────────────────
// Provider short labels for hover badge
// ─────────────────────────────────────────────

const PROVIDER_SHORT: Partial<Record<AIProvider, string>> = {
  [AIProvider.Gemini]:    'Gemini',
  [AIProvider.Fal]:       'FLUX',
  [AIProvider.OpenAI]:    'GPT',
  [AIProvider.Replicate]: 'Grok',
  [AIProvider.ModelsLab]: 'NSFW',
};

// ─────────────────────────────────────────────
// Card details helper
// ─────────────────────────────────────────────

const CardDetails: React.FC<{ item: GeneratedContent }> = ({ item }) => {
  if (item.type === 'create') {
    const p = item.params as InfluencerParams;
    return (
      <>
        <p className="truncate"><span className="text-zinc-500">Characters:</span> {p.characters?.length || 1}</p>
        <p className="truncate">
          <span className="text-zinc-500">Scene:</span>{' '}
          {p.scenario || (p.scenarioImage && p.scenarioImage.length > 0 ? `[${p.scenarioImage.length} Imgs]` : 'N/A')}
        </p>
      </>
    );
  }
  if (item.type === 'edit') {
    const p = item.params as PoseModificationParams;
    const imgCount = p.poseImages?.length || 0;
    return (
      <p className="truncate">
        <span className="text-zinc-500">Pose:</span>{' '}
        {p.pose || (imgCount > 0 ? `[${imgCount} Imgs]` : 'N/A')}
      </p>
    );
  }
  const p = item.params as VideoParams;
  return (
    <>
      <p className="truncate"><span className="text-zinc-500">Prompt:</span> {p.prompt || 'N/A'}</p>
      <p className="truncate"><span className="text-zinc-500">Dialogue:</span> {p.dialogue || 'N/A'}</p>
    </>
  );
};

// DeleteConfirm replaced by undo-toast in GalleryCard

// ─────────────────────────────────────────────
// Inline Tag Editor
// ─────────────────────────────────────────────

interface TagEditorProps {
  item: GeneratedContent;
  onClose: () => void;
}

const TagEditor: React.FC<TagEditorProps> = ({ item, onClose }) => {
  const { updateItemTags, allTags } = useGallery();
  const [tags, setTags] = useState<string[]>(item.tags || []);
  const [inputVal, setInputVal] = useState('');

  const addTag = (tag: string) => {
    const trimmed = tag.trim().toLowerCase().replace(/\s+/g, '-');
    if (!trimmed || tags.includes(trimmed)) return;
    setTags(prev => [...prev, trimmed]);
    setInputVal('');
  };

  const removeTag = (tag: string) => setTags(prev => prev.filter(t => t !== tag));

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputVal);
    } else if (e.key === 'Backspace' && inputVal === '' && tags.length > 0) {
      setTags(prev => prev.slice(0, -1));
    }
  };

  const handleSave = async () => {
    await updateItemTags(item.id, tags);
    onClose();
  };

  const suggestedTags = allTags.filter(t => !tags.includes(t) && t.includes(inputVal.toLowerCase())).slice(0, 6);

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm shadow-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">🏷️ Tags</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        {/* Preview */}
        <img src={item.url} alt="preview" className="w-16 h-16 rounded-lg object-cover border border-zinc-700" loading="lazy" />

        {/* Tag input */}
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-2 min-h-[56px] flex flex-wrap gap-1.5 cursor-text focus-within:border-purple-500 transition-colors">
          {tags.map(tag => (
            <span key={tag} className="flex items-center gap-1 bg-purple-600/30 text-purple-300 text-[11px] px-2 py-0.5 rounded-full border border-purple-700/40">
              #{tag}
              <button onClick={() => removeTag(tag)} className="hover:text-white text-purple-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </span>
          ))}
          <input
            type="text"
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={tags.length === 0 ? 'Escribe y presiona Enter...' : ''}
            className="flex-1 min-w-[120px] bg-transparent text-xs text-white outline-none placeholder-zinc-600"
          />
        </div>

        {/* Suggestions */}
        {suggestedTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {suggestedTags.map(tag => (
              <button
                key={tag}
                onClick={() => addTag(tag)}
                className="text-[11px] text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 px-2 py-0.5 rounded-full border border-zinc-700 transition-colors"
              >
                + #{tag}
              </button>
            ))}
          </div>
        )}

        <p className="text-[10px] text-zinc-600">Press Enter or comma to add. Backspace to remove the last one.</p>

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition-colors">Cancel</button>
          <button onClick={handleSave} className="flex-1 py-2 text-xs bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-medium transition-colors">Save</button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// More-Options Dropdown — rendered via Portal to escape isolate stacking context
// ─────────────────────────────────────────────

interface MoreOptionsMenuProps {
  item: GeneratedContent;
  anchorRect: DOMRect;
  onClose: () => void;
  onCaption: () => void;
  onRemoveBg: () => void;
  onFaceSwap: () => void;
  onTryOn: () => void;
  onSkinEnhance: (item: GeneratedContent) => void;
  onRelight: (item: GeneratedContent) => void;
  onInpaint: () => void;
  onStoryboard: () => void;
  onCopyToClipboard: () => void;
  onEditTags: () => void;
  onReuse: () => void;
  onChangePose: () => void;
  onEdit: () => void;
  onUpscale: () => void;
  upscalingId: string | null;
  onShare: () => void;
  isShared: boolean;
}

const MoreOptionsMenu: React.FC<MoreOptionsMenuProps> = ({
  item, anchorRect, onClose,
  onCaption, onRemoveBg, onFaceSwap, onTryOn, onSkinEnhance, onRelight, onInpaint, onStoryboard, onCopyToClipboard, onEditTags,
  onReuse, onChangePose, onEdit, onUpscale, upscalingId, onShare, isShared,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const MENU_WIDTH = 208; // w-52 = 13rem = 208px

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    const handleScroll = () => onClose();
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('scroll', handleScroll, true);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('scroll', handleScroll, true);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  // Position: open below the button, aligned to the right edge of the button
  // Flip left if it would go off-screen
  const vpW = window.innerWidth;
  const vpH = window.innerHeight;
  const totalActions = (item.type !== 'video' ? 10 : 4);
  const MENU_HEIGHT_APPROX = totalActions * 44;
  let top = anchorRect.bottom + 4;
  let left = anchorRect.right - MENU_WIDTH;
  if (left < 8) left = 8;
  if (left + MENU_WIDTH > vpW - 8) left = vpW - MENU_WIDTH - 8;
  if (top + MENU_HEIGHT_APPROX > vpH - 8) top = anchorRect.top - MENU_HEIGHT_APPROX - 4;

  const actions = [
    ...(item.type !== 'video' ? [
      { icon: '🎭', label: 'Change Pose', onClick: onChangePose, mobileOnly: true },
      { icon: '✏️', label: 'Image Editor', onClick: onEdit, mobileOnly: true },
      { icon: '♻️', label: 'Reuse Parameters', onClick: onReuse, mobileOnly: true },
      { icon: '⬆️', label: upscalingId ? 'Upscaling...' : 'Upscale 4×', onClick: onUpscale, mobileOnly: true },
    ] : []),
    ...(item.type !== 'video' ? [
      { icon: '✍️', label: 'Generate Caption', onClick: onCaption },
      { icon: '📋', label: 'Copy to Clipboard', onClick: onCopyToClipboard },
      { icon: '✂️', label: 'Remove Background', onClick: onRemoveBg },
      { icon: '🔄', label: 'Face Swap', onClick: onFaceSwap },
      { icon: '👗', label: 'Virtual Try-On', onClick: onTryOn },
      { icon: '✨', label: 'Skin Enhancer', onClick: () => onSkinEnhance(item) },
      { icon: '☀️', label: 'Relight', onClick: () => onRelight(item) },
      { icon: '🎨', label: 'Inpainting', onClick: onInpaint },
    ] : []),
    { icon: '🎬', label: 'Add to Storyboard', onClick: onStoryboard },
    { icon: isShared ? '🔗' : '🌐', label: isShared ? 'Unshare from Community' : 'Share to Community', onClick: onShare },
    { icon: '🏷️', label: 'Edit Tags', onClick: onEditTags },
  ];

  const mobileOnlyActions = actions.filter(a => (a as any).mobileOnly);
  const commonActions = actions.filter(a => !(a as any).mobileOnly);

  return createPortal(
    <div
      ref={menuRef}
      style={{ position: 'fixed', top, left, zIndex: 9999, width: MENU_WIDTH }}
      className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
    >
      {/* Mobile-only actions (hidden on desktop) */}
      {mobileOnlyActions.length > 0 && (
        <div className="lg:hidden">
          {mobileOnlyActions.map((action, i) => (
            <button
              key={`m-${i}`}
              onClick={(e) => { e.stopPropagation(); action.onClick(); onClose(); }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors text-left"
            >
              <span className="text-sm shrink-0">{action.icon}</span>
              {action.label}
            </button>
          ))}
          <div className="h-px bg-zinc-800 mx-2" />
        </div>
      )}
      {commonActions.map((action, i) => (
        <button
          key={i}
          onClick={(e) => { e.stopPropagation(); action.onClick(); onClose(); }}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors text-left"
        >
          <span className="text-sm shrink-0">{action.icon}</span>
          {action.label}
        </button>
      ))}
    </div>,
    document.body
  );
};

// ─────────────────────────────────────────────
// Gallery Card
// ─────────────────────────────────────────────

interface GalleryCardProps {
  item: GeneratedContent;
  index: number;
  onDownload: (e: React.MouseEvent, item: GeneratedContent) => void;
  onEdit: (item: GeneratedContent) => void;
  onReuse: (item: GeneratedContent) => void;
  onChangePose: (item: GeneratedContent) => void;
  onUpscale: (item: GeneratedContent) => void;
  upscalingId: string | null;
  onCaption: (item: GeneratedContent) => void;
  onRemoveBg: (item: GeneratedContent) => void;
  onFaceSwap: (item: GeneratedContent) => void;
  onTryOn: (item: GeneratedContent) => void;
  onSkinEnhance: (item: GeneratedContent) => void;
  onRelight: (item: GeneratedContent) => void;
  onInpaint: (item: GeneratedContent) => void;
  onStoryboard: (item: GeneratedContent) => void;
  onCopyToClipboard: (item: GeneratedContent) => void;
}

const GalleryCard: React.FC<GalleryCardProps> = ({
  item, index,
  onDownload, onEdit, onReuse, onChangePose, onUpscale, upscalingId,
  onCaption, onRemoveBg, onFaceSwap, onTryOn, onSkinEnhance, onRelight, onInpaint, onStoryboard, onCopyToClipboard,
}) => {
  const {
    isSelectionMode, selectedIds,
    toggleSelection, setSelectedItem,
    deleteItem,
    toggleFavorite, addToStoryboard,
    sharedIds, toggleShare,
  } = useGallery();
  const { profile } = useProfile();
  const toast = useToast();

  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [menuAnchorRect, setMenuAnchorRect] = useState<DOMRect | null>(null);
  const [showTagEditor, setShowTagEditor] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Touch swipe state
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const [swipeOffset, setSwipeOffset] = useState(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    setSwipeOffset(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = e.touches[0].clientY - touchStartY.current;
    // Only track horizontal swipes (not vertical scrolling)
    if (Math.abs(dx) > Math.abs(dy)) {
      setSwipeOffset(Math.max(-80, Math.min(80, dx)));
    }
  };

  const handleTouchEnd = () => {
    if (swipeOffset < -60) {
      // Swipe left → delete
      setSwipeOffset(0);
      setIsDeleted(true);
      const timer = setTimeout(() => { deleteItem(item.id); }, 5000);
      deleteTimerRef.current = timer;
      toast.undoable('Image deleted', () => {
        clearTimeout(timer);
        setIsDeleted(false);
      });
    } else if (swipeOffset > 60) {
      // Swipe right → toggle favorite
      setSwipeOffset(0);
      toggleFavorite(item.id);
      toast.info(item.favorite ? 'Removed from saved' : 'Saved ★');
    } else {
      setSwipeOffset(0);
    }
  };

  // Undo-toast delete: hide immediately, actually delete after 5s
  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDeleted(true);
    const timer = setTimeout(() => { deleteItem(item.id); }, 5000);
    deleteTimerRef.current = timer;
    toast.undoable('Image deleted', () => {
      clearTimeout(timer);
      setIsDeleted(false);
    });
  };

  // Cleanup timer on unmount
  useEffect(() => () => { if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current); }, []);

  const openMoreMenu = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (showMoreMenu) { setShowMoreMenu(false); return; }
    setMenuAnchorRect(e.currentTarget.getBoundingClientRect());
    setShowMoreMenu(true);
  };

  const isSelected = selectedIds.has(item.id);
  const isFavorite = item.favorite === true;
  const isUpscaling = upscalingId === item.id;
  const hasTags = item.tags && item.tags.length > 0;
  const [imgError, setImgError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Card hidden while undo window is open
  if (isDeleted) return null;

  return (
    <>
      <div
        className={`relative group aspect-square rounded-2xl bg-zinc-900 border shadow-xl isolate transition-all animate-in fade-in zoom-in-95 duration-300 ${isSelected ? 'border-purple-500 ring-1 ring-purple-500/50' : 'border-zinc-800'
          }`}
        style={{
          animationDelay: `${Math.min(index * 40, 400)}ms`,
          animationFillMode: 'backwards',
          transform: swipeOffset !== 0 ? `translateX(${swipeOffset}px)` : undefined,
          transition: swipeOffset === 0 ? 'transform 0.2s ease-out' : 'none',
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => { setIsHovered(false); setShowMoreMenu(false); }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Swipe hint overlays (mobile) */}
        {swipeOffset < -20 && (
          <div className="absolute inset-0 rounded-2xl z-30 pointer-events-none flex items-center justify-end pr-4 bg-red-900/40 backdrop-blur-sm">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
          </div>
        )}
        {swipeOffset > 20 && (
          <div className="absolute inset-0 rounded-2xl z-30 pointer-events-none flex items-center justify-start pl-4 bg-amber-900/40 backdrop-blur-sm">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          </div>
        )}
        {/* Clickable media area */}
        <div
          className="absolute inset-0 rounded-2xl overflow-hidden z-0"
          onClick={() => {
            if (isSelectionMode) {
              toggleSelection(item.id);
            } else {
              setSelectedItem(item);
            }
          }}
        >
          {item.type === 'video' ? (
            <video
              src={item.url}
              aria-label="Generated video"
              className="w-full h-full object-cover"
              loop
              muted
              onMouseOver={e => (e.target as HTMLVideoElement).play()}
              onMouseOut={e => (e.target as HTMLVideoElement).pause()}
            />
          ) : imgError ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-zinc-900 text-zinc-600">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
              <span className="text-[10px]">Image not available</span>
            </div>
          ) : (
            <img
              src={item.url}
              alt={item.type === 'edit' ? 'Edited image' : 'Generated image'}
              className="w-full h-full object-cover cursor-pointer"
              loading="lazy"
              onError={() => setImgError(true)}
            />
          )}
        </div>

        {/* Provider badge — top-right, fades in on hover */}
        {isHovered && !isSelectionMode && item.aiProvider && PROVIDER_SHORT[item.aiProvider as AIProvider] && (
          <div className="absolute top-11 right-2 z-20 pointer-events-none">
            <span className="text-[9px] font-jet px-1.5 py-0.5 rounded-full bg-black/70 backdrop-blur-sm border border-white/10" style={{ color: '#B8A9A5' }}>
              {PROVIDER_SHORT[item.aiProvider as AIProvider]}
            </span>
          </div>
        )}

        {/* Action overlay — lazy-rendered on hover to avoid DOM bloat (PERF-001) */}
        {isHovered && !isSelectionMode && (
          <div className="absolute inset-0 z-10 pointer-events-auto opacity-100 transition-all duration-300 rounded-2xl flex flex-col justify-end p-4 bg-gradient-to-t from-black/90 via-transparent to-transparent hidden lg:flex">
            <div className="flex gap-2 justify-end mb-2 pointer-events-auto flex-wrap">

              {/* Download */}
              <button
                onClick={(e) => onDownload(e, item)}
                aria-label="Download"
                className="p-2 bg-emerald-600/90 hover:bg-emerald-500 rounded-full text-white shadow-lg transition-transform hover:scale-110 active:scale-95"
              >
                <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </button>

              {/* Edit image */}
              {item.type !== 'video' && (
                <button
                  onClick={() => onEdit(item)}
                  aria-label="Edit image"
                  className="p-2 bg-blue-600/90 hover:bg-blue-500 rounded-full text-white shadow-lg transition-transform hover:scale-110 active:scale-95"
                >
                  <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                  </svg>
                </button>
              )}

              {/* Change pose */}
              {item.type !== 'video' && (
                <button
                  onClick={() => onChangePose(item)}
                  aria-label="Change pose"
                  title="Change pose"
                  className="p-2 bg-violet-600/90 hover:bg-violet-500 rounded-full text-white shadow-lg transition-transform hover:scale-110 active:scale-95"
                >
                  <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="5" r="2" />
                    <path d="M12 7v5l-2 2" />
                    <path d="M12 12l2 2" />
                    <path d="M9 17l3 4 3-4" />
                    <path d="M5 9l-3 3 3 3" />
                    <path d="M19 9l3 3-3 3" />
                  </svg>
                </button>
              )}

              {/* Reuse params */}
              <button
                onClick={() => onReuse(item)}
                aria-label="Reuse parameters"
                className="p-2 bg-purple-600/90 hover:bg-purple-500 rounded-full text-white shadow-lg transition-transform hover:scale-110 active:scale-95"
              >
                <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 2v6h-6" />
                  <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                  <path d="M3 22v-6h6" />
                  <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
                </svg>
              </button>

              {/* Upscale 4× */}
              {item.type !== 'video' && (
                <button
                  onClick={(e) => { e.stopPropagation(); onUpscale(item); }}
                  aria-label="Upscale 4×"
                  title="Upscale 4×"
                  disabled={isUpscaling}
                  className="p-2 bg-amber-600/90 hover:bg-amber-500 disabled:bg-zinc-700 disabled:cursor-not-allowed rounded-full text-white shadow-lg transition-transform hover:scale-110 active:scale-95"
                >
                  {isUpscaling ? (
                    <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                  ) : (
                    <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                    </svg>
                  )}
                </button>
              )}

              {/* ⋯ More options */}
              <button
                onClick={openMoreMenu}
                aria-label="More options"
                title="More options"
                className="p-2 bg-zinc-700/90 hover:bg-zinc-600 rounded-full text-white shadow-lg transition-transform hover:scale-110 active:scale-95"
              >
                <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" />
                </svg>
              </button>
              {showMoreMenu && menuAnchorRect && (
                <MoreOptionsMenu
                  item={item}
                  anchorRect={menuAnchorRect}
                  onClose={() => setShowMoreMenu(false)}
                  onCaption={() => onCaption(item)}
                  onRemoveBg={() => onRemoveBg(item)}
                  onFaceSwap={() => onFaceSwap(item)}
                  onTryOn={() => onTryOn(item)}
                  onSkinEnhance={() => { setShowMoreMenu(false); onSkinEnhance(item); }}
                  onRelight={() => { setShowMoreMenu(false); onRelight(item); }}
                  onInpaint={() => onInpaint(item)}
                  onStoryboard={() => { onStoryboard(item); }}
                  onCopyToClipboard={() => onCopyToClipboard(item)}
                  onEditTags={() => setShowTagEditor(true)}
                  onReuse={() => onReuse(item)}
                  onChangePose={() => onChangePose(item)}
                  onEdit={() => onEdit(item)}
                  onUpscale={() => onUpscale(item)}
                  upscalingId={upscalingId}
                  onShare={() => { setShowMoreMenu(false); toggleShare(item, profile?.displayName ?? 'Anonymous', profile?.avatarUrl ?? null); }}
                  isShared={sharedIds.has(item.id)}
                />
              )}
            </div>
            <div className="text-xs text-zinc-400 space-y-1 hidden sm:block">
              <CardDetails item={item} />
              {hasTags && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {item.tags!.slice(0, 3).map(tag => (
                    <span key={tag} className="text-[9px] bg-purple-900/50 text-purple-300 px-1.5 py-0.5 rounded-full border border-purple-800/30">
                      #{tag}
                    </span>
                  ))}
                  {item.tags!.length > 3 && <span className="text-[9px] text-zinc-500">+{item.tags!.length - 3}</span>}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mobile: compact strip always visible at bottom — Download + ⋯ only */}
        {!isSelectionMode && (
          <div className="absolute bottom-0 left-0 right-0 z-10 p-2 rounded-b-2xl bg-gradient-to-t from-black/80 to-transparent flex justify-end gap-2 lg:hidden pointer-events-auto">
            <button
              onClick={(e) => onDownload(e, item)}
              aria-label="Download"
              className="p-2 bg-emerald-600/90 hover:bg-emerald-500 rounded-full text-white shadow-lg active:scale-95"
            >
              <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </button>
            <button
              onClick={openMoreMenu}
              aria-label="More options"
              className="p-2 bg-zinc-700/90 hover:bg-zinc-600 rounded-full text-white shadow-lg active:scale-95"
            >
              <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" />
              </svg>
            </button>
          </div>
        )}

        {/* Type badge — only Video and Photo show text labels; edited images get a ✓ chip */}
        {!isSelectionMode && (item.type === 'video' || item.tags?.includes('uploaded') || item.type === 'edit') && (
          item.type === 'edit' ? (
            <div className="absolute top-2 left-2 z-20 pointer-events-none w-5 h-5 rounded-full bg-emerald-500/90 flex items-center justify-center shadow opacity-0 group-hover:opacity-100 transition-opacity duration-200" title="Edited">
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
          ) : (
            <div className={`absolute top-2 left-2 px-2 py-0.5 backdrop-blur-sm rounded-md text-[10px] text-white uppercase font-bold tracking-wider z-20 pointer-events-none ${item.type === 'video' ? 'bg-red-600/80' : 'bg-sky-700/80'}`}>
              {item.type === 'video' ? 'Video' : '📷 Photo'}
            </div>
          )
        )}

        {/* ─── Favorite button ─── */}
        {!isSelectionMode && (
          <button
            onClick={(e) => { e.stopPropagation(); toggleFavorite(item.id); }}
            aria-label={isFavorite ? 'Remove from favorites' : 'Mark as favorite'}
            title={isFavorite ? 'Remove from favorites' : 'Mark as favorite'}
            className={`absolute top-2 z-30 w-8 h-8 flex items-center justify-center rounded-full shadow-lg transition-all duration-200 hover:scale-110 active:scale-95 ${isFavorite
              ? 'left-10 bg-amber-500 text-white opacity-100'
              : 'left-10 bg-black/60 text-zinc-400 hover:bg-black/80 hover:text-amber-400 opacity-0 group-hover:opacity-100'
              }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill={isFavorite ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </button>
        )}

        {/* Selection checkbox */}
        <div className={`absolute top-2 left-2 z-50 transition-all duration-300 ${isSelectionMode ? '' : 'pt-8'} ${isSelected ? 'opacity-100' : 'opacity-100 lg:opacity-0 lg:group-hover:opacity-100'}`}>
          <button
            onClick={(e) => { e.stopPropagation(); toggleSelection(item.id); }}
            aria-label={isSelected ? 'Deselect' : 'Select'}
            className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors shadow-lg ${isSelected ? 'bg-purple-600 border-purple-500' : 'bg-black/60 border-white/40 hover:bg-black/80'}`}
          >
            {isSelected ? (
              <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <div className="w-full h-full rounded-full" />
            )}
          </button>
        </div>

        {/* Delete button — single click, undo toast for 5s */}
        {!isSelectionMode && (
          <div className="absolute top-2 right-2 z-50 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleDelete}
              aria-label="Delete image"
              className="w-8 h-8 flex items-center justify-center bg-black/60 hover:bg-red-600 text-white rounded-full shadow-lg transition-all hover:scale-110 cursor-pointer active:scale-95"
            >
              <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Tag Editor Modal */}
      {showTagEditor && (
        <TagEditor item={item} onClose={() => setShowTagEditor(false)} />
      )}
    </>
  );
};

// ─────────────────────────────────────────────
// Gallery Grid
// ─────────────────────────────────────────────

interface GalleryGridProps {
  onDownload: (e: React.MouseEvent, item: GeneratedContent) => void;
  onEdit: (item: GeneratedContent) => void;
  onReuse: (item: GeneratedContent) => void;
  onChangePose: (item: GeneratedContent) => void;
  onUpscale: (item: GeneratedContent) => void;
  upscalingId: string | null;
  onOpenMobileMenu: () => void;
  onCaption: (item: GeneratedContent) => void;
  onRemoveBg: (item: GeneratedContent) => void;
  onFaceSwap: (item: GeneratedContent) => void;
  onTryOn: (item: GeneratedContent) => void;
  onSkinEnhance: (item: GeneratedContent) => void;
  onRelight: (item: GeneratedContent) => void;
  onInpaint: (item: GeneratedContent) => void;
  onStoryboard: (item: GeneratedContent) => void;
  onCopyToClipboard: (item: GeneratedContent) => void;
}

const GalleryGrid: React.FC<GalleryGridProps> = ({
  onDownload, onEdit, onReuse, onChangePose, onUpscale, upscalingId, onOpenMobileMenu,
  onCaption, onRemoveBg, onFaceSwap, onTryOn, onSkinEnhance, onRelight, onInpaint, onStoryboard, onCopyToClipboard,
}) => {
  const { filteredHistory, generatedHistory, selectedIds, clearSelection, batchDeleteItems, isSelectionMode, addItems, filterType, setFilterType, sourceFilter, setSourceFilter, sortOrder, setSortOrder } = useGallery();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [compareItems, setCompareItems] = useState<[GeneratedContent, GeneratedContent] | null>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const { activeMode, setActiveMode } = useForm();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files: File[] = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;
    const newItems: GeneratedContent[] = await Promise.all(
      files.map(async (file) => {
        const url = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        return {
          id: crypto.randomUUID(),
          url,
          type: 'create' as const,
          timestamp: Date.now(),
          tags: ['uploaded'],
          params: {
            characters: [],
            scenario: '',
            lighting: '',
            imageSize: ImageSize.Size1K,
            aspectRatio: AspectRatio.Portrait,
            numberOfImages: 1,
          } as InfluencerParams,
        };
      })
    );
    await addItems(newItems);
    // Reset input so the same file can be re-uploaded if needed
    if (uploadInputRef.current) uploadInputRef.current.value = '';
  };

  const handleBatchDownload = async () => {
    const items = generatedHistory.filter(item => selectedIds.has(item.id));
    for (let i = 0; i < items.length; i++) {
      await new Promise<void>(resolve => setTimeout(resolve, i * 200));
      const a = document.createElement('a');
      a.href = items[i].url;
      a.download = `vist-${items[i].type}-${i + 1}.${items[i].type === 'video' ? 'mp4' : 'png'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const handleBatchDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    await batchDeleteItems(Array.from(selectedIds));
    clearSelection();
    setConfirmDelete(false);
  };

  if (generatedHistory.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8">
        <input
          ref={uploadInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileUpload}
        />
        <div className="max-w-4xl w-full px-6 space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="text-center space-y-4 mb-8">
            <div className="w-24 h-24 mx-auto bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-full flex items-center justify-center mb-6 shadow-2xl border border-zinc-800">
              <span className="text-4xl opacity-50">🖼️</span>
            </div>
            <h2 className="text-4xl font-bold text-white tracking-tight">Studio Gallery</h2>
            <p className="text-zinc-400 text-base max-w-lg mx-auto">Your creations will appear here. Select a tool on the left to start generating.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div onClick={() => { setActiveMode('create'); onOpenMobileMenu(); }} className="group cursor-pointer p-8 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all text-center">
              <span className="text-3xl block mb-4 group-hover:scale-110 transition-transform">✨</span>
              <h3 className="text-zinc-200 font-medium mb-2">AI Creation</h3>
              <p className="text-sm text-zinc-500">Generate high-quality images with Flux, Ideogram and more.</p>
            </div>
            <div onClick={() => { setActiveMode('edit'); onOpenMobileMenu(); }} className="group cursor-pointer p-8 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all text-center">
              <span className="text-3xl block mb-4 group-hover:scale-110 transition-transform">✂️</span>
              <h3 className="text-zinc-200 font-medium mb-2">Magic Editing</h3>
              <p className="text-sm text-zinc-500">Modify poses, remove backgrounds or swap faces.</p>
            </div>
            <div onClick={() => { setActiveMode('video'); onOpenMobileMenu(); }} className="group cursor-pointer p-8 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all text-center">
              <span className="text-3xl block mb-4 group-hover:scale-110 transition-transform">🎬</span>
              <h3 className="text-zinc-200 font-medium mb-2">Video Motion</h3>
              <p className="text-sm text-zinc-500">Bring your images to life with Luma and Kling.</p>
            </div>
            <div onClick={() => uploadInputRef.current?.click()} className="group cursor-pointer p-8 rounded-2xl bg-zinc-900 border border-zinc-800 border-dashed hover:border-sky-700 hover:bg-sky-950/20 transition-all text-center">
              <span className="text-3xl block mb-4 group-hover:scale-110 transition-transform">📷</span>
              <h3 className="text-zinc-200 font-medium mb-2">Import Photo</h3>
              <p className="text-sm text-zinc-500">Upload photos to edit with Skin Enhancer, Face Swap and more.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const canCompare = selectedIds.size === 2;

  const handleCompare = () => {
    const [idA, idB] = Array.from(selectedIds);
    const a = generatedHistory.find(i => i.id === idA);
    const b = generatedHistory.find(i => i.id === idB);
    if (a && b) setCompareItems([a, b]);
  };

  return (
    <div className="relative">
      {/* ── Hidden file input ── */}
      <input
        ref={uploadInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* ── Compare Slider Modal ── */}
      {compareItems && (
        <CompareSliderModal
          itemA={compareItems[0]}
          itemB={compareItems[1]}
          onClose={() => setCompareItems(null)}
        />
      )}

      {/* ── Batch action toolbar ── */}
      {isSelectionMode && (
        <div className="sticky top-0 z-30 flex items-center gap-2 px-4 py-2.5 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800 animate-in slide-in-from-top-2 duration-200">
          {/* Count */}
          <span className="text-xs font-semibold text-white tabular-nums">
            {selectedIds.size} selected
          </span>

          {/* Clear */}
          <button
            onClick={() => { clearSelection(); setConfirmDelete(false); }}
            className="ml-1 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors underline underline-offset-2"
          >
            Clear
          </button>

          <div className="flex-1" />

          {/* Compare (only when exactly 2 selected) */}
          {canCompare && (
            <button
              onClick={handleCompare}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-700/20 hover:bg-violet-700/40 border border-violet-600/40 hover:border-violet-500 text-violet-300 text-[11px] font-medium rounded-lg transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="18"/><rect x="14" y="3" width="7" height="18"/></svg>
              Compare
            </button>
          )}

          {/* Download all */}
          <button
            onClick={handleBatchDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-[11px] font-medium rounded-lg transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Download {selectedIds.size}
          </button>

          {/* Delete all — two-step confirm */}
          <button
            onClick={handleBatchDelete}
            onBlur={() => setConfirmDelete(false)}
            className={`flex items-center gap-1.5 px-3 py-1.5 border text-[11px] font-medium rounded-lg transition-all ${
              confirmDelete
                ? "bg-red-600 hover:bg-red-500 border-red-500 text-white"
                : "bg-zinc-800 hover:bg-red-900/40 border-zinc-700 hover:border-red-700/60 text-zinc-300 hover:text-red-300"
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
            {confirmDelete ? `Confirm Delete ${selectedIds.size}` : `Delete ${selectedIds.size}`}
          </button>
        </div>
      )}

      {/* ── Filter bar (3.5) ── */}
      {!isSelectionMode && (
        <div className="sticky top-0 z-20 flex items-center gap-1.5 px-4 py-2 border-b" style={{ background: 'rgba(13,10,10,0.92)', backdropFilter: 'blur(12px)', borderColor: '#2A1F1C' }}>
          {(['all', 'create', 'video', 'favorites'] as const).map((type) => {
            const LABELS: Record<string, string> = { all: 'All', create: 'Images', video: 'Video', favorites: '★ Saved' };
            return (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className="text-[10px] px-2.5 py-1 rounded-full transition-all font-jet"
                style={filterType === type
                  ? { background: '#FF5C35', color: '#fff' }
                  : { background: 'transparent', color: '#6B5A56', border: '1px solid #2A1F1C' }
                }
              >
                {LABELS[type]}
              </button>
            );
          })}
          <div className="flex-1" />
          <button
            onClick={() => setSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest')}
            className="text-[10px] px-2.5 py-1 rounded-full font-jet transition-colors"
            style={{ color: '#6B5A56', border: '1px solid #2A1F1C' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#B8A9A5'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#6B5A56'; }}
          >
            {sortOrder === 'newest' ? '↓ Newest' : '↑ Oldest'}
          </button>
          <span className="text-[10px] font-jet tabular-nums" style={{ color: '#4A3A36' }}>
            {filteredHistory.length}
          </span>
        </div>
      )}

      {filteredHistory.length === 0 ? (
        /* ── Empty state (4.2) ── */
        <div className="flex flex-col items-center justify-center flex-1 min-h-[60vh] px-8 text-center select-none">
          {/* Animated arrow pointing left toward the panel */}
          <div className="flex items-center gap-2 mb-6 opacity-40">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="22" height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#FF5C35"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="animate-bounce"
              style={{ animationDirection: 'alternate', animationDuration: '1.2s' }}
            >
              <line x1="19" y1="12" x2="5" y2="12"/>
              <polyline points="12 19 5 12 12 5"/>
            </svg>
            <span className="text-[10px] font-jet uppercase tracking-widest" style={{ color: '#FF5C35' }}>
              Configure &amp; generate
            </span>
          </div>

          {/* Icon placeholder */}
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
            style={{ background: 'rgba(255,92,53,0.06)', border: '1px dashed rgba(255,92,53,0.18)' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FF5C35" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
              <rect x="3" y="3" width="18" height="18" rx="3"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
              <path d="M10 3h4M3 10v4"/>
            </svg>
          </div>

          <p className="text-[15px] font-semibold mb-1.5" style={{ color: '#B8A9A5' }}>
            Nothing here yet
          </p>
          <p className="text-[12px] leading-relaxed max-w-[220px]" style={{ color: '#4A3A36' }}>
            {filterType === 'all'
              ? 'Set up your character on the left and hit Generate to create your first image.'
              : 'No images match this filter. Try "All" or generate something new.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 auto-rows-max p-4 lg:p-6">
          {filteredHistory.map((item, index) => (
            <GalleryCard
              key={item.id}
              item={item}
              index={index}
              onDownload={onDownload}
              onEdit={onEdit}
              onReuse={onReuse}
              onChangePose={onChangePose}
              onUpscale={onUpscale}
              upscalingId={upscalingId}
              onCaption={onCaption}
              onRemoveBg={onRemoveBg}
              onFaceSwap={onFaceSwap}
              onTryOn={onTryOn}
              onSkinEnhance={onSkinEnhance}
              onRelight={onRelight}
              onInpaint={onInpaint}
              onStoryboard={onStoryboard}
              onCopyToClipboard={onCopyToClipboard}
            />
          ))}
        </div>
      )}

      {/* ── Upload FAB (bottom-right, always visible) ── */}
      {!isSelectionMode && (
        <button
          onClick={() => uploadInputRef.current?.click()}
          title="Upload photos to gallery"
          className="fixed bottom-20 lg:bottom-6 right-6 z-40 flex items-center gap-2 pl-3 pr-4 py-2.5 bg-sky-700 hover:bg-sky-600 text-white text-[12px] font-semibold rounded-full shadow-[0_4px_20px_rgba(14,165,233,0.35)] hover:shadow-[0_4px_24px_rgba(14,165,233,0.5)] transition-all hover:scale-105 active:scale-95"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          Upload Photo
        </button>
      )}
    </div>
  );
};

export default GalleryGrid;
