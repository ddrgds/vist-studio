import React, { useRef, useState, useCallback, useEffect } from 'react';
import { GeneratedContent } from '../types';

interface ABComparatorProps {
  itemA: GeneratedContent;
  itemB: GeneratedContent;
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

  const startDrag = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/95 flex flex-col items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={handleBackdropClick}
    >
      {/* Header */}
      <div className="w-full max-w-5xl flex items-center justify-between mb-3 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-white font-semibold text-sm">A/B Comparator</span>
          <span className="text-[10px] text-zinc-500 bg-zinc-900 border border-zinc-700 px-2 py-0.5 rounded">Drag the divider to compare</span>
        </div>
        <button
          onClick={onClose}
          aria-label="Close comparator"
          className="p-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-full transition-colors"
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
          alt="Image B"
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
            alt="Image A"
            className="absolute inset-0 w-full h-full object-contain"
            style={{ width: `${(100 / dividerX) * 100}%`, maxWidth: 'none' }}
            draggable={false}
          />
        </div>

        {/* Divider line */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_12px_rgba(255,255,255,0.8)] z-10 pointer-events-none"
          style={{ left: `${dividerX}%`, transform: 'translateX(-50%)' }}
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
          <span className="bg-black/70 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded">A</span>
        </div>
        <div className="absolute top-3 right-3 z-10 pointer-events-none">
          <span className="bg-black/70 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded">B</span>
        </div>
      </div>

      {/* Bottom info */}
      <div className="mt-3 flex gap-6 text-[11px] text-zinc-500 shrink-0">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-purple-500 inline-block"/>
          A — {itemA.type === 'create' ? 'Created' : itemA.type === 'edit' ? 'Edited' : 'Video'}
          {' '}{new Date(itemA.timestamp).toLocaleDateString()}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"/>
          B — {itemB.type === 'create' ? 'Created' : itemB.type === 'edit' ? 'Edited' : 'Video'}
          {' '}{new Date(itemB.timestamp).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
};

export default ABComparator;
