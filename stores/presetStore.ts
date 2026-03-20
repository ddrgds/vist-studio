import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CustomPreset {
  id: string;
  name: string;
  createdAt: number;
  // Generation settings
  prompt?: string;
  negativePrompt?: string;
  aspectRatio?: string;
  engine?: string;
  tier?: string;
  // Photo session settings
  poses?: string[];
  vibes?: string[];
  realisticMode?: boolean;
  gridMode?: boolean;
}

interface PresetStore {
  presets: CustomPreset[];
  savePreset: (preset: Omit<CustomPreset, 'id' | 'createdAt'>) => void;
  deletePreset: (id: string) => void;
  loadPreset: (id: string) => CustomPreset | undefined;
}

export const usePresetStore = create<PresetStore>()(
  persist(
    (set, get) => ({
      presets: [],

      savePreset: (preset) => {
        const newPreset: CustomPreset = {
          ...preset,
          id: `preset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          createdAt: Date.now(),
        };
        set((state) => ({
          presets: [newPreset, ...state.presets],
        }));
      },

      deletePreset: (id) => {
        set((state) => ({
          presets: state.presets.filter((p) => p.id !== id),
        }));
      },

      loadPreset: (id) => {
        return get().presets.find((p) => p.id === id);
      },
    }),
    {
      name: 'vist-custom-presets',
    }
  )
);
