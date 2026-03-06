import React, { useState } from 'react';
import { enhancePrompt } from '../services/geminiService';

interface EnhancedInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  category: string;
  placeholder?: string;
  multiline?: boolean;
  presets?: { label: string; value: string }[];
}

const EnhancedInput: React.FC<EnhancedInputProps> = ({
  label, value, onChange, category, placeholder, multiline = false, presets
}) => {
  const [isEnhancing, setIsEnhancing] = useState(false);

  const handleEnhance = async () => {
    if (!value.trim()) return;
    setIsEnhancing(true);
    try {
      const enhanced = await enhancePrompt(value, category);
      onChange(enhanced);
    } catch (e) {
      console.error(e);
    } finally {
      setIsEnhancing(false);
    }
  };

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium text-zinc-400">{label}</label>
      </div>
      <div className="relative group">
        {multiline ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 pr-10 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none h-24 placeholder:text-zinc-600 transition-all"
          />
        ) : (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 pr-10 text-sm focus:ring-2 focus:ring-purple-500 outline-none placeholder:text-zinc-600 transition-all"
          />
        )}

        <button
          onClick={handleEnhance}
          disabled={isEnhancing || !value.trim()}
          className={`
            absolute top-3 right-3 p-1 rounded-md transition-all duration-200
            ${!value.trim() ? 'text-zinc-700 cursor-not-allowed' : 'text-purple-500 hover:bg-purple-500/10 hover:text-purple-400 cursor-pointer'}
          `}
          title="Mejorar prompt con IA"
        >
          {isEnhancing ? (
            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
              <path d="M5 3v4" /><path d="M9 5H1" /><path d="M20 19v4" /><path d="M22 21h-4" />
            </svg>
          )}
        </button>
      </div>

      {presets && presets.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {presets.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                const currentText = value ? value.trim() : '';
                const newText = currentText
                  ? `${currentText}, ${preset.value}`
                  : preset.value;
                onChange(newText);
              }}
              className="px-2 py-1 text-[10px] font-medium bg-zinc-800/80 hover:bg-purple-500/20 text-zinc-400 hover:text-purple-300 border border-zinc-700/50 hover:border-purple-500/30 rounded-md transition-colors"
            >
              {preset.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default EnhancedInput;