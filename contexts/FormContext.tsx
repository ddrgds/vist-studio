import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  AspectRatio, ImageSize, CharacterParams, SessionPoseItem,
  VideoResolution, CustomPreset, Preset, InfluencerParams, GeminiImageModel, BatchOutfitItem,
  AIProvider, FalModel, ReplicateModel, OpenAIModel, IdeogramModel, ModelsLabModel, PoseEngine, AIEditEngine, VideoEngine
} from '../types';

// ─────────────────────────────────────────────
// Initial State
// ─────────────────────────────────────────────

export const initialCharacterState: Omit<CharacterParams, 'id'> = {
  modelImages: [],
  outfitImages: [],
  characteristics: '',
  pose: '',
  poseImage: null,
  accessory: '',
  accessoryImages: [],
  usePoseAsOutfit: false,
};

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface FormContextValue {
  // Mode
  activeMode: 'create' | 'edit' | 'video';
  setActiveMode: React.Dispatch<React.SetStateAction<'create' | 'edit' | 'video'>>;

  // Director Studio — face images aisladas (no comparten con GeneratorPage)
  directorFaceImages: File[];
  setDirectorFaceImages: React.Dispatch<React.SetStateAction<File[]>>;

  // Create Form
  numCharacters: number;
  setNumCharacters: React.Dispatch<React.SetStateAction<number>>;
  characters: CharacterParams[];
  setCharacters: React.Dispatch<React.SetStateAction<CharacterParams[]>>;
  updateCharacter: (id: string, field: keyof Omit<CharacterParams, 'id'>, value: any) => void;
  scenario: string;
  setScenario: React.Dispatch<React.SetStateAction<string>>;
  scenarioImage: File[];
  setScenarioImage: React.Dispatch<React.SetStateAction<File[]>>;
  lighting: string;
  setLighting: React.Dispatch<React.SetStateAction<string>>;
  camera: string;
  setCamera: React.Dispatch<React.SetStateAction<string>>;
  numberOfImages: number;
  setNumberOfImages: React.Dispatch<React.SetStateAction<number>>;
  negativePrompt: string;
  setNegativePrompt: React.Dispatch<React.SetStateAction<string>>;
  imageBoost: string;
  setImageBoost: React.Dispatch<React.SetStateAction<string>>;
  antiFisheye: boolean;
  setAntiFisheye: React.Dispatch<React.SetStateAction<boolean>>;
  steps: number;
  setSteps: React.Dispatch<React.SetStateAction<number>>;
  cfg: number;
  setCfg: React.Dispatch<React.SetStateAction<number>>;
  guidanceScale: number;
  setGuidanceScale: React.Dispatch<React.SetStateAction<number>>;
  strength: number;
  setStrength: React.Dispatch<React.SetStateAction<number>>;
  seed: number | undefined;
  setSeed: React.Dispatch<React.SetStateAction<number | undefined>>;

  // Edit Form
  editSubMode: 'poses' | 'ai' | 'session';
  setEditSubMode: React.Dispatch<React.SetStateAction<'poses' | 'ai' | 'session'>>;
  photoSessionCount: number;
  setPhotoSessionCount: React.Dispatch<React.SetStateAction<number>>;
  photoSessionAngles: string[];
  setPhotoSessionAngles: React.Dispatch<React.SetStateAction<string[]>>;
  photoSessionModel: 'nb2' | 'grok';
  setPhotoSessionModel: React.Dispatch<React.SetStateAction<'nb2' | 'grok'>>;
  poseEngine: PoseEngine;
  setPoseEngine: React.Dispatch<React.SetStateAction<PoseEngine>>;
  baseImageForEdit: File | null;
  setBaseImageForEdit: React.Dispatch<React.SetStateAction<File | null>>;
  editNumberOfImages: number;
  setEditNumberOfImages: React.Dispatch<React.SetStateAction<number>>;
  sessionPoses: SessionPoseItem[];
  setSessionPoses: React.Dispatch<React.SetStateAction<SessionPoseItem[]>>;
  updateSessionPose: (index: number, field: 'text' | 'images' | 'accessory' | 'accessoryImages', value: any) => void;
  aiEditInstruction: string;
  setAiEditInstruction: React.Dispatch<React.SetStateAction<string>>;
  aiEditReferenceImage: File | null;
  setAiEditReferenceImage: React.Dispatch<React.SetStateAction<File | null>>;
  aiEditReferenceImages: File[];
  setAiEditReferenceImages: React.Dispatch<React.SetStateAction<File[]>>;
  aiEditEngine: AIEditEngine;
  setAiEditEngine: React.Dispatch<React.SetStateAction<AIEditEngine>>;

  // Video Form
  videoImage: File | null;
  setVideoImage: React.Dispatch<React.SetStateAction<File | null>>;
  videoPrompt: string;
  setVideoPrompt: React.Dispatch<React.SetStateAction<string>>;
  videoDialogue: string;
  setVideoDialogue: React.Dispatch<React.SetStateAction<string>>;
  videoVoice: File | null;
  setVideoVoice: React.Dispatch<React.SetStateAction<File | null>>;
  videoResolution: VideoResolution;
  setVideoResolution: React.Dispatch<React.SetStateAction<VideoResolution>>;
  videoEngine: VideoEngine;
  setVideoEngine: React.Dispatch<React.SetStateAction<VideoEngine>>;
  referenceVideo: File | null;
  setReferenceVideo: React.Dispatch<React.SetStateAction<File | null>>;

  // Shared Config
  imageSize: ImageSize;
  setImageSize: React.Dispatch<React.SetStateAction<ImageSize>>;
  aspectRatio: AspectRatio;
  setAspectRatio: React.Dispatch<React.SetStateAction<AspectRatio>>;
  geminiModel: GeminiImageModel;
  setGeminiModel: React.Dispatch<React.SetStateAction<GeminiImageModel>>;

  // AI Provider selection
  aiProvider: AIProvider;
  setAiProvider: React.Dispatch<React.SetStateAction<AIProvider>>;
  falModel: FalModel;
  setFalModel: React.Dispatch<React.SetStateAction<FalModel>>;
  replicateModel: ReplicateModel;
  setReplicateModel: React.Dispatch<React.SetStateAction<ReplicateModel>>;
  openaiModel: OpenAIModel;
  setOpenaiModel: React.Dispatch<React.SetStateAction<OpenAIModel>>;
  ideogramModel: IdeogramModel;
  setIdeogramModel: React.Dispatch<React.SetStateAction<IdeogramModel>>;
  modelsLabModel: ModelsLabModel;
  setModelsLabModel: React.Dispatch<React.SetStateAction<ModelsLabModel>>;

  // Batch outfits
  batchOutfitEnabled: boolean;
  setBatchOutfitEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  batchOutfits: BatchOutfitItem[];
  setBatchOutfits: React.Dispatch<React.SetStateAction<BatchOutfitItem[]>>;
  updateBatchOutfit: (id: string, field: 'outfitImages' | 'outfitText', value: any) => void;
  addBatchOutfit: () => void;
  removeBatchOutfit: (id: string) => void;

  // Preset application
  applyPreset: (preset: Preset | CustomPreset) => void;
}

// ─────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────

const FormContext = createContext<FormContextValue | null>(null);

// ─────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────

export const FormProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Mode
  const [activeMode, setActiveMode] = useState<'create' | 'edit' | 'video'>('create');

  // Director Studio — face images aisladas
  const [directorFaceImages, setDirectorFaceImages] = useState<File[]>([]);

  // Create Form State
  const [numCharacters, setNumCharacters] = useState(1);
  const [characters, setCharacters] = useState<CharacterParams[]>([
    { id: crypto.randomUUID(), ...initialCharacterState },
  ]);
  const [scenario, setScenario] = useState('');
  const [scenarioImage, setScenarioImage] = useState<File[]>([]);
  const [lighting, setLighting] = useState('');
  const [camera, setCamera] = useState('');
  const [numberOfImages, setNumberOfImages] = useState<number>(1);
  const [negativePrompt, setNegativePrompt] = useState('');
  const [imageBoost, setImageBoost] = useState('');
  const [antiFisheye, setAntiFisheye] = useState(false);
  const [steps, setSteps] = useState<number>(50);
  const [cfg, setCfg] = useState<number>(7);
  const [guidanceScale, setGuidanceScale] = useState<number>(4.5);
  const [strength, setStrength] = useState<number>(0.55);
  const [seed, setSeed] = useState<number | undefined>(undefined);

  // Edit Form State
  const [editSubMode, setEditSubMode] = useState<'poses' | 'ai' | 'session'>('poses');
  const [photoSessionCount, setPhotoSessionCount] = useState<number>(4);
  const [photoSessionAngles, setPhotoSessionAngles] = useState<string[]>([]);
  const [photoSessionModel, setPhotoSessionModel] = useState<'nb2' | 'grok'>('nb2');
  const [poseEngine, setPoseEngine] = useState<PoseEngine>(PoseEngine.Gemini);
  const [baseImageForEdit, setBaseImageForEdit] = useState<File | null>(null);
  const [editNumberOfImages, setEditNumberOfImages] = useState<number>(1);
  const [sessionPoses, setSessionPoses] = useState<SessionPoseItem[]>([
    { id: '1', text: '', images: [], accessory: '', accessoryImages: [] },
  ]);
  const [aiEditInstruction, setAiEditInstruction] = useState('');
  const [aiEditReferenceImage, setAiEditReferenceImage] = useState<File | null>(null);
  const [aiEditReferenceImages, setAiEditReferenceImages] = useState<File[]>([]);
  const [aiEditEngine, setAiEditEngine] = useState<AIEditEngine>(AIEditEngine.Gemini);

  // Video Form State
  const [videoImage, setVideoImage] = useState<File | null>(null);
  const [videoPrompt, setVideoPrompt] = useState('');
  const [videoDialogue, setVideoDialogue] = useState('');
  const [videoVoice, setVideoVoice] = useState<File | null>(null);
  const [videoResolution, setVideoResolution] = useState<VideoResolution>(VideoResolution.Res720p);
  const [videoEngine, setVideoEngine] = useState<VideoEngine>(VideoEngine.KlingStandard);
  const [referenceVideo, setReferenceVideo] = useState<File | null>(null);

  // Batch outfits
  const [batchOutfitEnabled, setBatchOutfitEnabled] = useState(false);
  const [batchOutfits, setBatchOutfits] = useState<BatchOutfitItem[]>([
    { id: crypto.randomUUID(), outfitImages: [], outfitText: '' },
    { id: crypto.randomUUID(), outfitImages: [], outfitText: '' },
  ]);

  // Shared Config
  const [imageSize, setImageSize] = useState<ImageSize>(ImageSize.Size1K);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(AspectRatio.Portrait);
  const [geminiModel, setGeminiModel] = useState<GeminiImageModel>(GeminiImageModel.Flash);

  // AI Provider
  const [aiProvider, setAiProvider] = useState<AIProvider>(AIProvider.Gemini);
  const [falModel, setFalModel] = useState<FalModel>(FalModel.KontextMulti);
  const [replicateModel, setReplicateModel] = useState<ReplicateModel>(ReplicateModel.Flux2Max);
  const [openaiModel, setOpenaiModel] = useState<OpenAIModel>(OpenAIModel.GptImage15);
  const [ideogramModel, setIdeogramModel] = useState<IdeogramModel>(IdeogramModel.V3);
  const [modelsLabModel, setModelsLabModel] = useState<ModelsLabModel>(ModelsLabModel.LustifySdxl);

  // ─── Sync numCharacters ──────────────────────
  useEffect(() => {
    setCharacters(prev => {
      if (prev.length === numCharacters) return prev;
      if (prev.length < numCharacters) {
        const toAdd = numCharacters - prev.length;
        const newItems = Array.from({ length: toAdd }, () => ({
          id: crypto.randomUUID(),
          ...initialCharacterState,
        }));
        return [...prev, ...newItems];
      }
      return prev.slice(0, numCharacters);
    });
  }, [numCharacters]);

  // ─── Sync editNumberOfImages ────────────────
  useEffect(() => {
    setSessionPoses(prev => {
      if (prev.length === editNumberOfImages) return prev;
      if (prev.length < editNumberOfImages) {
        const toAdd = editNumberOfImages - prev.length;
        const newItems = Array.from({ length: toAdd }, () => ({
          id: crypto.randomUUID(),
          text: '',
          images: [],
          accessory: '',
          accessoryImages: [],
        }));
        return [...prev, ...newItems];
      }
      return prev.slice(0, editNumberOfImages);
    });
  }, [editNumberOfImages]);

  // ─── Handlers ───────────────────────────────
  const updateCharacter = (id: string, field: keyof Omit<CharacterParams, 'id'>, value: any) => {
    setCharacters(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const updateSessionPose = (
    index: number,
    field: 'text' | 'images' | 'accessory' | 'accessoryImages',
    value: any,
  ) => {
    setSessionPoses(prev => {
      const newArr = [...prev];
      newArr[index] = { ...newArr[index], [field]: value };
      return newArr;
    });
  };

  const updateBatchOutfit = (id: string, field: 'outfitImages' | 'outfitText', value: any) => {
    setBatchOutfits(prev => prev.map(o => o.id === id ? { ...o, [field]: value } : o));
  };

  const addBatchOutfit = () => {
    setBatchOutfits(prev => [...prev, { id: crypto.randomUUID(), outfitImages: [], outfitText: '' }]);
  };

  const removeBatchOutfit = (id: string) => {
    setBatchOutfits(prev => prev.filter(o => o.id !== id));
  };

  const applyPreset = (preset: Preset | CustomPreset) => {
    const data = preset.data as any;
    if (characters.length > 0) {
      const charId = characters[0].id;
      updateCharacter(charId, 'characteristics', data.characteristics || '');
      updateCharacter(charId, 'pose', data.pose || '');
      updateCharacter(charId, 'accessory', data.accessory || '');
      if (data.outfitDescription !== undefined) {
        updateCharacter(charId, 'outfitDescription', data.outfitDescription);
      }
    }
    setLighting(data.lighting || '');
    setCamera(data.camera || '');
    setScenario(data.scenario || '');
    setNegativePrompt(data.negativePrompt || '');
    if (data.imageSize) setImageSize(data.imageSize);
    if (data.aspectRatio) setAspectRatio(data.aspectRatio);
    if (data.steps) setSteps(data.steps);
    if (data.cfg) setCfg(data.cfg);
  };

  return (
    <FormContext.Provider value={{
      activeMode, setActiveMode,
      directorFaceImages, setDirectorFaceImages,
      numCharacters, setNumCharacters,
      characters, setCharacters, updateCharacter,
      scenario, setScenario,
      scenarioImage, setScenarioImage,
      lighting, setLighting,
      camera, setCamera,
      numberOfImages, setNumberOfImages,
      negativePrompt, setNegativePrompt,
      imageBoost, setImageBoost,
      antiFisheye, setAntiFisheye,
      steps, setSteps,
      cfg, setCfg,
      guidanceScale, setGuidanceScale,
      strength, setStrength,
      seed, setSeed,
      editSubMode, setEditSubMode,
      photoSessionCount, setPhotoSessionCount,
      photoSessionAngles, setPhotoSessionAngles,
      photoSessionModel, setPhotoSessionModel,
      poseEngine, setPoseEngine,
      baseImageForEdit, setBaseImageForEdit,
      editNumberOfImages, setEditNumberOfImages,
      sessionPoses, setSessionPoses, updateSessionPose,
      aiEditInstruction, setAiEditInstruction,
      aiEditReferenceImage, setAiEditReferenceImage,
      aiEditReferenceImages, setAiEditReferenceImages,
      aiEditEngine, setAiEditEngine,
      videoImage, setVideoImage,
      videoPrompt, setVideoPrompt,
      videoDialogue, setVideoDialogue,
      videoVoice, setVideoVoice,
      videoResolution, setVideoResolution,
      videoEngine, setVideoEngine,
      referenceVideo, setReferenceVideo,
      imageSize, setImageSize,
      aspectRatio, setAspectRatio,
      geminiModel, setGeminiModel,
      aiProvider, setAiProvider,
      falModel, setFalModel,
      replicateModel, setReplicateModel,
      openaiModel, setOpenaiModel,
      ideogramModel, setIdeogramModel,
      modelsLabModel, setModelsLabModel,
      batchOutfitEnabled, setBatchOutfitEnabled,
      batchOutfits, setBatchOutfits, updateBatchOutfit, addBatchOutfit, removeBatchOutfit,
      applyPreset,
    }}>
      {children}
    </FormContext.Provider>
  );
};

// ─────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────

export const useForm = (): FormContextValue => {
  const ctx = useContext(FormContext);
  if (!ctx) throw new Error('useForm must be used inside <FormProvider>');
  return ctx;
};
