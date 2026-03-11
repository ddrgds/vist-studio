import React from 'react';
import { Sparkles, Star, Gamepad2, Brush, Skull, Wand2 } from 'lucide-react';
import { useStudioStore } from '../../../stores/studioStore';
import Input from '../../../ui/Input';
import { TextArea } from '../../../ui/Input';
import Chip from '../../../ui/Chip';
import Button from '../../../ui/Button';
import SectionLabel from '../../../ui/SectionLabel';
import { getModel } from '../../../models/registry';
import { useProfile } from '../../../contexts/ProfileContext';
import { useToast } from '../../../contexts/ToastContext';

const STYLES = [
  { id: 'realistic', label: 'Realistic', icon: <Star size={14} className="text-amber-brand" /> },
  { id: 'anime',     label: 'Anime',     icon: <span className="text-sm">&#x1F47E;</span> },
  { id: '3dcgi',     label: '3D CGI',    icon: <Gamepad2 size={14} className="text-zinc-400" /> },
  { id: 'cartoon',   label: 'Cartoon',   icon: <Brush size={14} className="text-orange-400" /> },
  { id: 'cyberpunk', label: 'Cyberpunk', icon: <Skull size={14} className="text-violet-400" /> },
  { id: 'fantasy',   label: 'Fantasy',   icon: <Wand2 size={14} className="text-cyan-400" /> },
];

const ETHNICITIES = ['Latina', 'Asian', 'European', 'African', 'Arab', 'Mixed', 'Fantasy', 'Alien', 'Elf'];
const HAIR_COLORS = ['Black', 'Brown', 'Blonde', 'Red', 'Pink', 'Blue', 'White', 'Silver', 'Purple', 'Rainbow', 'Neon'];
const EYE_COLORS = ['Brown', 'Green', 'Blue', 'Gray', 'Hazel', 'Violet', 'Red', 'Gold', 'Heterochromia'];
const BODY_TYPES = ['Slim', 'Athletic', 'Curvy', 'Natural', 'Muscular', 'Petite', 'Plus', 'Tall', 'Ethereal'];
const PERSONALITIES = ['Sophisticated', 'Youthful', 'Mysterious', 'Cheerful', 'Rebellious', 'Elegant', 'Dark', 'Playful', 'Fierce'];

const CreateTool: React.FC = () => {
  const store = useStudioStore();
  const { characterConfig: cfg, updateCharacterConfig: set, selectedModelId, resolution, isApplying, setIsApplying, pushCanvas } = store;
  const { decrementCredits, restoreCredits } = useProfile();
  const toast = useToast();

  const togglePersonality = (p: string) => {
    const cur = cfg.personalities;
    set('personalities', cur.includes(p) ? cur.filter(x => x !== p) : [...cur, p]);
  };

  const buildPrompt = (): string => {
    const parts: string[] = [];
    if (cfg.style) parts.push(`${cfg.style} style`);
    parts.push(`${cfg.age} years old`);
    if (cfg.ethnicity) parts.push(cfg.ethnicity);
    if (cfg.bodyType) parts.push(`${cfg.bodyType} build`);
    if (cfg.hairColor) parts.push(`${cfg.hairColor} hair`);
    if (cfg.eyeColor) parts.push(`${cfg.eyeColor} eyes`);
    if (cfg.personalities.length) parts.push(cfg.personalities.join(', ').toLowerCase() + ' personality');
    if (cfg.description) parts.push(cfg.description);
    return `A full-body portrait photograph of a character: ${parts.join(', ')}. Professional studio lighting, high quality.`;
  };

  const handleGenerate = async () => {
    const model = getModel(selectedModelId);
    const cost = model.getCost(resolution);
    setIsApplying(true);

    const ok = await decrementCredits(cost);
    if (!ok) { toast.error('Not enough credits'); setIsApplying(false); return; }

    try {
      const prompt = buildPrompt();
      // Use edit with empty image for text-to-image models
      // Most models support generate or edit
      if (model.generate) {
        const result = await model.generate({ prompt, resolution, count: 1 });
        if (result.urls.length > 0) {
          pushCanvas(result.urls[0]);
          toast.success('Character generated!');
        }
      } else {
        // Fallback: use edit with a blank instruction
        toast.error('This model does not support text-to-image generation.');
        restoreCredits(cost);
      }
    } catch (err: any) {
      restoreCredits(cost);
      toast.error(err?.message || 'Generation failed');
    } finally {
      setIsApplying(false);
    }
  };

  const model = getModel(selectedModelId);
  const cost = model.getCost(resolution);
  const isReady = !!cfg.style;

  return (
    <div className="flex flex-col gap-4">
      <Input
        label="Character Name"
        value={cfg.name}
        onChange={(e) => set('name', e.target.value)}
        placeholder="E.g. Luna, Nova, Kai..."
      />

      <SectionLabel>Style</SectionLabel>
      <div className="flex flex-wrap gap-1.5">
        {STYLES.map(s => (
          <Chip key={s.id} label={s.label} icon={s.icon} selected={cfg.style === s.id} onClick={() => set('style', s.id)} size="sm" />
        ))}
      </div>

      <SectionLabel>
        Age: <span className="font-jet">{cfg.age}</span>
      </SectionLabel>
      <input
        type="range" min={18} max={40} value={cfg.age}
        onChange={(e) => set('age', Number(e.target.value))}
        className="w-full accent-coral"
      />

      <SectionLabel>Ethnicity</SectionLabel>
      <div className="flex flex-wrap gap-1.5">
        {ETHNICITIES.map(e => (
          <Chip key={e} label={e} selected={cfg.ethnicity === e} onClick={() => set('ethnicity', e)} size="sm" />
        ))}
      </div>

      <SectionLabel>Hair</SectionLabel>
      <div className="flex flex-wrap gap-1.5">
        {HAIR_COLORS.map(c => (
          <Chip key={c} label={c} selected={cfg.hairColor === c} onClick={() => set('hairColor', c)} size="sm" />
        ))}
      </div>

      <SectionLabel>Eyes</SectionLabel>
      <div className="flex flex-wrap gap-1.5">
        {EYE_COLORS.map(c => (
          <Chip key={c} label={c} selected={cfg.eyeColor === c} onClick={() => set('eyeColor', c)} size="sm" />
        ))}
      </div>

      <SectionLabel>Body</SectionLabel>
      <div className="flex flex-wrap gap-1.5">
        {BODY_TYPES.map(b => (
          <Chip key={b} label={b} selected={cfg.bodyType === b} onClick={() => set('bodyType', b)} size="sm" />
        ))}
      </div>

      <SectionLabel>Personality</SectionLabel>
      <div className="flex flex-wrap gap-1.5">
        {PERSONALITIES.map(p => (
          <Chip key={p} label={p} selected={cfg.personalities.includes(p)} onClick={() => togglePersonality(p)} size="sm" />
        ))}
      </div>

      <TextArea
        label="Extra description (optional)"
        value={cfg.description}
        onChange={(e) => set('description', e.target.value)}
        placeholder="Unique features, accessories, mood..."
        rows={3}
      />

      <Button
        onClick={handleGenerate}
        loading={isApplying}
        disabled={!isReady}
        icon={<Sparkles size={16} />}
        size="lg"
        className={`w-full mt-2 ${isReady ? 'generate-ready' : ''}`}
      >
        Generate Character
        <span className="font-jet text-xs ml-1 opacity-70">{cost}</span>
      </Button>
    </div>
  );
};

export default CreateTool;
