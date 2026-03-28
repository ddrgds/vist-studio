import React, { useState, useRef, useEffect, useCallback } from 'react';

interface ImageEditorProps {
  imageUrl: string;           // URL or data URL of image to edit
  onSave: (editedDataUrl: string) => void;
  onClose: () => void;
  /** Optional action buttons rendered at the top of the sidebar (AI Editor, Try-On, etc.) */
  actions?: React.ReactNode;
}

interface FilterState {
  brightness: number;
  contrast: number;
  saturation: number;
  sepia: number;
  grayscale: number;
}

interface HistoryItem {
  src: string;
  filters: FilterState;
}

const ImageEditor: React.FC<ImageEditorProps> = ({ imageUrl, onSave, onClose, actions }) => {
  const initialFilters: FilterState = {
    brightness: 100,
    contrast: 100,
    saturation: 100,
    sepia: 0,
    grayscale: 0,
  };

  const [internalSrc, setInternalSrc] = useState(imageUrl);
  const [filters, setFilters] = useState<FilterState>(initialFilters);

  const [history, setHistory] = useState<HistoryItem[]>([{ src: imageUrl, filters: initialFilters }]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const imgRef = useRef<HTMLImageElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [openSection, setOpenSection] = useState<string>('light');

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const [isCropping, setIsCropping] = useState(false);
  const [selection, setSelection] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);

  const filterString = `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturation}%) sepia(${filters.sepia}%) grayscale(${filters.grayscale}%)`;

  const addToHistory = (newSrc: string, newFilters: FilterState) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ src: newSrc, filters: { ...newFilters } });
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setInternalSrc(prev.src);
      setFilters({ ...prev.filters });
      setHistoryIndex(historyIndex - 1);
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setInternalSrc(next.src);
      setFilters({ ...next.filters });
      setHistoryIndex(historyIndex + 1);
    }
  };

  const handleRestoreOriginal = () => {
    if (confirm('¿Estás seguro? Esto descartará todos los cambios y recortes.')) {
      setInternalSrc(imageUrl);
      setFilters(initialFilters);
      addToHistory(imageUrl, initialFilters);
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
  };

  const ensureDataUrl = async (url: string): Promise<string> => {
    if (url.startsWith('data:')) return url;
    const resp = await fetch(url);
    const blob = await resp.blob();
    return new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  };

  const loadImage = (dataUrl: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = dataUrl;
    });

  const updateFilter = (key: keyof FilterState, value: number) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const commitFilterChange = () => {
    addToHistory(internalSrc, filters);
  };

  const renderToCanvas = async (): Promise<string | null> => {
    const img = imgRef.current;
    if (!img) return null;

    const dataUrl = await ensureDataUrl(internalSrc);
    const drawableImg = await loadImage(dataUrl);

    const canvas = document.createElement('canvas');
    canvas.width = drawableImg.naturalWidth;
    canvas.height = drawableImg.naturalHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.filter = filterString;
    ctx.drawImage(drawableImg, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL('image/png');
  };

  const handleSave = async () => {
    setIsProcessing(true);
    try {
      const editedDataUrl = await renderToCanvas();
      if (editedDataUrl) {
        onSave(editedDataUrl);
        onClose();
      }
    } catch (err) {
      console.error('Error saving image:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = async () => {
    setIsProcessing(true);
    try {
      const editedDataUrl = await renderToCanvas();
      if (editedDataUrl) {
        const link = document.createElement('a');
        link.download = `edited-${Date.now()}.png`;
        link.href = editedDataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      console.error('Error downloading image:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const applyPreset = (type: string) => {
    let newFilters = { ...initialFilters };
    switch (type) {
      case 'bw':
        newFilters.grayscale = 100;
        newFilters.contrast = 120;
        break;
      case 'warm':
        newFilters.sepia = 30;
        newFilters.brightness = 105;
        newFilters.saturation = 110;
        break;
      case 'cool':
        newFilters.brightness = 110;
        newFilters.contrast = 90;
        newFilters.saturation = 90;
        break;
      case 'vintage':
        newFilters.sepia = 60;
        newFilters.contrast = 90;
        newFilters.brightness = 95;
        newFilters.saturation = 80;
        break;
      case 'cinematic':
        newFilters.contrast = 125;
        newFilters.saturation = 90;
        newFilters.brightness = 95;
        break;
      case 'vivid':
        newFilters.contrast = 110;
        newFilters.saturation = 140;
        break;
      case 'matte':
        newFilters.contrast = 85;
        newFilters.brightness = 115;
        newFilters.saturation = 90;
        break;
    }
    setFilters(newFilters);
    addToHistory(internalSrc, newFilters);
  };

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.1, 5));
  const handleZoomOut = () => {
    setZoom((prev) => {
      const newZoom = Math.max(prev - 0.1, 0.5);
      if (newZoom <= 1 && prev > 1) setPan({ x: 0, y: 0 });
      return newZoom;
    });
  };
  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const toggleCropMode = (active: boolean) => {
    if (active) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setIsCropping(true);
    } else {
      setIsCropping(false);
      setSelection(null);
    }
  };

  // --- Interaction Logic (Crop & Pan) ---

  const startDrag = (x: number, y: number) => {
    if (!imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();

    if (isCropping) {
      const relX = x - rect.left;
      const relY = y - rect.top;
      setDragStart({ x: relX, y: relY });
      setSelection({ x: relX, y: relY, w: 0, h: 0 });
      setIsDragging(true);
    } else if (zoom > 1 || zoom < 1) {
      setDragStart({ x, y });
      setIsDragging(true);
    }
  };

  const moveDrag = (x: number, y: number) => {
    if (!isDragging || !dragStart || !imgRef.current) return;

    if (isCropping) {
      const rect = imgRef.current.getBoundingClientRect();
      const currentX = Math.max(0, Math.min(x - rect.left, rect.width));
      const currentY = Math.max(0, Math.min(y - rect.top, rect.height));

      const w = currentX - dragStart.x;
      const h = currentY - dragStart.y;

      setSelection({
        x: w > 0 ? dragStart.x : currentX,
        y: h > 0 ? dragStart.y : currentY,
        w: Math.abs(w),
        h: Math.abs(h),
      });
    } else {
      const dx = x - dragStart.x;
      const dy = y - dragStart.y;
      setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      setDragStart({ x, y });
    }
  };

  const endDrag = () => {
    setIsDragging(false);
    setDragStart(null);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    startDrag(e.clientX, e.clientY);
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    e.preventDefault();
    moveDrag(e.clientX, e.clientY);
  };
  const handleMouseUp = () => endDrag();

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      startDrag(e.touches[0].clientX, e.touches[0].clientY);
    }
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging) {
      e.preventDefault();
      moveDrag(e.touches[0].clientX, e.touches[0].clientY);
    }
  };
  const handleTouchEnd = () => endDrag();

  const applyCrop = async () => {
    if (!selection || !imgRef.current || selection.w < 10 || selection.h < 10) return;

    const img = imgRef.current;
    const rect = img.getBoundingClientRect();
    const scaleX = img.naturalWidth / rect.width;
    const scaleY = img.naturalHeight / rect.height;

    const cropW = Math.round(selection.w * scaleX);
    const cropH = Math.round(selection.h * scaleY);
    if (cropW < 1 || cropH < 1) return;

    try {
      const dataUrl = await ensureDataUrl(internalSrc);
      const drawableImg = await loadImage(dataUrl);

      const canvas = document.createElement('canvas');
      canvas.width = cropW;
      canvas.height = cropH;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.filter = filterString;
      ctx.drawImage(
        drawableImg,
        Math.round(selection.x * scaleX),
        Math.round(selection.y * scaleY),
        cropW,
        cropH,
        0, 0, cropW, cropH,
      );

      const newUrl = canvas.toDataURL('image/png');
      setInternalSrc(newUrl);
      setFilters(initialFilters);
      setSelection(null);
      setIsCropping(false);
      addToHistory(newUrl, initialFilters);
    } catch (err) {
      console.error('Error cropping image:', err);
    }
  };

  const applySmartCrop = (ratioX: number, ratioY: number) => {
    if (!imgRef.current) return;

    if (!isCropping) {
      toggleCropMode(true);
    }

    const rect = imgRef.current.getBoundingClientRect();
    const imgW = rect.width;
    const imgH = rect.height;

    let cropW = imgW;
    let cropH = (imgW * ratioY) / ratioX;

    if (cropH > imgH) {
      cropH = imgH;
      cropW = (imgH * ratioX) / ratioY;
    }

    const cropX = (imgW - cropW) / 2;
    const cropY = (imgH - cropH) / 2;

    setSelection({ x: cropX, y: cropY, w: cropW, h: cropH });
  };

  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? '' : section);
  };

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.ctrlKey && e.key === 'z') {
      e.preventDefault();
      handleUndo();
    } else if (e.ctrlKey && e.key === 'y') {
      e.preventDefault();
      handleRedo();
    }
  }, [historyIndex, history.length]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const renderPresetButton = (id: string, name: string) => (
    <button
      key={id}
      onClick={() => applyPreset(id)}
      title={`Aplicar preset ${name}`}
      className="h-14 rounded-lg transition-all overflow-hidden relative group hover:bg-black/5"
      style={{ background: 'var(--joi-bg-0)', border: '1px solid var(--joi-border)' }}
    >
      <span className="relative z-10 text-xs font-medium" style={{ color: 'var(--joi-text-2)' }}>{name}</span>
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 lg:p-4 animate-in fade-in duration-200"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}>
      <div className="border-0 lg:border rounded-none lg:rounded-2xl w-full max-w-6xl h-full lg:h-[90vh] flex flex-col overflow-hidden shadow-2xl"
        style={{ background: 'var(--joi-bg-0)', borderColor: 'var(--joi-border)' }}>
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-4 lg:px-6 shrink-0"
          style={{ borderBottom: '1px solid var(--joi-border)', background: 'var(--joi-bg-1)' }}>
          <div className="flex items-center gap-2 lg:gap-4">
            <h3 className="font-medium flex items-center gap-2" style={{ color: 'var(--joi-text-1)' }}>
              <div className="p-2 rounded-lg hidden sm:block" style={{ background: 'var(--joi-bg-3)' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--joi-text-2)' }}>
                  <path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
              </div>
              <span className="hidden sm:inline">Editor de Imagen</span>
            </h3>
            <div className="flex gap-1">
              <button
                onClick={handleUndo}
                disabled={historyIndex <= 0}
                title="Deshacer (Ctrl+Z)"
                className="p-2 rounded-lg transition-colors hover:bg-black/5"
                style={{ color: historyIndex <= 0 ? 'var(--joi-text-3)' : 'var(--joi-text-2)', opacity: historyIndex <= 0 ? 0.4 : 1 }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6" /><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" /></svg>
              </button>
              <button
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1}
                title="Rehacer (Ctrl+Y)"
                className="p-2 rounded-lg transition-colors hover:bg-black/5"
                style={{ color: historyIndex >= history.length - 1 ? 'var(--joi-text-3)' : 'var(--joi-text-2)', opacity: historyIndex >= history.length - 1 ? 0.4 : 1 }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 7v6h-6" /><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7" /></svg>
              </button>
            </div>
          </div>

          <div className="flex gap-2 lg:gap-3">
            <button
              onClick={handleRestoreOriginal}
              title="Restaurar Original"
              className="px-3 py-2 text-xs lg:text-sm rounded-lg transition-colors hover:bg-red-50"
              style={{ color: '#e05050' }}
            >
              Restaurar
            </button>
            <div className="w-px h-6 my-auto hidden sm:block" style={{ background: 'var(--joi-border)' }} />
            <button
              onClick={handleDownload}
              disabled={isProcessing || isCropping}
              title="Descargar como PNG"
              className="p-2 rounded-lg transition-colors hover:bg-black/5"
              style={{ color: isCropping ? 'var(--joi-text-3)' : 'var(--joi-text-2)', opacity: isCropping ? 0.3 : 1 }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
            </button>
            <button onClick={onClose} className="px-3 py-2 text-xs lg:text-sm transition-colors hover:bg-black/5 rounded-lg" style={{ color: 'var(--joi-text-3)' }} title="Cerrar sin guardar">
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={isProcessing || isCropping}
              title="Guardar cambios"
              className={`px-4 py-2 text-xs lg:text-sm font-medium rounded-lg transition-all flex items-center gap-2 ${isCropping ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80'}`}
              style={{ background: 'var(--joi-pink)', color: 'var(--joi-bg-0)' }}
            >
              {isProcessing && <div className="animate-spin h-3 w-3 border-2 rounded-full" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} />}
              Guardar
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Preview Area */}
          <div
            className="flex-1 p-4 lg:p-8 flex items-center justify-center relative select-none overflow-hidden h-[45vh] lg:h-auto"
            style={{
              borderBottom: '1px solid var(--joi-border)',
              backgroundImage: `
                linear-gradient(45deg, #E8E8EA 25%, transparent 25%),
                linear-gradient(-45deg, #E8E8EA 25%, transparent 25%),
                linear-gradient(45deg, transparent 75%, #E8E8EA 75%),
                linear-gradient(-45deg, transparent 75%, #E8E8EA 75%)
              `,
              backgroundSize: '20px 20px',
              backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
              backgroundColor: '#F3F4F6',
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onWheel={(e) => {
              e.stopPropagation();
              if (e.deltaY < 0) setZoom((prev) => Math.min(prev + 0.1, 5));
              else setZoom((prev) => {
                const newZoom = Math.max(prev - 0.1, 0.5);
                if (newZoom <= 1 && zoom > 1) setPan({ x: 0, y: 0 });
                return newZoom;
              });
            }}
          >
            {/* Image Container */}
            <div
              className="relative transition-transform duration-75 ease-out origin-center will-change-transform"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                cursor: isCropping ? 'crosshair' : (zoom > 1 || zoom < 1) ? (isDragging ? 'grabbing' : 'grab') : 'default',
              }}
            >
              <img
                ref={imgRef}
                src={internalSrc}
                alt="Editing"
                style={{ filter: filterString }}
                className="max-w-none shadow-2xl"
                draggable={false}
              />

              <style>{`
                img[alt="Editing"] {
                  max-height: 80vh;
                  max-width: 100%;
                  object-fit: contain;
                }
                @media (max-width: 1024px) {
                  img[alt="Editing"] {
                    max-height: 40vh;
                  }
                }
              `}</style>

              {/* Crop Overlay */}
              {isCropping && (
                <div className="absolute inset-0 cursor-crosshair">
                  {selection && (
                    <div
                      className="absolute border-2 border-white box-content shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] z-20"
                      style={{
                        left: selection.x,
                        top: selection.y,
                        width: selection.w,
                        height: selection.h,
                      }}
                    >
                      <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-white" />
                      <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-white" />
                      <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-white" />
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-white" />
                      {/* Grid lines */}
                      <div className="absolute top-1/3 left-0 right-0 h-px bg-black/30" />
                      <div className="absolute top-2/3 left-0 right-0 h-px bg-black/30" />
                      <div className="absolute left-1/3 top-0 bottom-0 w-px bg-black/30" />
                      <div className="absolute left-2/3 top-0 bottom-0 w-px bg-black/30" />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Zoom Controls */}
            <div
              className="absolute bottom-4 right-4 lg:bottom-8 lg:right-8 flex flex-col gap-2 rounded-lg shadow-xl p-1 z-40"
              style={{ background: 'var(--joi-bg-1)', border: '1px solid var(--joi-border)' }}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setZoom((prev) => Math.min(prev + 0.5, 5))}
                className="p-2 hover:bg-black/5 rounded transition-colors" style={{ color: 'var(--joi-text-3)' }}
                title="Acercar (+)"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" /></svg>
              </button>
              <div className="text-[10px] text-center font-mono py-1" style={{ color: 'var(--joi-text-3)' }}>{Math.round(zoom * 100)}%</div>
              <button
                onClick={() =>
                  setZoom((prev) => {
                    const newZoom = Math.max(prev - 0.5, 0.5);
                    if (newZoom <= 1 && zoom > 1) setPan({ x: 0, y: 0 });
                    return newZoom;
                  })
                }
                className="p-2 hover:bg-black/5 rounded transition-colors" style={{ color: 'var(--joi-text-3)' }}
                title="Alejar (-)"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="8" y1="11" x2="14" y2="11" /></svg>
              </button>
              <button
                onClick={handleResetZoom}
                className="p-2 hover:bg-black/5 rounded transition-colors"
                style={{ color: 'var(--joi-text-3)', borderTop: '1px solid var(--joi-border)' }}
                title="Restablecer Zoom"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
              </button>
            </div>

            {/* Crop Action Bar */}
            {isCropping && (
              <div
                className="absolute bottom-8 left-1/2 -translate-x-1/2 rounded-full px-4 py-2 flex items-center gap-3 shadow-xl z-30 animate-in slide-in-from-bottom-4 w-max max-w-[90%]"
                style={{ background: 'var(--joi-bg-1)', border: '1px solid var(--joi-border)' }}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
              >
                <span className="text-xs font-medium px-2 whitespace-nowrap" style={{ color: 'var(--joi-text-2)' }}>Ajustar Recorte</span>
                <div className="w-px h-4" style={{ background: 'var(--joi-border)' }} />
                <button
                  onClick={() => toggleCropMode(false)}
                  className="p-1 hover:bg-black/5 rounded-full transition-colors"
                  style={{ color: 'var(--joi-text-3)' }}
                  title="Cancelar recorte"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
                <button
                  onClick={applyCrop}
                  className="p-1 hover:bg-black/5 rounded-full text-green-600 hover:text-green-700 transition-colors"
                  title="Aplicar recorte"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                </button>
              </div>
            )}
          </div>

          {/* Controls Sidebar */}
          <div className="w-full lg:w-80 flex flex-col shrink-0 h-[55vh] lg:h-auto"
            style={{ borderTop: '1px solid var(--joi-border)', borderLeft: '1px solid var(--joi-border)', background: 'var(--joi-bg-1)' }}>
            <div className="p-5 flex-1 overflow-y-auto custom-scrollbar space-y-6">
              {/* External actions (AI Editor, Try-On, etc.) injected by parent */}
              {actions && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--joi-text-3)' }}>Enviar a</h4>
                  <div className="flex flex-col gap-1.5">{actions}</div>
                </div>
              )}
              {/* Tools Section */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--joi-text-3)' }}>Herramientas</h4>

                {!isCropping ? (
                  <button
                    onClick={() => toggleCropMode(true)}
                    title="Activar herramienta de recorte (reinicia el zoom)"
                    className="w-full flex items-center justify-center p-4 rounded-xl transition-all gap-2 hover:bg-black/5"
                    style={{ border: '1px solid var(--joi-border)', color: 'var(--joi-text-2)' }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2v14a2 2 0 0 0 2 2h14" /><path d="M18 22V8a2 2 0 0 0-2-2H2" /></svg>
                    <span className="text-sm font-medium">Recortar Imagen</span>
                  </button>
                ) : (
                  <div className="space-y-2">
                    <div className="text-xs font-medium mb-2" style={{ color: 'var(--joi-text-2)' }}>Recorte Inteligente</div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => applySmartCrop(1, 1)}
                        className="px-3 py-2 rounded text-xs transition-colors hover:bg-black/5"
                        style={{ background: 'var(--joi-bg-3)', border: '1px solid var(--joi-border)', color: 'var(--joi-text-2)' }}
                      >
                        Cuadrado (1:1)
                      </button>
                      <button
                        onClick={() => applySmartCrop(4, 5)}
                        className="px-3 py-2 rounded text-xs transition-colors hover:bg-black/5"
                        style={{ background: 'var(--joi-bg-3)', border: '1px solid var(--joi-border)', color: 'var(--joi-text-2)' }}
                      >
                        Retrato (4:5)
                      </button>
                      <button
                        onClick={() => applySmartCrop(16, 9)}
                        className="px-3 py-2 rounded text-xs transition-colors hover:bg-black/5"
                        style={{ background: 'var(--joi-bg-3)', border: '1px solid var(--joi-border)', color: 'var(--joi-text-2)' }}
                      >
                        Paisaje (16:9)
                      </button>
                      <button
                        onClick={() => applySmartCrop(9, 16)}
                        className="px-3 py-2 rounded text-xs transition-colors hover:bg-black/5"
                        style={{ background: 'var(--joi-bg-3)', border: '1px solid var(--joi-border)', color: 'var(--joi-text-2)' }}
                      >
                        Historia (9:16)
                      </button>
                    </div>
                    <button
                      onClick={() => toggleCropMode(false)}
                      className="w-full mt-2 py-2 text-xs underline hover:opacity-70 transition-opacity"
                      style={{ color: 'var(--joi-text-3)' }}
                    >
                      Cancelar Recorte
                    </button>
                  </div>
                )}
              </div>

              {/* Presets */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--joi-text-3)' }}>Presets</h4>
                <div className="grid grid-cols-2 gap-2">
                  {renderPresetButton('bw', 'B/N')}
                  {renderPresetButton('warm', 'Cálido')}
                  {renderPresetButton('cool', 'Frío')}
                  {renderPresetButton('vintage', 'Vintage')}
                  {renderPresetButton('cinematic', 'Cinemático')}
                  {renderPresetButton('vivid', 'Vívido')}
                  {renderPresetButton('matte', 'Mate')}
                </div>
              </div>

              {/* Adjustments Groups */}
              <div className="space-y-4">
                {/* Light Section */}
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--joi-border)', background: 'var(--joi-bg-3)' }}>
                  <button
                    onClick={() => toggleSection('light')}
                    className="w-full flex items-center justify-between p-3 text-xs font-medium transition-colors hover:bg-black/5"
                    style={{ color: 'var(--joi-text-2)' }}
                  >
                    <span>Luz y Exposición</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${openSection === 'light' ? 'rotate-180' : ''}`}><path d="m6 9 6 6 6-6" /></svg>
                  </button>

                  {openSection === 'light' && (
                    <div className="p-4 pt-0 space-y-4 animate-in slide-in-from-top-2 duration-200">
                      <div className="space-y-2 pt-2">
                        <div className="flex justify-between text-xs">
                          <label style={{ color: 'var(--joi-text-3)' }}>Brillo</label>
                          <span className="tabular-nums" style={{ color: 'var(--joi-text-3)' }}>{filters.brightness}%</span>
                        </div>
                        <input
                          type="range" min="0" max="200"
                          value={filters.brightness}
                          onChange={(e) => updateFilter('brightness', Number(e.target.value))}
                          onMouseUp={commitFilterChange}
                          onTouchEnd={commitFilterChange}
                          className="w-full h-1 rounded-lg appearance-none cursor-pointer accent-black"
                          style={{ background: 'var(--joi-border)' }}
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <label style={{ color: 'var(--joi-text-3)' }}>Contraste</label>
                          <span className="tabular-nums" style={{ color: 'var(--joi-text-3)' }}>{filters.contrast}%</span>
                        </div>
                        <input
                          type="range" min="0" max="200"
                          value={filters.contrast}
                          onChange={(e) => updateFilter('contrast', Number(e.target.value))}
                          onMouseUp={commitFilterChange}
                          onTouchEnd={commitFilterChange}
                          className="w-full h-1 rounded-lg appearance-none cursor-pointer accent-black"
                          style={{ background: 'var(--joi-border)' }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Color Section */}
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--joi-border)', background: 'var(--joi-bg-3)' }}>
                  <button
                    onClick={() => toggleSection('color')}
                    className="w-full flex items-center justify-between p-3 text-xs font-medium transition-colors hover:bg-black/5"
                    style={{ color: 'var(--joi-text-2)' }}
                  >
                    <span>Color y Saturación</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${openSection === 'color' ? 'rotate-180' : ''}`}><path d="m6 9 6 6 6-6" /></svg>
                  </button>

                  {openSection === 'color' && (
                    <div className="p-4 pt-0 space-y-4 animate-in slide-in-from-top-2 duration-200">
                      <div className="space-y-2 pt-2">
                        <div className="flex justify-between text-xs">
                          <label style={{ color: 'var(--joi-text-3)' }}>Saturación</label>
                          <span className="tabular-nums" style={{ color: 'var(--joi-text-3)' }}>{filters.saturation}%</span>
                        </div>
                        <input
                          type="range" min="0" max="200"
                          value={filters.saturation}
                          onChange={(e) => updateFilter('saturation', Number(e.target.value))}
                          onMouseUp={commitFilterChange}
                          onTouchEnd={commitFilterChange}
                          title="Ajustar intensidad del color"
                          className="w-full h-1 rounded-lg appearance-none cursor-pointer accent-black"
                          style={{ background: 'var(--joi-border)' }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Effects Section */}
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--joi-border)', background: 'var(--joi-bg-3)' }}>
                  <button
                    onClick={() => toggleSection('effects')}
                    className="w-full flex items-center justify-between p-3 text-xs font-medium transition-colors hover:bg-black/5"
                    style={{ color: 'var(--joi-text-2)' }}
                  >
                    <span>Efectos de Filtro</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${openSection === 'effects' ? 'rotate-180' : ''}`}><path d="m6 9 6 6 6-6" /></svg>
                  </button>

                  {openSection === 'effects' && (
                    <div className="p-4 pt-0 space-y-4 animate-in slide-in-from-top-2 duration-200">
                      <div className="space-y-2 pt-2">
                        <div className="flex justify-between text-xs">
                          <label style={{ color: 'var(--joi-text-3)' }}>Sepia</label>
                          <span className="tabular-nums" style={{ color: 'var(--joi-text-3)' }}>{filters.sepia}%</span>
                        </div>
                        <input
                          type="range" min="0" max="100"
                          value={filters.sepia}
                          onChange={(e) => updateFilter('sepia', Number(e.target.value))}
                          onMouseUp={commitFilterChange}
                          onTouchEnd={commitFilterChange}
                          title="Agregar tono sepia"
                          className="w-full h-1 rounded-lg appearance-none cursor-pointer accent-black"
                          style={{ background: 'var(--joi-border)' }}
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <label style={{ color: 'var(--joi-text-3)' }}>Escala de grises</label>
                          <span className="tabular-nums" style={{ color: 'var(--joi-text-3)' }}>{filters.grayscale}%</span>
                        </div>
                        <input
                          type="range" min="0" max="100"
                          value={filters.grayscale}
                          onChange={(e) => updateFilter('grayscale', Number(e.target.value))}
                          onMouseUp={commitFilterChange}
                          onTouchEnd={commitFilterChange}
                          title="Convertir a escala de grises"
                          className="w-full h-1 rounded-lg appearance-none cursor-pointer accent-black"
                          style={{ background: 'var(--joi-border)' }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageEditor;
