import { useState } from 'react';
import { useGalleryStore, type GalleryItem } from '../stores/galleryStore';
import { useToast } from '../contexts/ToastContext';

// ─────────────────────────────────────────────
// Canvas helper — roundRect polyfill for older browsers
// ─────────────────────────────────────────────

const drawRoundRect = (
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
};

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export function StoryboardView() {
  const items = useGalleryStore((s) => s.items);
  const storyboardIds = useGalleryStore((s) => s.storyboardIds);
  const removeFromStoryboard = useGalleryStore((s) => s.removeFromStoryboard);
  const reorderStoryboard = useGalleryStore((s) => s.reorderStoryboard);
  const clearStoryboard = useGalleryStore((s) => s.clearStoryboard);
  const { addToast } = useToast();

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [exportingGrid, setExportingGrid] = useState(false);

  // Resolve IDs to gallery items (skip deleted ones)
  const storyboardItems: GalleryItem[] = storyboardIds
    .map((id) => items.find((item) => item.id === id))
    .filter((item): item is GalleryItem => item !== undefined);

  // ─── Reorder ─────────────────────────────────

  const handleMove = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= storyboardItems.length) return;
    const newIds = storyboardItems.map((i) => i.id);
    const [moved] = newIds.splice(fromIndex, 1);
    newIds.splice(toIndex, 0, moved);
    reorderStoryboard(newIds);
  };

  const handleDragStart = (index: number) => setDragIndex(index);

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    handleMove(dragIndex, index);
    setDragIndex(index);
  };

  const handleDragEnd = () => setDragIndex(null);

  // ─── Clear all ───────────────────────────────

  const handleClearAll = () => {
    clearStoryboard();
    addToast('Storyboard cleared', 'info');
  };

  // ─── Grid export ─────────────────────────────

  const exportAsGrid = async () => {
    if (storyboardItems.length === 0) return;
    setExportingGrid(true);
    try {
      const cols = Math.min(storyboardItems.length, 4);
      const rows = Math.ceil(storyboardItems.length / cols);
      const cellSize = 300;
      const padding = 8;
      const labelH = 24;

      const canvas = document.createElement('canvas');
      canvas.width = cols * cellSize + (cols + 1) * padding;
      canvas.height = rows * (cellSize + labelH) + (rows + 1) * padding;

      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#08070C';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      await Promise.all(
        storyboardItems.map(async (item, i) => {
          const col = i % cols;
          const row = Math.floor(i / cols);
          const x = padding + col * (cellSize + padding);
          const y = padding + row * (cellSize + labelH + padding);

          const img = new Image();
          img.crossOrigin = 'anonymous';
          await new Promise<void>((res, rej) => {
            img.onload = () => res();
            img.onerror = () => rej(new Error('Image load failed'));
            img.src = item.url;
          });

          // Draw image (cropped to square) with rounded corners
          ctx.save();
          drawRoundRect(ctx, x, y, cellSize, cellSize, 8);
          ctx.clip();
          const aspect = img.width / img.height;
          let sx = 0, sy = 0, sw = img.width, sh = img.height;
          if (aspect > 1) { sw = img.height; sx = (img.width - sw) / 2; }
          else { sh = img.width; sy = (img.height - sh) / 2; }
          ctx.drawImage(img, sx, sy, sw, sh, x, y, cellSize, cellSize);
          ctx.restore();

          // Frame number label
          ctx.fillStyle = 'rgba(0,0,0,0.7)';
          ctx.fillRect(x, y + cellSize, cellSize, labelH);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 12px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`Frame ${i + 1}`, x + cellSize / 2, y + cellSize + labelH / 2);
        }),
      );

      // Download
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `storyboard-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        addToast('Storyboard exported as PNG', 'success');
      }, 'image/png');
    } catch (err: any) {
      addToast('Export failed: ' + (err?.message || ''), 'error');
    } finally {
      setExportingGrid(false);
    }
  };

  // ─── Empty state ─────────────────────────────

  if (storyboardItems.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8">
        <div className="max-w-3xl w-full px-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 text-center">
          {/* Icon */}
          <div className="relative w-32 h-32 mx-auto">
            <div
              className="absolute inset-0 rounded-3xl rotate-6 animate-pulse"
              style={{ background: 'linear-gradient(135deg, var(--joi-bg-3), var(--joi-bg-2))' }}
            />
            <div
              className="absolute inset-0 rounded-3xl -rotate-3 flex flex-col items-center justify-center shadow-2xl"
              style={{ background: 'var(--joi-bg-0)', border: '1px solid rgba(255,255,255,.04)' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--joi-text-3)', opacity: 0.6 }}>
                <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
                <line x1="7" y1="2" x2="7" y2="22" />
                <line x1="17" y1="2" x2="17" y2="22" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <line x1="2" y1="7" x2="7" y2="7" />
                <line x1="2" y1="17" x2="7" y2="17" />
                <line x1="17" y1="17" x2="22" y2="17" />
                <line x1="17" y1="7" x2="22" y2="7" />
              </svg>
            </div>
          </div>

          {/* Copy */}
          <div className="space-y-3 mb-4">
            <h3 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--joi-text-1)' }}>
              Your Storyboard is empty
            </h3>
            <p className="text-sm max-w-lg mx-auto" style={{ color: 'var(--joi-text-3)' }}>
              Collect your best creations here to build sequences, visual references, or export as a grid.
            </p>
          </div>

          {/* Hint card */}
          <div
            className="p-5 rounded-2xl flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left mx-auto max-w-xl"
            style={{ background: 'var(--joi-bg-glass)', border: '1px solid rgba(255,255,255,.04)', backdropFilter: 'blur(12px)' }}
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--joi-bg-3)', color: 'var(--joi-text-3)' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--joi-text-1)' }}>How to add frames</p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--joi-text-3)' }}>
                Go to the <strong style={{ color: 'var(--joi-text-2)' }}>Gallery</strong>, hover any image, and click
                the{' '}
                <span
                  className="inline-flex items-center justify-center w-5 h-5 rounded-md text-[9px] font-bold mx-0.5"
                  style={{ background: 'var(--joi-bg-3)', border: '1px solid rgba(255,255,255,.06)', color: 'var(--joi-text-1)' }}
                >
                  +
                </span>{' '}
                button to add it to your storyboard.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Main view ───────────────────────────────

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <p className="text-xs" style={{ color: 'var(--joi-text-3)' }}>
          <span className="font-semibold font-mono" style={{ color: 'var(--joi-text-1)' }}>
            {storyboardItems.length}
          </span>{' '}
          frames — drag to reorder
        </p>
        <div className="flex gap-2">
          <button
            onClick={exportAsGrid}
            disabled={exportingGrid}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all hover:scale-[1.02]"
            style={{
              background: 'rgba(167,139,250,.08)',
              border: '1px solid rgba(167,139,250,.15)',
              color: 'var(--joi-violet)',
              opacity: exportingGrid ? 0.5 : 1,
            }}
          >
            {exportingGrid ? (
              <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
            )}
            Export Grid
          </button>
          <button
            onClick={handleClearAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all hover:scale-[1.02]"
            style={{
              background: 'rgba(255,60,60,.06)',
              border: '1px solid rgba(255,60,60,.12)',
              color: '#e05050',
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            Clear
          </button>
        </div>
      </div>

      {/* Filmstrip grid */}
      <div className="flex-1 overflow-y-auto joi-scroll">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {storyboardItems.map((item, index) => (
            <div
              key={item.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className="relative group rounded-xl overflow-hidden aspect-square cursor-grab active:cursor-grabbing transition-all joi-border-glow"
              style={{
                border: `1px solid ${dragIndex === index ? 'rgba(167,139,250,.4)' : 'rgba(255,255,255,.04)'}`,
                opacity: dragIndex === index ? 0.5 : 1,
                transform: dragIndex === index ? 'scale(0.95)' : 'scale(1)',
                background: 'var(--joi-bg-glass)',
                backdropFilter: 'blur(12px)',
              }}
            >
              {item.type === 'video' ? (
                <video src={item.url} className="w-full h-full object-cover" loop muted />
              ) : (
                <img src={item.url} alt={`Frame ${index + 1}`} className="w-full h-full object-cover" />
              )}

              {/* Frame number badge */}
              <div
                className="absolute top-2 left-2 z-10 text-[10px] font-bold font-mono px-2 py-0.5 rounded-md"
                style={{ background: 'rgba(8,7,12,.75)', color: 'var(--joi-text-1)', backdropFilter: 'blur(4px)' }}
              >
                {index + 1}
              </div>

              {/* Hover controls overlay */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 z-10">
                {/* Move buttons */}
                <div className="flex gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleMove(index, index - 1); }}
                    disabled={index === 0}
                    aria-label="Move left"
                    className="p-1.5 rounded-lg transition-all hover:scale-110 disabled:opacity-30"
                    style={{ background: 'var(--joi-bg-3)', color: 'var(--joi-text-1)' }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleMove(index, index + 1); }}
                    disabled={index === storyboardItems.length - 1}
                    aria-label="Move right"
                    className="p-1.5 rounded-lg transition-all hover:scale-110 disabled:opacity-30"
                    style={{ background: 'var(--joi-bg-3)', color: 'var(--joi-text-1)' }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                </div>

                {/* Remove button */}
                <button
                  onClick={(e) => { e.stopPropagation(); removeFromStoryboard(item.id); }}
                  aria-label="Remove from storyboard"
                  className="px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all hover:scale-105"
                  style={{ background: 'rgba(255,60,60,.15)', color: '#e05050', border: '1px solid rgba(255,60,60,.2)' }}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default StoryboardView;
