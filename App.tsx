import React, { useRef, useState } from "react";
import JSZip from "jszip";
import ApiKeyGuard from "./components/ApiKeyGuard";
import AuthScreen from "./components/AuthScreen";
import UploadZone from "./components/UploadZone";
import DetailModal from "./components/DetailModal";
import ImageModal from "./components/ImageModal";
import EnhancedInput from "./components/EnhancedInput";
import CharacteristicsInput from "./components/CharacteristicsInput";
import ReferenceInput from "./components/ReferenceInput";
import ImageEditor from "./components/ImageEditor";
import ProgressBar from "./components/ProgressBar";
import InspirationBoard from "./components/InspirationBoard";
import CustomPresets from "./components/CustomPresets";
import GalleryGrid from "./components/Gallery/GalleryGrid";
import ABComparator from "./components/ABComparator";
import CaptionModal from "./components/CaptionModal";
import FaceSwapModal from "./components/FaceSwapModal";
import TryOnModal from "./components/TryOnModal";
import SkinEnhancerModal from "./components/SkinEnhancerModal";
import RelightModal from "./components/RelightModal";
import InpaintingModal from "./components/InpaintingModal";
import StoryboardView from "./components/StoryboardView";
import ExplorePage from "./components/ExplorePage";
import GeneratorPage from "./components/GeneratorPage";
import DirectorStudio from "./components/DirectorStudio";
import CharactersPage from "./components/CharactersPage";
import PricingPage from "./components/PricingPage";
import ProfilePage from "./components/ProfilePage";

import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { GalleryProvider, useGallery } from "./contexts/GalleryContext";
import { FormProvider, useForm } from "./contexts/FormContext";
import { ToastProvider, useToast } from "./contexts/ToastContext";
import { CharacterLibraryProvider, useCharacterLibrary } from "./contexts/CharacterLibraryContext";
import { ProfileProvider, useProfile } from "./contexts/ProfileContext";
import { useSubscription } from "./hooks/useSubscription";
import { useGeneration } from "./hooks/useGeneration";
import { PoseAssistantWidget } from "./components/Assistant/PoseAssistantWidget";

import { signOut } from "./services/supabaseService";
import {
  exportDatabaseToJson,
  importDatabaseFromJson,
  exportForBigQuery,
} from "./services/storageService";
import { generateBatchOutfits } from "./services/geminiService";
import {
  extractPoseSkeleton,
  upscaleWithAuraSR,
  removeBackground,
  inpaintImage,
} from "./services/falService";
import {
  AspectRatio,
  ImageSize,
  InspirationImage,
  GeneratedContent,
  InfluencerParams,
  PoseModificationParams,
  VideoParams,
  Preset,
  CustomPreset,
  CharacterParams,
  VideoResolution,
  GeminiImageModel,
  GEMINI_IMAGE_MODEL_LABELS,
  AIProvider,
  AI_PROVIDER_LABELS,
  FalModel,
  FAL_MODEL_LABELS,
  FAL_GENERATION_MODELS,
  ReplicateModel,
  REPLICATE_MODEL_LABELS,
  OpenAIModel,
  OPENAI_MODEL_LABELS,
  IdeogramModel,
  IDEOGRAM_MODEL_LABELS,
  IMAGEN4_MODELS,
  PoseEngine,
  POSE_ENGINE_LABELS,
  AIEditEngine,
  VideoEngine,
  VIDEO_ENGINE_LABELS,
  SavedCharacter,
} from "./types";
import {
  Video,
  Camera,
  Layers,
  Settings,
  Sparkles,
  Zap,
  MoreVertical,
  UserPlus,
} from "lucide-react";

// ─────────────────────────────────────────────
// Preset Data (static, no need to move to context)
// ─────────────────────────────────────────────

const STYLE_PRESETS: Preset[] = [
  {
    id: "realistic",
    name: "Fotorrealista",
    icon: "📸",
    data: {
      characteristics:
        "4k texture, highly detailed skin pores, realistic eyes, natural lighting, shot on 85mm lens",
      lighting: "Soft studio lighting, cinematic rim light",
    },
  },
  {
    id: "anime",
    name: "Anime",
    icon: "🌸",
    data: {
      characteristics:
        "Anime style, vibrant colors, large expressive eyes, cel shading, 2D aesthetic",
      lighting: "Bright, flat lighting, high contrast",
    },
  },
  {
    id: "cyberpunk",
    name: "Cyberpunk",
    icon: "🌃",
    data: {
      characteristics:
        "Futuristic fashion, neon accents, cybernetic enhancements, glossy textures",
      lighting: "Neon pink and blue volumetric lighting, dark atmosphere",
    },
  },
  {
    id: "painting",
    name: "Óleo",
    icon: "🎨",
    data: {
      characteristics:
        "Oil painting style, visible brush strokes, rich texture, artistic interpretation",
      lighting: "Dramatic chiaroscuro",
    },
  },
];

const LIGHTING_PRESETS = [
  {
    label: "Luz natural",
    value: "soft natural light, golden hour, sun-kissed",
  },
  {
    label: "Estudio clásico",
    value: "professional studio lighting, softbox, rim light",
  },
  {
    label: "Cinematográfica",
    value: "cinematic lighting, dramatic shadows, moody atmosphere",
  },
  {
    label: "Luz de neon",
    value: "neon lighting, cyberpunk glow, vivid colors",
  },
];

const SCENARIO_PRESETS = [
  {
    label: "Estudio neutro",
    value: "clean neutral studio background, seamless paper backdrop",
  },
  {
    label: "Naturaleza",
    value: "lush green forest, outdoors, natural environment",
  },
  { label: "Urbano", value: "busy city street, urban environment, neon signs" },
  {
    label: "Interiores",
    value: "luxurious modern living room, stylish interior",
  },
];

const CAMERA_PRESETS = [
  {
    label: "Retrato 85mm",
    value: "shot on 85mm lens, shallow depth of field, beautiful bokeh",
  },
  {
    label: "Gran Angular",
    value: "24mm wide angle lens, dynamic perspective, immersive view",
  },
  {
    label: "Macro",
    value: "macro photography, extreme close up, sharp microdetails",
  },
  {
    label: "Cámara antigua",
    value:
      "vintage film camera look, 35mm film, subtle grain, analog photography",
  },
  {
    label: "Cámara Polar",
    value: "polaroid style, instant photo aesthetic, vintage colors",
  },
];

const POSE_PRESETS = [
  {
    label: "De pie firme",
    value: "standing straight, firm posture, facing camera",
  },
  { label: "Mano en la cadera", value: "hand on hip, confident stance" },
  { label: "Caminando", value: "walking towards camera, dynamic movement" },
  { label: "Mirando hombro", value: "looking over shoulder, profile view" },
  { label: "Sentado elegante", value: "sitting elegantly, crossed legs" },
  { label: "Apoyado", value: "leaning against wall, relaxed pose" },
];

// ─────────────────────────────────────────────
// Provider capabilities — what each AI engine supports
// ─────────────────────────────────────────────

interface ProviderCaps {
  outfitImage: boolean; // Can use outfit reference photos
  poseImage: boolean; // Can use pose reference photos
  scenarioImage: boolean; // Can use scenario/background photos
  multiCharacter: boolean; // Can handle more than 1 character
  faceImage: boolean; // Can use face/model reference photos
}

const getProviderCaps = (
  aiProvider: AIProvider,
  geminiModel: GeminiImageModel,
): ProviderCaps => {
  if (aiProvider === AIProvider.Gemini && !IMAGEN4_MODELS.has(geminiModel)) {
    // Gemini Flash / Pro — full multimodal
    return {
      outfitImage: true,
      poseImage: true,
      scenarioImage: true,
      multiCharacter: true,
      faceImage: true,
    };
  }
  if (aiProvider === AIProvider.Gemini && IMAGEN4_MODELS.has(geminiModel)) {
    // Imagen 4 — text-only diffusion
    return {
      outfitImage: false,
      poseImage: false,
      scenarioImage: false,
      multiCharacter: false,
      faceImage: false,
    };
  }
  if (aiProvider === AIProvider.Fal) {
    // FLUX.2 Pro — face identity from photo(s), rest is text
    return {
      outfitImage: false,
      poseImage: false,
      scenarioImage: false,
      multiCharacter: false,
      faceImage: true,
    };
  }
  if (aiProvider === AIProvider.Replicate) {
    // FLUX.2 Max — requiere foto de referencia; Gen-4 Image — requiere al menos 1 foto
    return {
      outfitImage: false,
      poseImage: false,
      scenarioImage: false,
      multiCharacter: false,
      faceImage: true,
    };
  }
  if (aiProvider === AIProvider.OpenAI) {
    // GPT Image 1.5 — acepta fotos de referencia opcionales
    return {
      outfitImage: true,
      poseImage: true,
      scenarioImage: true,
      multiCharacter: false,
      faceImage: true,
    };
  }
  if (aiProvider === AIProvider.Ideogram) {
    // Ideogram V3 — character reference opcional
    return {
      outfitImage: false,
      poseImage: false,
      scenarioImage: false,
      multiCharacter: false,
      faceImage: true,
    };
  }
  return {
    outfitImage: true,
    poseImage: true,
    scenarioImage: true,
    multiCharacter: true,
    faceImage: true,
  };
};

// ─────────────────────────────────────────────
// handleReuse helper — sanitizes File objects lost in Supabase serialization
// ─────────────────────────────────────────────

const safeFiles = (arr: any[]): File[] =>
  Array.isArray(arr) ? arr.filter((f) => f instanceof File) : [];

// ─────────────────────────────────────────────
// Inner App — consumes contype MainView = 'gallery' | 'inspiration' | 'storyboard';
type MainView = "gallery" | "inspiration" | "storyboard";
type AppWorkspace = "explore" | "generate" | "director" | "characters" | "storyboard" | "pricing" | "profile" | "create" | "video" | "influencer";

const AppInner: React.FC = () => {
  const { user, signOut, authLoading } = useAuth();
  const gallery = useGallery();
  const form = useForm();
  const toast = useToast();
  const charLib = useCharacterLibrary();
  const profileCtx = useProfile();
  const sub = useSubscription();

  const [activeWorkspace, setActiveWorkspace] =
    useState<AppWorkspace>("explore");

  // ─── Handle Stripe checkout return ───────────────────────────────────────
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get('checkout');
    if (checkout === 'success') {
      profileCtx.refreshProfile();
      toast.success('🎉 Subscription activated! Your plan is now updated.');
      setActiveWorkspace('profile');
      window.history.replaceState({}, '', window.location.pathname);
    } else if (checkout === 'cancel') {
      toast.warning('Checkout cancelled. Your plan was not changed.');
      window.history.replaceState({}, '', window.location.pathname);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Create Workspace State
  const [mainView, setMainView] = useState<MainView>("gallery");

  // Computed provider capabilities — drives which inputs are enabled/visible
  const caps = getProviderCaps(form.aiProvider, form.geminiModel);

  // UI state (not worth moving to context — purely local)
  const [showDbManager, setShowDbManager] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showAdvancedConfig, setShowAdvancedConfig] = useState(false);
  const [showLeftDrawer, setShowLeftDrawer] = useState(false); // Controls opening full left sidebar

  // New feature modals
  const [captionItem, setCaptionItem] = useState<GeneratedContent | null>(null);
  const [faceSwapItem, setFaceSwapItem] = useState<GeneratedContent | null>(null);
  const [tryOnItem, setTryOnItem] = useState<GeneratedContent | null>(null);
  const [skinEnhanceItem, setSkinEnhanceItem] = useState<GeneratedContent | null>(null);
  const [relightItem, setRelightItem] = useState<GeneratedContent | null>(null);
  const [inpaintItem, setInpaintItem] = useState<GeneratedContent | null>(null);
  const [removingBgId, setRemovingBgId] = useState<string | null>(null);
  const [batchZipLoading, setBatchZipLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
  const [batchError, setBatchError] = useState<string | null>(null);

  // Upscaling state
  const [upscalingId, setUpscalingId] = useState<string | null>(null);

  // A/B Comparator state
  const [showComparator, setShowComparator] = useState(false);

  // Generation hook — closes mobile menu when generation starts
  const { isGenerating, progress, handleGenerate, stopGeneration } =
    useGeneration(() => {
      if (window.innerWidth < 1024) setIsMobileMenuOpen(false);
    });

  // ─── Sync form.activeMode when workspace changes ───────
  React.useEffect(() => {
    if (activeWorkspace === "generate") {
      // Generator manages its own mode via model selection
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspace]);

  // ─── Model pre-selection from Explore ───────
  const applyModelFromId = (modelId: string) => {
    switch (modelId) {
      case "nb2":          form.setAiProvider(AIProvider.Gemini); form.setGeminiModel(GeminiImageModel.Flash2); form.setActiveMode("create"); break;
      case "nb2-pro":      form.setAiProvider(AIProvider.Gemini); form.setGeminiModel(GeminiImageModel.Pro); form.setActiveMode("create"); break;
      case "seedream45":   form.setAiProvider(AIProvider.Fal); form.setFalModel(FalModel.Seedream45); form.setActiveMode("create"); break;
      case "seedream50":   form.setAiProvider(AIProvider.Fal); form.setFalModel(FalModel.Seedream50); form.setActiveMode("create"); break;
      case "imagen4ultra": form.setAiProvider(AIProvider.Gemini); form.setGeminiModel(GeminiImageModel.Imagen4Ultra); form.setActiveMode("create"); break;
      case "gpt15":        form.setAiProvider(AIProvider.OpenAI); form.setOpenaiModel(OpenAIModel.GptImage15); form.setActiveMode("create"); break;
      case "kontext-multi":form.setAiProvider(AIProvider.Fal); form.setFalModel(FalModel.KontextMulti); form.setActiveMode("create"); break;
      case "kontext-max":  form.setAiProvider(AIProvider.Fal); form.setFalModel(FalModel.KontextMaxMulti); form.setActiveMode("create"); break;
      case "gen4":         form.setAiProvider(AIProvider.Replicate); form.setReplicateModel(ReplicateModel.Gen4Image); form.setActiveMode("create"); break;
      case "flux2max":     form.setAiProvider(AIProvider.Replicate); form.setReplicateModel(ReplicateModel.Flux2Max); form.setActiveMode("create"); break;
      case "ideogram-v3":  form.setAiProvider(AIProvider.Ideogram); form.setIdeogramModel(IdeogramModel.V3); form.setActiveMode("create"); break;
      case "gemini-flash": form.setAiProvider(AIProvider.Gemini); form.setGeminiModel(GeminiImageModel.Flash); form.setActiveMode("create"); break;
      case "kling-pro":    form.setVideoEngine(VideoEngine.KlingPro); form.setActiveMode("video"); break;
      case "kling-standard": form.setVideoEngine(VideoEngine.KlingStandard); form.setActiveMode("video"); break;
      case "runway-gen3":  form.setVideoEngine(VideoEngine.RunwayGen3); form.setActiveMode("video"); break;
      case "luma":         form.setVideoEngine(VideoEngine.LumaDreamMachine); form.setActiveMode("video"); break;
    }
  };

  // ─── Explore → Workspace navigation ───────
  const handleExploreNavigate = (workspace: AppWorkspace, mode?: string, modelId?: string) => {
    // Map old workspace names to new ones
    const mapped: AppWorkspace =
      workspace === "create" ? "generate" :
      workspace === "video" ? "generate" :
      workspace;
    setActiveWorkspace(mapped);
    // Apply model pre-selection first (takes priority over mode)
    if (modelId) {
      applyModelFromId(modelId);
    } else {
      if (mode === "video") form.setActiveMode("video");
      else if (mode === "create") form.setActiveMode("create");
      else if (mode === "poses") { form.setActiveMode("edit"); form.setEditSubMode("poses"); }
      else if (mode === "ai_edit") { form.setActiveMode("edit"); form.setEditSubMode("ai"); }
    }
  };

  // ─── Send result to Director Studio ───────
  const handleSendToDirector = async (item: GeneratedContent) => {
    try {
      const response = await fetch(item.url);
      const blob = await response.blob();
      const file = new File([blob], `director-ref-${item.id}.jpg`, { type: blob.type || "image/jpeg" });
      // Cargar como imagen base para edición en el editor VIST
      form.setBaseImageForEdit(file);
      form.setActiveMode("edit");
      setActiveWorkspace("influencer");
    } catch {
      toast.error("No se pudo cargar la imagen para el editor.");
    }
  };

  // ─── Load character from library into Director ───────
  const handleLoadCharacterInDirector = (char: SavedCharacter) => {
    const char0 = form.characters[0];
    if (!char0) return;
    charLib.loadCharacterIntoForm(char, char0.id, form.updateCharacter);
    charLib.incrementUsage(char.id);
    setActiveWorkspace("director");
  };

  // ─── Reuse params ─────────────────────────
  const handleReuse = (item: GeneratedContent) => {
    if (item.type === "create") {
      const p = item.params as InfluencerParams;
      const pAsAny = p as any;

      form.setScenario(p.scenario || "");
      form.setLighting(p.lighting || "");
      form.setNegativePrompt(p.negativePrompt || "");
      if (p.imageSize) form.setImageSize(p.imageSize);
      if (p.aspectRatio) form.setAspectRatio(p.aspectRatio);
      form.setNumberOfImages(p.numberOfImages || 1);
      form.setSteps(p.steps || 50);
      form.setCfg(p.cfg || 7);
      if (p.seed !== undefined) form.setSeed(p.seed);
      if (p.imageBoost) form.setImageBoost(p.imageBoost);
      // Restaurar proveedor y modelo
      if (item.aiProvider) {
        form.setAiProvider(item.aiProvider);
        if (item.falModel) form.setFalModel(item.falModel);
        if (item.replicateModel) form.setReplicateModel(item.replicateModel);
        if (item.openaiModel) form.setOpenaiModel(item.openaiModel);
        if (item.ideogramModel) form.setIdeogramModel(item.ideogramModel);
      }
      if (p.model) form.setGeminiModel(p.model);
      form.setScenarioImage(
        safeFiles(
          Array.isArray(p.scenarioImage)
            ? p.scenarioImage
            : p.scenarioImage
              ? [p.scenarioImage]
              : [],
        ),
      );

      if (p.characters && p.characters.length > 0) {
        const sanitizedChars = p.characters.map((c) => ({
          ...c,
          modelImages: safeFiles(c.modelImages || []),
          outfitImages: safeFiles(c.outfitImages || []),
          poseImage: c.poseImage instanceof File ? c.poseImage : null,
          accessoryImages: safeFiles(c.accessoryImages || []),
        }));
        form.setCharacters(sanitizedChars);
        form.setNumCharacters(sanitizedChars.length);
      } else {
        // Backward compat for old single-character format
        const oldCharacter: CharacterParams = {
          id: crypto.randomUUID(),
          modelImages: safeFiles(
            pAsAny.modelImages ||
              (pAsAny.modelImage ? [pAsAny.modelImage] : []),
          ),
          outfitImages: safeFiles(
            pAsAny.outfitImages ||
              (pAsAny.outfitImage ? [pAsAny.outfitImage] : []),
          ),
          characteristics: pAsAny.characteristics || "",
          pose: pAsAny.pose || "",
          poseImage: pAsAny.poseImage instanceof File ? pAsAny.poseImage : null,
          accessory: pAsAny.accessory || "",
          accessoryImages: safeFiles(pAsAny.accessoryImages || []),
          usePoseAsOutfit: pAsAny.usePoseAsOutfit || false,
        };
        form.setCharacters([oldCharacter]);
        form.setNumCharacters(1);
      }
      form.setActiveMode("create");
    } else if (item.type === "edit") {
      const p = item.params as PoseModificationParams;
      if (p.baseImage instanceof File) form.setBaseImageForEdit(p.baseImage);
      if (p.sessionPoses && p.sessionPoses.length > 0) {
        const sanitizedPoses = p.sessionPoses.map((sp) => ({
          ...sp,
          images: safeFiles(sp.images || []),
          accessoryImages: safeFiles(sp.accessoryImages || []),
        }));
        form.setEditNumberOfImages(sanitizedPoses.length);
        form.setSessionPoses(sanitizedPoses);
      } else {
        form.setEditNumberOfImages(p.numberOfImages || 1);
        form.setSessionPoses([
          {
            id: "1",
            text: p.pose || "",
            images: safeFiles(p.poseImages || []),
            accessory: p.accessory || "",
            accessoryImages: safeFiles(p.accessoryImages || []),
          },
        ]);
      }
      if (form.characters.length > 0) {
        form.updateCharacter(
          form.characters[0].id,
          "usePoseAsOutfit",
          p.usePoseAsOutfit || false,
        );
      }
      if (p.imageSize) form.setImageSize(p.imageSize);
      if (p.aspectRatio) form.setAspectRatio(p.aspectRatio);
      form.setActiveMode("edit");
    } else if (item.type === "video") {
      const p = item.params as VideoParams;
      if (p.baseImage instanceof File) form.setVideoImage(p.baseImage);
      form.setVideoPrompt((p.prompt as string) || "");
      form.setVideoDialogue((p.dialogue as string) || "");
      if (p.voiceFile instanceof File) form.setVideoVoice(p.voiceFile);
      if (p.resolution) form.setVideoResolution(p.resolution);
      if (p.aspectRatio) form.setAspectRatio(p.aspectRatio);
      form.setActiveMode("video");
    }

    setIsMobileMenuOpen(true);
    setTimeout(() => {
      const sidebar = document.querySelector("aside .overflow-y-auto");
      if (sidebar) sidebar.scrollTo({ top: 0, behavior: "smooth" });
    }, 100);
  };

  // ─── Batch outfit generation ──────────────────
  const handleBatchGenerate = async () => {
    const character = form.characters[0];
    if (!character || (character.modelImages?.length ?? 0) === 0) {
      setBatchError(
        "Sube al menos una foto de referencia del modelo (Cara/Cuerpo) antes de usar el modo Batch.",
      );
      return;
    }
    const validOutfits = form.batchOutfits.filter(
      (o) => o.outfitImages.length > 0 || o.outfitText.trim(),
    );
    if (validOutfits.length < 1) {
      setBatchError(
        "Añade al menos un outfit (imagen o descripción) para generar variaciones.",
      );
      return;
    }

    setBatchError(null);
    setIsBatchGenerating(true);
    setBatchProgress(0);

    try {
      const baseParams: InfluencerParams = {
        characters: form.characters,
        scenario: form.scenario,
        scenarioImage: form.scenarioImage,
        lighting: form.lighting,
        negativePrompt: form.negativePrompt,
        imageSize: form.imageSize,
        aspectRatio: form.aspectRatio,
        model: form.geminiModel,
      };

      const results = await generateBatchOutfits(
        baseParams,
        validOutfits,
        setBatchProgress,
      );

      const items: GeneratedContent[] = results.map((r) => ({
        id: crypto.randomUUID(),
        url: r.url,
        params: {
          ...baseParams,
          characters: [
            {
              ...character,
              outfitImages: validOutfits[r.outfitIndex]?.outfitImages ?? [],
            },
          ],
        },
        timestamp: Date.now(),
        type: "create",
      }));

      await gallery.addItems(items);
      toast.success(`${results.length} variaciones de outfit generadas`);
    } catch (err: any) {
      setBatchError(
        err?.message || "Error al generar variaciones. Inténtalo de nuevo.",
      );
    } finally {
      setIsBatchGenerating(false);
      setBatchProgress(0);
    }
  };

  // ─── Change pose from gallery card ───────────
  const handleChangePose = async (item: GeneratedContent) => {
    // Convert the URL to a File so the Edit mode can use it as base image
    try {
      const response = await fetch(item.url);
      const blob = await response.blob();
      const mimeType = blob.type || "image/png";
      const ext = mimeType.includes("jpeg") ? "jpg" : "png";
      const file = new File([blob], `pose-base-${item.id}.${ext}`, {
        type: mimeType,
      });

      form.setBaseImageForEdit(file);
      // Reset session poses to a single blank pose so the user fills it in
      form.setEditNumberOfImages(1);
      form.setSessionPoses([
        { id: "1", text: "", images: [], accessory: "", accessoryImages: [] },
      ]);
      form.setActiveMode("edit");
      setIsMobileMenuOpen(true);
      setTimeout(() => {
        const sidebar = document.querySelector("aside .overflow-y-auto");
        if (sidebar) sidebar.scrollTo({ top: 0, behavior: "smooth" });
      }, 100);
      toast.info("Imagen cargada — describe o sube la nueva pose");
    } catch {
      toast.error("No se pudo cargar la imagen para editar la pose.");
    }
  };

  // ─── Upscale image 4× ─────────────────────
  const handleUpscale = async (item: GeneratedContent) => {
    if (item.type === "video" || upscalingId) return;
    setUpscalingId(item.id);
    toast.info("Mejorando resolución 4×… puede tardar ~30 segundos");
    try {
      const upscaledUrl = await upscaleWithAuraSR(item.url);
      const newItem: GeneratedContent = {
        id: crypto.randomUUID(),
        url: upscaledUrl,
        params: item.params,
        timestamp: Date.now(),
        type: item.type,
      };
      await gallery.addItems([newItem]);
      toast.success("Imagen mejorada guardada en la galería");
    } catch (err: any) {
      toast.error(
        err?.message || "Error al mejorar la resolución. Verifica tu FAL_KEY.",
      );
    } finally {
      setUpscalingId(null);
    }
  };

  // ─── Save edited image ─────────────────────
  const handleSaveEditedImage = async (blob: Blob) => {
    const { editingItem, setEditingItem, addItems } = gallery;
    if (!editingItem) return;
    const url = URL.createObjectURL(blob);
    const newItem: GeneratedContent = {
      id: crypto.randomUUID(),
      url,
      params: editingItem.params,
      timestamp: Date.now(),
      type: "edit",
    };
    setEditingItem(null);
    await addItems([newItem]);
    toast.success("Imagen guardada en la galería");
  };

  // ─── Download ─────────────────────────────
  // Uses fetch → blob URL to force download even for cross-origin Supabase URLs.
  // Without this, the browser opens the file instead of saving it.
  const handleDownload = async (
    e: React.MouseEvent,
    item: GeneratedContent,
  ) => {
    e.stopPropagation();
    const ext = item.type === "video" ? "mp4" : "png";
    const filename = `influencer-${item.id}.${ext}`;

    try {
      // If it's already a local blob/data URL, skip the fetch
      if (item.url.startsWith("blob:") || item.url.startsWith("data:")) {
        const a = document.createElement("a");
        a.href = item.url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
      }

      // For remote URLs (Supabase Storage): fetch → blob → local URL → download
      const response = await fetch(item.url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // Revoke after a short delay to let the download start
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10_000);
    } catch {
      toast.error("No se pudo descargar el archivo. Inténtalo de nuevo.");
    }
  };

  // ─── Batch delete ─────────────────────────
  const handleBatchDelete = async () => {
    const { selectedIds, batchDeleteItems } = gallery;
    if (selectedIds.size === 0) return;
    if (
      window.confirm(
        `¿Estás seguro de que quieres eliminar ${selectedIds.size} elementos seleccionados permanentemente?`,
      )
    ) {
      await batchDeleteItems(Array.from(selectedIds));
    }
  };

  // ─── Copy to Clipboard ────────────────────
  const handleCopyToClipboard = async (item: GeneratedContent) => {
    if (item.type === "video") {
      toast.error("No se pueden copiar videos al portapapeles");
      return;
    }
    try {
      // Obtener el blob de la imagen (soporta data URLs y URLs remotas)
      let blob: Blob;
      if (item.url.startsWith("data:")) {
        const res = await fetch(item.url);
        blob = await res.blob();
      } else {
        const resp = await fetch(item.url);
        blob = await resp.blob();
      }

      // Convertir a PNG si es necesario (Clipboard API solo acepta image/png)
      let pngBlob: Blob;
      if (blob.type === "image/png") {
        pngBlob = blob;
      } else {
        pngBlob = await new Promise<Blob>((resolve, reject) => {
          createImageBitmap(blob)
            .then((bmp) => {
              const canvas = document.createElement("canvas");
              canvas.width = bmp.width;
              canvas.height = bmp.height;
              const ctx = canvas.getContext("2d")!;
              ctx.drawImage(bmp, 0, 0);
              canvas.toBlob((b) => {
                if (b) resolve(b);
                else reject(new Error("No se pudo convertir la imagen a PNG"));
              }, "image/png");
            })
            .catch(reject);
        });
      }

      if (!navigator.clipboard?.write) {
        throw new Error(
          "Tu navegador no soporta copiar imágenes al portapapeles",
        );
      }
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": pngBlob }),
      ]);
      toast.success("Imagen copiada al portapapeles");
    } catch (err: any) {
      toast.error(
        "No se pudo copiar: " + (err?.message || "Error desconocido"),
      );
    }
  };

  // ─── Remove Background ────────────────────
  const handleRemoveBg = async (item: GeneratedContent) => {
    if (item.type === "video" || removingBgId) return;
    setRemovingBgId(item.id);
    toast.info("Quitando fondo… puede tardar ~20 segundos");
    try {
      const dataUrl = await removeBackground(item.url);
      const newItem: GeneratedContent = {
        id: crypto.randomUUID(),
        url: dataUrl,
        params: item.params,
        timestamp: Date.now(),
        type: item.type,
        tags: [...(item.tags || []), "sin-fondo"],
      };
      await gallery.addItems([newItem]);
      toast.success("Fondo eliminado — guardado en galería");
    } catch (err: any) {
      toast.error(
        err?.message || "Error al quitar el fondo. Verifica tu FAL_KEY.",
      );
    } finally {
      setRemovingBgId(null);
    }
  };

  // ─── Face Swap save ───────────────────────
  const handleSaveFaceSwap = async (dataUrl: string, sourceItemId: string) => {
    const sourceItem = gallery.generatedHistory.find(
      (i) => i.id === sourceItemId,
    );
    const newItem: GeneratedContent = {
      id: crypto.randomUUID(),
      url: dataUrl,
      params: sourceItem?.params ?? ({} as any),
      timestamp: Date.now(),
      type: "edit",
      tags: ["face-swap"],
    };
    await gallery.addItems([newItem]);
  };

  // ─── Virtual Try-On save ──────────────────
  const handleSaveTryOn = async (dataUrl: string, sourceItemId: string) => {
    const sourceItem = gallery.generatedHistory.find((i) => i.id === sourceItemId);
    const newItem: GeneratedContent = {
      id: crypto.randomUUID(),
      url: dataUrl,
      params: sourceItem?.params ?? ({} as any),
      timestamp: Date.now(),
      type: "edit",
      tags: ["try-on"],
    };
    await gallery.addItems([newItem]);
  };

  // ─── Skin Enhance save ────────────────────
  const handleSaveSkinEnhance = async (dataUrl: string, sourceItemId: string) => {
    const sourceItem = gallery.generatedHistory.find((i) => i.id === sourceItemId);
    const newItem: GeneratedContent = {
      id: crypto.randomUUID(),
      url: dataUrl,
      params: sourceItem?.params ?? ({} as any),
      timestamp: Date.now(),
      type: "edit",
      tags: ["skin-enhanced"],
    };
    await gallery.addItems([newItem]);
  };

  // ─── Relight save ─────────────────────────
  const handleSaveRelight = async (dataUrl: string, sourceItemId: string) => {
    const sourceItem = gallery.generatedHistory.find((i) => i.id === sourceItemId);
    const newItem: GeneratedContent = {
      id: crypto.randomUUID(),
      url: dataUrl,
      params: sourceItem?.params ?? ({} as any),
      timestamp: Date.now(),
      type: "edit",
      tags: ["relit"],
    };
    await gallery.addItems([newItem]);
  };

  // ─── Inpainting save ─────────────────────
  const handleSaveInpaint = async (dataUrl: string, sourceItemId: string) => {
    const sourceItem = gallery.generatedHistory.find(
      (i) => i.id === sourceItemId,
    );
    const newItem: GeneratedContent = {
      id: crypto.randomUUID(),
      url: dataUrl,
      params: sourceItem?.params ?? ({} as any),
      timestamp: Date.now(),
      type: "edit",
      tags: ["inpainting"],
    };
    await gallery.addItems([newItem]);
  };

  // ─── Add to Storyboard ────────────────────
  const handleAddToStoryboard = (item: GeneratedContent) => {
    gallery.addToStoryboard(item.id);
    toast.success("Añadido al storyboard");
  };

  // ─── Batch ZIP Download ───────────────────
  const handleBatchZipDownload = async () => {
    const { selectedIds, generatedHistory } = gallery;
    if (selectedIds.size === 0) return;
    setBatchZipLoading(true);
    toast.info(`Preparando ZIP con ${selectedIds.size} archivos…`);
    try {
      const zip = new JSZip();
      const items = generatedHistory.filter((item) => selectedIds.has(item.id));
      await Promise.all(
        items.map(async (item, i) => {
          const ext = item.type === "video" ? "mp4" : "png";
          const filename = `influencer-${i + 1}-${item.id.slice(0, 8)}.${ext}`;
          const resp = await fetch(item.url);
          const blob = await resp.blob();
          zip.file(filename, blob);
        }),
      );
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `galeria-${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`ZIP con ${items.length} archivos descargado`);
    } catch (err: any) {
      toast.error("Error al crear el ZIP: " + (err?.message || ""));
    } finally {
      setBatchZipLoading(false);
    }
  };

  // ─── Use inspiration ──────────────────────
  const handleUseInspiration = async (
    image: InspirationImage,
    target: "model" | "outfit" | "pose" | "scenario" | "accessory",
  ) => {
    const file = new File([image.blob], image.name, { type: image.blob.type });
    const fileArray = [file];

    if (target === "scenario") {
      form.setScenarioImage((prev) => [...prev, ...fileArray]);
    } else if (form.characters.length > 0) {
      const charId = form.characters[0].id;
      switch (target) {
        case "model":
          form.updateCharacter(charId, "modelImages", [
            ...(form.characters[0].modelImages || []),
            ...fileArray,
          ]);
          break;
        case "outfit":
          form.updateCharacter(charId, "outfitImages", [
            ...(form.characters[0].outfitImages || []),
            ...fileArray,
          ]);
          break;
        case "pose":
          form.updateCharacter(charId, "poseImage", file);
          break;
        case "accessory":
          form.updateCharacter(charId, "accessoryImages", [
            ...(form.characters[0].accessoryImages || []),
            ...fileArray,
          ]);
          break;
      }
    }

    form.setActiveMode("create");
    setIsMobileMenuOpen(true);
    toast.info(
      `"${image.name}" añadida a ${target === "scenario" ? "escenario" : target}`,
    );
    if (window.innerWidth < 1024) {
      setTimeout(() => setIsMobileMenuOpen(false), 1500);
    }
  };

  // ─── Preset save ──────────────────────────
  const handleSavePreset = async () => {
    const name = prompt("Dale un nombre a tu preset:");
    if (name && name.trim() && form.characters.length > 0) {
      const firstChar = form.characters[0];

      // Genera thumbnail desde la primera imagen del modelo (si existe)
      let thumbnail: string | undefined;
      if (firstChar.modelImages && firstChar.modelImages.length > 0) {
        try {
          thumbnail = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(firstChar.modelImages![0]);
          });
        } catch {
          // Si falla, seguimos sin thumbnail
        }
      }

      const presetData = {
        characteristics: firstChar.characteristics,
        outfitDescription: firstChar.outfitDescription || "",
        lighting: form.lighting,
        camera: form.camera,
        scenario: form.scenario,
        negativePrompt: form.negativePrompt,
        pose: firstChar.pose,
        accessory: firstChar.accessory,
        imageSize: form.imageSize,
        aspectRatio: form.aspectRatio,
        steps: form.steps,
        cfg: form.cfg,
      };
      const newPreset: CustomPreset = {
        id: crypto.randomUUID(),
        name: name.trim(),
        thumbnail,
        data: presetData,
      };
      await gallery.savePreset(newPreset);
      toast.success(`Preset "${name.trim()}" guardado`);
    }
  };

  // ─── DB Manager ──────────────────────────
  const handleExportBackup = async () => {
    const json = await exportDatabaseToJson();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `influencer-studio-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Backup exportado correctamente");
  };

  const handleExportBigQuery = async () => {
    const jsonl = await exportForBigQuery();
    const blob = new Blob([jsonl], { type: "application/x-jsonlines" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bigquery-export-${new Date().toISOString().slice(0, 10)}.jsonl`;
    a.click();
    URL.revokeObjectURL(url);
    alert(
      "Archivo .jsonl descargado. Puedes subir este archivo directamente a una tabla de BigQuery para analizar tu historial.",
    );
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        if (typeof reader.result === "string") {
          await importDatabaseFromJson(reader.result);
          await gallery.refreshHistory();
          toast.success("Base de datos restaurada correctamente");
          setShowDbManager(false);
        }
      } catch {
        toast.error("Error al importar: archivo inválido o corrupto");
      }
    };
    reader.readAsText(file);
  };

  const handleSwitchKey = async () => {
    const aistudio = (window as any).aistudio;
    if (aistudio?.openSelectKey) await aistudio.openSelectKey();
    else alert("La selección de API Key no está disponible.");
  };

  // ─── Auth loading spinner ────────────────
  if (authLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center bg-[#0a0a0a]"
        aria-live="polite"
        aria-busy="true"
      >
        <svg
          aria-hidden="true"
          className="animate-spin h-8 w-8 text-purple-500"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      </div>
    );
  }

  // ─── Auth gate ───────────────────────────
  if (!user) {
    return <AuthScreen onAuthenticated={() => {}} />;
  }

  // ─── Render ──────────────────────────────
  const { activeMode, setActiveMode } = form;
  const { selectedIds, isSelectionMode, filteredHistory, inspirationImages } =
    gallery;

  const renderRightPanel = () => (
    <>
      {/* ─── Global config ────────────────── */}
      <div className="space-y-4 pt-6 border-t border-zinc-800">
        <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2 mb-2">
          Format & Output
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-zinc-400">Formato</label>
            <select
              value={form.aspectRatio}
              onChange={(e) =>
                form.setAspectRatio(e.target.value as AspectRatio)
              }
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-sm outline-none"
            >
              <option value={AspectRatio.Wide}>
                16:9 Widescreen {activeMode === "video" ? "(Recomendado)" : ""}
              </option>
              <option value={AspectRatio.Tall}>
                9:16 Vertical {activeMode === "video" ? "(Recomendado)" : ""}
              </option>
              {activeMode !== "video" && (
                <>
                  <option value={AspectRatio.Square}>1:1 Square</option>
                  <option value={AspectRatio.Portrait}>3:4 Portrait</option>
                  <option value={AspectRatio.Landscape}>4:3 Landscape</option>
                </>
              )}
            </select>
            {activeMode === "video" &&
              form.aspectRatio !== AspectRatio.Wide &&
              form.aspectRatio !== AspectRatio.Tall && (
                <p className="text-[10px] text-amber-500">
                  Nota: El video usará 16:9 por defecto si el formato
                  seleccionado no es compatible.
                </p>
              )}
          </div>
          {activeMode !== "video" && (
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-zinc-400 mb-1 block">
                Resolution Quality
              </label>
              <select
                value={form.imageSize}
                onChange={(e) => form.setImageSize(e.target.value as ImageSize)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-sm outline-none"
              >
                <option value={ImageSize.Size1K}>1K Estándar</option>
                <option value={ImageSize.Size2K}>2K Alta Res</option>
                <option value={ImageSize.Size4K}>4K Ultra</option>
              </select>
            </div>
          )}
        </div>

        {/* ─── AI Provider + Model selector ──── */}
        {activeMode !== "video" && (
          <div className="space-y-3 pt-1">
            <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block mt-4">
              Render Engine
            </label>

            {/* Provider selector */}
            <div className="grid grid-cols-3 gap-1.5">
              {(Object.values(AIProvider) as AIProvider[])
                .filter((p) => {
                  if (p === AIProvider.Fal) return !!process.env.FAL_KEY;
                  if (p === AIProvider.Replicate)
                    return !!process.env.REPLICATE_API_TOKEN;
                  if (p === AIProvider.OpenAI)
                    return !!process.env.OPENAI_API_KEY;
                  if (p === AIProvider.Ideogram)
                    return !!process.env.IDEOGRAM_API_KEY;
                  return true;
                })
                .map((p) => {
                  const info = AI_PROVIDER_LABELS[p];
                  const isActive = form.aiProvider === p;
                  return (
                    <button
                      key={p}
                      onClick={() => form.setAiProvider(p)}
                      className={`flex flex-col items-center gap-1 p-2.5 rounded-lg border text-center transition-all ${
                        isActive
                          ? "bg-purple-600/20 border-purple-500 text-white"
                          : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
                      }`}
                    >
                      <span className="text-base leading-none">
                        {info.icon}
                      </span>
                      <span className="text-[11px] font-semibold mt-0.5 leading-tight">
                        {info.name}
                      </span>
                    </button>
                  );
                })}
            </div>

            {/* Provider description */}
            <p className="text-[10px] text-zinc-500 px-0.5">
              {AI_PROVIDER_LABELS[form.aiProvider].description}
            </p>

            {/* Gemini sub-model selector */}
            {form.aiProvider === AIProvider.Gemini && (
              <div className="space-y-3">
                {/* Group 1: Gemini multimodal (support reference images + editing) */}
                <div className="space-y-1.5">
                  <p className="text-[10px] text-zinc-600 uppercase tracking-wider font-semibold">
                    Gemini — Multimodal
                  </p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(
                      [
                        GeminiImageModel.Flash,
                        GeminiImageModel.Flash2,
                        GeminiImageModel.Pro,
                      ] as GeminiImageModel[]
                    ).map((m) => {
                      const isActive = form.geminiModel === m;
                      const isFlash = m === GeminiImageModel.Flash;
                      const isFlash2 = m === GeminiImageModel.Flash2;
                      const icon = isFlash ? "⚡" : isFlash2 ? "🍌" : "🔬";
                      const name = isFlash
                        ? "Flash"
                        : isFlash2
                          ? " NB2"
                          : "Pro";
                      const desc = isFlash
                        ? "Rápido y eficiente"
                        : isFlash2
                          ? "Económico"
                          : "Máximo detalle";

                      return (
                        <button
                          key={m}
                          onClick={() => form.setGeminiModel(m)}
                          className={`flex flex-col items-start gap-0.5 p-2.5 rounded-lg border text-left transition-all ${
                            isActive
                              ? "bg-purple-600/20 border-purple-500 text-white"
                              : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
                          }`}
                        >
                          <span className="text-base leading-none">{icon}</span>
                          <span className="text-[11px] font-semibold mt-1">
                            {name}
                          </span>
                          <span className="text-[9px] leading-tight opacity-70">
                            {desc}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Group 2: Imagen 4 (dedicated diffusion — superior photorealism) */}
                <div className="space-y-1.5">
                  <p className="text-[10px] text-zinc-600 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                    Imagen 4 — Difusión Pura
                    <span className="px-1.5 py-0.5 text-[8px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded font-bold">
                      NUEVO
                    </span>
                  </p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(
                      [
                        GeminiImageModel.Imagen4,
                        GeminiImageModel.Imagen4Ultra,
                        GeminiImageModel.Imagen4Fast,
                      ] as GeminiImageModel[]
                    ).map((m) => {
                      const isActive = form.geminiModel === m;
                      const meta = {
                        [GeminiImageModel.Imagen4]: {
                          icon: "🎨",
                          name: "Imagen 4",
                          sub: "Equilibrado",
                        },
                        [GeminiImageModel.Imagen4Ultra]: {
                          icon: "✨",
                          name: "Ultra",
                          sub: "Max fidelidad",
                        },
                        [GeminiImageModel.Imagen4Fast]: {
                          icon: "🚀",
                          name: "Fast",
                          sub: "Rapidísimo",
                        },
                      } as Record<
                        string,
                        { icon: string; name: string; sub: string }
                      >;
                      const info = meta[m];
                      return (
                        <button
                          key={m}
                          onClick={() => form.setGeminiModel(m)}
                          className={`flex flex-col items-start gap-0.5 p-2.5 rounded-lg border text-left transition-all ${
                            isActive
                              ? "bg-emerald-600/20 border-emerald-500 text-white"
                              : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
                          }`}
                        >
                          <span className="text-sm leading-none">
                            {info.icon}
                          </span>
                          <span className="text-[11px] font-semibold mt-1 leading-tight">
                            {info.name}
                          </span>
                          <span className="text-[9px] leading-tight opacity-60">
                            {info.sub}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {IMAGEN4_MODELS.has(form.geminiModel) && (
                    <p className="text-[10px] text-emerald-400/80">
                      🎨 Imagen 4 genera solo desde texto — las fotos de
                      referencia no se usan como contexto visual, pero el
                      outfit/personaje se describe en el prompt.
                    </p>
                  )}
                </div>

                {form.geminiModel === GeminiImageModel.Pro && (
                  <p className="text-[10px] text-amber-400/80">
                    ⚠️ Pro puede ser más lento y está sujeto a mayor demanda del
                    servidor.
                  </p>
                )}
              </div>
            )}

            {/* fal.ai sub-model selector */}
            {form.aiProvider === AIProvider.Fal && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  {FAL_GENERATION_MODELS.map((m) => {
                    const info = FAL_MODEL_LABELS[m];
                    const isActive = form.falModel === m;
                    return (
                      <button
                        key={m}
                        onClick={() => form.setFalModel(m)}
                        className={`flex flex-col items-start gap-1 p-3 rounded-lg border text-left transition-all ${
                          isActive
                            ? "bg-purple-600/20 border-purple-500 text-white"
                            : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
                        }`}
                      >
                        <span className="text-xs font-semibold leading-tight">
                          {info.name}
                        </span>
                        <span className="text-[10px] leading-tight opacity-70 mt-0.5">
                          {info.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-blue-400/80">
                  ⚡ fal.ai requiere foto de referencia del modelo para
                  preservar identidad.
                </p>
              </div>
            )}

            {/* Replicate sub-model selector */}
            {form.aiProvider === AIProvider.Replicate && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      ReplicateModel.Flux2Max,
                      ReplicateModel.Gen4Image,
                    ] as ReplicateModel[]
                  ).map((m) => {
                    const info = REPLICATE_MODEL_LABELS[m];
                    const isActive = form.replicateModel === m;
                    return (
                      <button
                        key={m}
                        onClick={() => form.setReplicateModel(m)}
                        className={`flex flex-col items-start gap-1 p-3 rounded-lg border text-left transition-all ${
                          isActive
                            ? "bg-purple-600/20 border-purple-500 text-white"
                            : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
                        }`}
                      >
                        <span className="text-xs font-semibold leading-tight">
                          {info.name}
                        </span>
                        <span className="text-[10px] leading-tight opacity-70 mt-0.5">
                          {info.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {form.replicateModel === ReplicateModel.Flux2Max ? (
                  <p className="text-[10px] text-amber-400/80">
                    ✨ FLUX.2 [max] — hasta 8 fotos de referencia para máxima
                    fidelidad de identidad.
                  </p>
                ) : (
                  <p className="text-[10px] text-purple-400/80">
                    🎯 Gen-4 Image — requiere al menos 1 foto. Usa{" "}
                    <strong>@model</strong> en el prompt para referenciar al
                    personaje.
                  </p>
                )}
              </div>
            )}

            {/* OpenAI GPT Image sub-model selector */}
            {form.aiProvider === AIProvider.OpenAI && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  {(Object.values(OpenAIModel) as OpenAIModel[]).map((m) => {
                    const info = OPENAI_MODEL_LABELS[m];
                    const isActive = form.openaiModel === m;
                    return (
                      <button
                        key={m}
                        onClick={() => form.setOpenaiModel(m)}
                        className={`flex flex-col items-start gap-1 p-3 rounded-lg border text-left transition-all ${
                          isActive
                            ? "bg-emerald-600/20 border-emerald-500 text-white"
                            : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
                        }`}
                      >
                        <span className="text-xs font-semibold leading-tight">
                          {info.name}
                        </span>
                        <span className="text-[10px] leading-tight opacity-70 mt-0.5">
                          {info.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-emerald-400/80">
                  🤖 Con foto de referencia usa el modo edición multimodal. Sin
                  foto genera desde texto.
                </p>
              </div>
            )}

            {/* Ideogram sub-model selector */}
            {form.aiProvider === AIProvider.Ideogram && (
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-1.5">
                  {(Object.values(IdeogramModel) as IdeogramModel[]).map(
                    (m) => {
                      const info = IDEOGRAM_MODEL_LABELS[m];
                      const isActive = form.ideogramModel === m;
                      return (
                        <button
                          key={m}
                          onClick={() => form.setIdeogramModel(m)}
                          className={`flex flex-col items-start gap-0.5 p-2.5 rounded-lg border text-left transition-all ${
                            isActive
                              ? "bg-blue-600/20 border-blue-500 text-white"
                              : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
                          }`}
                        >
                          <span className="text-[11px] font-semibold leading-tight">
                            {info.name}
                          </span>
                          <span className="text-[9px] leading-tight opacity-60 mt-0.5">
                            {info.description}
                          </span>
                        </button>
                      );
                    },
                  )}
                </div>
                {form.ideogramModel === IdeogramModel.V3 && (
                  <p className="text-[10px] text-blue-400/80">
                    💡 V3 soporta character reference — agrega fotos para
                    mantener consistencia facial.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {activeMode === "create" && (
          <div className="space-y-4 pt-4 border-t border-zinc-800/50">
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <label className="font-medium text-zinc-400">Variaciones</label>
                <span className="text-zinc-500">{form.numberOfImages}</span>
              </div>
              <input
                type="range"
                min="1"
                max="4"
                step="1"
                value={form.numberOfImages}
                onChange={(e) => form.setNumberOfImages(Number(e.target.value))}
                className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
            </div>
          </div>
        )}

        {activeMode === "edit" && form.editSubMode === "poses" && (
          <div className="space-y-1 col-span-2">
            <div className="flex justify-between text-sm items-center mb-1">
              <label className="font-medium text-zinc-400">
                Fotos en Sesión
              </label>
              <span
                className={`text-[10px] px-2 py-0.5 rounded ${form.editNumberOfImages > 1 ? "bg-purple-500/20 text-purple-300" : "bg-zinc-800 text-zinc-500"}`}
              >
                {form.editNumberOfImages}
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="4"
              step="1"
              value={form.editNumberOfImages}
              onChange={(e) =>
                form.setEditNumberOfImages(Number(e.target.value))
              }
              className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
            <p className="text-[10px] text-zinc-500 mt-1">
              {form.editNumberOfImages === 1
                ? "Modo Simple: 1 Pose"
                : "Define una pose diferente para cada foto."}
            </p>
          </div>
        )}
      </div>

      {/* ─── Generate button ──────────────── */}
      <div className="pt-4 pb-8">
        {isGenerating ? (
          <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
            <ProgressBar
              progress={progress}
              label={
                activeMode === "video"
                  ? "Renderizando video..."
                  : "Generando imágenes..."
              }
              onCancel={stopGeneration}
            />
            <p className="text-[10px] text-zinc-500 text-center mt-2 animate-pulse">
              {activeMode === "video"
                ? "Esto puede tardar unos minutos"
                : "Creando detalles de alta fidelidad"}
            </p>
          </div>
        ) : (
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className={`w-full py-4 rounded-xl font-semibold text-white shadow-lg transition-all active:scale-[0.98] ${activeMode === "edit" && form.editSubMode === "ai" ? "bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 shadow-violet-900/30" : "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500"}`}
          >
            {activeMode === "create"
              ? "Generar Imagen"
              : activeMode === "edit"
                ? form.editSubMode === "ai"
                  ? "✨ Aplicar Edición con IA"
                  : form.editNumberOfImages > 1
                    ? `Generar Sesión (${form.editNumberOfImages})`
                    : "Generar Pose"
                : "Crear Video"}
          </button>
        )}
        {gallery.error && (
          <div
            role="alert"
            aria-live="assertive"
            className="mt-4 p-3 bg-red-900/30 border border-red-800/50 rounded-lg text-red-200 text-sm animate-in fade-in flex items-start gap-2"
          >
            <svg
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0 mt-0.5"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{gallery.error}</span>
          </div>
        )}
      </div>
    </>
  );

  return (
    <ApiKeyGuard>
      <div className="relative w-screen h-screen overflow-hidden text-zinc-300 font-body" style={{ background: '#0D0A0A' }}>
        {/* Mobile header */}
        <header className="lg:hidden h-16 flex items-center justify-between px-4 shrink-0 z-40" style={{ background: 'rgba(13,10,10,0.92)', borderBottom: '1px solid #2A1F1C' }}>
          <h1 className="flex items-center gap-1.5 font-display">
            <span className="text-base font-extrabold text-gradient-brand">VIST</span>
            <span className="text-base font-light" style={{ color: '#6B5A56' }}>Studio</span>
          </h1>
          <div className="flex gap-2">
            <button
              onClick={() => setShowDbManager(true)}
              className="p-2 text-zinc-400 hover:text-white"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
                <path d="M12 12v9" />
                <path d="m16 16-4-4-4 4" />
              </svg>
            </button>
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 bg-zinc-800 rounded-lg text-white"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          </div>
        </header>

        {/* ─── Global Top Navigation (Header) ─── */}
        <header className="hidden lg:flex h-14 w-full sticky top-0 z-50 px-6 items-center justify-between" style={{ background: 'rgba(13,10,10,0.88)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #2A1F1C' }}>
          <div className="flex items-center gap-8">
            {/* VIST Wordmark */}
            <h1 className="flex items-center gap-1.5 pr-5 font-display" style={{ borderRight: '1px solid #2A1F1C' }}>
              <span className="text-base font-extrabold text-gradient-brand tracking-tight">VIST</span>
              <span className="text-base font-light text-zinc-500 tracking-wide">Studio</span>
            </h1>

            <nav className="flex gap-0.5">
              {(["explore", "generate", "director", "characters", "storyboard", "pricing"] as const).map((ws) => {
                const TAB_LABELS: Record<string, string> = {
                  explore: "Explore", generate: "Generate", director: "Director",
                  characters: "Library", storyboard: "Storyboard", pricing: "Pricing",
                };
                const TAB_TIPS: Record<string, string> = {
                  explore: "Home & overview",
                  generate: "AI image generation",
                  director: "Character studio",
                  characters: "Character library",
                  storyboard: "Content planner",
                  pricing: "Plans & features",
                };
                return (
                  <button
                    key={ws}
                    onClick={() => setActiveWorkspace(ws)}
                    className="relative group px-4 py-2 text-xs font-semibold tracking-wide transition-all"
                    style={activeWorkspace === ws ? { color: '#FF5C35' } : { color: '#6B5A56' }}
                    onMouseEnter={e => { if (activeWorkspace !== ws) (e.currentTarget as HTMLElement).style.color = '#B8A9A5'; }}
                    onMouseLeave={e => { if (activeWorkspace !== ws) (e.currentTarget as HTMLElement).style.color = '#6B5A56'; }}
                  >
                    {TAB_LABELS[ws]}
                    {activeWorkspace === ws && (
                      <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full" style={{ background: '#FF5C35' }} />
                    )}
                    {/* Tooltip */}
                    <span
                      className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 rounded-lg text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none font-jet z-[100]"
                      style={{ background: '#161110', border: '1px solid #2A1F1C', color: '#B8A9A5', boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }}
                    >
                      {TAB_TIPS[ws]}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative group flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full font-jet cursor-default" style={{ color: '#B8A9A5', background: '#161110', border: '1px solid #2A1F1C' }}>
              <span style={{ color: '#FFB347' }}>⚡</span>
              {sub.isUnlimited ? '∞' : sub.credits.toLocaleString()}
              {/* Credits tooltip */}
              <span
                className="absolute top-full right-0 mt-2 px-2.5 py-1.5 rounded-lg text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none font-jet z-[100]"
                style={{ background: '#161110', border: '1px solid #2A1F1C', color: '#B8A9A5', boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }}
              >
                {sub.isUnlimited ? 'Unlimited credits' : `${sub.credits.toLocaleString()} credits remaining`}
              </span>
            </div>

            <button
              onClick={() => setActiveWorkspace('pricing')}
              className="hidden xl:block px-4 py-1.5 rounded-full text-xs font-bold text-white transition-all hover:scale-[1.02]"
              style={{ background: 'linear-gradient(135deg, #FF5C35, #FFB347)', boxShadow: '0 2px 12px rgba(255,92,53,0.35)', fontFamily: 'var(--font-display)' }}
            >
              Upgrade
            </button>

            {/* User avatar — navigates to profile */}
            <button
              onClick={() => setActiveWorkspace('profile')}
              className="relative flex items-center justify-center w-8 h-8 rounded-full overflow-hidden transition-all"
              style={{
                background: '#1E1614',
                border: activeWorkspace === 'profile' ? '1.5px solid #FF5C35' : '1px solid #2A1F1C',
                boxShadow: activeWorkspace === 'profile' ? '0 0 0 2px rgba(255,92,53,0.2)' : 'none',
              }}
              title="Your profile"
            >
              {profileCtx.profile?.avatarUrl ? (
                <img src={profileCtx.profile.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs font-bold font-display" style={{ color: '#FF5C35' }}>
                  {(profileCtx.profile?.displayName || user?.email || 'U')
                    .split(/[\s@]/).filter(Boolean).map(s => s[0].toUpperCase()).slice(0, 2).join('')}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* ─── Mobile Bottom Tab Bar ─── */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around px-2 py-2 border-t" style={{ background: 'rgba(13,10,10,0.96)', backdropFilter: 'blur(16px)', borderColor: '#1A1210' }}>
          {([
            { ws: 'explore' as const,     icon: (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            ), label: 'Explore' },
            { ws: 'generate' as const,    icon: (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            ), label: 'Generate' },
            { ws: 'director' as const,    icon: (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
            ), label: 'Director' },
            { ws: 'characters' as const,  icon: (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            ), label: 'Library' },
            { ws: 'storyboard' as const,  icon: (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
            ), label: 'Board' },
          ]).map(({ ws, icon, label }) => {
            const isActive = activeWorkspace === ws;
            return (
              <button
                key={ws}
                onClick={() => setActiveWorkspace(ws)}
                className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors min-w-[52px]"
                style={{ color: isActive ? '#FF5C35' : '#4A3A36' }}
              >
                {icon}
                <span className="text-[9px] font-jet font-semibold">{label}</span>
                {isActive && (
                  <span className="w-1 h-1 rounded-full" style={{ background: '#FF5C35' }} />
                )}
              </button>
            );
          })}
        </nav>

        {/* ─── Workspace Router Container ─── */}
        <div className="relative flex-1 w-full h-[calc(100vh-3.5rem)] overflow-hidden transition-opacity duration-300">
          {/* ────── WORKSPACE: EXPLORE ────── */}
          {activeWorkspace === "explore" && (
            <div className="absolute inset-0 z-0 overflow-hidden">
              <ExplorePage onNavigate={handleExploreNavigate} />
            </div>
          )}

          {/* ────── WORKSPACE: GENERATE ────── */}
          {activeWorkspace === "generate" && (
            <div className="absolute inset-0 z-0 overflow-hidden">
              <GeneratorPage
                isGenerating={isGenerating}
                progress={progress}
                onGenerate={handleGenerate}
                onStopGeneration={stopGeneration}
                onDownload={handleDownload}
                onReuse={handleReuse}
                onUpscale={handleUpscale}
                onCaption={(item) => setCaptionItem(item)}
                onFaceSwap={(item) => setFaceSwapItem(item)}
                onTryOn={(item) => setTryOnItem(item)}
                onRelight={(item) => setRelightItem(item)}
                onInpaint={(item) => setInpaintItem(item)}
                onAddToStoryboard={handleAddToStoryboard}
                onSendToDirector={handleSendToDirector}
              />
            </div>
          )}

          {/* ────── WORKSPACE: DIRECTOR ────── */}
          {activeWorkspace === "director" && (
            <div className="absolute inset-0 z-0 overflow-hidden">
              <DirectorStudio
                isGenerating={isGenerating}
                progress={progress}
                onGenerate={handleGenerate}
                onStopGeneration={stopGeneration}
                onDownload={handleDownload}
                onEdit={(item) => gallery.setEditingItem(item)}
                onReuse={handleReuse}
                onChangePose={handleChangePose}
                onUpscale={handleUpscale}
                upscalingId={upscalingId}
                onCaption={(item) => setCaptionItem(item)}
                onRemoveBg={handleRemoveBg}
                onFaceSwap={(item) => setFaceSwapItem(item)}
                onTryOn={(item) => setTryOnItem(item)}
                onSkinEnhance={(item) => setSkinEnhanceItem(item)}
                onRelight={(item) => setRelightItem(item)}
                onInpaint={(item) => setInpaintItem(item)}
                onAddToStoryboard={handleAddToStoryboard}
                onCopyToClipboard={handleCopyToClipboard}
              />
            </div>
          )}

          {/* ────── WORKSPACE: CHARACTERS ────── */}
          {activeWorkspace === "characters" && (
            <div className="absolute inset-0 z-0 overflow-hidden">
              <CharactersPage
                onLoadCharacter={handleLoadCharacterInDirector}
                onNewCharacter={() => setActiveWorkspace("director")}
              />
            </div>
          )}

          {/* ────── WORKSPACE: CREATE / VIDEO / INFLUENCER (legacy) ────── */}
          {(activeWorkspace === "create" || activeWorkspace === "video" || activeWorkspace === "influencer") && (
            <>
              {isMobileMenuOpen && (
                <div
                  className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 lg:hidden"
                  onClick={() => setIsMobileMenuOpen(false)}
                />
              )}

              {/* ─── Sidebar ─────────────────────────── */}

              {/* Floating Minimal Left Dock */}
              <nav className="hidden lg:flex fixed left-4 top-1/2 -translate-y-1/2 z-40 w-16 bg-zinc-950/90 backdrop-blur-xl border border-zinc-800 rounded-3xl flex-col items-center py-6 gap-6 shadow-2xl shadow-black/50">
                <button
                  onClick={() => setShowLeftDrawer(!showLeftDrawer)}
                  className="text-zinc-400 hover:text-white transition-colors"
                  title="Assets & History"
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <line x1="9" y1="3" x2="9" y2="21" />
                  </svg>
                </button>
                <button
                  onClick={() => setMainView("storyboard")}
                  className={`transition-colors ${mainView === "storyboard" ? "text-purple-400" : "text-zinc-400 hover:text-white"}`}
                  title="Storyboard"
                >
                  <span className="text-xl">🎬</span>
                </button>
              </nav>

              {/* The actual Left Sidebar Drawer */}
              <aside
                className={`fixed inset-y-0 left-0 z-[60] w-full md:w-[400px] bg-zinc-950/95 backdrop-blur-2xl border-r border-zinc-800/50 flex flex-col transition-transform duration-500 cubic-bezier(0.16, 1, 0.3, 1) ${isMobileMenuOpen || showLeftDrawer ? "translate-x-0" : "-translate-x-full"}`}
              >
                <div className="p-6 pb-0 border-b border-zinc-800 flex flex-col gap-4 bg-zinc-950">
                  <div className="flex justify-between items-start">
                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        setShowLeftDrawer(false);
                      }}
                      className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-white lg:block hidden"
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                    <div>
                      <h1 className="text-xl font-bold text-white flex items-center gap-2">
                        <span className="w-2 h-8 bg-gradient-to-b from-purple-500 to-indigo-600 rounded-full inline-block"></span>
                        Influencer Studio
                      </h1>
                      <p className="text-xs text-zinc-500 mt-1">
                        Powered by Gemini & Veo
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => signOut()}
                        title={`Cerrar sesión (${user?.email})`}
                        aria-label="Cerrar sesión"
                        className="p-2 text-zinc-500 hover:text-red-400 transition-colors rounded-lg hover:bg-zinc-900"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                          <polyline points="16 17 21 12 16 7" />
                          <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="lg:hidden p-2 text-zinc-400 hover:text-white"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  {user?.email && (
                    <p className="text-[10px] text-zinc-600 truncate -mt-2">
                      {user.email}
                    </p>
                  )}

                  <div className="flex bg-zinc-900 p-1 rounded-lg">
                    <button
                      onClick={() => setMainView("gallery")}
                      className={`flex-1 py-2 text-xs font-medium rounded-md transition-all ${mainView === "gallery" ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"}`}
                    >
                      Galería
                    </button>
                    <button
                      onClick={() => setMainView("inspiration")}
                      className={`flex-1 py-2 text-xs font-medium rounded-md transition-all ${mainView === "inspiration" ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"}`}
                    >
                      Assets
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar h-full">
                  {mainView === "gallery" && (
                    <div className="h-full">
                      <GalleryGrid
                        onDownload={handleDownload}
                        onEdit={(item) => gallery.setEditingItem(item)}
                        onReuse={handleReuse}
                        onChangePose={handleChangePose}
                        onUpscale={handleUpscale}
                        upscalingId={upscalingId}
                        onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
                        onCaption={(item) => setCaptionItem(item)}
                        onRemoveBg={handleRemoveBg}
                        onFaceSwap={(item) => setFaceSwapItem(item)}
                        onTryOn={(item) => setTryOnItem(item)}
                        onSkinEnhance={(item) => setSkinEnhanceItem(item)}
                        onRelight={(item) => setRelightItem(item)}
                        onInpaint={(item) => setInpaintItem(item)}
                        onStoryboard={handleAddToStoryboard}
                        onCopyToClipboard={handleCopyToClipboard}
                      />
                    </div>
                  )}
                  {mainView === "inspiration" && (
                    <InspirationBoard
                      images={gallery.inspirationImages}
                      onAdd={gallery.addInspiration}
                      onDelete={gallery.deleteInspiration}
                      onUse={handleUseInspiration}
                    />
                  )}
                </div>
              </aside>

              <main
                className={`absolute inset-y-0 left-0 z-0 bg-black flex flex-col pt-0 pb-32 transition-all duration-500 cubic-bezier(0.16, 1, 0.3, 1) ${showAdvancedConfig ? "right-0 md:right-[450px]" : "right-0"}`}
              >
                {/* ─── Mode Toggles (workspace-aware) ─── */}
                <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[50] flex items-center gap-1 p-1 bg-zinc-900/40 backdrop-blur-2xl border border-white/5 rounded-2xl shadow-2xl">
                  {activeWorkspace === "create" && (
                    /* Create workspace: image generation only */
                    <span className="px-5 py-2.5 rounded-xl text-xs font-semibold tracking-wide text-zinc-200 bg-white/8">
                      🖼️ Image Studio
                    </span>
                  )}
                  {activeWorkspace === "video" && (
                    /* Video workspace: video generation only */
                    <span className="px-5 py-2.5 rounded-xl text-xs font-semibold tracking-wide text-zinc-200 bg-white/8">
                      🎬 Video Studio
                    </span>
                  )}
                  {activeWorkspace === "influencer" && (
                    /* Influencer workspace: character creation + editing */
                    <>
                      <button
                        onClick={() => setActiveMode("create")}
                        className={`px-4 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-300 ${activeMode === "create" ? "bg-white text-black shadow-md" : "text-zinc-400 hover:text-white hover:bg-white/5"}`}
                      >
                        🎨 Crear Personaje
                      </button>
                      <button
                        onClick={() => { setActiveMode("edit"); form.setEditSubMode("poses"); }}
                        className={`px-4 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-300 ${activeMode === "edit" && form.editSubMode === "poses" ? "bg-white text-black shadow-md" : "text-zinc-400 hover:text-white hover:bg-white/5"}`}
                      >
                        🎭 Poses
                      </button>
                      <button
                        onClick={() => { setActiveMode("edit"); form.setEditSubMode("ai"); }}
                        className={`px-4 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-300 ${activeMode === "edit" && form.editSubMode === "ai" ? "bg-white text-black shadow-md" : "text-zinc-400 hover:text-white hover:bg-white/5"}`}
                      >
                        ✨ AI Edit
                      </button>
                    </>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 pt-24">
                  {mainView === "gallery" && (
                    <div className="h-full">
                      {gallery.generatedHistory.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center -mt-10 animate-in zoom-in duration-700">
                          <div className="absolute inset-0 bg-gradient-to-b from-purple-900/10 via-transparent to-transparent pointer-events-none" />
                          <h2 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-white/20 mb-6 tracking-tighter text-center leading-none">
                            {activeWorkspace === "video" ? (
                              <>TELL YOUR<br />STORY</>
                            ) : activeWorkspace === "influencer" ? (
                              <>SHAPE YOUR<br />CHARACTER</>
                            ) : (
                              <>CREATE<br />ANYTHING</>
                            )}
                          </h2>
                          <p className="text-zinc-500 text-center max-w-md text-lg md:text-xl font-light tracking-wide mb-12">
                            {activeWorkspace === "video"
                              ? "Upload an image and describe the motion to generate cinematic AI video."
                              : activeWorkspace === "influencer"
                              ? "Upload a reference photo, select a mode above, and start crafting your character."
                              : "Type your vision below to direct your next cinematic shot."}
                          </p>
                        </div>
                      ) : (
                        <GalleryGrid
                          onDownload={handleDownload}
                          onEdit={(item) => gallery.setEditingItem(item)}
                          onReuse={handleReuse}
                          onChangePose={handleChangePose}
                          onUpscale={handleUpscale}
                          upscalingId={upscalingId}
                          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
                          onCaption={(item) => setCaptionItem(item)}
                          onRemoveBg={handleRemoveBg}
                          onFaceSwap={(item) => setFaceSwapItem(item)}
                          onTryOn={(item) => setTryOnItem(item)}
                          onSkinEnhance={(item) => setSkinEnhanceItem(item)}
                          onRelight={(item) => setRelightItem(item)}
                          onInpaint={(item) => setInpaintItem(item)}
                          onStoryboard={handleAddToStoryboard}
                          onCopyToClipboard={handleCopyToClipboard}
                        />
                      )}
                    </div>
                  )}
                </div>

                {/* ─── Floating Command Bar (Higgsfield Style) ─── */}
                <div
                  className={`fixed bottom-6 z-[70] transition-all duration-500 cubic-bezier(0.16, 1, 0.3, 1) w-[96%] max-w-4xl bg-zinc-900/40 backdrop-blur-3xl border border-white/5 rounded-3xl p-3 shadow-[0_8px_32px_rgba(0,0,0,0.8)] flex flex-col gap-3 left-1/2 -translate-x-1/2`}
                >
                  {/* Upper Row: Prompt taking full width */}
                  <div className="bg-white/[0.02] rounded-2xl border border-white/5 flex items-center p-2 focus-within:border-white/20 focus-within:bg-white/[0.04] transition-all">
                    {activeMode === "video" ? (
                      <input
                        value={form.videoPrompt}
                        onChange={(e) => form.setVideoPrompt(e.target.value)}
                        placeholder="Describe the motion and scene for your video..."
                        className="w-full bg-transparent text-white text-base outline-none px-4 py-2 placeholder:text-zinc-500 font-light"
                      />
                    ) : (
                      <input
                        value={form.characters[0]?.outfitDescription || ""}
                        onChange={(e) =>
                          form.updateCharacter(
                            form.characters[0]?.id || "",
                            "outfitDescription",
                            e.target.value,
                          )
                        }
                        placeholder="Describe the subject, outfit, taking place in a cinematic setting..."
                        className="w-full bg-transparent text-white text-base outline-none px-4 py-2 placeholder:text-zinc-500 font-light"
                      />
                    )}
                  </div>

                  {/* Lower Row: Pills and Generate Button */}
                  <div className="flex items-center justify-between gap-3 px-1">
                    {/* Left block: Settings Pills */}
                    <div className="flex items-center gap-2">
                      {/* AR Pill */}
                      <button className="hidden sm:flex items-center gap-1.5 px-4 py-2 bg-white/[0.03] hover:bg-white/10 rounded-xl border border-white/5 text-[11px] font-medium text-zinc-300 transition-colors">
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                        </svg>
                        {form.aspectRatio.split(":")[0]}:
                        {form.aspectRatio.split(":")[1] || "1"}
                      </button>

                      {/* Advanced Settings Drawer Trigger */}
                      <button
                        onClick={() =>
                          setShowAdvancedConfig(!showAdvancedConfig)
                        }
                        className="flex items-center gap-1.5 px-4 py-2 bg-white/[0.03] hover:bg-white/10 rounded-xl border border-white/5 text-[11px] font-medium text-zinc-300 transition-colors group"
                      >
                        <svg
                          className="text-zinc-500 group-hover:text-white transition-colors"
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <circle cx="12" cy="12" r="3" />
                          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                        </svg>
                        Studio Config
                      </button>
                    </div>

                    {/* Right block: Action Button */}
                    <button
                      onClick={handleGenerate}
                      disabled={isGenerating}
                      className="px-8 py-2.5 rounded-xl text-white font-bold text-sm tracking-wide bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 hover:scale-[1.03] active:scale-95 transition-all shadow-[0_0_20px_rgba(147,51,234,0.3)] disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-2"
                    >
                      {isGenerating ? (
                        <span className="flex items-center">
                          <svg
                            className="animate-spin w-4 h-4 mr-2"
                            viewBox="0 0 24 24"
                          >
                            <path
                              fill="currentColor"
                              d="M12 2A10 10 0 1 0 22 12A10 10 0 0 0 12 2Zm0 18A8 8 0 1 1 20 12A8 8 0 0 1 12 20Z"
                              opacity="0.2"
                            />
                            <path
                              fill="currentColor"
                              d="M12 4A8 8 0 0 1 20 12h2A10 10 0 0 0 12 2Z"
                            />
                          </svg>{" "}
                          GENERATING...
                        </span>
                      ) : (
                        <span>
                          GENERATE <span className="text-purple-300">♦</span>
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              </main>

              {/* ─── Right Sidebar Floating Drawer ─────────────────────── */}
              <aside
                className={`fixed inset-y-0 right-0 z-[60] w-full md:w-[450px] bg-zinc-950/90 backdrop-blur-3xl border-l border-white/5 flex flex-col transition-transform duration-500 cubic-bezier(0.16, 1, 0.3, 1) ${showAdvancedConfig ? "translate-x-0" : "translate-x-full"}`}
              >
                {/* Close Right Drawer button */}
                <button
                  onClick={() => setShowAdvancedConfig(false)}
                  className="absolute top-4 left-4 p-2 text-zinc-500 hover:text-white z-50 bg-white/5 rounded-full backdrop-blur-md transition-colors hover:bg-white/10"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
                <div className="p-6 pb-0 border-b border-white/5 bg-transparent sticky top-0 z-10 flex flex-col gap-3">
                  <div className="flex justify-between items-center pt-2 pl-12">
                    <h2 className="text-sm font-semibold tracking-widest uppercase text-white">
                      Director's Panel
                    </h2>
                  </div>
                  <div className="flex bg-zinc-900 p-1 rounded-lg mb-4">
                    <button
                      onClick={() => setActiveMode("create")}
                      className={`flex-1 py-1.5 text-[11px] font-medium rounded transition-all ${activeMode === "create" ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"}`}
                    >
                      Creación
                    </button>
                    <button
                      onClick={() => setActiveMode("edit")}
                      className={`flex-1 py-1.5 text-[11px] font-medium rounded transition-all ${activeMode === "edit" ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"}`}
                    >
                      Poses(Edición)
                    </button>
                    <button
                      onClick={() => setActiveMode("video")}
                      className={`flex-1 py-1.5 text-[11px] font-medium rounded transition-all ${activeMode === "video" ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"}`}
                    >
                      Video
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar pb-32">
                  <div
                    key={activeMode}
                    className="animate-in fade-in slide-in-from-right-2 duration-300 space-y-8"
                  >
                    {/* ─── Create mode ──────────────────── */}
                    {activeMode === "create" && (
                      <>
                        {/* Multi-character slider — only Gemini multimodal supports it */}
                        <div
                          className={`space-y-1 transition-opacity ${caps.multiCharacter ? "" : "opacity-40 pointer-events-none"}`}
                        >
                          <div className="flex justify-between text-sm items-center mb-1">
                            <label className="font-medium text-zinc-400 flex items-center gap-1.5">
                              Número de Personajes
                              {!caps.multiCharacter && (
                                <span className="text-[9px] bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded">
                                  Solo Gemini
                                </span>
                              )}
                            </label>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded ${form.numCharacters > 1 ? "bg-purple-500/20 text-purple-300" : "bg-zinc-800 text-zinc-500"}`}
                            >
                              {form.numCharacters}
                            </span>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max="4"
                            step="1"
                            value={caps.multiCharacter ? form.numCharacters : 1}
                            onChange={(e) =>
                              form.setNumCharacters(Number(e.target.value))
                            }
                            className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                            disabled={!caps.multiCharacter}
                          />
                        </div>

                        {form.characters.map((char, index) => (
                          <div
                            key={char.id}
                            className="p-4 border border-zinc-800 rounded-xl bg-zinc-900/30 space-y-6 relative animate-in fade-in slide-in-from-bottom-4 duration-300"
                          >
                            <div className="flex justify-between items-center">
                              <h3 className="text-sm font-semibold text-purple-300 uppercase tracking-wider">
                                Personaje {index + 1}
                              </h3>
                            </div>

                            {/* Face / Model photo — supported by all except Imagen 4 */}
                            {caps.faceImage ? (
                              <>
                                <UploadZone
                                  label="Modelo (Cara/Cuerpo)"
                                  files={char.modelImages}
                                  onFilesChange={(f) =>
                                    form.updateCharacter(
                                      char.id,
                                      "modelImages",
                                      Array.isArray(f) ? f : f ? [f] : [],
                                    )
                                  }
                                  multiple={true}
                                  onImagePreview={gallery.setPreviewImage}
                                />
                                {/* Quality indicator */}
                                {(() => {
                                  const count = char.modelImages?.length ?? 0;
                                  if (count === 0) return null;
                                  const steps: {
                                    label: string;
                                    active: boolean;
                                    color: string;
                                  }[] = [
                                    {
                                      label: "1 foto",
                                      active: count >= 1,
                                      color: "bg-amber-500",
                                    },
                                    {
                                      label: "2 fotos",
                                      active: count >= 2,
                                      color: "bg-yellow-400",
                                    },
                                    {
                                      label: "3+ fotos",
                                      active: count >= 3,
                                      color: "bg-emerald-500",
                                    },
                                  ];
                                  const msg =
                                    count >= 3
                                      ? {
                                          text: "Identidad óptima",
                                          color: "text-emerald-400",
                                        }
                                      : count === 2
                                        ? {
                                            text: "Buena referencia — añade 1 más para mejorar",
                                            color: "text-yellow-400",
                                          }
                                        : {
                                            text: "Mínimo — añade más ángulos para mejor fidelidad",
                                            color: "text-amber-400",
                                          };
                                  return (
                                    <div className="flex flex-col gap-1.5 px-1">
                                      <div className="flex items-center gap-1.5">
                                        {steps.map((s, i) => (
                                          <div
                                            key={i}
                                            className={`h-1 flex-1 rounded-full transition-all duration-300 ${s.active ? s.color : "bg-zinc-800"}`}
                                          />
                                        ))}
                                      </div>
                                      <p className={`text-[10px] ${msg.color}`}>
                                        {msg.text}
                                      </p>
                                    </div>
                                  );
                                })()}
                              </>
                            ) : (
                              <div className="flex items-center gap-2 p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg">
                                <span className="text-base">🎨</span>
                                <p className="text-[11px] text-zinc-500">
                                  Este motor genera desde texto — describe las
                                  características del personaje abajo.
                                </p>
                              </div>
                            )}

                            {/* Outfit — image + text for Gemini, text-only for others */}
                            {caps.outfitImage ? (
                              <ReferenceInput
                                label="Outfit / Ropa"
                                textValue={char.outfitDescription ?? ""}
                                onTextChange={(v) =>
                                  form.updateCharacter(
                                    char.id,
                                    "outfitDescription" as any,
                                    v,
                                  )
                                }
                                imageValue={char.outfitImages ?? []}
                                onImageChange={(f) =>
                                  form.updateCharacter(
                                    char.id,
                                    "outfitImages",
                                    Array.isArray(f) ? f : f ? [f] : [],
                                  )
                                }
                                onImagePreview={gallery.setPreviewImage}
                                multiple={true}
                                category="Outfit / Ropa"
                                placeholder="Ej. vestido rojo ajustado con escote en V, tacones negros..."
                              />
                            ) : (
                              <div className="space-y-1">
                                <label className="text-sm font-medium text-zinc-400 flex items-center gap-1.5">
                                  Outfit / Ropa
                                  <span className="text-[9px] bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded">
                                    Solo texto
                                  </span>
                                </label>
                                <textarea
                                  value={char.outfitDescription ?? ""}
                                  onChange={(e) =>
                                    form.updateCharacter(
                                      char.id,
                                      "outfitDescription" as any,
                                      e.target.value,
                                    )
                                  }
                                  placeholder="Describe el outfit: Ej. vestido rojo ajustado con escote en V, tacones negros..."
                                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none resize-none h-16 placeholder:text-zinc-600 transition-all"
                                />
                                <p className="text-[10px] text-zinc-500">
                                  Las fotos de outfit no son compatibles con
                                  este motor — descríbelo en texto.
                                </p>
                              </div>
                            )}

                            <CharacteristicsInput
                              value={char.characteristics}
                              onChange={(v) =>
                                form.updateCharacter(
                                  char.id,
                                  "characteristics",
                                  v,
                                )
                              }
                            />

                            {/* Pose — image + text for Gemini, text-only for others */}
                            <div>
                              <ReferenceInput
                                label="Pose"
                                textValue={char.pose}
                                onTextChange={(v) =>
                                  form.updateCharacter(char.id, "pose", v)
                                }
                                imageValue={
                                  caps.poseImage ? char.poseImage : null
                                }
                                onImageChange={
                                  caps.poseImage
                                    ? (v) =>
                                        form.updateCharacter(
                                          char.id,
                                          "poseImage",
                                          v as File | null,
                                        )
                                    : undefined
                                }
                                onImagePreview={gallery.setPreviewImage}
                                presets={POSE_PRESETS}
                                category="Pose Fotográfica"
                                placeholder="Ej. Caminando, sentada, de espaldas mirando al horizonte..."
                                disableImage={!caps.poseImage}
                                disableImageTooltip="Solo Gemini soporta foto de pose"
                              />
                              {caps.poseImage && char.poseImage && (
                                <div className="mt-3 flex flex-col gap-3">
                                  <div className="flex items-center justify-between p-2.5 bg-indigo-500/5 border border-indigo-500/20 rounded-lg">
                                    <div className="space-y-0.5">
                                      <p className="text-xs font-semibold text-indigo-300">
                                        Evitar interferencias
                                      </p>
                                      <p className="text-[10px] text-zinc-400">
                                        Extrae el esqueleto para que la IA no
                                        copie la ropa ni la cara de esta foto.
                                      </p>
                                    </div>
                                    <button
                                      onClick={async (e) => {
                                        e.preventDefault();
                                        try {
                                          toast.info(
                                            "Analizando pose (incluyendo manos y rostro)...",
                                          );
                                          const skeleton =
                                            await extractPoseSkeleton(
                                              char.poseImage as File,
                                            );
                                          form.updateCharacter(
                                            char.id,
                                            "poseImage",
                                            skeleton,
                                          );
                                          toast.success(
                                            "Pose convertida a esqueleto con éxito",
                                          );
                                        } catch (err) {
                                          console.error(err);
                                          toast.error(
                                            "Error al generar el esqueleto.",
                                          );
                                        }
                                      }}
                                      className="px-3 py-1.5 text-[11px] font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-md transition-colors whitespace-nowrap"
                                    >
                                      🪄 Extraer Esqueleto
                                    </button>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      id={`usePoseAsOutfit-${char.id}`}
                                      checked={char.usePoseAsOutfit}
                                      onChange={(e) =>
                                        form.updateCharacter(
                                          char.id,
                                          "usePoseAsOutfit",
                                          e.target.checked,
                                        )
                                      }
                                      className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-purple-600 focus:ring-purple-500"
                                    />
                                    <label
                                      htmlFor={`usePoseAsOutfit-${char.id}`}
                                      className="text-xs text-zinc-400 select-none cursor-pointer"
                                    >
                                      Copiar outfit de esta foto de pose
                                    </label>
                                  </div>
                                </div>
                              )}
                            </div>

                            <ReferenceInput
                              label="Objeto / Accesorio"
                              textValue={char.accessory}
                              onTextChange={(v) =>
                                form.updateCharacter(char.id, "accessory", v)
                              }
                              imageValue={
                                caps.poseImage ? char.accessoryImages : []
                              }
                              onImageChange={
                                caps.poseImage
                                  ? (v) =>
                                      form.updateCharacter(
                                        char.id,
                                        "accessoryImages",
                                        Array.isArray(v) ? v : v ? [v] : [],
                                      )
                                  : undefined
                              }
                              category="Accesorio / Objeto"
                              placeholder="Ej. Sosteniendo un café..."
                              multiple={true}
                              disableImage={!caps.poseImage}
                              disableImageTooltip="Solo Gemini soporta foto de accesorio"
                            />
                          </div>
                        ))}

                        <div className="space-y-4 pt-6 border-t border-zinc-800">
                          <div className="flex justify-between items-center">
                            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                              Escena Compartida
                            </h2>
                            <button
                              onClick={handleSavePreset}
                              className="px-2 py-1 text-[10px] bg-purple-500/10 border border-purple-500/20 text-purple-300 rounded hover:bg-purple-500/20"
                            >
                              Guardar Preset
                            </button>
                          </div>
                          {/* Scenario — image + text for Gemini, text-only for others */}
                          <ReferenceInput
                            label="Escenario / Fondo"
                            textValue={form.scenario}
                            onTextChange={form.setScenario}
                            imageValue={
                              caps.scenarioImage ? form.scenarioImage : []
                            }
                            onImageChange={
                              caps.scenarioImage
                                ? (val) =>
                                    form.setScenarioImage(
                                      Array.isArray(val)
                                        ? val
                                        : val
                                          ? [val]
                                          : [],
                                    )
                                : undefined
                            }
                            category="Escenario"
                            placeholder="Ej. Café en París, playa al atardecer..."
                            presets={SCENARIO_PRESETS}
                            multiple={true}
                            disableImage={!caps.scenarioImage}
                            disableImageTooltip="Solo Gemini soporta foto de escenario"
                          />
                          <EnhancedInput
                            label="Iluminación"
                            value={form.lighting}
                            onChange={form.setLighting}
                            category="Iluminación"
                            placeholder="Ej. Hora dorada, luz de estudio..."
                            presets={LIGHTING_PRESETS}
                          />
                          <EnhancedInput
                            label="Cámara y Lente"
                            value={form.camera}
                            onChange={form.setCamera}
                            category="Fotografía"
                            placeholder="Ej. Lente 85mm, estilo analógico, cámara polaroid..."
                            presets={CAMERA_PRESETS}
                          />

                          {/* ── Image Boost ─────────────────────── */}
                          <div className="space-y-1.5">
                            <label className="text-sm font-medium text-zinc-400 flex items-center gap-1.5">
                              ✨ Potenciador de Imagen
                              <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded font-semibold">
                                BOOST
                              </span>
                            </label>
                            <textarea
                              value={form.imageBoost}
                              onChange={(e) =>
                                form.setImageBoost(e.target.value)
                              }
                              placeholder="Ej. 3D CGI render, Octane render style, subsurface scattering, ultra-detailed textures, volumetric lighting..."
                              className="w-full bg-zinc-900 border border-amber-500/20 rounded-lg p-3 text-sm focus:ring-2 focus:ring-amber-500/50 outline-none resize-none h-16 placeholder:text-zinc-600 transition-all"
                            />
                            <p className="text-[10px] text-zinc-500">
                              Keywords de calidad, estilo o renderizado que se
                              añaden al final del prompt.
                            </p>
                          </div>

                          <div className="pt-2">
                            <div className="flex items-center justify-between">
                              <label className="text-sm font-medium text-zinc-400">
                                Prompt Negativo (Opcional)
                              </label>
                              <div
                                className="flex items-center gap-2 px-2 py-1 bg-zinc-900/50 rounded border border-zinc-800/50 cursor-pointer hover:bg-zinc-800 transition-colors"
                                onClick={() =>
                                  form.setAntiFisheye(!form.antiFisheye)
                                }
                              >
                                <label
                                  htmlFor="antiFisheye"
                                  className="text-xs text-zinc-400 cursor-pointer select-none font-medium"
                                >
                                  Evitar Ojo de Pez
                                </label>
                                <input
                                  type="checkbox"
                                  id="antiFisheye"
                                  checked={form.antiFisheye}
                                  onChange={(e) =>
                                    form.setAntiFisheye(e.target.checked)
                                  }
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-3.5 h-3.5 rounded border-zinc-700 bg-zinc-950 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-zinc-900 cursor-pointer"
                                />
                              </div>
                            </div>
                            <textarea
                              value={form.negativePrompt}
                              onChange={(e) =>
                                form.setNegativePrompt(e.target.value)
                              }
                              placeholder="Ej. deformado, borroso, baja calidad, texto, marcas de agua, manos extrañas..."
                              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none resize-none h-20 placeholder:text-zinc-600 mt-2 transition-all"
                            />
                            <p className="text-[10px] text-zinc-500 mt-1">
                              Describe lo que NO quieres que aparezca en la
                              imagen.
                            </p>
                          </div>

                          <div className="pt-4 border-t border-zinc-800/50 mt-4 space-y-4">
                            <div className="flex items-center gap-2">
                              <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                                Ajustes Avanzados
                              </h2>
                              <span className="px-1.5 py-0.5 text-[9px] bg-zinc-800 text-zinc-400 rounded font-bold">
                                OPCIONAL
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <div className="flex justify-between text-xs">
                                  <label className="font-medium text-zinc-400">
                                    Guía (CFG Scale)
                                  </label>
                                  <span className="text-purple-400 font-mono">
                                    {form.guidanceScale}
                                  </span>
                                </div>
                                <input
                                  type="range"
                                  min="1"
                                  max="20"
                                  step="0.5"
                                  value={form.guidanceScale}
                                  onChange={(e) =>
                                    form.setGuidanceScale(
                                      Number(e.target.value),
                                    )
                                  }
                                  className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                />
                                <p className="text-[9px] text-zinc-500 leading-tight">
                                  Adherencia al prompt (valores altos = más
                                  estricto).
                                </p>
                              </div>

                              <div className="space-y-1">
                                <div className="flex justify-between text-xs">
                                  <label className="font-medium text-zinc-400">
                                    Strength (Fuerza)
                                  </label>
                                  <span className="text-blue-400 font-mono">
                                    {form.strength}
                                  </span>
                                </div>
                                <input
                                  type="range"
                                  min="0"
                                  max="1"
                                  step="0.05"
                                  value={form.strength}
                                  onChange={(e) =>
                                    form.setStrength(Number(e.target.value))
                                  }
                                  className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                />
                                <p className="text-[9px] text-zinc-500 leading-tight">
                                  Intervención de IA vs Imagen Base (0.4-0.7
                                  recomendado).
                                </p>
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="text-xs font-medium text-zinc-400">
                                Semilla Aleatoria (Seed)
                              </label>
                              <input
                                type="number"
                                value={form.seed || ""}
                                onChange={(e) =>
                                  form.setSeed(
                                    e.target.value
                                      ? Number(e.target.value)
                                      : undefined,
                                  )
                                }
                                placeholder="Ej. 123456 (Dejar vacío para aleatorio)"
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-purple-500 outline-none placeholder:text-zinc-600 transition-all font-mono"
                              />
                              <p className="text-[9px] text-zinc-500 leading-tight">
                                Mantén este campo vacío para resultados
                                aleatorios o usa un número para
                                reproducibilidad.
                              </p>
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    {/* ─── Edit mode ────────────────────── */}
                    {activeMode === "edit" && (
                      <>
                        {/* Sub-mode switcher */}
                        <div className="flex gap-1 p-1 bg-zinc-900 rounded-lg border border-zinc-800">
                          <button
                            onClick={() => form.setEditSubMode("poses")}
                            className={`flex-1 py-1.5 text-[11px] font-medium rounded-md transition-all flex items-center justify-center gap-1.5 ${form.editSubMode === "poses" ? "bg-zinc-700 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"}`}
                          >
                            🎭 Poses
                          </button>
                          <button
                            onClick={() => form.setEditSubMode("ai")}
                            className={`flex-1 py-1.5 text-[11px] font-medium rounded-md transition-all flex items-center justify-center gap-1.5 ${form.editSubMode === "ai" ? "bg-violet-600 text-white shadow-sm shadow-violet-900/50" : "text-zinc-500 hover:text-zinc-300"}`}
                          >
                            ✨ Editar con IA
                          </button>
                        </div>

                        {/* Shared: base image upload */}
                        <div className="space-y-4">
                          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                            Imagen Base
                          </h2>
                          <UploadZone
                            label="Foto Original"
                            files={form.baseImageForEdit}
                            onFilesChange={(f) =>
                              form.setBaseImageForEdit(f as File | null)
                            }
                            onImagePreview={gallery.setPreviewImage}
                          />
                        </div>

                        {/* ── AI Edit sub-mode ── */}
                        {form.editSubMode === "ai" && (
                          <div className="space-y-4">
                            {/* Motor de edición IA — arriba para que los campos se adapten */}
                            <div className="space-y-1.5">
                              <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                                Motor de Edición
                              </h2>
                              <div className="flex gap-1 p-1 bg-zinc-900 rounded-lg border border-zinc-800">
                                <button
                                  onClick={() =>
                                    form.setAiEditEngine(AIEditEngine.Gemini)
                                  }
                                  title="Gemini — multimodal, acepta imagen de referencia"
                                  className={`flex-1 py-1.5 text-[11px] font-medium rounded-md transition-all flex items-center justify-center gap-1 ${form.aiEditEngine === AIEditEngine.Gemini ? "bg-violet-700 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"}`}
                                >
                                  <span>✦</span> Gemini
                                </button>
                                {!!process.env.OPENAI_API_KEY && (
                                  <button
                                    onClick={() =>
                                      form.setAiEditEngine(
                                        AIEditEngine.GPTImageEdit,
                                      )
                                    }
                                    title="GPT Image 1 — edición por instrucción de texto con OpenAI"
                                    className={`flex-1 py-1.5 text-[11px] font-medium rounded-md transition-all flex items-center justify-center gap-1 ${form.aiEditEngine === AIEditEngine.GPTImageEdit ? "bg-emerald-700 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"}`}
                                  >
                                    <span>🤖</span> GPT
                                  </button>
                                )}
                                {!!process.env.FAL_KEY && (
                                  <>
                                    <button
                                      onClick={() =>
                                        form.setAiEditEngine(
                                          AIEditEngine.FluxKontext,
                                        )
                                      }
                                      title="FLUX Kontext Pro — edición precisa por texto, preserva identidad"
                                      className={`flex-1 py-1.5 text-[11px] font-medium rounded-md transition-all flex items-center justify-center gap-1 ${form.aiEditEngine === AIEditEngine.FluxKontext ? "bg-blue-700 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"}`}
                                    >
                                      <span>⚡</span> FLUX
                                    </button>
                                    <button
                                      onClick={() =>
                                        form.setAiEditEngine(
                                          AIEditEngine.Flux2ProEdit,
                                        )
                                      }
                                      title="FLUX.2 Pro Edit — multi-referencia, ideal para 2D→3D y escenarios"
                                      className={`flex-1 py-1.5 text-[11px] font-medium rounded-md transition-all flex items-center justify-center gap-1 ${form.aiEditEngine === AIEditEngine.Flux2ProEdit ? "bg-sky-700 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"}`}
                                    >
                                      <span>🔥</span> FLUX.2
                                    </button>
                                    <button
                                      onClick={() =>
                                        form.setAiEditEngine(
                                          AIEditEngine.Seedream5Edit,
                                        )
                                      }
                                      title="Seedream 5 Edit — edición multimodal con hasta 9 imágenes de referencia"
                                      className={`flex-1 py-1.5 text-[11px] font-medium rounded-md transition-all flex items-center justify-center gap-1 ${form.aiEditEngine === AIEditEngine.Seedream5Edit ? "bg-orange-700 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"}`}
                                    >
                                      <span>🌊</span> Seedream
                                    </button>
                                    <button
                                      onClick={() =>
                                        form.setAiEditEngine(
                                          AIEditEngine.FaceSwapFal,
                                        )
                                      }
                                      title="Face Swap — intercambio de caras puro con fal.ai"
                                      className={`flex-1 py-1.5 text-[11px] font-medium rounded-md transition-all flex items-center justify-center gap-1 ${form.aiEditEngine === AIEditEngine.FaceSwapFal ? "bg-rose-700 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"}`}
                                    >
                                      <span>🎭</span> Face Swap
                                    </button>
                                  </>
                                )}
                              </div>
                              {/* Descripción del motor seleccionado */}
                              {form.aiEditEngine === AIEditEngine.Gemini && (
                                <p className="text-[10px] text-zinc-500 leading-relaxed px-0.5">
                                  <span className="text-violet-400 font-medium">
                                    Gemini
                                  </span>{" "}
                                  — multimodal, acepta imagen de referencia
                                  opcional para guiar el efecto.
                                </p>
                              )}
                              {form.aiEditEngine ===
                                AIEditEngine.GPTImageEdit && (
                                <p className="text-[10px] text-zinc-500 leading-relaxed px-0.5">
                                  <span className="text-emerald-400 font-medium">
                                    GPT Image 1
                                  </span>{" "}
                                  — edición precisa por instrucción de texto.
                                  Sin referencias adicionales.
                                </p>
                              )}
                              {form.aiEditEngine ===
                                AIEditEngine.FluxKontext && (
                                <p className="text-[10px] text-zinc-500 leading-relaxed px-0.5">
                                  <span className="text-blue-400 font-medium">
                                    FLUX Kontext Pro
                                  </span>{" "}
                                  — preserva cara e identidad. Solo texto, sin
                                  imagen de referencia.
                                </p>
                              )}
                              {form.aiEditEngine ===
                                AIEditEngine.Flux2ProEdit && (
                                <p className="text-[10px] text-zinc-500 leading-relaxed px-0.5">
                                  <span className="text-sky-400 font-medium">
                                    FLUX.2 Pro Edit
                                  </span>{" "}
                                  — multi-referencia. Ideal para 2D→3D, cambio
                                  de escenario, transformación de estilo. Sube
                                  fotos del personaje u outfit como referencias.
                                </p>
                              )}
                              {form.aiEditEngine ===
                                AIEditEngine.Seedream5Edit && (
                                <p className="text-[10px] text-zinc-500 leading-relaxed px-0.5">
                                  <span className="text-orange-400 font-medium">
                                    Seedream 5 Edit
                                  </span>{" "}
                                  — hasta 9 referencias. En el prompt usa
                                  "Figure 1" para la base y "Figure 2", "Figure
                                  3"… para las referencias.
                                </p>
                              )}
                              {form.aiEditEngine ===
                                AIEditEngine.FaceSwapFal && (
                                <p className="text-[10px] text-zinc-500 leading-relaxed px-0.5">
                                  <span className="text-rose-400 font-medium">
                                    Face Swap
                                  </span>{" "}
                                  — intercambio de caras. Sube la foto del
                                  Influencer a continuación para ponerla en la
                                  foto de destino.
                                </p>
                              )}
                            </div>

                            {/* Instrucción (Oculto para FaceSwap) */}
                            {form.aiEditEngine !== AIEditEngine.FaceSwapFal && (
                              <>
                                <div className="flex items-center gap-2">
                                  <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                                    Instrucción de Edición
                                  </h2>
                                  <span className="text-[9px] bg-violet-500/20 text-violet-300 border border-violet-500/30 px-1.5 py-0.5 rounded font-semibold">
                                    IA
                                  </span>
                                </div>
                                <div className="space-y-1.5">
                                  <textarea
                                    value={form.aiEditInstruction}
                                    onChange={(e) =>
                                      form.setAiEditInstruction(e.target.value)
                                    }
                                    placeholder={
                                      form.aiEditEngine ===
                                      AIEditEngine.Seedream5Edit
                                        ? "Ej. Change the outfit in Figure 1 to the outfit shown in Figure 2. Keep the same pose, face and background."
                                        : form.aiEditEngine ===
                                            AIEditEngine.Flux2ProEdit
                                          ? "Ej. Transform this 2D character into a 3D photorealistic portrait in a cyberpunk city at night. Keep the exact same face and costume design."
                                          : "Ej. Agrega un halo de luz dorada alrededor de la cabeza, añade partículas brillantes en el aire, pon gotas de lluvia cayendo, agrega un reflejo de neón azul en la ropa..."
                                    }
                                    className="w-full bg-zinc-900 border border-violet-500/20 rounded-lg p-3 text-sm focus:ring-2 focus:ring-violet-500/50 outline-none resize-none h-24 placeholder:text-zinc-600 transition-all"
                                  />
                                  <p className="text-[10px] text-zinc-500">
                                    {form.aiEditEngine ===
                                    AIEditEngine.Seedream5Edit
                                      ? 'Referencia la imagen base como "Figure 1" y las referencias adicionales como "Figure 2", "Figure 3", etc.'
                                      : form.aiEditEngine ===
                                          AIEditEngine.Flux2ProEdit
                                        ? "Describe la transformación. El modelo usará tu imagen base + las referencias adicionales para generar el resultado."
                                        : "Describe qué quieres agregar o modificar. El resto de la imagen se preserva exactamente."}
                                  </p>
                                </div>
                              </>
                            )}

                            {/* Imagen de referencia / Cara — Gemini / FaceSwap */}
                            {form.aiEditEngine === AIEditEngine.Gemini && (
                              <div className="space-y-1.5">
                                <label className="text-sm font-medium text-zinc-400">
                                  Imagen de Referencia{" "}
                                  <span className="text-zinc-600 text-[10px]">
                                    (Opcional)
                                  </span>
                                </label>
                                <UploadZone
                                  label="Referencia visual del efecto"
                                  files={form.aiEditReferenceImage}
                                  onFilesChange={(f) =>
                                    form.setAiEditReferenceImage(
                                      f as File | null,
                                    )
                                  }
                                  onImagePreview={gallery.setPreviewImage}
                                />
                                <p className="text-[10px] text-zinc-500">
                                  Sube una imagen de referencia del elemento que
                                  quieres agregar (ej. un tipo de luz, textura,
                                  objeto).
                                </p>
                              </div>
                            )}
                            {/* Cara para FaceSwap */}
                            {form.aiEditEngine === AIEditEngine.FaceSwapFal && (
                              <div className="space-y-1.5">
                                <label className="text-sm font-medium text-zinc-400">
                                  Foto del Influencer{" "}
                                  <span className="text-zinc-600 text-[10px]">
                                    (Cara a aplicar)
                                  </span>
                                </label>
                                <UploadZone
                                  label="Sube un plano cerrado de la cara"
                                  files={form.aiEditReferenceImage}
                                  onFilesChange={(f) =>
                                    form.setAiEditReferenceImage(
                                      f as File | null,
                                    )
                                  }
                                  onImagePreview={gallery.setPreviewImage}
                                />
                                <p className="text-[10px] text-zinc-500">
                                  Se detectará la cara en esta foto y se
                                  reemplazará en la foto de destino (arriba).
                                </p>
                              </div>
                            )}
                            {/* Imágenes de referencia — Seedream 5 Edit */}
                            {form.aiEditEngine ===
                              AIEditEngine.Seedream5Edit && (
                              <div className="space-y-1.5">
                                <label className="text-sm font-medium text-zinc-400">
                                  Imágenes de Referencia{" "}
                                  <span className="text-zinc-600 text-[10px]">
                                    (Figure 2, 3… — hasta 9)
                                  </span>
                                </label>
                                <UploadZone
                                  label="Outfit, estilo, producto, etc."
                                  files={form.aiEditReferenceImages}
                                  onFilesChange={(f) =>
                                    form.setAiEditReferenceImages(
                                      Array.isArray(f) ? f : f ? [f] : [],
                                    )
                                  }
                                  onImagePreview={gallery.setPreviewImage}
                                  multiple={true}
                                />
                                <p className="text-[10px] text-zinc-500">
                                  Estas imágenes se pasan como Figure 2, Figure
                                  3, etc. El modelo las puede usar para cambiar
                                  outfit, reemplazar producto, copiar estilo,
                                  etc.
                                </p>
                              </div>
                            )}
                            {/* Imágenes de referencia — FLUX.2 Pro Edit */}
                            {form.aiEditEngine ===
                              AIEditEngine.Flux2ProEdit && (
                              <div className="space-y-1.5">
                                <label className="text-sm font-medium text-zinc-400">
                                  Imágenes de Referencia{" "}
                                  <span className="text-zinc-600 text-[10px]">
                                    (Opcional — hasta 9)
                                  </span>
                                </label>
                                <UploadZone
                                  label="Personaje, outfit, escenario de referencia…"
                                  files={form.aiEditReferenceImages}
                                  onFilesChange={(f) =>
                                    form.setAiEditReferenceImages(
                                      Array.isArray(f) ? f : f ? [f] : [],
                                    )
                                  }
                                  onImagePreview={gallery.setPreviewImage}
                                  multiple={true}
                                />
                                <p className="text-[10px] text-zinc-500">
                                  Sube fotos del personaje, outfit o escenario
                                  que quieres usar como referencia. FLUX.2 Pro
                                  las combina con la imagen base.
                                </p>
                              </div>
                            )}

                            {/* Ideas — según motor */}
                            {(form.aiEditEngine === AIEditEngine.Gemini ||
                              form.aiEditEngine === AIEditEngine.GPTImageEdit ||
                              form.aiEditEngine ===
                                AIEditEngine.FluxKontext) && (
                              <div className="p-3 bg-violet-500/5 border border-violet-500/15 rounded-lg space-y-1">
                                <p className="text-[10px] text-violet-300 font-semibold">
                                  💡 Ideas de edición
                                </p>
                                <p className="text-[10px] text-zinc-500">
                                  Halo de luz · Partículas brillantes · Lluvia ·
                                  Fuego · Humo · Reflejo de neón · Glitter ·
                                  Piercings · Tatuajes · Gotas de agua · Flores
                                  · Sombras dramáticas
                                </p>
                              </div>
                            )}
                            {form.aiEditEngine ===
                              AIEditEngine.Flux2ProEdit && (
                              <div className="p-3 bg-sky-500/5 border border-sky-500/15 rounded-lg space-y-1">
                                <p className="text-[10px] text-sky-300 font-semibold">
                                  💡 Ideas para FLUX.2 Pro Edit
                                </p>
                                <p className="text-[10px] text-zinc-500">
                                  2D → 3D fotorrealista · Cambiar escenario ·
                                  Aplicar outfit de referencia · Transformar
                                  estilo artístico · Insertar personaje en
                                  entorno nuevo · Combinar varios looks
                                </p>
                              </div>
                            )}
                            {form.aiEditEngine ===
                              AIEditEngine.Seedream5Edit && (
                              <div className="p-3 bg-orange-500/5 border border-orange-500/15 rounded-lg space-y-1">
                                <p className="text-[10px] text-orange-300 font-semibold">
                                  💡 Ideas para Seedream 5 Edit
                                </p>
                                <p className="text-[10px] text-zinc-500">
                                  Cambiar outfit (Figure 2) · Reemplazar
                                  producto · Fusionar estilo de dos imágenes ·
                                  Cambiar fondo · Aplicar textura de referencia
                                  · Combinar elementos de múltiples fotos
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* ── Poses sub-mode ── */}
                        {form.editSubMode === "poses" && (
                          <div className="space-y-4">
                            {/* Motor de poses */}
                            <div className="space-y-1.5">
                              <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                                Motor de Poses
                              </h2>
                              <div className="flex gap-1 p-1 bg-zinc-900 rounded-lg border border-zinc-800">
                                {Object.values(PoseEngine)
                                  .filter((e) => {
                                    if (
                                      e === PoseEngine.FalAI ||
                                      e === PoseEngine.Flux2ProEdit
                                    )
                                      return !!process.env.FAL_KEY;
                                    if (e === PoseEngine.GPTImageEdit)
                                      return !!process.env.OPENAI_API_KEY;
                                    return true;
                                  })
                                  .map((engine) => {
                                    const label = POSE_ENGINE_LABELS[engine];
                                    const isActive = form.poseEngine === engine;
                                    const activeColor =
                                      engine === PoseEngine.Gemini
                                        ? "bg-violet-700"
                                        : engine === PoseEngine.FalAI
                                          ? "bg-yellow-700"
                                          : engine === PoseEngine.Flux2ProEdit
                                            ? "bg-sky-700"
                                            : engine === PoseEngine.GPTImageEdit
                                              ? "bg-emerald-700"
                                              : "bg-zinc-700";
                                    return (
                                      <button
                                        key={engine}
                                        onClick={() =>
                                          form.setPoseEngine(engine)
                                        }
                                        title={label.description}
                                        className={`flex-1 py-1.5 text-[11px] font-medium rounded-md transition-all flex items-center justify-center gap-1 ${isActive ? `${activeColor} text-white shadow-sm` : "text-zinc-500 hover:text-zinc-300"}`}
                                      >
                                        <span>{label.icon}</span>
                                        {label.name}
                                      </button>
                                    );
                                  })}
                              </div>
                              {form.poseEngine === PoseEngine.FalAI && (
                                <p className="text-[10px] text-zinc-500 leading-relaxed px-0.5">
                                  <span className="text-yellow-400 font-medium">
                                    Leffa
                                  </span>{" "}
                                  si subes imagen de pose ·{" "}
                                  <span className="text-blue-400 font-medium">
                                    FLUX Kontext
                                  </span>{" "}
                                  si escribes texto
                                </p>
                              )}
                              {form.poseEngine === PoseEngine.Flux2ProEdit && (
                                <p className="text-[10px] text-zinc-500 leading-relaxed px-0.5">
                                  <span className="text-sky-400 font-medium">
                                    FLUX.2 Pro Edit
                                  </span>{" "}
                                  — la imagen de pose se pasa como referencia
                                  junto a la instrucción. Ideal para
                                  transformaciones complejas con múltiples refs.
                                </p>
                              )}
                              {form.poseEngine === PoseEngine.GPTImageEdit && (
                                <p className="text-[10px] text-zinc-500 leading-relaxed px-0.5">
                                  <span className="text-emerald-400 font-medium">
                                    GPT Image 1
                                  </span>{" "}
                                  — edita por instrucción de texto. Sin imagen
                                  de referencia de pose; describe la postura con
                                  palabras.
                                </p>
                              )}
                            </div>

                            <div className="flex justify-between items-center">
                              <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                                Poses de Sesión
                              </h2>
                              {form.editNumberOfImages > 1 && (
                                <span className="text-[10px] text-purple-400 font-bold bg-purple-900/30 px-2 py-0.5 rounded border border-purple-500/30">
                                  Modo Sesión
                                </span>
                              )}
                            </div>
                            <div className="space-y-6">
                              {form.sessionPoses.map((item, index) => (
                                <div
                                  key={item.id}
                                  className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl space-y-4 transition-all duration-200 hover:border-zinc-700 focus-within:border-purple-500/40 focus-within:ring-1 focus-within:ring-purple-500/10 focus-within:shadow-lg focus-within:shadow-purple-900/5"
                                >
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
                                      Pose {index + 1}
                                    </span>
                                    {item.images.length > 0 && (
                                      <span className="text-[10px] text-purple-400 flex items-center gap-1">
                                        <svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          width="10"
                                          height="10"
                                          viewBox="0 0 24 24"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeWidth="2"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                        >
                                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                          <polyline points="22 4 12 14.01 9 11.01" />
                                        </svg>
                                        Imagen cargada
                                      </span>
                                    )}
                                  </div>
                                  <ReferenceInput
                                    label="Descripción o Imagen"
                                    textValue={item.text}
                                    onTextChange={(val) =>
                                      form.updateSessionPose(index, "text", val)
                                    }
                                    imageValue={item.images}
                                    onImageChange={(files) =>
                                      form.updateSessionPose(
                                        index,
                                        "images",
                                        Array.isArray(files)
                                          ? files
                                          : files
                                            ? [files]
                                            : [],
                                      )
                                    }
                                    onImagePreview={gallery.setPreviewImage}
                                    presets={POSE_PRESETS}
                                    category="Pose"
                                    placeholder="Ej. De pie, mirando a la izquierda..."
                                    multiline={true}
                                    multiple={true}
                                  />
                                  {item.images.length > 0 && (
                                    <div className="mt-3 flex flex-col gap-3">
                                      <div className="flex items-center justify-between p-2.5 bg-indigo-500/5 border border-indigo-500/20 rounded-lg">
                                        <div className="space-y-0.5">
                                          <p className="text-xs font-semibold text-indigo-300">
                                            Evitar interferencias
                                          </p>
                                          <p className="text-[10px] text-zinc-400">
                                            Extrae el esqueleto para no copiar
                                            la ropa ni la cara de esta foto.
                                          </p>
                                        </div>
                                        <button
                                          onClick={async (e) => {
                                            e.preventDefault();
                                            try {
                                              toast.info(
                                                "Extrayendo esqueleto de la pose...",
                                              );
                                              const skeleton =
                                                await extractPoseSkeleton(
                                                  item.images[0],
                                                );
                                              form.updateSessionPose(
                                                index,
                                                "images",
                                                [skeleton],
                                              );
                                              toast.success(
                                                "Pose convertida a esqueleto con éxito",
                                              );
                                            } catch (err) {
                                              console.error(err);
                                              toast.error(
                                                "Error al generar el esqueleto.",
                                              );
                                            }
                                          }}
                                          className="px-3 py-1.5 text-[11px] font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-md transition-colors whitespace-nowrap"
                                        >
                                          🪄 Extraer Esqueleto
                                        </button>
                                      </div>
                                      {form.characters.length > 0 && (
                                        <div className="flex items-center gap-2 px-1">
                                          <input
                                            type="checkbox"
                                            id={`usePoseAsOutfit-${index}`}
                                            checked={
                                              form.characters[0].usePoseAsOutfit
                                            }
                                            onChange={(e) =>
                                              form.updateCharacter(
                                                form.characters[0].id,
                                                "usePoseAsOutfit",
                                                e.target.checked,
                                              )
                                            }
                                            className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-purple-600 focus:ring-purple-500"
                                          />
                                          <label
                                            htmlFor={`usePoseAsOutfit-${index}`}
                                            className="text-xs text-zinc-400 select-none cursor-pointer"
                                          >
                                            Copiar Outfit de esta referencia
                                          </label>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  <div className="pt-2 border-t border-zinc-800/50">
                                    <ReferenceInput
                                      label="Objeto / Accesorio (Opcional)"
                                      textValue={item.accessory || ""}
                                      onTextChange={(val) =>
                                        form.updateSessionPose(
                                          index,
                                          "accessory",
                                          val,
                                        )
                                      }
                                      imageValue={item.accessoryImages || []}
                                      onImageChange={(files) =>
                                        form.updateSessionPose(
                                          index,
                                          "accessoryImages",
                                          Array.isArray(files)
                                            ? files
                                            : files
                                              ? [files]
                                              : [],
                                        )
                                      }
                                      category="Objeto"
                                      placeholder="Ej. Sosteniendo un teléfono..."
                                      multiple={true}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {/* ─── Shared Edit Options ──────────────── */}
                        <div className="pt-6 border-t border-zinc-800/50 mt-4 space-y-4">
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-zinc-400">
                              Prompt Negativo (Opcional)
                            </label>
                            <div
                              className="flex items-center gap-2 px-2 py-1 bg-zinc-900/50 rounded border border-zinc-800/50 cursor-pointer hover:bg-zinc-800 transition-colors"
                              onClick={() =>
                                form.setAntiFisheye(!form.antiFisheye)
                              }
                            >
                              <label
                                htmlFor="antiFisheyeEdit"
                                className="text-xs text-zinc-400 cursor-pointer select-none font-medium"
                              >
                                Evitar Ojo de Pez
                              </label>
                              <input
                                type="checkbox"
                                id="antiFisheyeEdit"
                                checked={form.antiFisheye}
                                onChange={(e) =>
                                  form.setAntiFisheye(e.target.checked)
                                }
                                onClick={(e) => e.stopPropagation()}
                                className="w-3.5 h-3.5 rounded border-zinc-700 bg-zinc-950 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-zinc-900 cursor-pointer"
                              />
                            </div>
                          </div>
                          <textarea
                            value={form.negativePrompt}
                            onChange={(e) =>
                              form.setNegativePrompt(e.target.value)
                            }
                            placeholder="Ej. deformado, borroso, baja calidad, texto, marcas de agua, manos extrañas..."
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none resize-none h-20 placeholder:text-zinc-600 mt-2 transition-all"
                          />
                          <p className="text-[10px] text-zinc-500 mt-1">
                            Describe lo que NO quieres que aparezca en la imagen
                            editada.
                          </p>
                        </div>
                      </>
                    )}

                    {/* ─── Video mode ───────────────────── */}
                    {activeMode === "video" && (
                      <>
                        <div className="space-y-4">
                          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                            Motor de Video
                          </h2>
                          <div className="grid grid-cols-2 gap-2">
                            {Object.values(VideoEngine).map((engine) => {
                              const info = VIDEO_ENGINE_LABELS[engine];
                              return (
                                <button
                                  key={engine}
                                  onClick={() => form.setVideoEngine(engine)}
                                  className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${form.videoEngine === engine ? "bg-zinc-800/80 border-purple-500/50 shadow-sm shadow-purple-900/20" : "bg-zinc-900 border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700"}`}
                                >
                                  <div className="flex items-center gap-1.5 font-medium text-zinc-200 text-sm">
                                    <span>{info.icon}</span>
                                    {info.name}
                                  </div>
                                  <div className="text-[10px] text-zinc-500 mt-1 line-clamp-2">
                                    {info.description}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        <div className="space-y-4">
                          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                            Imágenes / Video Base
                          </h2>
                          <div className="grid grid-cols-2 gap-4">
                            <UploadZone
                              label="Foto del Influencer"
                              files={form.videoImage}
                              onFilesChange={(f) =>
                                form.setVideoImage(f as File | null)
                              }
                              onImagePreview={gallery.setPreviewImage}
                            />
                            {form.videoEngine === VideoEngine.KlingStandard ||
                            form.videoEngine === VideoEngine.KlingPro ? (
                              <UploadZone
                                label="Video de Referencia (Movimiento)"
                                files={form.referenceVideo}
                                onFilesChange={(f) =>
                                  form.setReferenceVideo(f as File | null)
                                }
                                accept="video/*"
                                hint="Opcional. Kling extraerá el movimiento."
                              />
                            ) : (
                              <div className="border-2 border-dashed border-zinc-800/30 rounded-xl p-6 flex flex-col items-center justify-center text-center opacity-50 bg-zinc-900/20">
                                <span className="text-2xl mb-2 grayscale">
                                  ▶️
                                </span>
                                <span className="text-sm font-medium text-zinc-500">
                                  Motion Control NO disponible
                                </span>
                                <span className="text-xs text-zinc-600 mt-1">
                                  Solo Kling soporta videos de referencia.
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="space-y-4">
                          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                            Acción y Diálogo
                          </h2>
                          <EnhancedInput
                            label="¿Qué sucede en el video?"
                            value={form.videoPrompt}
                            onChange={form.setVideoPrompt}
                            category="Acción Cinematográfica"
                            placeholder="Ej. Saluda a la cámara..."
                            multiline={true}
                          />
                          <div className="space-y-1">
                            <label className="text-sm font-medium text-zinc-400">
                              Diálogo
                            </label>
                            <textarea
                              value={form.videoDialogue}
                              onChange={(e) =>
                                form.setVideoDialogue(e.target.value)
                              }
                              placeholder="Escribe lo que el personaje debe decir..."
                              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none resize-none h-20 placeholder:text-zinc-600"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-sm font-medium text-zinc-400">
                              Voz (Opcional)
                            </label>
                            <input
                              type="file"
                              accept="audio/*"
                              onChange={(e) =>
                                form.setVideoVoice(
                                  e.target.files ? e.target.files[0] : null,
                                )
                              }
                              className="w-full text-xs text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:bg-zinc-800 file:text-zinc-300"
                            />
                          </div>
                        </div>
                        <div className="space-y-4">
                          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                            Configuración
                          </h2>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-sm font-medium text-zinc-400">
                                Calidad
                              </label>
                              <select
                                value={form.videoResolution}
                                onChange={(e) =>
                                  form.setVideoResolution(
                                    e.target.value as VideoResolution,
                                  )
                                }
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-sm outline-none"
                              >
                                <option value={VideoResolution.Res720p}>
                                  720p
                                </option>
                                <option value={VideoResolution.Res1080p}>
                                  1080p
                                </option>
                              </select>
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    {/* ─── Batch Outfits (create only) ─────── */}
                    {activeMode === "create" && (
                      <div className="space-y-4 pt-6 border-t border-zinc-800">
                        <div className="flex items-center justify-between">
                          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                            <span>Batch de Outfits</span>
                            <span className="px-1.5 py-0.5 text-[9px] bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded font-bold">
                              NUEVO
                            </span>
                          </h2>
                          <button
                            onClick={() =>
                              form.setBatchOutfitEnabled(
                                !form.batchOutfitEnabled,
                              )
                            }
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${form.batchOutfitEnabled ? "bg-purple-600" : "bg-zinc-700"}`}
                            aria-label="Activar batch de outfits"
                          >
                            <span
                              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${form.batchOutfitEnabled ? "translate-x-[18px]" : "translate-x-0.5"}`}
                            />
                          </button>
                        </div>
                        {form.batchOutfitEnabled && (
                          <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                            <p className="text-[10px] text-zinc-500">
                              Genera la misma cara con múltiples outfits en una
                              sola operación. Sube fotos o describe cada outfit.
                            </p>
                            {form.batchOutfits.map((outfit, idx) => (
                              <div
                                key={outfit.id}
                                className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-xl space-y-3"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                                    Outfit {idx + 1}
                                  </span>
                                  {form.batchOutfits.length > 1 && (
                                    <button
                                      onClick={() =>
                                        form.removeBatchOutfit(outfit.id)
                                      }
                                      className="text-zinc-600 hover:text-red-400 transition-colors"
                                      title="Eliminar"
                                    >
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="12"
                                        height="12"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      >
                                        <line x1="18" y1="6" x2="6" y2="18" />
                                        <line x1="6" y1="6" x2="18" y2="18" />
                                      </svg>
                                    </button>
                                  )}
                                </div>
                                <ReferenceInput
                                  label=""
                                  textValue={outfit.outfitText}
                                  onTextChange={(v) =>
                                    form.updateBatchOutfit(
                                      outfit.id,
                                      "outfitText",
                                      v,
                                    )
                                  }
                                  imageValue={outfit.outfitImages}
                                  onImageChange={(v) =>
                                    form.updateBatchOutfit(
                                      outfit.id,
                                      "outfitImages",
                                      Array.isArray(v) ? v : v ? [v] : [],
                                    )
                                  }
                                  category="Outfit / Ropa"
                                  placeholder="Describe el outfit o sube una foto de referencia..."
                                  multiple={true}
                                />
                              </div>
                            ))}
                            {form.batchOutfits.length < 6 && (
                              <button
                                onClick={form.addBatchOutfit}
                                className="w-full py-2 border border-dashed border-zinc-700 rounded-lg text-xs text-zinc-500 hover:text-zinc-300 hover:border-zinc-600 transition-colors flex items-center justify-center gap-2"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="12"
                                  height="12"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <line x1="12" y1="5" x2="12" y2="19" />
                                  <line x1="5" y1="12" x2="19" y2="12" />
                                </svg>
                                Añadir outfit
                              </button>
                            )}
                            {isBatchGenerating ? (
                              <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
                                <ProgressBar
                                  progress={batchProgress}
                                  label={`Generando ${form.batchOutfits.filter((o) => o.outfitImages.length > 0 || o.outfitText.trim()).length} variaciones...`}
                                />
                                <p className="text-[10px] text-zinc-500 text-center mt-2 animate-pulse">
                                  Procesando outfits en paralelo
                                </p>
                              </div>
                            ) : (
                              <button
                                onClick={handleBatchGenerate}
                                disabled={isGenerating}
                                className="w-full py-3 rounded-xl font-semibold text-white text-sm shadow-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <rect x="3" y="3" width="7" height="7" />
                                  <rect x="14" y="3" width="7" height="7" />
                                  <rect x="14" y="14" width="7" height="7" />
                                  <rect x="3" y="14" width="7" height="7" />
                                </svg>
                                Generar Batch (
                                {
                                  form.batchOutfits.filter(
                                    (o) =>
                                      o.outfitImages.length > 0 ||
                                      o.outfitText.trim(),
                                  ).length
                                }{" "}
                                outfits)
                              </button>
                            )}
                            {batchError && (
                              <div
                                role="alert"
                                className="p-3 bg-red-900/30 border border-red-800/50 rounded-lg text-red-200 text-xs flex items-start gap-2"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="shrink-0 mt-0.5"
                                >
                                  <circle cx="12" cy="12" r="10" />
                                  <line x1="12" y1="8" x2="12" y2="12" />
                                  <line x1="12" y1="16" x2="12.01" y2="16" />
                                </svg>
                                <span>{batchError}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* ─── Presets (create only) ────────── */}
                    {activeMode === "create" && (
                      <>
                        <div className="space-y-4 pt-6 border-t border-zinc-800">
                          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                            Estilos Rápidos (Presets)
                          </h2>
                          <div className="grid grid-cols-2 gap-2">
                            {STYLE_PRESETS.map((preset) => (
                              <button
                                key={preset.id}
                                onClick={() => form.applyPreset(preset)}
                                className="flex items-center gap-2 p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition-all text-left group"
                              >
                                <span className="text-lg">{preset.icon}</span>
                                <span className="text-xs font-medium text-zinc-400 group-hover:text-white">
                                  {preset.name}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                        <CustomPresets
                          presets={gallery.customPresets}
                          onApply={form.applyPreset}
                          onDelete={gallery.deletePreset}
                        />
                      </>
                    )}
                  </div>
                </div>
                <div>{renderRightPanel()}</div>
              </aside>

              {/* ────── END CREATE WORKSPACE ────── */}
            </>
          )}

          {/* ────── WORKSPACE: STORYBOARD ────── */}
          {activeWorkspace === "storyboard" && (
            <div className="absolute inset-0 z-0 bg-black flex h-full">
              {gallery.storyboardIds.length > 0 ? (
                <div className="w-full h-full p-6 pb-32 overflow-y-auto">
                  <StoryboardView />
                </div>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center -mt-10 animate-in zoom-in duration-700">
                  <h2 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-white/20 mb-6 tracking-tighter text-center leading-none">
                    DIRECT
                    <br />
                    YOUR FILM
                  </h2>
                  <p className="text-zinc-500 text-center max-w-md text-lg md:text-xl font-light tracking-wide mb-12">
                    Collect your best generations to build sequences and
                    storyboards.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ────── WORKSPACE: PRICING ────── */}
          {activeWorkspace === "pricing" && (
            <div className="absolute inset-0 z-0 overflow-y-auto">
              <PricingPage onNavigate={(ws) => setActiveWorkspace(ws as AppWorkspace)} />
            </div>
          )}

          {/* ────── WORKSPACE: PROFILE ────── */}
          {activeWorkspace === "profile" && (
            <div className="absolute inset-0 z-0 overflow-hidden">
              <ProfilePage onNavigate={(ws) => setActiveWorkspace(ws as AppWorkspace)} />
            </div>
          )}
        </div>

        {/* Modals */}
        {gallery.selectedItem && (
          <DetailModal
            item={gallery.selectedItem}
            onClose={() => gallery.setSelectedItem(null)}
          />
        )}
        {gallery.previewImage && (
          <ImageModal
            src={gallery.previewImage}
            onClose={() => gallery.setPreviewImage(null)}
          />
        )}
        {gallery.editingItem && (
          <ImageEditor
            src={gallery.editingItem.url}
            onClose={() => gallery.setEditingItem(null)}
            onSave={handleSaveEditedImage}
          />
        )}

        {/* Caption Modal */}
        {captionItem && (
          <CaptionModal
            imageUrl={captionItem.url}
            onClose={() => setCaptionItem(null)}
          />
        )}

        {/* Face Swap Modal */}
        {faceSwapItem && (
          <FaceSwapModal
            targetItem={faceSwapItem}
            onClose={() => setFaceSwapItem(null)}
            onSave={handleSaveFaceSwap}
          />
        )}

        {/* Virtual Try-On Modal */}
        {tryOnItem && (
          <TryOnModal
            targetItem={tryOnItem}
            onClose={() => setTryOnItem(null)}
            onSave={handleSaveTryOn}
          />
        )}

        {/* Skin Enhancer Modal */}
        {skinEnhanceItem && (
          <SkinEnhancerModal
            targetItem={skinEnhanceItem}
            onClose={() => setSkinEnhanceItem(null)}
            onSave={handleSaveSkinEnhance}
          />
        )}

        {/* Relight Modal */}
        {relightItem && (
          <RelightModal
            targetItem={relightItem}
            onClose={() => setRelightItem(null)}
            onSave={handleSaveRelight}
          />
        )}

        {/* Inpainting Modal */}
        {inpaintItem && (
          <InpaintingModal
            item={inpaintItem}
            onClose={() => setInpaintItem(null)}
            onSave={handleSaveInpaint}
          />
        )}

        {/* A/B Comparator */}
        {showComparator &&
          selectedIds.size === 2 &&
          (() => {
            const [idA, idB] = Array.from(selectedIds);
            const imgA = filteredHistory.find((i) => i.id === idA);
            const imgB = filteredHistory.find((i) => i.id === idB);
            if (imgA && imgB) {
              return (
                <ABComparator
                  itemA={imgA}
                  itemB={imgB}
                  onClose={() => setShowComparator(false)}
                />
              );
            }
            return null;
          })()}

        {/* Floating Pose Assistant */}
        <PoseAssistantWidget />
      </div>
    </ApiKeyGuard>
  );
};

// ─────────────────────────────────────────────
// Root App — wraps with providers
// ─────────────────────────────────────────────

const App: React.FC = () => (
  <ToastProvider>
    <AuthProvider>
      <GalleryProvider>
        <FormProvider>
          <CharacterLibraryProvider>
            <ProfileProvider>
              <AppInner />
            </ProfileProvider>
          </CharacterLibraryProvider>
        </FormProvider>
      </GalleryProvider>
    </AuthProvider>
  </ToastProvider>
);

export default App;
