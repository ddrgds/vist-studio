import React, { useState } from 'react';
import { enhancePrompt } from '../services/geminiService';

interface CharacteristicsInputProps {
  value: string;
  onChange: (value: string) => void;
}

const SUGGESTIONS = {
  'Face': [
    { label: 'Blue eyes', value: 'crystal blue eyes' },
    { label: 'Green eyes', value: 'emerald green eyes' },
    { label: 'Brown eyes', value: 'deep brown eyes' },
    { label: 'Freckles', value: 'subtle freckles on nose and cheeks' },
    { label: 'Full lips', value: 'full and defined lips' },
    { label: 'Strong jawline', value: 'defined jawline' },
    { label: 'Slight smile', value: 'a slight mysterious smile' },
    { label: 'Intense gaze', value: 'intense gaze looking directly at the camera' },
    { label: 'Tanned skin', value: 'tanned and glowing skin' },
  ],
  'Hair': [
    { label: 'Long & wavy', value: 'long wavy brown hair' },
    { label: 'Bob cut', value: 'sleek and elegant bob haircut' },
    { label: 'Platinum blonde', value: 'platinum blonde hair' },
    { label: 'Redhead', value: 'vibrant red hair' },
    { label: 'Updo', value: 'hair pulled up in a messy bun' },
    { label: 'Bangs', value: 'straight bangs over the eyes' },
    { label: 'Curly hair', value: 'curly and voluminous hair' },
    { label: 'High ponytail', value: 'sleek high ponytail' },
    { label: 'Jet black', value: 'jet black hair' },
  ],
  'Details': [
    { label: 'Flawless skin', value: 'porcelain skin, detailed skin pores' },
    { label: 'Soft lighting', value: 'soft studio lighting' },
    { label: 'Golden light', value: 'golden hour light' },
    { label: 'Cinematic', value: 'cinematic look, subtle film grain' },
    { label: 'Hyperrealistic', value: 'hyperrealistic, 4k, octane render' },
    { label: '85mm lens', value: 'shot with an 85mm lens, f/1.8' },
    { label: 'Bokeh background', value: 'blurred background with bokeh' },
    { label: 'Neon light', value: 'neon lighting' },
    { label: 'Vogue style', value: 'Vogue editorial style' },
  ],
  'Realism': [
    { label: 'Flyaway hairs', value: 'messy flyaway hairs' },
    { label: 'Lip texture', value: 'dry skin texture on lips' },
    { label: 'Wrinkled clothes', value: 'slightly wrinkled clothes' },
    { label: 'Flushed cheeks', value: 'flushed cheeks' },
    { label: 'Sweat sheen', value: 'subtle sweat sheen on forehead' },
    { label: 'Visible pores', value: 'detailed skin pores, realistic skin texture' },
    { label: 'Peach fuzz', value: 'subtle peach fuzz on the face' },
    { label: 'Eye catchlight', value: 'detailed catchlight in the eyes' },
  ],
  'Makeup': [
    { label: 'Smokey eyes', value: 'smokey eyeshadow' },
    { label: 'Red lipstick', value: 'bold red lipstick' },
    { label: 'Natural look', value: 'natural no-makeup makeup look' },
    { label: 'Glitter shadow', value: 'glitter eyeshadow' },
    { label: 'Cat eye liner', value: 'sharp winged eyeliner' },
    { label: 'Glossy lips', value: 'glossy lips' },
    { label: 'Dewy skin', value: 'dewy skin finish, glass skin' },
    { label: 'Laminated brows', value: 'laminated brows' },
  ]
};

type SuggestionCategory = keyof typeof SUGGESTIONS;

const CharacteristicsInput: React.FC<CharacteristicsInputProps> = ({ value, onChange }) => {
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [activeCategory, setActiveCategory] = useState<SuggestionCategory>('Face');

  const handleEnhance = async () => {
    if (!value.trim()) return;
    setIsEnhancing(true);
    try {
      const enhanced = await enhancePrompt(value, "Model Physical Appearance");
      onChange(enhanced);
    } catch (e) {
      console.error(e);
    } finally {
      setIsEnhancing(false);
    }
  };

  const addSuggestion = (suggestion: string) => {
    let currentValue = value;
    if (currentValue.trim() === '') {
      onChange(suggestion);
      return;
    }
    
    if (currentValue.length > 0 && !currentValue.endsWith(' ') && !currentValue.endsWith(',')) {
      currentValue += ', ';
    } else if (currentValue.length > 0 && currentValue.endsWith(',')) {
      currentValue += ' ';
    }

    onChange(currentValue + suggestion);
  };

  return (
    <div className="space-y-3 p-3 bg-zinc-900/50 rounded-xl border border-zinc-800">
      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <label htmlFor="characteristics-input" className="text-sm font-medium text-zinc-400">Physical Characteristics</label>
        </div>
        <div className="relative group">
          <textarea
            id="characteristics-input"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="E.g. blonde, blue eyes, freckles..."
            aria-label="Describe the model's physical characteristics"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 pr-10 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none h-24 placeholder:text-zinc-600 transition-all"
          />
          <button
            onClick={handleEnhance}
            disabled={isEnhancing || !value.trim()}
            aria-label={isEnhancing ? 'Enhancing prompt with AI...' : 'Enhance description with AI'}
            className={`
              absolute top-3 right-3 p-1 rounded-md transition-all duration-200
              ${!value.trim() ? 'text-zinc-700 cursor-not-allowed' : 'text-purple-500 hover:bg-purple-500/10 hover:text-purple-400 cursor-pointer'}
            `}
          >
            {isEnhancing ? (
              <svg aria-hidden="true" className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
                <path d="M5 3v4"/><path d="M9 5H1"/><path d="M20 19v4"/><path d="M22 21h-4"/>
              </svg>
            )}
          </button>
        </div>
      </div>
      
      <div className="pt-2">
        <p id="suggestions-label" className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Suggestions</p>
        <div role="tablist" aria-label="Suggestion categories" className="flex border-b border-zinc-800 text-xs mt-2 overflow-x-auto">
          {(Object.keys(SUGGESTIONS) as SuggestionCategory[]).map(category => (
            <button
              key={category}
              role="tab"
              aria-selected={activeCategory === category}
              onClick={() => setActiveCategory(category)}
              className={`px-3 py-1.5 transition-colors font-medium -mb-px whitespace-nowrap ${
                activeCategory === category
                  ? 'text-purple-300 border-b-2 border-purple-400'
                  : 'text-zinc-500 hover:text-zinc-300 border-b-2 border-transparent'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
        <div role="tabpanel" aria-labelledby="suggestions-label" className="pt-3 flex flex-wrap gap-2">
          {SUGGESTIONS[activeCategory].map(suggestion => (
            <button
              key={suggestion.label}
              onClick={() => addSuggestion(suggestion.value)}
              aria-label={`Add suggestion: ${suggestion.label}`}
              className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-full text-xs transition-colors"
            >
              + {suggestion.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CharacteristicsInput;