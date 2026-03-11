import React, { useState, useCallback, useRef } from 'react';
import { Camera, Save, X, Check } from 'lucide-react';
import { useStudioStore } from '../../../stores/studioStore';
import { useCharacterStore } from '../../../stores/characterStore';
import { useGalleryStore, type GalleryItem } from '../../../stores/galleryStore';
import { useProfile } from '../../../contexts/ProfileContext';
import { useToast } from '../../../contexts/ToastContext';
import { getModel } from '../../../models/registry';
import Chip from '../../../ui/Chip';
import Button from '../../../ui/Button';
import Input from '../../../ui/Input';
import SectionLabel from '../../../ui/SectionLabel';

const STYLE_PRESETS = [
  { id: 'selfies',    emoji: '\u{1F4F1}', label: 'Selfies' },
  { id: 'editorial',  emoji: '\u{1F4F8}', label: 'Editorial' },
  { id: 'street',     emoji: '\u{1F3D9}', label: 'Street Style' },
  { id: 'portrait',   emoji: '\u{1F5BC}', label: 'Portrait' },
  { id: 'fitness',    emoji: '\u{1F4AA}', label: 'Fitness' },
  { id: 'nightout',   emoji: '\u{1F319}', label: 'Night Out' },
  { id: 'lifestyle',  emoji: '\u{2615}',  label: 'Lifestyle' },
  { id: 'fotodump',   emoji: '\u{1F4F7}', label: 'Foto Dump' },
];

const INSPIRATIONS = [
  { id: 'neon', emoji: '\u{1F306}', label: 'Neon City', scene: 'neon-lit city street at night' },
  { id: 'beach', emoji: '\u{1F3DD}', label: 'Beach', scene: 'tropical beach, turquoise water' },
  { id: 'studio', emoji: '\u{2B1C}', label: 'Studio', scene: 'clean white photography studio' },
  { id: 'cafe', emoji: '\u{2615}', label: 'Cafe', scene: 'cozy artisan coffee shop' },
  { id: 'park', emoji: '\u{1F33F}', label: 'Park', scene: 'lush green park, dappled sunlight' },
  { id: 'rooftop', emoji: '\u{1F305}', label: 'Rooftop', scene: 'rooftop terrace at sunset' },
];

const SessionTool: React.FC = () => {
  const { selectedModelId, resolution, sessionResults, setSessionResults, sessionSaved, setSessionSaved } = useStudioStore();
  const { characters } = useCharacterStore();
  const { addItems } = useGalleryStore();
  const { decrementCredits, restoreCredits } = useProfile();
  const toast = useToast();

  const [selectedCharId, setSelectedCharId] = useState<string | null>(null);
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [sceneText, setSceneText] = useState('');
  const [photoCount, setPhotoCount] = useState(4);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const selectedChar = characters.find(c => c.id === selectedCharId);

  const toggleStyle = (id: string) => {
    setSelectedStyles(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  const model = getModel(selectedModelId);
  const cost = model.getCost(resolution) * photoCount;
  const isReady = !!selectedChar && selectedStyles.length > 0;

  const handleShoot = useCallback(async () => {
    if (!selectedChar || selectedStyles.length === 0) return;
    if (selectedChar.modelImageBlobs.length === 0) {
      toast.warning('This character has no reference photos.');
      return;
    }

    const model = getModel(selectedModelId);
    if (!model.session) {
      toast.error('This model does not support photo sessions.');
      return;
    }

    const cost = model.getCost(resolution) * photoCount;
    const ok = await decrementCredits(cost);
    if (!ok) { toast.error('Not enough credits'); return; }

    setIsGenerating(true);
    setProgress(0);
    setSessionResults([]);
    setSessionSaved(false);
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const refBlob = selectedChar.modelImageBlobs[0];
      const refFile = new File([refBlob], 'ref.jpg', { type: refBlob.type || 'image/jpeg' });

      const scenario = [sceneText, ...selectedStyles].filter(Boolean).join(', ');

      const result = await model.session({
        referenceImage: refFile,
        count: photoCount,
        scenario,
        resolution,
        abortSignal: ctrl.signal,
        onProgress: setProgress,
      });

      setSessionResults(result.urls.map((url, i) => ({ url, index: i })));
      toast.success(`${result.urls.length} photos generated. Review and save below.`);
    } catch (err: any) {
      if (!ctrl.signal.aborted) {
        toast.error(err?.message || 'Session failed');
      }
      restoreCredits(cost);
    } finally {
      setIsGenerating(false);
      abortRef.current = null;
    }
  }, [selectedChar, selectedStyles, sceneText, photoCount, selectedModelId, resolution, decrementCredits, restoreCredits, toast, setSessionResults, setSessionSaved]);

  const handleSave = useCallback(async () => {
    const items: GalleryItem[] = sessionResults.map((r, i) => ({
      id: crypto.randomUUID(),
      url: r.url,
      timestamp: Date.now() - (sessionResults.length - i),
      type: 'session' as const,
      characterId: selectedCharId ?? undefined,
    }));
    addItems(items);
    setSessionSaved(true);
    toast.success(`${items.length} photos saved to gallery!`);
  }, [sessionResults, selectedCharId, addItems, setSessionSaved, toast]);

  return (
    <div className="flex flex-col gap-4">
      {/* Character selector */}
      <SectionLabel>Character</SectionLabel>
      {characters.length === 0 ? (
        <div className="text-xs text-zinc-500">No characters saved yet.</div>
      ) : (
        <div className="flex flex-col gap-1">
          {characters.slice(0, 8).map(ch => (
            <Chip
              key={ch.id}
              label={ch.name}
              selected={selectedCharId === ch.id}
              onClick={() => setSelectedCharId(ch.id)}
              size="sm"
            />
          ))}
        </div>
      )}

      {/* Style presets */}
      <SectionLabel>Style</SectionLabel>
      <div className="flex flex-wrap gap-1.5">
        {STYLE_PRESETS.map(p => (
          <Chip
            key={p.id}
            label={`${p.emoji} ${p.label}`}
            selected={selectedStyles.includes(p.id)}
            onClick={() => toggleStyle(p.id)}
            size="sm"
          />
        ))}
      </div>

      {/* Scene */}
      <Input
        label="Scene"
        value={sceneText}
        onChange={(e) => setSceneText(e.target.value)}
        placeholder="Cafe, beach, studio..."
      />

      {/* Inspirations */}
      <SectionLabel>Inspirations</SectionLabel>
      <div className="flex flex-wrap gap-1.5">
        {INSPIRATIONS.map(i => (
          <Chip
            key={i.id}
            label={`${i.emoji} ${i.label}`}
            selected={sceneText === i.scene}
            onClick={() => setSceneText(i.scene)}
            size="sm"
          />
        ))}
      </div>

      {/* Count */}
      <SectionLabel>
        Photos: <span className="font-jet">{photoCount}</span>
      </SectionLabel>
      <input
        type="range" min={2} max={8} value={photoCount}
        onChange={(e) => setPhotoCount(Number(e.target.value))}
        className="w-full accent-coral"
      />

      <Button
        onClick={handleShoot}
        loading={isGenerating}
        disabled={!isReady}
        icon={<Camera size={16} />}
        size="lg"
        className={`w-full ${isReady ? 'generate-ready' : ''}`}
      >
        {isGenerating
          ? `${Math.round(progress)}%...`
          : <>Shoot <span className="font-jet text-xs ml-1 opacity-70">{cost}</span></>
        }
      </Button>

      {/* Results */}
      {sessionResults.length > 0 && (
        <div className="mt-4">
          <div className="flex gap-2 mb-3">
            {!sessionSaved ? (
              <>
                <Button size="sm" onClick={handleSave} icon={<Save size={12} />}>Save</Button>
                <Button size="sm" variant="ghost" onClick={() => setSessionResults([])} icon={<X size={12} />}>Discard</Button>
              </>
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-green-500">
                <Check size={14} /> Saved
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {sessionResults.map((r, i) => (
              <img
                key={i}
                src={r.url}
                alt={`Shot ${i + 1}`}
                className="rounded-lg border border-zinc-800 w-full aspect-[3/4] object-cover"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionTool;
