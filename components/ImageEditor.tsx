import React, { useState, useRef, useEffect } from 'react';

interface ImageEditorProps {
  src: string;
  onSave: (blob: Blob) => void;
  onClose: () => void;
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

const ImageEditor: React.FC<ImageEditorProps> = ({ src, onSave, onClose }) => {
  // Initial State
  const initialFilters: FilterState = {
    brightness: 100,
    contrast: 100,
    saturation: 100,
    sepia: 0,
    grayscale: 0,
  };

  // State
  const [internalSrc, setInternalSrc] = useState(src);
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  
  // History
  const [history, setHistory] = useState<HistoryItem[]>([{ src, filters: initialFilters }]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // UI States
  const imgRef = useRef<HTMLImageElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [openSection, setOpenSection] = useState<string>('light'); // light, color, effects

  // Zoom & Pan States
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  // Crop States
  const [isCropping, setIsCropping] = useState(false);
  const [selection, setSelection] = useState<{x: number, y: number, w: number, h: number} | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Mouse/Touch tracking for interactions
  const [dragStart, setDragStart] = useState<{x: number, y: number} | null>(null);

  // Apply filters to CSS string for preview
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
      // Reset view
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
    if (confirm("¿Estás seguro? Esto descartará todos los cambios y recortes.")) {
        setInternalSrc(src);
        setFilters(initialFilters);
        addToHistory(src, initialFilters);
        setZoom(1);
        setPan({ x: 0, y: 0 });
    }
  };

  /**
   * Si la URL no es ya un data URL, la descarga y la convierte.
   * Esto evita el error "tainted canvas" cuando la imagen viene de un servidor externo.
   */
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

  /**
   * Crea un HTMLImageElement a partir de un data URL y espera a que cargue.
   */
  const loadImage = (dataUrl: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = dataUrl;
    });

  const updateFilter = (key: keyof FilterState, value: number) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Commit filter change to history only when slider is released
  const commitFilterChange = () => {
      addToHistory(internalSrc, filters);
  };

  const handleSave = async () => {
    setIsProcessing(true);
    const img = imgRef.current;
    if (!img) { setIsProcessing(false); return; }

    try {
      // Convertir a data URL primero para evitar "tainted canvas" con URLs externas
      const dataUrl = await ensureDataUrl(internalSrc);
      const drawableImg = await loadImage(dataUrl);

      const canvas = document.createElement('canvas');
      canvas.width = drawableImg.naturalWidth;
      canvas.height = drawableImg.naturalHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) { setIsProcessing(false); return; }

      ctx.filter = filterString;
      ctx.drawImage(drawableImg, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((blob) => {
        if (blob) {
          onSave(blob);
          onClose();
        }
        setIsProcessing(false);
      }, 'image/png');
    } catch (err) {
      console.error('Error al guardar imagen:', err);
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

  // --- Zoom Logic ---
  
  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 5)); // Smoother increments
  const handleZoomOut = () => {
    setZoom(prev => {
        const newZoom = Math.max(prev - 0.1, 0.5); // Allow zooming out a bit more
        if (newZoom <= 1 && prev > 1) setPan({ x: 0, y: 0 }); // Auto-center if zooming back to fit
        return newZoom;
    });
  };
  const handleResetZoom = () => {
      setZoom(1);
      setPan({ x: 0, y: 0 });
  };

  const toggleCropMode = (active: boolean) => {
      if (active) {
          // Reset zoom when entering crop mode to simplify coordinate math
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
          setDragStart({ x: relX, y: relY }); // Relative to image
          setSelection({ x: relX, y: relY, w: 0, h: 0 });
          setIsDragging(true);
      } else if (zoom > 1 || zoom < 1) { 
          // Start Panning
          setDragStart({ x: x, y: y }); // Screen coords for panning delta
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
              h: Math.abs(h)
          });
      } else {
          const dx = x - dragStart.x;
          const dy = y - dragStart.y;
          
          setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
          setDragStart({ x: x, y: y }); // Reset start to current for continuous delta
      }
  };

  const endDrag = () => {
      setIsDragging(false);
      setDragStart(null);
  };

  // Mouse Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
      e.preventDefault();
      startDrag(e.clientX, e.clientY);
  };
  const handleMouseMove = (e: React.MouseEvent) => {
      e.preventDefault();
      moveDrag(e.clientX, e.clientY);
  };
  const handleMouseUp = () => endDrag();

  // Touch Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
      if (e.touches.length === 1) {
        // e.preventDefault(); // Sometimes prevents scroll, use carefully
        startDrag(e.touches[0].clientX, e.touches[0].clientY);
      }
  };
  const handleTouchMove = (e: React.TouchEvent) => {
      if (e.touches.length === 1 && isDragging) {
          e.preventDefault(); // Prevent scrolling while dragging
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
        // Convertir a data URL para evitar "tainted canvas"
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
          0, 0, cropW, cropH
        );

        const newUrl = canvas.toDataURL('image/png');
        setInternalSrc(newUrl);
        setFilters(initialFilters);
        setSelection(null);
        setIsCropping(false);
        addToHistory(newUrl, initialFilters);
      } catch (err) {
        console.error('Error al recortar imagen:', err);
      }
  };

  // --- Smart Crop Presets ---
  
  const applySmartCrop = (ratioX: number, ratioY: number) => {
      if (!imgRef.current) return;
      
      // Ensure we are in crop mode
      if (!isCropping) {
          toggleCropMode(true);
      }
      
      // We need to wait for render if we just switched mode, but for now assuming synchronous layout update enough or user clicks button while active
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
      
      setSelection({
          x: cropX,
          y: cropY,
          w: cropW,
          h: cropH
      });
  };

  const toggleSection = (section: string) => {
      setOpenSection(openSection === section ? '' : section);
  };

  const renderPresetButton = (id: string, name: string, bgClass: string, overlayClass: string) => (
      <button 
        onClick={() => applyPreset(id)} 
        title={`Aplicar filtro ${name}`} 
        className={`h-16 rounded-lg ${bgClass} border border-zinc-700 hover:border-zinc-500 transition-all overflow-hidden relative group`}
      >
          <div className={`absolute inset-0 ${overlayClass}`}></div>
          <span className="relative z-10 text-xs text-white/90 font-medium drop-shadow-md">{name}</span>
      </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-0 lg:p-4 animate-in fade-in duration-200">
       <div className="bg-zinc-900 border-0 lg:border border-zinc-800 rounded-none lg:rounded-2xl w-full max-w-6xl h-full lg:h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            
            {/* Header */}
            <div className="h-16 border-b border-zinc-800 flex items-center justify-between px-4 lg:px-6 bg-zinc-900 shrink-0">
                <div className="flex items-center gap-2 lg:gap-4">
                    <h3 className="text-white font-medium flex items-center gap-2">
                        <div className="p-2 bg-purple-500/20 rounded-lg hidden sm:block">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                        </div>
                        <span className="hidden sm:inline">Editor</span>
                    </h3>
                    <div className="flex gap-1">
                        <button 
                            onClick={handleUndo} 
                            disabled={historyIndex <= 0}
                            title="Deshacer (Ctrl+Z)"
                            className={`p-2 rounded-lg hover:bg-zinc-800 transition-colors ${historyIndex <= 0 ? 'text-zinc-600' : 'text-zinc-300'}`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>
                        </button>
                        <button 
                            onClick={handleRedo} 
                            disabled={historyIndex >= history.length - 1}
                            title="Rehacer (Ctrl+Y)"
                            className={`p-2 rounded-lg hover:bg-zinc-800 transition-colors ${historyIndex >= history.length - 1 ? 'text-zinc-600' : 'text-zinc-300'}`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/></svg>
                        </button>
                    </div>
                </div>

                <div className="flex gap-2 lg:gap-3">
                     <button 
                        onClick={handleRestoreOriginal}
                        title="Descartar cambios"
                        className="px-3 py-2 text-xs lg:text-sm text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                        Restaurar
                    </button>
                    <div className="w-px h-6 bg-zinc-800 my-auto hidden sm:block"></div>
                    <button onClick={onClose} className="px-3 py-2 text-xs lg:text-sm text-zinc-400 hover:text-white transition-colors" title="Cerrar sin guardar">
                        Cancelar
                    </button>
                    <button 
                        onClick={handleSave} 
                        disabled={isProcessing || isCropping}
                        title="Guardar copia"
                        className={`px-4 py-2 text-xs lg:text-sm bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-lg transition-colors flex items-center gap-2 ${isCropping ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {isProcessing && <div className="animate-spin h-3 w-3 border-2 border-white/30 border-t-white rounded-full"></div>}
                        Guardar
                    </button>
                </div>
            </div>

            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                {/* Preview Area */}
                <div 
                    className="flex-1 bg-zinc-950 p-4 lg:p-8 flex items-center justify-center relative select-none overflow-hidden h-[45vh] lg:h-auto border-b lg:border-b-0 border-zinc-800"
                    style={{ 
                        backgroundImage: `
                            linear-gradient(45deg, #18181b 25%, transparent 25%), 
                            linear-gradient(-45deg, #18181b 25%, transparent 25%), 
                            linear-gradient(45deg, transparent 75%, #18181b 75%), 
                            linear-gradient(-45deg, transparent 75%, #18181b 75%)
                        `,
                        backgroundSize: '20px 20px',
                        backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
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
                        // Smooth scroll zoom
                        if (e.deltaY < 0) setZoom(prev => Math.min(prev + 0.1, 5));
                        else setZoom(prev => {
                            const newZoom = Math.max(prev - 0.1, 0.5);
                            if (newZoom <= 1 && prev > 1) setPan({ x: 0, y: 0 });
                            return newZoom;
                        });
                    }}
                >
                    {/* Image Container - Strictly contained within the flexible parent */}
                    <div 
                        className="relative transition-transform duration-75 ease-out origin-center will-change-transform"
                        style={{
                            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                            cursor: isCropping ? 'crosshair' : (zoom > 1 || zoom < 1) ? (isDragging ? 'grabbing' : 'grab') : 'default'
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
                                            height: selection.h
                                        }}
                                    >
                                        <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-white"></div>
                                        <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-white"></div>
                                        <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-white"></div>
                                        <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-white"></div>
                                        
                                        {/* Grid lines */}
                                        <div className="absolute top-1/3 left-0 right-0 h-px bg-white/30"></div>
                                        <div className="absolute top-2/3 left-0 right-0 h-px bg-white/30"></div>
                                        <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/30"></div>
                                        <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/30"></div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    
                    {/* Zoom Controls Toolbar */}
                    <div className="absolute bottom-4 right-4 lg:bottom-8 lg:right-8 flex flex-col gap-2 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl p-1 z-40" onMouseDown={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()}>
                         <button 
                            onClick={() => setZoom(prev => Math.min(prev + 0.5, 5))}
                            className="p-2 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded transition-colors"
                            title="Zoom In (+)"
                         >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
                         </button>
                         <div className="text-[10px] text-center text-zinc-500 font-mono py-1">{Math.round(zoom * 100)}%</div>
                         <button 
                            onClick={() => setZoom(prev => {
                                const newZoom = Math.max(prev - 0.5, 0.5);
                                if (newZoom <= 1 && zoom > 1) setPan({ x: 0, y: 0 });
                                return newZoom;
                            })}
                            className="p-2 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded transition-colors"
                            title="Zoom Out (-)"
                         >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
                         </button>
                         <button 
                            onClick={handleResetZoom}
                            className="p-2 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded transition-colors border-t border-zinc-800"
                            title="Reset Zoom"
                         >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                         </button>
                    </div>

                    {/* Crop Action Bar */}
                    {isCropping && (
                        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-zinc-900 border border-zinc-700 rounded-full px-4 py-2 flex items-center gap-3 shadow-xl z-30 animate-in slide-in-from-bottom-4 w-max max-w-[90%]" onMouseDown={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()}>
                            <span className="text-xs text-zinc-300 font-medium px-2 whitespace-nowrap">Ajustar Recorte</span>
                            <div className="w-px h-4 bg-zinc-700"></div>
                            <button 
                                onClick={() => toggleCropMode(false)}
                                className="p-1 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors"
                                title="Cancelar recorte"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                            <button 
                                onClick={applyCrop}
                                className="p-1 hover:bg-zinc-800 rounded-full text-green-400 hover:text-green-300 transition-colors"
                                title="Confirmar recorte"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            </button>
                        </div>
                    )}
                </div>

                {/* Controls Sidebar */}
                <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-zinc-800 bg-zinc-900 flex flex-col shrink-0 h-[55vh] lg:h-auto">
                    <div className="p-5 flex-1 overflow-y-auto custom-scrollbar space-y-6">
                        {/* Tools Section */}
                        <div>
                            <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">Herramientas</h4>
                            
                            {!isCropping ? (
                                <button 
                                    onClick={() => toggleCropMode(true)}
                                    title="Activar herramienta de recorte (Reinicia el zoom)"
                                    className="w-full flex items-center justify-center p-4 rounded-xl border border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-800 hover:text-white transition-all gap-2"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2v14a2 2 0 0 0 2 2h14"/><path d="M18 22V8a2 2 0 0 0-2-2H2"/></svg>
                                    <span className="text-sm font-medium">Recortar Imagen</span>
                                </button>
                            ) : (
                                <div className="space-y-2">
                                    <div className="text-xs text-purple-400 font-medium mb-2">Recorte Inteligente</div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button 
                                            onClick={() => applySmartCrop(1, 1)}
                                            className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded text-xs text-zinc-300 border border-zinc-700"
                                        >
                                            Cuadrado (1:1)
                                        </button>
                                        <button 
                                            onClick={() => applySmartCrop(4, 5)}
                                            className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded text-xs text-zinc-300 border border-zinc-700"
                                        >
                                            Retrato (4:5)
                                        </button>
                                        <button 
                                            onClick={() => applySmartCrop(16, 9)}
                                            className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded text-xs text-zinc-300 border border-zinc-700"
                                        >
                                            Paisaje (16:9)
                                        </button>
                                        <button 
                                            onClick={() => applySmartCrop(9, 16)}
                                            className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded text-xs text-zinc-300 border border-zinc-700"
                                        >
                                            Historia (9:16)
                                        </button>
                                    </div>
                                    <button 
                                        onClick={() => toggleCropMode(false)}
                                        className="w-full mt-2 py-2 text-xs text-zinc-500 hover:text-zinc-300 underline"
                                    >
                                        Cancelar Recorte
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Presets */}
                        <div>
                             <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">Filtros Rápidos</h4>
                             <div className="grid grid-cols-2 gap-2">
                                 {renderPresetButton('bw', 'B&W', 'bg-zinc-800', 'bg-gradient-to-tr from-black to-transparent opacity-50')}
                                 {renderPresetButton('warm', 'Cálido', 'bg-orange-900/30', 'bg-orange-500/10')}
                                 {renderPresetButton('cool', 'Frío', 'bg-blue-900/30', 'bg-blue-500/10')}
                                 {renderPresetButton('vintage', 'Vintage', 'bg-amber-900/30', 'bg-amber-600/10')}
                                 {renderPresetButton('cinematic', 'Cine', 'bg-teal-900/30', 'bg-teal-500/10')}
                                 {renderPresetButton('vivid', 'Vívido', 'bg-pink-900/30', 'bg-pink-500/10')}
                                 {renderPresetButton('matte', 'Mate', 'bg-stone-800', 'bg-stone-500/10')}
                             </div>
                        </div>

                        {/* Adjustments Groups */}
                        <div className="space-y-4">
                            {/* Light Section */}
                            <div className="border border-zinc-800 rounded-xl bg-zinc-800/20 overflow-hidden">
                                <button 
                                    onClick={() => toggleSection('light')}
                                    className="w-full flex items-center justify-between p-3 text-xs font-medium text-zinc-300 hover:bg-zinc-800 transition-colors"
                                >
                                    <span>Luz y Exposición</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${openSection === 'light' ? 'rotate-180' : ''}`}><path d="m6 9 6 6 6-6"/></svg>
                                </button>
                                
                                {openSection === 'light' && (
                                    <div className="p-4 pt-0 space-y-4 animate-in slide-in-from-top-2 duration-200">
                                        <div className="space-y-2 pt-2">
                                            <div className="flex justify-between text-xs">
                                                <label className="text-zinc-400">Brillo</label>
                                                <span className="text-zinc-500 tabular-nums">{filters.brightness}%</span>
                                            </div>
                                            <input 
                                                type="range" min="0" max="200" 
                                                value={filters.brightness} 
                                                onChange={(e) => updateFilter('brightness', Number(e.target.value))}
                                                onMouseUp={commitFilterChange}
                                                onTouchEnd={commitFilterChange}
                                                className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-xs">
                                                <label className="text-zinc-400">Contraste</label>
                                                <span className="text-zinc-500 tabular-nums">{filters.contrast}%</span>
                                            </div>
                                            <input 
                                                type="range" min="0" max="200" 
                                                value={filters.contrast} 
                                                onChange={(e) => updateFilter('contrast', Number(e.target.value))}
                                                onMouseUp={commitFilterChange}
                                                onTouchEnd={commitFilterChange}
                                                className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Color Section */}
                            <div className="border border-zinc-800 rounded-xl bg-zinc-800/20 overflow-hidden">
                                <button 
                                    onClick={() => toggleSection('color')}
                                    className="w-full flex items-center justify-between p-3 text-xs font-medium text-zinc-300 hover:bg-zinc-800 transition-colors"
                                >
                                    <span>Color y Saturación</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${openSection === 'color' ? 'rotate-180' : ''}`}><path d="m6 9 6 6 6-6"/></svg>
                                </button>
                                
                                {openSection === 'color' && (
                                    <div className="p-4 pt-0 space-y-4 animate-in slide-in-from-top-2 duration-200">
                                        <div className="space-y-2 pt-2">
                                            <div className="flex justify-between text-xs">
                                                <label className="text-zinc-400">Saturación</label>
                                                <span className="text-zinc-500 tabular-nums">{filters.saturation}%</span>
                                            </div>
                                            <input 
                                                type="range" min="0" max="200" 
                                                value={filters.saturation} 
                                                onChange={(e) => updateFilter('saturation', Number(e.target.value))}
                                                onMouseUp={commitFilterChange}
                                                onTouchEnd={commitFilterChange}
                                                title="Ajustar la intensidad de los colores"
                                                className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Effects Section */}
                            <div className="border border-zinc-800 rounded-xl bg-zinc-800/20 overflow-hidden">
                                <button 
                                    onClick={() => toggleSection('effects')}
                                    className="w-full flex items-center justify-between p-3 text-xs font-medium text-zinc-300 hover:bg-zinc-800 transition-colors"
                                >
                                    <span>Efectos de Filtro</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${openSection === 'effects' ? 'rotate-180' : ''}`}><path d="m6 9 6 6 6-6"/></svg>
                                </button>
                                
                                {openSection === 'effects' && (
                                    <div className="p-4 pt-0 space-y-4 animate-in slide-in-from-top-2 duration-200">
                                        <div className="space-y-2 pt-2">
                                            <div className="flex justify-between text-xs">
                                                <label className="text-zinc-400">Sepia</label>
                                                <span className="text-zinc-500 tabular-nums">{filters.sepia}%</span>
                                            </div>
                                            <input 
                                                type="range" min="0" max="100" 
                                                value={filters.sepia} 
                                                onChange={(e) => updateFilter('sepia', Number(e.target.value))}
                                                onMouseUp={commitFilterChange}
                                                onTouchEnd={commitFilterChange}
                                                title="Añadir tono sepia (antiguo)"
                                                className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-xs">
                                                <label className="text-zinc-400">Blanco y Negro</label>
                                                <span className="text-zinc-500 tabular-nums">{filters.grayscale}%</span>
                                            </div>
                                            <input 
                                                type="range" min="0" max="100" 
                                                value={filters.grayscale} 
                                                onChange={(e) => updateFilter('grayscale', Number(e.target.value))}
                                                onMouseUp={commitFilterChange}
                                                onTouchEnd={commitFilterChange}
                                                title="Convertir a escala de grises"
                                                className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
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