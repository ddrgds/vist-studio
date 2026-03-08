import React, { useState, useRef, useEffect, useCallback } from 'react';

interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  className?: string;
  style?: React.CSSProperties;
  suggestions?: string[];
}

const DEFAULT_SUGGESTIONS = [
  // Fashion & editorial
  "editorial fashion shoot, golden hour lighting",
  "street style portrait, Tokyo neon nights",
  "luxury brand campaign, minimalist studio",
  "high fashion magazine cover, dramatic lighting",
  "vintage film aesthetic, European café",
  "runway fashion, backstage candid",
  // Lifestyle
  "athletic wear, outdoor mountain scenery",
  "casual chic, rooftop sunset city skyline",
  "cozy café setting, warm morning light",
  "urban rooftop, golden hour, city skyline",
  "beach lifestyle, natural sunlight",
  // Creative
  "fantasy character, dramatic cinematic lighting",
  "cyberpunk aesthetic, neon glow, rain",
  "ethereal portrait, soft pastel colors",
  "film noir, black and white, moody shadows",
  "retro 70s vibe, warm color grading",
  // Specific styles
  "swimwear editorial, tropical beach paradise",
  "formal evening gown, ballroom setting",
  "streetwear lookbook, graffiti wall backdrop",
  "professional headshot, clean background",
  "fitness photoshoot, gym environment",
  // Modifiers
  "shot on 85mm lens, f/1.4, bokeh background",
  "cinematic color grading, 4K, film grain",
  "studio lighting, soft diffused light",
  "natural light, window lit, intimate",
  "dramatic side lighting, Rembrandt style",
  // Scenarios
  "walking through Paris streets, autumn leaves",
  "sitting at a luxury restaurant, candlelight",
  "standing on a cliff overlooking the ocean",
  "leaning against a vintage car, desert road",
  "dancing in the rain, city lights reflected",
];

const AutocompleteInput: React.FC<AutocompleteInputProps> = ({
  value,
  onChange,
  placeholder,
  onKeyDown,
  className,
  style,
  suggestions = DEFAULT_SUGGESTIONS,
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [filtered, setFiltered] = useState<string[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filterSuggestions = useCallback((query: string) => {
    if (!query.trim() || query.length < 2) {
      setFiltered([]);
      setShowSuggestions(false);
      return;
    }
    const words = query.toLowerCase().split(/\s+/);
    const matches = suggestions
      .filter(s => words.some(w => s.toLowerCase().includes(w)))
      .filter(s => s.toLowerCase() !== query.toLowerCase())
      .slice(0, 6);
    setFiltered(matches);
    setShowSuggestions(matches.length > 0);
    setSelectedIndex(-1);
  }, [suggestions]);

  useEffect(() => {
    filterSuggestions(value);
  }, [value, filterSuggestions]);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && listRef.current) {
      const items = listRef.current.children;
      if (items[selectedIndex]) {
        (items[selectedIndex] as HTMLElement).scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  const handleSelect = (suggestion: string) => {
    onChange(suggestion);
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showSuggestions && filtered.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, filtered.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, -1));
        return;
      }
      if (e.key === 'Tab' && selectedIndex >= 0) {
        e.preventDefault();
        handleSelect(filtered[selectedIndex]);
        return;
      }
      if (e.key === 'Escape') {
        setShowSuggestions(false);
        return;
      }
    }
    onKeyDown?.(e);
  };

  return (
    <div ref={wrapperRef} className="relative flex-1">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={className}
        style={style}
        onKeyDown={handleKeyDown}
        onFocus={() => { if (filtered.length > 0) setShowSuggestions(true); }}
        autoComplete="off"
      />

      {/* Suggestions dropdown */}
      {showSuggestions && filtered.length > 0 && (
        <div
          ref={listRef}
          className="absolute bottom-full left-0 right-0 mb-1 rounded-xl overflow-hidden z-50 max-h-48 overflow-y-auto custom-scrollbar"
          style={{ background: '#1E1614', border: '1px solid #2A1F1C', boxShadow: '0 -8px 24px rgba(0,0,0,0.4)' }}
        >
          {filtered.map((s, i) => (
            <button
              key={s}
              onClick={() => handleSelect(s)}
              className="w-full text-left px-3 py-2 text-[11px] transition-colors flex items-center gap-2"
              style={{
                color: i === selectedIndex ? '#F5EDE8' : '#B8A9A5',
                background: i === selectedIndex ? 'rgba(255,92,53,0.1)' : 'transparent',
              }}
              onMouseEnter={() => setSelectedIndex(i)}
            >
              <span className="text-[9px] flex-shrink-0" style={{ color: '#FF5C35', opacity: 0.5 }}>↗</span>
              <span className="truncate">{highlightMatch(s, value)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// Highlight matching portion
function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const words = query.toLowerCase().split(/\s+/).filter(w => w.length >= 2);
  if (words.length === 0) return text;

  const regex = new RegExp(`(${words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  const parts = text.split(regex);

  return parts.map((part, i) =>
    words.some(w => part.toLowerCase() === w)
      ? <strong key={i} style={{ color: '#FF5C35' }}>{part}</strong>
      : part
  );
}

export default AutocompleteInput;
