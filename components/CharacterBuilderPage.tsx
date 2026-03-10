import React, { useState, useCallback } from 'react';
import {
  Check,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  User,
  Palette,
  Heart,
  Target,
  RefreshCw,
  Star,
  Gamepad2,
  Brush,
  Skull,
  Wand2,
  Zap,
} from 'lucide-react';
import type { AppPage } from './SidebarNav';

// ─── Data ───────────────────────────────────────────────────

const VISUAL_STYLES = [
  { id: 'realistic', label: 'Realistic', desc: 'Ultra realistic, almost human', icon: <Star className="w-5 h-5" style={{ color: '#FFB347' }} /> },
  { id: 'anime', label: 'Anime', desc: 'Japanese anime/manga style', icon: <span className="text-lg">👾</span> },
  { id: '3dcgi', label: '3D CGI', desc: 'High quality 3D rendering', icon: <Gamepad2 className="w-5 h-5" style={{ color: '#B8A9A5' }} /> },
  { id: 'cartoon', label: 'Cartoon', desc: 'Stylized illustration', icon: <Brush className="w-5 h-5" style={{ color: '#FF8A65' }} /> },
  { id: 'cyberpunk', label: 'Cyberpunk', desc: 'Futuristic neon aesthetic', icon: <Skull className="w-5 h-5" style={{ color: '#A78BFA' }} /> },
  { id: 'fantasy', label: 'Fantasy', desc: 'Magical and fantastical', icon: <Wand2 className="w-5 h-5" style={{ color: '#22D3EE' }} /> },
];

const ETHNICITIES = ['Latina', 'Asian', 'European', 'African', 'Arab', 'Mixed'];
const HAIR_COLORS = ['Black', 'Brown', 'Blonde', 'Red', 'Pink', 'Blue', 'White', 'Gradient'];
const EYE_COLORS = ['Brown', 'Green', 'Blue', 'Gray', 'Hazel', 'Violet'];
const BODY_TYPES = ['Slim', 'Athletic', 'Curvy', 'Natural', 'Muscular'];
const PERSONALITIES = ['Sophisticated', 'Youthful', 'Mysterious', 'Cheerful', 'Rebellious', 'Elegant'];
const NICHES = [
  'Fashion & Lifestyle',
  'Fitness & Health',
  'Tech & Gaming',
  'Beauty & Makeup',
  'Travel & Luxe',
  'Music & Art',
];

// ─── Types ──────────────────────────────────────────────────

interface CharacterBuilderState {
  name: string;
  style: string;
  age: number;
  ethnicity: string;
  hairColor: string;
  eyeColor: string;
  bodyType: string;
  personalities: string[];
  description: string;
  niche: string;
}

interface CharacterBuilderPageProps {
  onGenerate: (characteristics: string, style: string, niche: string) => void;
  onNavigate: (page: AppPage) => void;
  isGenerating?: boolean;
}

// ─── Steps ──────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: 'Style', icon: Palette },
  { id: 2, label: 'Appearance', icon: User },
  { id: 3, label: 'Personality', icon: Heart },
  { id: 4, label: 'Niche', icon: Target },
];

// ─── Component ──────────────────────────────────────────────

const CharacterBuilderPage: React.FC<CharacterBuilderPageProps> = ({ onGenerate, onNavigate, isGenerating }) => {
  const [step, setStep] = useState(1);
  const [state, setState] = useState<CharacterBuilderState>({
    name: '',
    style: 'realistic',
    age: 24,
    ethnicity: '',
    hairColor: '',
    eyeColor: '',
    bodyType: '',
    personalities: [],
    description: '',
    niche: '',
  });

  const set = useCallback(<K extends keyof CharacterBuilderState>(key: K, value: CharacterBuilderState[K]) => {
    setState(prev => ({ ...prev, [key]: value }));
  }, []);

  const togglePersonality = (p: string) => {
    setState(prev => ({
      ...prev,
      personalities: prev.personalities.includes(p)
        ? prev.personalities.filter(x => x !== p)
        : [...prev.personalities, p],
    }));
  };

  const canProceed = (): boolean => {
    switch (step) {
      case 1: return !!state.style;
      case 2: return !!state.ethnicity || !!state.hairColor;
      case 3: return state.personalities.length > 0 || !!state.description;
      case 4: return !!state.niche;
      default: return false;
    }
  };

  const handleGenerate = () => {
    const parts: string[] = [];
    if (state.style && state.style !== 'realistic') parts.push(`${state.style} style`);
    if (state.age) parts.push(`${state.age} years old`);
    if (state.ethnicity) parts.push(`${state.ethnicity}`);
    if (state.bodyType) parts.push(`${state.bodyType} build`);
    if (state.hairColor) parts.push(`${state.hairColor} hair`);
    if (state.eyeColor) parts.push(`${state.eyeColor} eyes`);
    if (state.personalities.length) parts.push(state.personalities.join(', ').toLowerCase() + ' personality');
    if (state.description) parts.push(state.description);

    const characteristics = parts.join(', ');
    onGenerate(characteristics, state.style, state.niche);
  };

  // ─── Chip helper ──────────────────────────────────────────
  const Chip: React.FC<{ label: string; selected: boolean; onClick: () => void }> = ({ label, selected, onClick }) => (
    <button
      onClick={onClick}
      className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150"
      style={{
        background: selected ? 'rgba(255,92,53,0.15)' : '#0F0C0C',
        border: selected ? '1.5px solid #FF5C35' : '1.5px solid #1A1210',
        color: selected ? '#FF5C35' : '#6B5A56',
      }}
      onMouseEnter={e => { if (!selected) (e.currentTarget as HTMLElement).style.borderColor = '#2A1F1C'; }}
      onMouseLeave={e => { if (!selected) (e.currentTarget as HTMLElement).style.borderColor = '#1A1210'; }}
    >
      {label}
    </button>
  );

  // ─── Render steps ─────────────────────────────────────────

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            {/* Name */}
            <div>
              <label className="text-sm font-semibold mb-2 block" style={{ color: '#B8A9A5' }}>Character Name</label>
              <input
                type="text"
                value={state.name}
                onChange={e => set('name', e.target.value)}
                placeholder="E.g. Luna, Nova, Kai..."
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                style={{ background: '#0F0C0C', border: '1.5px solid #1A1210', color: '#F5EDE8' }}
                onFocus={e => { (e.target as HTMLElement).style.borderColor = '#FF5C35'; }}
                onBlur={e => { (e.target as HTMLElement).style.borderColor = '#1A1210'; }}
              />
            </div>
            {/* Visual Style */}
            <div>
              <label className="text-sm font-semibold mb-3 block" style={{ color: '#B8A9A5' }}>Visual Style</label>
              <div className="grid grid-cols-2 gap-3">
                {VISUAL_STYLES.map(s => (
                  <button
                    key={s.id}
                    onClick={() => set('style', s.id)}
                    className="flex flex-col gap-2 p-4 rounded-xl text-left transition-all duration-150"
                    style={{
                      background: state.style === s.id ? 'rgba(255,92,53,0.08)' : '#0F0C0C',
                      border: state.style === s.id ? '1.5px solid #FF5C35' : '1.5px solid #1A1210',
                    }}
                    onMouseEnter={e => { if (state.style !== s.id) (e.currentTarget as HTMLElement).style.borderColor = '#2A1F1C'; }}
                    onMouseLeave={e => { if (state.style !== s.id) (e.currentTarget as HTMLElement).style.borderColor = '#1A1210'; }}
                  >
                    {s.icon}
                    <div className="text-sm font-bold" style={{ color: state.style === s.id ? '#F5EDE8' : '#B8A9A5' }}>{s.label}</div>
                    <div className="text-[11px]" style={{ color: '#6B5A56' }}>{s.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            {/* Age */}
            <div>
              <label className="text-sm font-semibold mb-2 block" style={{ color: '#B8A9A5' }}>
                Age: <span style={{ color: '#FF5C35' }}>{state.age} years</span>
              </label>
              <div className="relative">
                <input
                  type="range"
                  min={18}
                  max={40}
                  value={state.age}
                  onChange={e => set('age', Number(e.target.value))}
                  className="w-full accent-[#FF5C35]"
                  style={{ accentColor: '#FF5C35' }}
                />
                <div className="flex justify-between text-[10px] mt-1" style={{ color: '#4A3A36' }}>
                  <span>18</span><span>40</span>
                </div>
              </div>
            </div>
            {/* Ethnicity */}
            <div>
              <label className="text-sm font-semibold mb-2 block" style={{ color: '#B8A9A5' }}>Ethnicity / Origin</label>
              <div className="flex flex-wrap gap-2">
                {ETHNICITIES.map(e => <Chip key={e} label={e} selected={state.ethnicity === e} onClick={() => set('ethnicity', e)} />)}
              </div>
            </div>
            {/* Hair */}
            <div>
              <label className="text-sm font-semibold mb-2 block" style={{ color: '#B8A9A5' }}>Hair Color</label>
              <div className="flex flex-wrap gap-2">
                {HAIR_COLORS.map(c => <Chip key={c} label={c} selected={state.hairColor === c} onClick={() => set('hairColor', c)} />)}
              </div>
            </div>
            {/* Eyes */}
            <div>
              <label className="text-sm font-semibold mb-2 block" style={{ color: '#B8A9A5' }}>Eye Color</label>
              <div className="flex flex-wrap gap-2">
                {EYE_COLORS.map(c => <Chip key={c} label={c} selected={state.eyeColor === c} onClick={() => set('eyeColor', c)} />)}
              </div>
            </div>
            {/* Body */}
            <div>
              <label className="text-sm font-semibold mb-2 block" style={{ color: '#B8A9A5' }}>Body Type</label>
              <div className="flex flex-wrap gap-2">
                {BODY_TYPES.map(b => <Chip key={b} label={b} selected={state.bodyType === b} onClick={() => set('bodyType', b)} />)}
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            {/* Personality chips */}
            <div>
              <label className="text-sm font-semibold mb-2 block" style={{ color: '#B8A9A5' }}>Personality</label>
              <div className="grid grid-cols-2 gap-2">
                {PERSONALITIES.map(p => (
                  <Chip key={p} label={p} selected={state.personalities.includes(p)} onClick={() => togglePersonality(p)} />
                ))}
              </div>
            </div>
            {/* Additional description */}
            <div>
              <label className="text-sm font-semibold mb-2 block" style={{ color: '#B8A9A5' }}>Additional Description (optional)</label>
              <textarea
                value={state.description}
                onChange={e => set('description', e.target.value)}
                placeholder="Describe specific traits: unique features, accessories, mood..."
                rows={4}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none transition-all"
                style={{ background: '#0F0C0C', border: '1.5px solid #1A1210', color: '#F5EDE8' }}
                onFocus={e => { (e.target as HTMLElement).style.borderColor = '#FF5C35'; }}
                onBlur={e => { (e.target as HTMLElement).style.borderColor = '#1A1210'; }}
              />
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <label className="text-sm font-semibold mb-2 block" style={{ color: '#B8A9A5' }}>Content Niche</label>
            {NICHES.map(n => (
              <button
                key={n}
                onClick={() => set('niche', n)}
                className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-left text-sm font-medium transition-all duration-150"
                style={{
                  background: state.niche === n ? 'rgba(255,92,53,0.08)' : '#0F0C0C',
                  border: state.niche === n ? '1.5px solid #FF5C35' : '1.5px solid #1A1210',
                  color: state.niche === n ? '#F5EDE8' : '#B8A9A5',
                }}
                onMouseEnter={e => { if (state.niche !== n) (e.currentTarget as HTMLElement).style.borderColor = '#2A1F1C'; }}
                onMouseLeave={e => { if (state.niche !== n) (e.currentTarget as HTMLElement).style.borderColor = '#1A1210'; }}
              >
                {n}
                {state.niche === n && <Check className="w-4 h-4" style={{ color: '#FF5C35' }} />}
              </button>
            ))}
          </div>
        );
    }
  };

  return (
    <div className="h-full flex" style={{ background: '#0D0A0A' }}>
      {/* ─── Left: Wizard ─── */}
      <div className="flex-1 flex flex-col min-w-0 max-w-[640px]" style={{ borderRight: '1px solid #1A1210' }}>
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold mb-1" style={{ color: '#FF5C35' }}>
            <Sparkles className="w-3 h-3" /> AI Character Creator
          </div>
          <h1 className="text-xl font-black tracking-tight" style={{ color: '#F5EDE8', fontFamily: 'var(--font-display)' }}>
            Design Your Character
          </h1>
          <p className="text-xs mt-1" style={{ color: '#6B5A56' }}>
            Customize every detail of your virtual character
          </p>
        </div>

        {/* Step indicator */}
        <div className="px-6 pb-4">
          <div className="flex items-center gap-1">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const isCompleted = step > s.id;
              const isCurrent = step === s.id;
              return (
                <React.Fragment key={s.id}>
                  <button
                    onClick={() => { if (isCompleted) setStep(s.id); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all"
                    style={{
                      background: isCurrent ? 'rgba(255,92,53,0.15)' : 'transparent',
                      border: isCurrent ? '1px solid rgba(255,92,53,0.3)' : '1px solid transparent',
                      color: isCompleted ? '#22C55E' : isCurrent ? '#FF5C35' : '#4A3A36',
                      cursor: isCompleted ? 'pointer' : 'default',
                    }}
                  >
                    {isCompleted ? <Check className="w-3 h-3" /> : <Icon className="w-3 h-3" />}
                    {s.label}
                  </button>
                  {i < STEPS.length - 1 && (
                    <ChevronRight className="w-3 h-3 shrink-0" style={{ color: '#2A1F1C' }} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Step content (scrollable) */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {renderStep()}
        </div>

        {/* Action buttons */}
        <div className="px-6 py-4" style={{ borderTop: '1px solid #1A1210' }}>
          {step < 4 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!canProceed()}
              className="w-full py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
              style={{ background: 'linear-gradient(135deg, #FF5C35, #FF8A65)' }}
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleGenerate}
              disabled={!canProceed() || isGenerating}
              className="w-full py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
              style={{ background: 'linear-gradient(135deg, #FF5C35, #FF8A65)' }}
            >
              <Sparkles className="w-4 h-4" />
              {isGenerating ? 'Generating...' : 'Generate with AI'}
            </button>
          )}
          {step > 1 && (
            <button
              onClick={() => setStep(s => s - 1)}
              className="w-full py-2.5 mt-2 rounded-xl text-sm font-medium flex items-center justify-center gap-1 transition-colors"
              style={{ color: '#6B5A56' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#B8A9A5'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#6B5A56'; }}
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>
          )}
        </div>
      </div>

      {/* ─── Right: Preview ─── */}
      <div className="hidden lg:flex flex-1 flex-col items-center justify-center p-8" style={{ background: '#0A0808' }}>
        {/* Preview header */}
        <div className="w-full max-w-md flex items-center justify-between mb-8">
          <div>
            <h2 className="text-base font-bold" style={{ color: '#F5EDE8' }}>
              {state.name || 'My Character'} — Preview
            </h2>
            <p className="text-xs mt-0.5" style={{ color: '#6B5A56' }}>
              {state.style} · {state.niche || 'No niche selected'}
            </p>
          </div>
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{ color: '#6B5A56', border: '1px solid #1A1210' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#2A1F1C'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#1A1210'; }}
          >
            <RefreshCw className="w-3 h-3" /> Regenerate
          </button>
        </div>

        {/* Preview circle placeholder */}
        <div
          className="w-56 h-56 rounded-full flex items-center justify-center mb-6"
          style={{ border: '2px dashed #2A1F1C' }}
        >
          <User className="w-12 h-12" style={{ color: '#2A1F1C' }} />
        </div>

        <p className="text-sm font-semibold mb-1" style={{ color: '#6B5A56' }}>Configure your character</p>
        <p className="text-xs mb-8" style={{ color: '#4A3A36' }}>Complete the steps and press Generate</p>

        {/* Summary chips */}
        <div className="flex flex-wrap gap-2 justify-center max-w-sm">
          {state.style && (
            <span className="px-3 py-1 rounded-full text-[11px] font-medium" style={{ background: '#161110', border: '1px solid #1A1210', color: '#B8A9A5' }}>
              {state.style}
            </span>
          )}
          {state.ethnicity && (
            <span className="px-3 py-1 rounded-full text-[11px] font-medium" style={{ background: '#161110', border: '1px solid #1A1210', color: '#B8A9A5' }}>
              {state.ethnicity}
            </span>
          )}
          {state.hairColor && (
            <span className="px-3 py-1 rounded-full text-[11px] font-medium" style={{ background: '#161110', border: '1px solid #1A1210', color: '#B8A9A5' }}>
              {state.hairColor} hair
            </span>
          )}
          {state.bodyType && (
            <span className="px-3 py-1 rounded-full text-[11px] font-medium" style={{ background: '#161110', border: '1px solid #1A1210', color: '#B8A9A5' }}>
              {state.bodyType}
            </span>
          )}
          {state.personalities.map(p => (
            <span key={p} className="px-3 py-1 rounded-full text-[11px] font-medium" style={{ background: 'rgba(255,92,53,0.08)', border: '1px solid rgba(255,92,53,0.2)', color: '#FF5C35' }}>
              {p}
            </span>
          ))}
          {state.niche && (
            <span className="px-3 py-1 rounded-full text-[11px] font-medium" style={{ background: '#161110', border: '1px solid #1A1210', color: '#FFB347' }}>
              {state.niche}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default CharacterBuilderPage;
