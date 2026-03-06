import React, { useState } from 'react';
import { GeneratedContent } from '../types';
import { useGallery } from '../contexts/GalleryContext';
import { useToast } from '../contexts/ToastContext';

interface StoryboardViewProps {
  onOpenMobileMenu: () => void;
}

// Fallback para ctx.roundRect (no disponible en Firefox < 112 / Safari < 15.4)
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
  const [exportingGrid, setExportingGrid] = useState(false);

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
    toast.info('Storyboard vacío');
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
      ctx.fillStyle = '#09090b';
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

          // Draw image (cropped to square) — usando fallback manual en vez de roundRect
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
        })
      );

      // Trigger download
      canvas.toBlob(blob => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `storyboard-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('Storyboard exportado como PNG');
      }, 'image/png');
    } catch (err: any) {
      toast.error('Error al exportar: ' + (err?.message || ''));
    } finally {
      setExportingGrid(false);
    }
  };

  if (storyboardItems.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8">
        <div className="max-w-3xl w-full px-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 text-center">
          <div className="relative w-32 h-32 mx-auto">
            <div className="absolute inset-0 bg-gradient-to-tr from-zinc-800 to-zinc-900 rounded-3xl rotate-6 animate-pulse" />
            <div className="absolute inset-0 bg-zinc-950 border border-zinc-800 rounded-3xl -rotate-3 flex flex-col items-center justify-center shadow-2xl">
              <span className="text-5xl opacity-50">🎬</span>
            </div>
          </div>
          <div className="space-y-3 mb-4">
            <h3 className="text-3xl font-bold text-white tracking-tight">Tu Storyboard está vacío</h3>
            <p className="text-base text-zinc-400 max-w-lg mx-auto">
              Colecciona tus mejores generaciones aquí para armar secuencias, referencias visuales o crear tu propio cómic.
            </p>
          </div>
          <div className="p-6 bg-zinc-900/40 border border-zinc-800 rounded-2xl flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left mx-auto max-w-xl">
            <div className="w-10 h-10 rounded-full bg-zinc-800 text-zinc-400 flex items-center justify-center flex-shrink-0">
              <span className="text-lg">💡</span>
            </div>
            <div>
              <p className="text-sm text-white font-medium mb-1">¿Cómo añadir frames?</p>
              <p className="text-sm text-zinc-500 leading-relaxed">
                Ve al <strong>Feed</strong> (Galería), abre el menú <span className="inline-flex items-center justify-center w-6 h-6 bg-zinc-800 rounded-full border border-zinc-700 text-white font-bold mx-1">⋯</span> en cualquier imagen y elige <strong>"Añadir al Storyboard"</strong>.
              </p>
            </div>
          </div>
          <div className="pt-6 flex justify-center lg:hidden">
            <button
              onClick={onOpenMobileMenu}
              className="px-8 py-3 bg-white text-black text-sm font-semibold rounded-full hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/10"
            >
              Comenzar a crear
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <p className="text-xs text-zinc-500">
          <span className="text-white font-semibold">{storyboardItems.length}</span> frames — arrastra para reordenar
        </p>
        <div className="flex gap-2">
          <button
            onClick={exportAsGrid}
            disabled={exportingGrid}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-lg transition-colors"
          >
            {exportingGrid ? (
              <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
            ) : '🖼️'}
            Exportar Grid
          </button>
          <button
            onClick={handleClearAll}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-900/30 hover:bg-red-900/50 text-red-400 text-xs rounded-lg transition-colors border border-red-800/30"
          >
            🗑️ Vaciar
          </button>
        </div>
      </div>

      {/* Filmstrip */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {storyboardItems.map((item, index) => (
            <div
              key={item.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={`relative group rounded-xl overflow-hidden border aspect-square cursor-grab active:cursor-grabbing transition-all ${dragIndex === index ? 'opacity-50 border-purple-500 scale-95' : 'border-zinc-800 hover:border-zinc-600'
                }`}
            >
              {item.type === 'video' ? (
                <video src={item.url} className="w-full h-full object-cover" loop muted />
              ) : (
                <img src={item.url} alt={`Frame ${index + 1}`} className="w-full h-full object-cover" />
              )}

              {/* Frame number badge */}
              <div className="absolute top-2 left-2 z-10 bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                {index + 1}
              </div>

              {/* Controls overlay */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 z-10">
                <div className="flex gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleMove(index, index - 1); }}
                    disabled={index === 0}
                    aria-label="Mover izquierda"
                    className="p-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 rounded-lg text-white transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleMove(index, index + 1); }}
                    disabled={index === storyboardItems.length - 1}
                    aria-label="Mover derecha"
                    className="p-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 rounded-lg text-white transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                  </button>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); removeFromStoryboard(item.id); }}
                  aria-label="Quitar del storyboard"
                  className="px-2 py-1 bg-red-600/80 hover:bg-red-600 text-white text-[10px] rounded-lg transition-colors"
                >
                  Quitar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StoryboardView;
