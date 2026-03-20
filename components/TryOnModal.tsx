import React, { useState, useRef, useEffect } from 'react';
import { generateVirtualTryOn } from '../services/replicateService';
import { useToast } from '../contexts/ToastContext';
import { useProfile } from '../contexts/ProfileContext';
import { CREDIT_COSTS } from '../types';
import ProgressBar from './ProgressBar';

type Category = 'upper_body' | 'lower_body' | 'dresses';

interface TryOnModalProps {
  targetItem: { id: string; url: string };
  onClose: () => void;
  onSave: (dataUrl: string, sourceItemId: string) => Promise<void>;
}

const CATEGORIES: { value: Category; label: string; icon: string; hint: string }[] = [
  { value: 'upper_body', label: 'Top',     icon: '👕', hint: 'Shirt, jacket, blouse…' },
  { value: 'lower_body', label: 'Bottom',  icon: '👖', hint: 'Pants, skirt, shorts…' },
  { value: 'dresses',    label: 'Dress',   icon: '👗', hint: 'Full-length dress…'    },
];

const TryOnModal: React.FC<TryOnModalProps> = ({ targetItem, onClose, onSave }) => {
  const toast = useToast();
  const { decrementCredits, restoreCredits } = useProfile();
  const garmentInputRef = useRef<HTMLInputElement>(null);

  const [garmentFile, setGarmentFile] = useState<File | null>(null);
  const [garmentPreview, setGarmentPreview] = useState<string | null>(null);
  const [garmentDesc, setGarmentDesc] = useState('');
  const [category, setCategory] = useState<Category>('upper_body');
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  // Revoke object URLs on unmount
  useEffect(() => {
    return () => {
      if (garmentPreview) URL.revokeObjectURL(garmentPreview);
    };
  }, [garmentPreview]);

  const setGarmentFromFile = (file: File) => {
    setGarmentFile(file);
    setGarmentPreview(URL.createObjectURL(file));
    setResult(null);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setGarmentFromFile(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file?.type.startsWith('image/')) setGarmentFromFile(file);
  };

  const handleGenerate = async () => {
    if (!garmentFile) { toast.error('Upload a photo of the garment'); return; }
    if (!garmentDesc.trim()) { toast.error('Briefly describe the garment'); return; }

    const cost = CREDIT_COSTS['try-on'];
    const hasCredits = await decrementCredits(cost);
    if (!hasCredits) { toast.error('Insufficient credits. Please upgrade your plan.'); return; }

    setLoading(true);
    setProgress(0);
    setResult(null);

    try {
      // Convert gallery image (dataURL) → File
      const resp = await fetch(targetItem.url);
      const blob = await resp.blob();
      const personFile = new File([blob], `person-${targetItem.id}.png`, { type: blob.type || 'image/png' });

      const dataUrl = await generateVirtualTryOn(
        { personImage: personFile, garmentImage: garmentFile, garmentDescription: garmentDesc.trim(), category },
        setProgress,
      );
      setResult(dataUrl);
    } catch (err: any) {
      restoreCredits(cost);
      toast.error(err?.message || 'Error applying the try-on');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!result) return;
    try {
      await onSave(result, targetItem.id);
      toast.success('Try-on saved to gallery');
      onClose();
    } catch {
      toast.error('Error saving');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex animate-in fade-in duration-300">

      {/* ─── Center: result / person preview ─── */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 relative bg-zinc-950">
        <button
          onClick={onClose}
          className="absolute top-6 left-6 flex items-center gap-2 text-zinc-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl backdrop-blur-md border border-white/5 z-10"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></svg>
          Back to Canvas
        </button>

        <div className="w-full max-w-2xl aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl relative flex items-center justify-center bg-black border border-white/5">
          <img
            src={result ?? targetItem.url}
            alt={result ? 'Virtual try-on result' : 'Person'}
            className="w-full h-full object-contain"
          />

          {loading && (
            <div className="absolute inset-0 bg-black/70 backdrop-blur-md flex flex-col items-center justify-center z-20 rounded-2xl">
              <svg className="animate-spin text-white mb-6" xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
              <div className="w-72">
                <ProgressBar progress={progress} label="Applying Virtual Try-On…" />
              </div>
              <p className="text-xs text-zinc-500 mt-3">IDM-VTON · ~30s</p>
            </div>
          )}
        </div>
      </div>

      {/* ─── Right Inspector Panel ─── */}
      <aside className="w-[420px] bg-zinc-950/95 backdrop-blur-3xl border-l border-white/5 flex flex-col shadow-2xl relative z-10">

        {/* Header */}
        <div className="p-6 pb-5 border-b border-white/5 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">👗</span>
              <h2 className="text-lg font-bold text-white tracking-wide">Virtual Try-On</h2>
            </div>
            <span className="text-[10px] text-zinc-400 bg-white/5 px-2 py-1 rounded border border-white/10 uppercase tracking-widest">Inspector</span>
          </div>
          <p className="text-xs text-zinc-500 font-light">IDM-VTON · Replicate · ~30s</p>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-6 custom-scrollbar">

          {/* Category */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">Garment Category</label>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setCategory(c.value)}
                  className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border text-center transition-all ${
                    category === c.value
                      ? 'bg-white/10 border-white/25 text-white'
                      : 'bg-white/[0.02] border-white/5 text-zinc-500 hover:border-white/15 hover:text-zinc-300'
                  }`}
                >
                  <span className="text-xl leading-none">{c.icon}</span>
                  <span className="text-[11px] font-semibold">{c.label}</span>
                  <span className="text-[9px] text-zinc-600 leading-tight">{c.hint}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Garment image upload */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">
              Garment Photo <span className="text-zinc-600 normal-case font-normal">(flat lay or worn)</span>
            </label>
            <div
              className={`aspect-square rounded-2xl border border-dashed transition-all cursor-pointer flex flex-col items-center justify-center overflow-hidden bg-white/[0.02] ${
                garmentPreview ? 'border-purple-500/50' : 'border-white/10 hover:border-white/30 hover:bg-white/[0.04]'
              }`}
              onClick={() => garmentInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
            >
              {garmentPreview ? (
                <div className="relative w-full h-full group">
                  <img src={garmentPreview} alt="Garment" className="w-full h-full object-contain p-2" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl">
                    <span className="text-white text-sm font-medium">Change Photo</span>
                  </div>
                </div>
              ) : (
                <div className="text-center text-zinc-500 p-6 flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-2xl">👕</div>
                  <p className="text-sm font-medium text-zinc-300">Upload Garment Photo</p>
                  <p className="text-xs text-zinc-600">Flat lay, hanger, or worn — PNG/JPG</p>
                </div>
              )}
            </div>
            <input ref={garmentInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
          </div>

          {/* Garment description */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">Garment Description</label>
            <input
              type="text"
              value={garmentDesc}
              onChange={(e) => setGarmentDesc(e.target.value)}
              placeholder={category === 'upper_body' ? 'e.g. white oversized linen shirt' : category === 'lower_body' ? 'e.g. black slim-fit trousers' : 'e.g. floral midi dress with puff sleeves'}
              className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none focus:border-white/20 transition-all"
            />
            <p className="text-[10px] text-zinc-600">The model uses this to accurately place the garment on the person.</p>
          </div>

          {/* Actions */}
          <div className="pt-2 border-t border-white/5 flex flex-col gap-3">
            {result ? (
              <div className="flex gap-3">
                <button
                  onClick={handleGenerate}
                  disabled={loading}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-sm font-medium transition-all"
                >
                  Retry
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
                disabled={loading || !garmentFile || !garmentDesc.trim()}
                className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:from-zinc-800 disabled:to-zinc-800 disabled:text-zinc-500 disabled:shadow-none text-white rounded-xl text-sm font-bold tracking-wide transition-all shadow-[0_0_20px_rgba(147,51,234,0.3)] active:scale-[0.98]"
              >
                APPLY TRY-ON
              </button>
            )}
            <p className="text-[10px] text-zinc-700 text-center">
              ⚠️ IDM-VTON is for non-commercial use only (CC BY-NC-SA 4.0)
            </p>
          </div>

        </div>
      </aside>
    </div>
  );
};

export default TryOnModal;
