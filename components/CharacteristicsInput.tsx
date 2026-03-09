import React, { useState } from 'react';

interface CharacteristicsInputProps {
  value: string;
  onChange: (value: string) => void;
}

const CATEGORY_ICONS: Record<string, string> = {
  Face: '👁',
  Hair: '💇',
  Body: '🧍',
  Makeup: '💄',
  Style: '✨',
};

const SUGGESTIONS = {
  Face: [
    { label: 'Blue eyes', value: 'crystal blue eyes' },
    { label: 'Green eyes', value: 'emerald green eyes' },
    { label: 'Brown eyes', value: 'deep brown eyes' },
    { label: 'Hazel eyes', value: 'warm hazel eyes' },
    { label: 'Freckles', value: 'subtle freckles on nose and cheeks' },
    { label: 'Full lips', value: 'full and defined lips' },
    { label: 'Strong jaw', value: 'defined jawline' },
    { label: 'Soft smile', value: 'a slight mysterious smile' },
    { label: 'Intense gaze', value: 'intense gaze looking directly at the camera' },
    { label: 'Tanned', value: 'tanned and glowing skin' },
    { label: 'Fair skin', value: 'fair porcelain skin' },
    { label: 'Dark skin', value: 'rich dark skin tone' },
  ],
  Hair: [
    { label: 'Long wavy', value: 'long wavy hair' },
    { label: 'Bob cut', value: 'sleek elegant bob haircut' },
    { label: 'Platinum blonde', value: 'platinum blonde hair' },
    { label: 'Redhead', value: 'vibrant red hair' },
    { label: 'Jet black', value: 'jet black hair' },
    { label: 'Brunette', value: 'rich brown hair' },
    { label: 'Curly', value: 'curly voluminous hair' },
    { label: 'High ponytail', value: 'sleek high ponytail' },
    { label: 'Messy bun', value: 'hair pulled up in a messy bun' },
    { label: 'Bangs', value: 'straight bangs over the eyes' },
    { label: 'Braids', value: 'intricate braided hairstyle' },
    { label: 'Pixie cut', value: 'short pixie cut' },
  ],
  Body: [
    { label: '20s', value: 'in their early 20s' },
    { label: '30s', value: 'in their early 30s' },
    { label: 'Slim', value: 'slim build' },
    { label: 'Athletic', value: 'athletic toned body' },
    { label: 'Curvy', value: 'curvy figure' },
    { label: 'Tall', value: 'tall and slender' },
    { label: 'Petite', value: 'petite frame' },
    { label: 'Muscular', value: 'muscular build' },
  ],
  Makeup: [
    { label: 'Smokey eyes', value: 'smokey eyeshadow' },
    { label: 'Red lipstick', value: 'bold red lipstick' },
    { label: 'Natural', value: 'natural no-makeup makeup look' },
    { label: 'Glossy lips', value: 'glossy lips' },
    { label: 'Cat eye', value: 'sharp winged eyeliner' },
    { label: 'Dewy skin', value: 'dewy glass skin finish' },
    { label: 'Laminated brows', value: 'laminated brows' },
    { label: 'Glitter', value: 'glitter eyeshadow highlights' },
  ],
  Style: [
    { label: 'Flawless skin', value: 'porcelain skin, detailed pores' },
    { label: 'Flyaway hairs', value: 'messy flyaway hairs for realism' },
    { label: 'Flushed cheeks', value: 'flushed cheeks' },
    { label: 'Sweat sheen', value: 'subtle sweat sheen' },
    { label: 'Peach fuzz', value: 'subtle peach fuzz' },
    { label: 'Eye catchlight', value: 'detailed catchlight in eyes' },
    { label: 'Visible pores', value: 'realistic skin pores' },
    { label: 'Film grain', value: 'subtle cinematic film grain' },
  ],
};

type Category = keyof typeof SUGGESTIONS;

const CharacteristicsInput: React.FC<CharacteristicsInputProps> = ({ value, onChange }) => {
  const [activeCategory, setActiveCategory] = useState<Category>('Face');

  const toggleSuggestion = (suggestion: string) => {
    // If already present, remove it
    const lower = suggestion.toLowerCase();
    const parts = value.split(',').map(s => s.trim()).filter(Boolean);
    const idx = parts.findIndex(p => p.toLowerCase() === lower);
    if (idx >= 0) {
      parts.splice(idx, 1);
      onChange(parts.join(', '));
      return;
    }
    // Otherwise add it
    if (!value.trim()) { onChange(suggestion); return; }
    const sep = value.endsWith(',') ? ' ' : value.endsWith(' ') ? '' : ', ';
    onChange(value + sep + suggestion);
  };

  const isSuggestionActive = (suggestion: string) => {
    const lower = suggestion.toLowerCase();
    return value.split(',').some(p => p.trim().toLowerCase() === lower);
  };

  const categories = Object.keys(SUGGESTIONS) as Category[];

  return (
    <div>
      {/* Textarea */}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Age, ethnicity, features... e.g. 25yo, Asian, almond eyes"
        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-[12px] text-zinc-200 outline-none resize-none placeholder:text-zinc-500 focus:border-zinc-600 transition-colors leading-relaxed"
        rows={2}
      />

      {/* Category tabs — icon-first with tooltip on small widths */}
      <div className="flex gap-0.5 mt-2 overflow-x-auto">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            title={cat}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all whitespace-nowrap"
            style={activeCategory === cat
              ? { background: 'rgba(255,92,53,0.1)', border: '1px solid rgba(255,92,53,0.25)', color: '#FF5C35' }
              : { background: 'transparent', border: '1px solid transparent', color: '#8C7570' }
            }
          >
            <span className="text-[12px]">{CATEGORY_ICONS[cat]}</span>
            <span className="text-[10px]">{cat === 'Makeup' ? 'Look' : cat}</span>
          </button>
        ))}
      </div>

      {/* Suggestion chips with active/toggle feedback */}
      <div className="flex flex-wrap gap-1 mt-1.5">
        {SUGGESTIONS[activeCategory].map((s) => {
          const active = isSuggestionActive(s.value);
          return (
            <button
              key={s.label}
              onClick={() => toggleSuggestion(s.value)}
              className="text-[10px] px-2.5 py-1 rounded-full transition-all duration-150 font-medium"
              style={active
                ? { background: 'rgba(255,92,53,0.15)', border: '1px solid #FF5C35', color: '#FFB347' }
                : { background: 'rgba(255,255,255,0.04)', border: '1px solid #2A1F1C', color: '#8C7570' }
              }
              onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.color = '#D4C8C4'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,92,53,0.4)'; }}}
              onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.color = '#8C7570'; (e.currentTarget as HTMLElement).style.borderColor = '#2A1F1C'; }}}
            >
              {active ? '✓' : '+'} {s.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CharacteristicsInput;
