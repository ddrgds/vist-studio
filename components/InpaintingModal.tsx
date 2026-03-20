import React, { useState, useRef, useEffect, useCallback } from 'react';
import { inpaintImage, inpaintWithZImageTurbo } from '../services/falService';
import { useToast } from '../contexts/ToastContext';
import { useProfile } from '../contexts/ProfileContext';
import { CREDIT_COSTS } from '../types';
import ProgressBar from './ProgressBar';

interface InpaintingModalProps {
  item: { id: string; url: string };
  onClose: () => void;
  onSave: (dataUrl: string, sourceItemId: string) => Promise<void>;
}

const InpaintingModal: React.FC<InpaintingModalProps> = ({ item, onClose, onSave }) => {
  const toast = useToast();
  const { decrementCredits, restoreCredits } = useProfile();
  const containerRef = useRef<HTMLDivElement>(null);
  const imageCanvasRef = useRef<HTMLCanvasElement>(null); // background image
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);  // drawing layer
  const isDrawing = useRef(false);

  const [brushSize, setBrushSize] = useState(30);
  const [prompt, setPrompt] = useState('');
  const [engine, setEngine] = useState<'flux' | 'zimage'>('zimage');
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ w: 512, h: 512 });

  // Load image onto background canvas and size everything
  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const maxW = Math.min(512, window.innerWidth - 80);
      const ratio = img.height / img.width;
      const w = maxW;
      const h = Math.round(w * ratio);
      setCanvasSize({ w, h });
      setImageLoaded(true);

      requestAnimationFrame(() => {
        const imgCanvas = imageCanvasRef.current;
        const maskCanvas = maskCanvasRef.current;
        if (!imgCanvas || !maskCanvas) return;

        imgCanvas.width = w;
        imgCanvas.height = h;
        maskCanvas.width = w;
        maskCanvas.height = h;

        const imgCtx = imgCanvas.getContext('2d');
        if (imgCtx) imgCtx.drawImage(img, 0, 0, w, h);

        const maskCtx = maskCanvas.getContext('2d');
        if (maskCtx) {
          maskCtx.clearRect(0, 0, w, h);
        }
      });
    };
    img.onerror = () => {
      setImageError(true);
    };
    img.src = item.url;
  }, [item.url]);

  const getPos = useCallback((e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing.current) return;
    const canvas = maskCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getPos(e, canvas);
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
    ctx.fill();
  }, [brushSize, getPos]);

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    isDrawing.current = true;
    draw(e);
  };

  const stopDraw = () => { isDrawing.current = false; };

  const clearMask = () => {
    const canvas = maskCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const exportMaskAsFile = async (): Promise<File> => {
    const maskCanvas = maskCanvasRef.current!;
    const w = maskCanvas.width;
    const h = maskCanvas.height;

    // Create a B&W mask: white = painted area, black = rest
    const offscreen = document.createElement('canvas');
    offscreen.width = w;
    offscreen.height = h;
    const ctx = offscreen.getContext('2d')!;

    // Fill black
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, w, h);

    // Draw white strokes from mask canvas
    ctx.drawImage(maskCanvas, 0, 0);

    return new Promise<File>((resolve, reject) => {
      offscreen.toBlob((blob) => {
        if (!blob) { reject(new Error('Could not export the mask from the canvas')); return; }
        resolve(new File([blob], `mask-${Date.now()}.png`, { type: 'image/png' }));
      }, 'image/png');
    });
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) { toast.error('Describe what you want to generate in the marked area'); return; }

    const cost = CREDIT_COSTS['inpaint'];
    const hasCredits = await decrementCredits(cost);
    if (!hasCredits) { toast.error('Insufficient credits. Please upgrade your plan.'); return; }

    setLoading(true);
    setProgress(0);
    setResult(null);
    try {
      // Get original image as File
      const resp = await fetch(item.url);
      const blob = await resp.blob();
      const imageFile = new File([blob], `base-${item.id}.png`, { type: blob.type || 'image/png' });

      const maskFile = await exportMaskAsFile();
      const dataUrl = engine === 'zimage'
        ? await inpaintWithZImageTurbo(imageFile, maskFile, prompt, setProgress)
        : await inpaintImage(imageFile, maskFile, prompt, setProgress);
      setResult(dataUrl);
    } catch (err: any) {
      restoreCredits(cost);
      toast.error(err?.message || 'Error performing the inpainting');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!result) return;
    try {
      await onSave(result, item.id);
      toast.success('Image saved to gallery');
      onClose();
    } catch {
      toast.error('Error saving');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex animate-in fade-in duration-300">

      {/* ─── Center Canvas Area ─── */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 relative bg-zinc-950">

        {/* Back Button */}
        <button onClick={onClose} className="absolute top-6 left-6 flex items-center gap-2 text-zinc-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl backdrop-blur-md border border-white/5 z-10">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></svg>
          Back to Canvas
        </button>

        <div className="w-full max-w-3xl flex items-center justify-center relative shadow-2xl">
          {result ? (
            <div className="rounded-xl overflow-hidden shadow-2xl border border-white/5 max-h-[80vh]">
              <img src={result} alt="Inpainting Result" className="w-full h-full object-contain" />
            </div>
          ) : (
            <div ref={containerRef} className="relative mx-auto rounded-xl overflow-hidden border border-white/5 shadow-2xl cursor-crosshair bg-black" style={{ width: canvasSize.w, maxWidth: '100%' }}>
              <canvas ref={imageCanvasRef} className="block w-full" />
              <canvas
                ref={maskCanvasRef}
                className="absolute inset-0 w-full h-full opacity-60"
                style={{ mixBlendMode: 'screen' }}
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={stopDraw}
                onMouseLeave={stopDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={stopDraw}
              />
              {!imageLoaded && !imageError && (
                <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center backdrop-blur-sm">
                  <svg className="animate-spin text-white mb-4" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                  <p className="text-sm text-zinc-400">Loading Canvas...</p>
                </div>
              )}
              {imageError && (
                <div className="absolute inset-0 bg-zinc-900 flex flex-col items-center justify-center p-6 text-center">
                  <span className="text-3xl mb-3">⚠️</span>
                  <p className="text-red-400 font-medium">Image load failed</p>
                  <p className="text-xs text-zinc-500 mt-2">Try saving it locally first.</p>
                </div>
              )}
            </div>
          )}

          {/* Processing Overlay */}
          {loading && (
            <div className="absolute inset-0 bg-black/70 backdrop-blur-md flex flex-col items-center justify-center z-20 rounded-xl">
              <svg className="animate-spin text-white mb-6" xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
              <div className="w-72">
                <ProgressBar progress={progress} label="Applying Inpainting..." />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Right Inspector Panel ─── */}
      <aside className="w-[450px] bg-zinc-950/95 backdrop-blur-3xl border-l border-white/5 flex flex-col shadow-2xl relative z-10">
        {/* Header */}
        <div className="p-6 pb-5 border-b border-white/5 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">🖌️</span>
              <h2 className="text-lg font-bold text-white tracking-wide">Inpainting</h2>
            </div>
            <span className="text-[10px] text-zinc-400 bg-white/5 px-2 py-1 rounded border border-white/10 uppercase tracking-widest">Inspector</span>
          </div>
          <p className="text-xs text-zinc-500 font-light">Draw over the area you want to replace</p>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-8 custom-scrollbar">

          {/* Brush Controls */}
          {!result && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Brush Size</label>
                <span className="text-xs text-zinc-500 font-mono">{brushSize}px</span>
              </div>
              <input
                type="range"
                min="5"
                max="100"
                value={brushSize}
                onChange={e => setBrushSize(Number(e.target.value))}
                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
              <button
                onClick={clearMask}
                className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/5 text-zinc-300 text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                Clear Mask
              </button>
            </div>
          )}

          {/* Engine Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">Engine</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setEngine('zimage')}
                className={`py-2 px-3 rounded-xl text-xs font-medium border transition-colors text-left ${engine === 'zimage' ? 'bg-white/10 border-white/20 text-white' : 'bg-white/[0.02] border-white/5 text-zinc-500 hover:border-white/10 hover:text-zinc-300'}`}
              >
                <span className="block font-semibold">Z-Image Turbo</span>
                <span className="block text-[10px] text-zinc-500 mt-0.5">Uncensored · fast · 8 steps</span>
              </button>
              <button
                onClick={() => setEngine('flux')}
                className={`py-2 px-3 rounded-xl text-xs font-medium border transition-colors text-left ${engine === 'flux' ? 'bg-white/10 border-white/20 text-white' : 'bg-white/[0.02] border-white/5 text-zinc-500 hover:border-white/10 hover:text-zinc-300'}`}
              >
                <span className="block font-semibold">FLUX Pro</span>
                <span className="block text-[10px] text-zinc-500 mt-0.5">High quality · 28 steps</span>
              </button>
            </div>
          </div>

          {/* Prompt Input */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">Generation Prompt</label>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Describe what to generate inside the masked area (e.g., 'a red handbag', 'sunglasses')..."
              rows={4}
              className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none focus:border-white/20 focus:bg-white/[0.04] transition-all resize-none shadow-inner"
            />
          </div>

          {/* Actions Footer */}
          <div className="pt-4 border-t border-white/5 flex flex-col gap-3">
            {result ? (
              <div className="flex gap-3">
                <button
                  onClick={handleGenerate}
                  disabled={loading}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-sm font-medium transition-all"
                >
                  Retry Inpaint
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-sm font-bold tracking-wide transition-all shadow-[0_0_20px_rgba(147,51,234,0.3)] active:scale-[0.98]"
                >
                  Save to Gallery
                </button>
              </div>
            ) : (
              <button
                onClick={handleGenerate}
                disabled={loading || !imageLoaded || imageError}
                className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:from-zinc-800 disabled:to-zinc-800 disabled:text-zinc-500 disabled:shadow-none text-white rounded-xl text-sm font-bold tracking-wide transition-all shadow-[0_0_20px_rgba(147,51,234,0.3)] active:scale-[0.98]"
              >
                APPLY INPAINTING
              </button>
            )}
          </div>

        </div>
      </aside>
    </div>
  );
};

export default InpaintingModal;
