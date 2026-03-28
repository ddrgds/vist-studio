import React, { useRef, useState, useCallback, useEffect } from 'react';
import type { GalleryItem } from '../stores/galleryStore';

interface ABComparatorProps {
  itemA: GalleryItem;
  itemB: GalleryItem;
  onClose: () => void;
}

const ABComparator: React.FC<ABComparatorProps> = ({ itemA, itemB, onClose }) => {
  const [dividerX, setDividerX] = useState(50); // 0-100 percent
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const handleMouseMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    setDividerX(x * 100);
  }, []);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleMouseMove);
    window.addEventListener('touchend', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const startDrag = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const labelA = itemA.tags?.includes('uploaded') ? 'Foto A' : `${itemA.type === 'edit' ? 'Editada' : itemA.type === 'video' ? 'Video' : 'Creada'} A`;
  const labelB = itemB.tags?.includes('uploaded') ? 'Foto B' : `${itemB.type === 'edit' ? 'Editada' : itemB.type === 'video' ? 'Video' : 'Creada'} B`;

  return (
    <div
      className="fixed inset-0 z-[80] flex flex-col items-center justify-center p-4"
      style={{ background: 'rgba(8,7,12,0.95)' }}
      onClick={handleBackdropClick}
    >
      {/* Header */}
      <div className="w-full max-w-5xl flex items-center justify-between mb-3 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-white font-semibold text-sm">Comparación A/B</span>
          <span
            className="text-[10px] px-2 py-0.5 rounded"
            style={{ color: 'var(--joi-text-3)', background: 'var(--joi-bg-2)', border: '1px solid var(--joi-border)' }}
          >
            Arrastra el divisor para comparar
          </span>
        </div>
        <button
          onClick={onClose}
          aria-label="Cerrar comparador"
          className="p-2 rounded-full transition-colors"
          style={{ background: 'var(--joi-bg-3)', color: 'var(--joi-text-2)' }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* Comparison Area */}
      <div
        ref={containerRef}
        className="relative w-full max-w-5xl rounded-2xl overflow-hidden cursor-ew-resize select-none"
        style={{ aspectRatio: '4/3', maxHeight: 'calc(100vh - 140px)' }}
        onMouseDown={startDrag}
        onTouchStart={startDrag}
      >
        {/* Image B (right / full width background) */}
        <img
          src={itemB.url}
          alt={labelB}
          className="absolute inset-0 w-full h-full object-contain"
          draggable={false}
        />

        {/* Image A (left, clipped) */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ width: `${dividerX}%` }}
        >
          <img
            src={itemA.url}
            alt={labelA}
            className="absolute inset-0 w-full h-full object-contain"
            style={{ width: `${(100 / dividerX) * 100}%`, maxWidth: 'none' }}
            draggable={false}
          />
        </div>

        {/* Divider line */}
        <div
          className="absolute top-0 bottom-0 w-0.5 z-10 pointer-events-none"
          style={{
            left: `${dividerX}%`,
            transform: 'translateX(-50%)',
            background: '#fff',
            boxShadow: '0 0 12px rgba(255,255,255,0.8)',
          }}
        />

        {/* Drag handle */}
        <div
          className="absolute top-1/2 z-20 -translate-y-1/2 -translate-x-1/2 w-9 h-9 bg-white rounded-full shadow-2xl flex items-center justify-center pointer-events-none"
          style={{ left: `${dividerX}%` }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#18181b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" style={{ transform: 'translateX(2px)' }}/>
            <polyline points="15 18 9 12 15 6" style={{ transform: 'translateX(-2px)' }}/>
          </svg>
        </div>

        {/* Labels */}
        <div className="absolute top-3 left-3 z-10 pointer-events-none">
          <span
            className="backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded"
            style={{ background: 'rgba(8,7,12,0.7)' }}
          >
            A
          </span>
        </div>
        <div className="absolute top-3 right-3 z-10 pointer-events-none">
          <span
            className="backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded"
            style={{ background: 'rgba(8,7,12,0.7)' }}
          >
            B
          </span>
        </div>
      </div>

      {/* Bottom info */}
      <div className="mt-3 flex gap-6 text-[11px] shrink-0" style={{ color: 'var(--joi-text-3)' }}>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: '#6366F1' }}/>
          A {'\u2014'} {labelA}
          {' '}{new Date(itemA.timestamp).toLocaleDateString()}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: '#818CF8' }}/>
          B {'\u2014'} {labelB}
          {' '}{new Date(itemB.timestamp).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
};

export default ABComparator;
