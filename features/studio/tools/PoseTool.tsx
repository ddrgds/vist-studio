import React, { useState } from 'react';
import { PersonStanding } from 'lucide-react';
import { useStudioStore } from '../../../stores/studioStore';
import { getModel } from '../../../models/registry';
import { useProfile } from '../../../contexts/ProfileContext';
import { useToast } from '../../../contexts/ToastContext';
import Chip from '../../../ui/Chip';
import Button from '../../../ui/Button';
import SectionLabel from '../../../ui/SectionLabel';

const POSES = [
  'Standing straight, arms at sides',
  'Walking confidently',
  'Sitting cross-legged',
  'Leaning against a wall',
  'Arms crossed, power pose',
  'Looking over shoulder',
  'Hands in pockets, casual',
  'Modeling pose, one hand on hip',
  'Sitting on a chair, relaxed',
  'Dynamic action pose',
];

async function urlToFile(url: string, name: string): Promise<File> {
  const res = await fetch(url);
  const blob = await res.blob();
  return new File([blob], name, { type: blob.type || 'image/png' });
}

const PoseTool: React.FC = () => {
  const [selectedPose, setSelectedPose] = useState('');
  const { canvasImage, selectedModelId, resolution, isApplying, setIsApplying, pushCanvas } = useStudioStore();
  const { decrementCredits, restoreCredits } = useProfile();
  const toast = useToast();

  const handleApply = async () => {
    if (!canvasImage || !selectedPose) return;
    const model = getModel(selectedModelId);
    const cost = model.getCost(resolution);
    setIsApplying(true);

    const ok = await decrementCredits(cost);
    if (!ok) { toast.error('Not enough credits'); setIsApplying(false); return; }

    try {
      const file = await urlToFile(canvasImage, 'canvas.png');
      const instruction = `Change the pose to: ${selectedPose}. Keep the same person, outfit, and background.`;
      const result = await model.edit({ image: file, instruction, resolution });
      if (result.urls.length === 0) throw new Error('No image returned');
      pushCanvas(result.urls[0]);
      toast.success('Pose applied');
    } catch (err: any) {
      restoreCredits(cost);
      toast.error(err?.message || 'Pose change failed');
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {!canvasImage && (
        <div className="rounded-xl border border-dashed border-zinc-700 p-6 text-center text-sm text-zinc-500">
          Upload an image first
        </div>
      )}

      <SectionLabel>Select Pose</SectionLabel>
      <div className="flex flex-col gap-1">
        {POSES.map(pose => (
          <Chip
            key={pose}
            label={pose}
            selected={selectedPose === pose}
            onClick={() => setSelectedPose(pose)}
            size="sm"
          />
        ))}
      </div>

      <Button
        onClick={handleApply}
        loading={isApplying}
        disabled={!canvasImage || !selectedPose}
        icon={<PersonStanding size={16} />}
        size="lg"
        className="w-full"
      >
        Apply Pose
      </Button>
    </div>
  );
};

export default PoseTool;
