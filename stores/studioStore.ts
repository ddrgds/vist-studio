import { create } from 'zustand';
import type { Resolution } from '../models/types';
import { DEFAULT_MODEL_ID } from '../models/registry';

export type ToolId = 'create' | 'pose' | 'faceswap' | 'relight' | 'camera' | 'objects' | 'scenes' | 'aiedit' | 'session' | 'face360';

interface StudioState {
  // Canvas
  canvasImage: string | undefined;
  undoStack: string[];
  redoStack: string[];

  // Tool & Model
  activeTool: ToolId;
  selectedModelId: string;
  resolution: Resolution;

  // Reference
  referencePhoto: string | null;

  // Status
  isApplying: boolean;
  progress: number;

  // Character creation (inline, no wizard)
  characterConfig: {
    name: string;
    style: string;
    ethnicity: string;
    hairColor: string;
    eyeColor: string;
    bodyType: string;
    age: number;
    personalities: string[];
    description: string;
    niche: string;
  };

  // Photo session
  sessionResults: { url: string; index: number }[];
  sessionSaved: boolean;

  // 360 Face
  face360Results: { angle: string; url: string }[];

  // Actions
  setCanvasImage: (url: string | undefined) => void;
  pushCanvas: (url: string) => void;
  undo: () => void;
  redo: () => void;
  setActiveTool: (tool: ToolId) => void;
  setSelectedModelId: (id: string) => void;
  setResolution: (res: Resolution) => void;
  setReferencePhoto: (url: string | null) => void;
  setIsApplying: (v: boolean) => void;
  setProgress: (v: number) => void;
  updateCharacterConfig: <K extends keyof StudioState['characterConfig']>(key: K, value: StudioState['characterConfig'][K]) => void;
  resetCharacterConfig: () => void;
  setSessionResults: (results: { url: string; index: number }[]) => void;
  setSessionSaved: (v: boolean) => void;
  setFace360Results: (results: { angle: string; url: string }[]) => void;
}

const defaultCharConfig: StudioState['characterConfig'] = {
  name: '',
  style: 'realistic',
  ethnicity: '',
  hairColor: '',
  eyeColor: '',
  bodyType: '',
  age: 24,
  personalities: [],
  description: '',
  niche: '',
};

export const useStudioStore = create<StudioState>((set) => ({
  canvasImage: undefined,
  undoStack: [],
  redoStack: [],
  activeTool: 'create',
  selectedModelId: DEFAULT_MODEL_ID,
  resolution: '2K',
  referencePhoto: null,
  isApplying: false,
  progress: 0,
  characterConfig: { ...defaultCharConfig },
  sessionResults: [],
  sessionSaved: false,
  face360Results: [],

  setCanvasImage: (url) => set({ canvasImage: url }),

  pushCanvas: (url) => set((s) => ({
    canvasImage: url,
    undoStack: s.canvasImage ? [...s.undoStack, s.canvasImage] : s.undoStack,
    redoStack: [],
  })),

  undo: () => set((s) => {
    if (s.undoStack.length === 0) return s;
    const prev = s.undoStack[s.undoStack.length - 1];
    return {
      canvasImage: prev,
      undoStack: s.undoStack.slice(0, -1),
      redoStack: s.canvasImage ? [...s.redoStack, s.canvasImage] : s.redoStack,
    };
  }),

  redo: () => set((s) => {
    if (s.redoStack.length === 0) return s;
    const next = s.redoStack[s.redoStack.length - 1];
    return {
      canvasImage: next,
      redoStack: s.redoStack.slice(0, -1),
      undoStack: s.canvasImage ? [...s.undoStack, s.canvasImage] : s.undoStack,
    };
  }),

  setActiveTool: (tool) => set({ activeTool: tool }),
  setSelectedModelId: (id) => set({ selectedModelId: id, referencePhoto: null }),
  setResolution: (res) => set({ resolution: res }),
  setReferencePhoto: (url) => set({ referencePhoto: url }),
  setIsApplying: (v) => set({ isApplying: v }),
  setProgress: (v) => set({ progress: v }),

  updateCharacterConfig: (key, value) => set((s) => ({
    characterConfig: { ...s.characterConfig, [key]: value },
  })),

  resetCharacterConfig: () => set({ characterConfig: { ...defaultCharConfig } }),
  setSessionResults: (results) => set({ sessionResults: results, sessionSaved: false }),
  setSessionSaved: (v) => set({ sessionSaved: v }),
  setFace360Results: (results) => set({ face360Results: results }),
}));
