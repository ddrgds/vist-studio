import React, { useState, useRef, useCallback, useEffect } from 'react';
import type { GalleryItem } from '../stores/galleryStore';

interface CompareSliderModalProps {
  itemA: GalleryItem;
  itemB: GalleryItem;
  onClose: () => void;
}

const CompareSliderModal: React.FC<CompareSliderModalProps> = ({ itemA, itemB, onClose }) => {
  const [sliderPos, setSliderPos] = useState(50); // 0-100%
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'ArrowLeft') setSliderPos(p => Math.max(0, p - 2));
    if (e.key === 'ArrowRight') setSliderPos(p => Math.min(100, p + 2));
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const updateSlider = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pos = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
    setSliderPos(pos);
  }, []);

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    updateSlider(e.clientX);
  }, [isDragging, updateSlider]);

  const onTouchMove = useCallback((e: TouchEvent) => {
    updateSlider(e.touches[0].clientX);
  }, [updateSlider]);

  useEffect(() => {
    if (isDragging) {
      const handleUp = () => setIsDragging(false);
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', handleUp);
      return () => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', handleUp);
      };
    }
  }, [isDragging, onMouseMove]);

  const labelA = itemA.tags?.includes('uploaded') ? 'Foto A' : `${itemA.type === 'edit' ? 'Editada' : itemA.type === 'video' ? 'Video' : 'Creada'} A`;
  const labelB = itemB.tags?.includes('uploaded') ? 'Foto B' : `${itemB.type === 'edit' ? 'Editada' : itemB.type === 'video' ? 'Video' : 'Creada'} B`;

  return (
    <div className="fixed inset-0 z-[90] flex flex-col" style={{ background: '#08070C' }}>
      {/* Header */}
      <div
        className="shrink-0 flex items-center justify-between px-6 py-3"
        style={{
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          background: 'rgba(14,12,20,0.8)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm transition-colors"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.05)',
              color: 'var(--joi-text-2)',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></svg>
            Volver
          </button>
          <h2 className="text-sm font-semibold text-white">Comparar</h2>
          <span className="text-[11px]" style={{ color: 'var(--joi-text-3)' }}>Arrastra el deslizador {'\u00B7'} Teclas de flecha</span>
        </div>
        <div className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--joi-text-3)' }}>
          <span style={{ color: '#818CF8' }} className="font-medium">{Math.round(sliderPos)}%</span>
        </div>
      </div>

      {/* Comparison canvas */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
        <div
          ref={containerRef}
          className="relative select-none max-w-5xl w-full h-full cursor-ew-resize rounded-xl overflow-hidden shadow-2xl"
          onMouseDown={(e) => { e.preventDefault(); setIsDragging(true); updateSlider(e.clientX); }}
          onTouchStart={(e) => updateSlider(e.touches[0].clientX)}
          onTouchMove={(e) => onTouchMove(e.nativeEvent)}
        >
          {/* Image B -- right side (full, behind) */}
          <img
            src={itemB.url}
            alt={labelB}
            className="absolute inset-0 w-full h-full object-contain pointer-events-none"
            draggable={false}
          />

          {/* Image A -- left side (clipped by slider) */}
          <div
            className="absolute inset-0 overflow-hidden"
            style={{ width: `${sliderPos}%` }}
          >
            <img
              src={itemA.url}
              alt={labelA}
              className="absolute inset-0 w-full h-full object-contain pointer-events-none"
              style={{ width: `${containerRef.current?.offsetWidth ?? 800}px`, maxWidth: 'none' }}
              draggable={false}
            />
          </div>

          {/* Slider handle */}
          <div
            className="absolute top-0 bottom-0 z-20 flex flex-col items-center"
            style={{ left: `${sliderPos}%`, transform: 'translateX(-50%)' }}
          >
            {/* Line */}
            <div
              className="w-[2px] h-full"
              style={{ background: 'rgba(255,255,255,0.9)', boxShadow: '0 0 8px rgba(0,0,0,0.8)' }}
            />
            {/* Handle circle */}
            <div className="absolute top-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-xl flex items-center justify-center cursor-ew-resize">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 9l-3 3 3 3" />
                <path d="M16 9l3 3-3 3" />
                <line x1="11" y1="12" x2="13" y2="12" />
              </svg>
            </div>
          </div>

          {/* Labels */}
          <div
            className="absolute top-4 left-4 z-30 px-2 py-1 backdrop-blur-sm rounded-lg text-[11px] font-semibold text-white pointer-events-none"
            style={{ background: 'rgba(8,7,12,0.6)' }}
          >
            {labelA}
          </div>
          <div
            className="absolute top-4 right-4 z-30 px-2 py-1 backdrop-blur-sm rounded-lg text-[11px] font-semibold text-white pointer-events-none"
            style={{ background: 'rgba(8,7,12,0.6)' }}
          >
            {labelB}
          </div>
        </div>
      </div>

      {/* Thumbnails strip */}
      <div
        className="shrink-0 flex items-center justify-center gap-4 px-6 py-3"
        style={{
          borderTop: '1px solid rgba(255,255,255,0.05)',
          background: 'rgba(14,12,20,0.8)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-8 rounded-full" style={{ background: '#6366F1' }} />
          <img src={itemA.url} alt={labelA} className="w-10 h-10 rounded-lg object-cover" style={{ border: '2px solid rgba(99,102,241,0.4)' }} />
          <span className="text-[11px]" style={{ color: 'var(--joi-text-2)' }}>{labelA}</span>
        </div>
        <span className="text-sm" style={{ color: 'var(--joi-text-3)' }}>vs</span>
        <div className="flex items-center gap-2">
          <img src={itemB.url} alt={labelB} className="w-10 h-10 rounded-lg object-cover" style={{ border: '2px solid rgba(129,140,248,0.4)' }} />
          <span className="text-[11px]" style={{ color: 'var(--joi-text-2)' }}>{labelB}</span>
          <div className="w-1.5 h-8 rounded-full" style={{ background: '#818CF8' }} />
        </div>
      </div>
    </div>
  );
};

export default CompareSliderModal;
