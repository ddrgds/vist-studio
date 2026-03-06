import React, { useState } from 'react';
import { enhancePrompt } from '../services/geminiService';

interface CharacteristicsInputProps {
  value: string;
  onChange: (value: string) => void;
}

const SUGGESTIONS = {
  'Rostro': [
    { label: 'Ojos azules', value: 'ojos azules cristalinos' },
    { label: 'Ojos verdes', value: 'ojos verdes esmeralda' },
    { label: 'Ojos marrones', value: 'ojos marrones profundos' },
    { label: 'Pecas', value: 'pecas sutiles en la nariz y mejillas' },
    { label: 'Labios carnosos', value: 'labios carnosos y definidos' },
    { label: 'Mandíbula marcada', value: 'línea de la mandíbula definida' },
    { label: 'Sonrisa leve', value: 'una leve sonrisa misteriosa' },
    { label: 'Mirada intensa', value: 'mirada intensa y directa a la cámara' },
    { label: 'Piel bronceada', value: 'piel bronceada y brillante' },
  ],
  'Pelo': [
    { label: 'Largo y ondulado', value: 'pelo largo y ondulado color castaño' },
    { label: 'Corte Bob', value: 'corte de pelo bob, liso y elegante' },
    { label: 'Rubio platino', value: 'pelo rubio platino' },
    { label: 'Pelirrojo', value: 'pelo rojo vibrante' },
    { label: 'Recogido', value: 'pelo recogido en un moño desordenado' },
    { label: 'Flequillo', value: 'flequillo recto sobre los ojos' },
    { label: 'Pelo rizado', value: 'pelo rizado y voluminoso' },
    { label: 'Coleta alta', value: 'coleta alta y pulida' },
    { label: 'Negro azabache', value: 'pelo negro azabache' },
  ],
  'Detalles': [
    { label: 'Piel perfecta', value: 'piel de porcelana, poros de piel detallados' },
    { label: 'Iluminación suave', value: 'iluminación de estudio suave' },
    { label: 'Luz dorada', value: 'luz de la hora dorada' },
    { label: 'Cinemático', value: 'aspecto cinematográfico, grano de película sutil' },
    { label: 'Hiperrealista', value: 'hiperrealista, 4k, octane render' },
    { label: 'Lente 85mm', value: 'disparado con una lente de 85 mm, f/1.8' },
    { label: 'Fondo Bokeh', value: 'fondo desenfocado con bokeh' },
    { label: 'Luz de neón', value: 'iluminación de neón' },
    { label: 'Estilo Vogue', value: 'estilo editorial de Vogue' },
  ],
  'Realismo': [
    { label: 'Pelos sueltos', value: 'messy flyaway hairs' },
    { label: 'Textura en labios', value: 'dry skin texture on lips' },
    { label: 'Ropa arrugada', value: 'slightly wrinkled clothes' },
    { label: 'Mejillas sonrojadas', value: 'flushed cheeks' },
    { label: 'Brillo de sudor', value: 'subtle sweat sheen on forehead' },
    { label: 'Poros visibles', value: 'detailed skin pores, realistic skin texture' },
    { label: 'Vello facial', value: 'subtle peach fuzz on the face' },
    { label: 'Reflejo en ojos', value: 'detailed catchlight in the eyes' },
  ],
  'Maquillaje': [
    { label: 'Ojos ahumados', value: 'smokey eyeshadow' },
    { label: 'Labial rojo', value: 'bold red lipstick' },
    { label: 'Look natural', value: 'natural no-makeup makeup look' },
    { label: 'Sombra con glitter', value: 'glitter eyeshadow' },
    { label: 'Delineado Cat Eye', value: 'sharp winged eyeliner' },
    { label: 'Labios Glossy', value: 'glossy lips' },
    { label: 'Piel Dewy', value: 'dewy skin finish, glass skin' },
    { label: 'Cejas laminadas', value: 'laminated brows' },
  ]
};

type SuggestionCategory = keyof typeof SUGGESTIONS;

const CharacteristicsInput: React.FC<CharacteristicsInputProps> = ({ value, onChange }) => {
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [activeCategory, setActiveCategory] = useState<SuggestionCategory>('Rostro');

  const handleEnhance = async () => {
    if (!value.trim()) return;
    setIsEnhancing(true);
    try {
      const enhanced = await enhancePrompt(value, "Apariencia Física del Modelo");
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
          <label htmlFor="characteristics-input" className="text-sm font-medium text-zinc-400">Características Físicas</label>
        </div>
        <div className="relative group">
          <textarea
            id="characteristics-input"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Ej. rubia, ojos azules, pecas..."
            aria-label="Describe las características físicas del modelo"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 pr-10 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none h-24 placeholder:text-zinc-600 transition-all"
          />
          <button
            onClick={handleEnhance}
            disabled={isEnhancing || !value.trim()}
            aria-label={isEnhancing ? 'Mejorando prompt con IA...' : 'Mejorar descripción con IA'}
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
        <p id="suggestions-label" className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Sugerencias</p>
        <div role="tablist" aria-label="Categorías de sugerencias" className="flex border-b border-zinc-800 text-xs mt-2 overflow-x-auto">
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
              aria-label={`Agregar sugerencia: ${suggestion.label}`}
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