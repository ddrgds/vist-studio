import React, { useState } from 'react';
import { Wand2 } from 'lucide-react';
import { useStudioStore } from '../../../stores/studioStore';
import { TextArea } from '../../../ui/Input';
import Button from '../../../ui/Button';
import { getModel } from '../../../models/registry';
import { useProfile } from '../../../contexts/ProfileContext';
import { useToast } from '../../../contexts/ToastContext';
import { useGalleryStore, type GalleryItem } from '../../../stores/galleryStore';

/** Convert a data URL or blob URL to a File object */
async function urlToFile(url: string, name: string): Promise<File> {
  const res = await fetch(url);
  const blob = await res.blob();
  return new File([blob], name, { type: blob.type || 'image/png' });
}

interface AIEditToolProps {
  placeholder?: string;
}

const AIEditTool: React.FC<AIEditToolProps> = ({
  placeholder = 'Describe the edit: change outfit to red dress, add sunglasses...',
}) => {
  const [prompt, setPrompt] = useState('');
  const { canvasImage, selectedModelId, resolution, isApplying, setIsApplying, pushCanvas } = useStudioStore();
  const { decrementCredits, restoreCredits } = useProfile();
  const { addItems } = useGalleryStore();
  const toast = useToast();

  const handleApply = async () => {
    if (!canvasImage || !prompt.trim()) return;
    const model = getModel(selectedModelId);
    const cost = model.getCost(resolution);
    setIsApplying(true);

    const ok = await decrementCredits(cost);
    if (!ok) { toast.error('Not enough credits'); setIsApplying(false); return; }

    try {
      const file = await urlToFile(canvasImage, 'canvas.png');
      const result = await model.edit({ image: file, instruction: prompt, resolution });
      if (result.urls.length === 0) throw new Error('No image returned');

      pushCanvas(result.urls[0]);

      // Auto-save edit result to gallery
      const item: GalleryItem = {
        id: crypto.randomUUID(),
        url: result.urls[0],
        prompt,
        model: selectedModelId,
        timestamp: Date.now(),
        type: 'edit',
      };
      addItems([item]);

      toast.success('Edit applied');
      setPrompt('');
    } catch (err: any) {
      restoreCredits(cost);
      toast.error(err?.message || 'Edit failed');
    } finally {
      setIsApplying(false);
    }
  };

  const model = getModel(selectedModelId);
  const cost = model.getCost(resolution);

  return (
    <div className="flex flex-col gap-4">
      {!canvasImage && (
        <div className="rounded-xl border border-dashed border-zinc-700 p-6 text-center text-sm text-zinc-500">
          Upload an image first to use this tool
        </div>
      )}

      <TextArea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder={placeholder}
        rows={3}
      />

      <Button
        onClick={handleApply}
        loading={isApplying}
        disabled={!canvasImage || !prompt.trim()}
        icon={<Wand2 size={16} />}
        size="lg"
        className="w-full"
      >
        Apply Edit
        <span className="font-jet text-xs ml-1 opacity-70">{cost}</span>
      </Button>

      {/* Results grid placeholder for future multi-result edits */}
    </div>
  );
};

export default AIEditTool;
