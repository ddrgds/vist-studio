import React, { useState, useRef } from 'react';
import { GeneratedContent } from '../types';
import { useGallery } from '../contexts/GalleryContext';
import { useToast } from '../contexts/ToastContext';

interface StoryboardViewProps {
  onOpenMobileMenu: () => void;
}

// Fallback for ctx.roundRect (not available in Firefox < 112 / Safari < 15.4)
const drawRoundRect = (
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
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

const StoryboardView: React.FC<StoryboardViewProps> = ({ onOpenMobileMenu }) => {
  const { storyboardIds, removeFromStoryboard, reorderStoryboard, generatedHistory } = useGallery();
  const toast = useToast();
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [selectedFrame, setSelectedFrame] = useState(0);
  const [exportingGrid, setExportingGrid] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Resolve IDs to items (filter out deleted ones)
  const storyboardItems: GeneratedContent[] = storyboardIds
    .map(id => generatedHistory.find(item => item.id === id))
    .filter((item): item is GeneratedContent => item !== undefined);

  const handleMove = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= storyboardItems.length) return;
    const newIds = storyboardItems.map(i => i.id);
    const [moved] = newIds.splice(fromIndex, 1);
    newIds.splice(toIndex, 0, moved);
    reorderStoryboard(newIds);
    setSelectedFrame(toIndex);
  };

  const handleDragStart = (index: number) => setDragIndex(index);
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    handleMove(dragIndex, index);
    setDragIndex(index);
  };
  const handleDragEnd = () => setDragIndex(null);

  const handleClearAll = () => {
    storyboardIds.forEach(id => removeFromStoryboard(id));
    setSelectedFrame(0);
    toast.info('Storyboard cleared');
  };

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
      ctx.fillStyle = '#0D0A0A';
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
            img.onerror = () => rej(new Error('img load failed'));
            img.src = item.url;
          });

          ctx.save();
          drawRoundRect(ctx, x, y, cellSize, cellSize, 8);
          ctx.clip();
          const aspect = img.width / img.height;
          let sx = 0, sy = 0, sw = img.width, sh = img.height;
          if (aspect > 1) { sw = img.height; sx = (img.width - sw) / 2; }
          else { sh = img.width; sy = (img.height - sh) / 2; }
          ctx.drawImage(img, sx, sy, sw, sh, x, y, cellSize, cellSize);
          ctx.restore();

          ctx.fillStyle = 'rgba(0,0,0,0.7)';
          ctx.fillRect(x, y + cellSize, cellSize, labelH);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 12px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`Frame ${i + 1}`, x + cellSize / 2, y + cellSize + labelH / 2);
        })
      );

      canvas.toBlob(blob => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `vist-storyboard-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('Storyboard exported as PNG');
      }, 'image/png');
    } catch (err: any) {
      toast.error('Export error: ' + (err?.message || ''));
    } finally {
      setExportingGrid(false);
    }
  };

  // ─── Empty State ───────────────────────────────────────────────────────────
  if (storyboardItems.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8" style={{ background: '#0D0A0A' }}>
        <div className="max-w-lg w-full text-center">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center" style={{ background: 'rgba(255,92,53,0.06)' }}>
            <span className="text-3xl">🎬</span>
          </div>
          <h3 className="text-xl font-bold font-display mb-2" style={{ color: '#F5EDE8' }}>
            Your Storyboard is empty
          </h3>
          <p className="text-sm mb-8" style={{ color: '#6B5A56' }}>
            Collect your best generations here to build sequences, visual references, or create your own comic.
          </p>

          <div className="p-5 rounded-2xl flex items-start gap-4 text-left mx-auto max-w-md"
            style={{ background: '#161110', border: '1px solid #2A1F1C' }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(255,179,71,0.1)' }}>
              <span className="text-sm">💡</span>
            </div>
            <div>
              <p className="text-xs font-semibold mb-1" style={{ color: '#F5EDE8' }}>How to add frames</p>
              <p className="text-[11px] leading-relaxed" style={{ color: '#6B5A56' }}>
                Open any image from your gallery, tap the <strong style={{ color: '#B8A9A5' }}>menu ⋯</strong> and choose <strong style={{ color: '#FF5C35' }}>"Add to Storyboard"</strong>.
              </p>
            </div>
          </div>

          <div className="mt-8 lg:hidden">
            <button
              onClick={onOpenMobileMenu}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm text-white transition-all hover:scale-[1.02] active:scale-[0.97]"
              style={{ background: 'linear-gradient(135deg, #FF5C35, #FFB347)', boxShadow: '0 4px 24px rgba(255,92,53,0.35)' }}
            >
              Start creating
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Active Frame ──────────────────────────────────────────────────────────
  const activeItem = storyboardItems[Math.min(selectedFrame, storyboardItems.length - 1)];
  const activeIndex = Math.min(selectedFrame, storyboardItems.length - 1);

  return (
    <div className="flex flex-col h-full" style={{ background: '#0D0A0A' }}>
      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: '#1A1210' }}>
        <div className="flex items-center gap-3">
          <h2 className="text-xs font-black tracking-widest uppercase font-display" style={{ color: '#FF5C35' }}>
            Storyboard
          </h2>
          <span className="text-[10px] font-jet" style={{ color: '#6B5A56' }}>
            {storyboardItems.length} frame{storyboardItems.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportAsGrid}
            disabled={exportingGrid}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-all hover:scale-[1.02]"
            style={{ background: 'rgba(255,92,53,0.08)', border: '1px solid rgba(255,92,53,0.15)', color: '#FF5C35' }}
          >
            {exportingGrid ? (
              <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
            )}
            Export Grid
          </button>
          <button
            onClick={handleClearAll}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-all"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: '#EF4444' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            Clear
          </button>
        </div>
      </div>

      {/* ── Preview Area ── */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-hidden relative min-h-0">
        {activeItem && (
          <div className="relative max-h-full max-w-full flex flex-col items-center">
            {/* Navigation arrows */}
            {activeIndex > 0 && (
              <button
                onClick={() => setSelectedFrame(activeIndex - 1)}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110"
                style={{ background: 'rgba(0,0,0,0.6)', color: '#fff' }}
                aria-label="Previous frame"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
              </button>
            )}
            {activeIndex < storyboardItems.length - 1 && (
              <button
                onClick={() => setSelectedFrame(activeIndex + 1)}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110"
                style={{ background: 'rgba(0,0,0,0.6)', color: '#fff' }}
                aria-label="Next frame"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
              </button>
            )}

            {activeItem.type === 'video' ? (
              <video
                src={activeItem.url}
                className="max-h-full max-w-full rounded-xl object-contain"
                style={{ maxHeight: 'calc(100vh - 280px)' }}
                controls
                loop
              />
            ) : (
              <img
                src={activeItem.url}
                alt={`Frame ${activeIndex + 1}`}
                className="max-h-full max-w-full rounded-xl object-contain"
                style={{ maxHeight: 'calc(100vh - 280px)' }}
              />
            )}

            {/* Frame info */}
            <div className="mt-3 flex items-center gap-3">
              <span className="text-[10px] font-jet font-bold px-2 py-0.5 rounded" style={{ background: 'rgba(255,92,53,0.1)', color: '#FF5C35' }}>
                Frame {activeIndex + 1} / {storyboardItems.length}
              </span>
              <span className="text-[10px] font-jet" style={{ color: '#6B5A56' }}>
                {activeItem.type === 'video' ? '🎬 Video' : '🖼 Image'}
              </span>
              <button
                onClick={() => { removeFromStoryboard(activeItem.id); if (selectedFrame >= storyboardItems.length - 1) setSelectedFrame(Math.max(0, selectedFrame - 1)); }}
                className="text-[10px] font-semibold transition-colors ml-2"
                style={{ color: '#EF4444' }}
              >
                Remove
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Timeline Strip ── */}
      <div className="border-t px-2 py-3" style={{ borderColor: '#1A1210', background: '#161110' }}>
        <div
          ref={timelineRef}
          className="flex gap-1.5 overflow-x-auto pb-1 custom-scrollbar"
          style={{ scrollBehavior: 'smooth' }}
        >
          {storyboardItems.map((item, index) => (
            <React.Fragment key={item.id}>
              <button
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                onClick={() => setSelectedFrame(index)}
                className={`relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all cursor-grab active:cursor-grabbing ${
                  dragIndex === index ? 'opacity-40 scale-90' : ''
                }`}
                style={{
                  borderColor: activeIndex === index ? '#FF5C35' : '#2A1F1C',
                  boxShadow: activeIndex === index ? '0 0 0 1px rgba(255,92,53,0.3), 0 4px 12px rgba(255,92,53,0.15)' : 'none',
                }}
              >
                {item.type === 'video' ? (
                  <video src={item.url} className="w-full h-full object-cover" muted />
                ) : (
                  <img src={item.url} alt="" className="w-full h-full object-cover" />
                )}
                {/* Frame number */}
                <span
                  className="absolute bottom-0.5 left-0.5 text-[8px] font-jet font-bold px-1 rounded"
                  style={{ background: 'rgba(0,0,0,0.7)', color: activeIndex === index ? '#FF5C35' : '#B8A9A5' }}
                >
                  {index + 1}
                </span>
                {/* Video indicator */}
                {item.type === 'video' && (
                  <span className="absolute top-0.5 right-0.5 text-[8px] px-1 rounded" style={{ background: 'rgba(0,0,0,0.7)', color: '#FFB347' }}>
                    ▶
                  </span>
                )}
              </button>
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StoryboardView;
