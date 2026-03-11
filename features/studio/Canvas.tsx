import React, { useRef, useCallback } from 'react';
import { Upload, Undo2, Redo2, Download, ZoomIn, ZoomOut, Hand, MousePointer2 } from 'lucide-react';
import { useStudioStore } from '../../stores/studioStore';

const Canvas: React.FC = () => {
  const { canvasImage, undoStack, redoStack, pushCanvas, undo, redo } = useStudioStore();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    pushCanvas(URL.createObjectURL(file));
  }, [pushCanvas]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  }, [handleUpload]);

  const handleDownload = useCallback(() => {
    if (!canvasImage) return;
    const a = document.createElement('a');
    a.href = canvasImage;
    a.download = `vist-studio-${Date.now()}.png`;
    a.click();
  }, [canvasImage]);

  return (
    <div className="flex-1 flex flex-col bg-[#0D0A0A] relative overflow-hidden">
      {/* Floating Toolbar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 inline-flex items-center gap-1 bg-zinc-900/90 backdrop-blur-sm border border-zinc-800 rounded-xl px-2 py-1.5 shadow-lg">
        <ToolbarBtn
          title="Select"
          icon={<MousePointer2 size={16} />}
        />
        <ToolbarBtn
          title="Pan"
          icon={<Hand size={16} />}
        />
        <div className="w-px h-5 bg-zinc-700 mx-1" />
        <ToolbarBtn
          title="Zoom In"
          icon={<ZoomIn size={16} />}
        />
        <ToolbarBtn
          title="Zoom Out"
          icon={<ZoomOut size={16} />}
        />
        <div className="w-px h-5 bg-zinc-700 mx-1" />
        <ToolbarBtn
          title="Undo"
          disabled={undoStack.length === 0}
          onClick={undo}
          icon={<Undo2 size={16} />}
        />
        <ToolbarBtn
          title="Redo"
          disabled={redoStack.length === 0}
          onClick={redo}
          icon={<Redo2 size={16} />}
        />
        <div className="w-px h-5 bg-zinc-700 mx-1" />
        <ToolbarBtn
          title="Download"
          disabled={!canvasImage}
          onClick={handleDownload}
          icon={<Download size={16} />}
        />
        <ToolbarBtn
          title="Upload"
          onClick={() => inputRef.current?.click()}
          icon={<Upload size={16} />}
        />
      </div>

      {/* Canvas area */}
      <div
        className="flex-1 flex items-center justify-center relative"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        {canvasImage ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <img
              src={canvasImage}
              alt="Canvas"
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center">
            <button
              onClick={() => inputRef.current?.click()}
              className="flex flex-col items-center justify-center border-2 border-dashed border-zinc-700 rounded-2xl p-12 hover:border-coral/30 transition-colors duration-200 cursor-pointer bg-transparent group"
            >
              <Upload className="w-12 h-12 text-zinc-600 mb-4 group-hover:text-zinc-500 transition-colors" />
              <span className="text-sm text-zinc-500 font-medium">
                Drop an image or click to upload
              </span>
              <span className="text-[11px] text-zinc-600 mt-1.5">
                PNG, JPG up to 10MB
              </span>
            </button>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleUpload(f);
          e.target.value = '';
        }}
      />
    </div>
  );
};

function ToolbarBtn({ icon, title, onClick, disabled, active }: {
  icon: React.ReactNode;
  title: string;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      title={title}
      aria-label={title}
      onClick={disabled ? undefined : onClick}
      className={`p-2 rounded-lg transition-all duration-150 ${
        active
          ? 'text-coral bg-coral/10'
          : disabled
            ? 'text-zinc-700 cursor-default'
            : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/5 cursor-pointer'
      }`}
    >
      {icon}
    </button>
  );
}

export default Canvas;
