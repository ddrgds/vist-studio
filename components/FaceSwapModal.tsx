import React, { useState, useRef, useEffect } from 'react';
import { faceSwapWithGemini } from '../services/geminiService';
import { useToast } from '../contexts/ToastContext';
import { useProfile } from '../contexts/ProfileContext';
import { OPERATION_CREDIT_COSTS } from '../types';
import ProgressBar from './ProgressBar';

interface FaceSwapModalProps {
  targetItem: { id: string; url: string; type: string };
  onClose: () => void;
  onSave: (dataUrl: string, sourceItemId: string) => Promise<void>;
}

const FaceSwapModal: React.FC<FaceSwapModalProps> = ({ targetItem, onClose, onSave }) => {
  const toast = useToast();
  const { decrementCredits, restoreCredits } = useProfile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sourceFaceFile, setSourceFaceFile] = useState<File | null>(null);
  const [sourceFacePreview, setSourceFacePreview] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  // Revoke object URLs when they change or when the modal unmounts
  useEffect(() => {
    return () => {
      if (sourceFacePreview) URL.revokeObjectURL(sourceFacePreview);
    };
  }, [sourceFacePreview]);

  const setSourceFaceFromFile = (file: File) => {
    setSourceFaceFile(file);
    setSourceFacePreview(URL.createObjectURL(file));
    setResult(null);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSourceFaceFromFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    setSourceFaceFromFile(file);
  };

  const handleGenerate = async () => {
    if (!sourceFaceFile) { toast.error('Upload a photo of the face to use'); return; }

    const cost = OPERATION_CREDIT_COSTS.faceSwap;
    const hasCredits = await decrementCredits(cost);
    if (!hasCredits) { toast.error('Insufficient credits. Please upgrade your plan.'); return; }

    setLoading(true);
    setProgress(0);
    setResult(null);
    try {
      // Convert target URL to File
      const resp = await fetch(targetItem.url);
      const blob = await resp.blob();
      const targetFile = new File([blob], `target-${targetItem.id}.png`, { type: blob.type || 'image/png' });

      const dataUrl = await faceSwapWithGemini(targetFile, sourceFaceFile, setProgress);
      setResult(dataUrl);
    } catch (err: any) {
      restoreCredits(cost);
      toast.error(err?.message || 'Error performing the face swap');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!result) return;
    try {
      await onSave(result, targetItem.id);
      toast.success('Face swap saved to gallery');
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

        <div className="w-full max-w-3xl aspect-square rounded-2xl overflow-hidden shadow-2xl relative flex items-center justify-center bg-black border border-white/5">
          {result ? (
            <img src={result} alt="Face Swap Result" className="w-full h-full object-contain" />
          ) : (
            <img src={targetItem.url} alt="Target" className="w-full h-full object-contain" />
          )}

          {/* Processing Overlay */}
          {loading && (
            <div className="absolute inset-0 bg-black/70 backdrop-blur-md flex flex-col items-center justify-center z-20">
              <svg className="animate-spin text-white mb-6" xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
              <div className="w-72">
                <ProgressBar progress={progress} label="Applying Face Swap..." />
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
              <span className="text-xl">🔄</span>
              <h2 className="text-lg font-bold text-white tracking-wide">Face Swap</h2>
            </div>
            <span className="text-[10px] text-zinc-400 bg-white/5 px-2 py-1 rounded border border-white/10 uppercase tracking-widest">Inspector</span>
          </div>
          <p className="text-xs text-zinc-500 font-light">NB2 · Gemini Flash 2 · Multimodal</p>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-8 custom-scrollbar">

          {/* Source Face Upload */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">
              Reference Identity <span className="text-zinc-600 normal-case">(Source Face)</span>
            </label>
            <div
              className={`aspect-square rounded-2xl border border-dashed transition-all cursor-pointer flex flex-col items-center justify-center overflow-hidden bg-white/[0.02] ${sourceFacePreview ? 'border-purple-500/50' : 'border-white/10 hover:border-white/30 hover:bg-white/[0.04]'
                }`}
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
            >
              {sourceFacePreview ? (
                <div className="relative w-full h-full group">
                  <img src={sourceFacePreview} alt="Source face" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white text-sm font-medium">Change Photo</span>
                  </div>
                </div>
              ) : (
                <div className="text-center text-zinc-500 p-6 flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-zinc-300">Upload Source Photo</p>
                  <p className="text-xs text-zinc-600">Drag & drop or click to browse</p>
                </div>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
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
                  Retry Swap
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
                disabled={loading || !sourceFaceFile}
                className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:from-zinc-800 disabled:to-zinc-800 disabled:text-zinc-500 disabled:shadow-none text-white rounded-xl text-sm font-bold tracking-wide transition-all shadow-[0_0_20px_rgba(147,51,234,0.3)] active:scale-[0.98]"
              >
                APPLY FACE SWAP
              </button>
            )}
          </div>

        </div>
      </aside>
    </div>
  );
};

export default FaceSwapModal;
