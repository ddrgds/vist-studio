import React, { useRef, useState, useEffect, useMemo, Suspense, lazy } from "react";
import JSZip from "jszip";
import ApiKeyGuard from "./components/ApiKeyGuard";
import AuthScreen from "./components/AuthScreen";
import UploadZone from "./components/UploadZone";
import ImageModal from "./components/ImageModal";
import EnhancedInput from "./components/EnhancedInput";
import CharacteristicsInput from "./components/CharacteristicsInput";
import ReferenceInput from "./components/ReferenceInput";
import ProgressBar from "./components/ProgressBar";
import SidebarNav from "./components/SidebarNav";
import type { AppPage } from "./components/SidebarNav";
import MobileNav from "./components/MobileNav";

// Lazy-loaded workspace components for code splitting
const DashboardPage = lazy(() => import("./components/DashboardPage"));
const CharacterBuilderPage = lazy(() => import("./components/CharacterBuilderPage"));
const CreatePage = lazy(() => import("./components/CreatePage"));
const CharactersPage = lazy(() => import("./components/CharactersPage"));
const StoryboardView = lazy(() => import("./components/StoryboardView"));
const ToolsPage = lazy(() => import("./components/ToolsPage"));
const StudioEditorPage = lazy(() => import("./components/StudioEditorPage"));
const PhotoSessionPage = lazy(() => import("./components/PhotoSessionPage"));
const PricingPage = lazy(() => import("./components/PricingPage"));
const ProfilePage = lazy(() => import("./components/ProfilePage"));

// Lazy-loaded modals & heavy components (only rendered on demand)
const DetailModal = lazy(() => import("./components/DetailModal"));
const ImageEditor = lazy(() => import("./components/ImageEditor"));
const GalleryGrid = lazy(() => import("./components/Gallery/GalleryGrid"));
const InspirationBoard = lazy(() => import("./components/InspirationBoard"));
const CustomPresets = lazy(() => import("./components/CustomPresets"));
const ABComparator = lazy(() => import("./components/ABComparator"));
const CaptionModal = lazy(() => import("./components/CaptionModal"));
const FaceSwapModal = lazy(() => import("./components/FaceSwapModal"));
const TryOnModal = lazy(() => import("./components/TryOnModal"));
const SkinEnhancerModal = lazy(() => import("./components/SkinEnhancerModal"));
const RelightModal = lazy(() => import("./components/RelightModal"));
const InpaintingModal = lazy(() => import("./components/InpaintingModal"));
import WelcomeModal, { ONBOARDING_KEY } from "./components/WelcomeModal";

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
  upscaleWithAuraSR,
  removeBackground,
} from "./services/falService";
import {
  InspirationImage,
  GeneratedContent,
  InfluencerParams,
  PoseModificationParams,
  VideoParams,
  Preset,
  CustomPreset,
  CharacterParams,
  GeminiImageModel,
  AIProvider,
  FalModel,
  ReplicateModel,
  OpenAIModel,
  IdeogramModel,
  VideoEngine,
  SavedCharacter,
} from "./types";

// ─────────────────────────────────────────────
// handleReuse helper — sanitizes File objects lost in Supabase serialization
// ─────────────────────────────────────────────

const safeFiles = (arr: any[]): File[] =>
  Array.isArray(arr) ? arr.filter((f) => f instanceof File) : [];

/** Wrap a user-uploaded File into a minimal GeneratedContent for tool modals */
const fileToContent = (file: File): GeneratedContent => ({
  id: `tools-${Date.now()}`,
  url: URL.createObjectURL(file),
  params: { prompt: '', characters: [] } as any,
  timestamp: Date.now(),
  type: 'create',
  source: 'generate',
});

// ─────────────────────────────────────────────
// Inner App — consumes all contexts
type AppWorkspace = AppPage;

const AppInner: React.FC = () => {
  const { user, signOut, authLoading } = useAuth();
  const gallery = useGallery();
  const form = useForm();
  const toast = useToast();
  const charLib = useCharacterLibrary();
  const profileCtx = useProfile();
  const sub = useSubscription();

  // Cache last known credits so the badge doesn't flash "0" / "..." during reloads
  const lastCreditsRef = useRef<{ text: string; raw: number } | null>(null);
  if (sub.profileLoaded && !sub.isUnlimited) {
    lastCreditsRef.current = { text: sub.credits.toLocaleString('en-US'), raw: sub.credits };
  }
  const displayCredits = sub.isUnlimited
    ? '∞'
    : sub.profileLoaded
      ? sub.credits.toLocaleString('en-US')
      : lastCreditsRef.current?.text ?? '…';
  const displayCreditsRaw = sub.isUnlimited ? 999999 : sub.profileLoaded ? sub.credits : lastCreditsRef.current?.raw ?? 0;

  // ─── Onboarding ────────────────────────────────────────────────────────
  const [showWelcome, setShowWelcome] = useState(() => {
    return !localStorage.getItem(ONBOARDING_KEY);
  });

  // Map URL paths to pages
  const PATH_TO_PAGE: Record<string, AppPage> = {
    '/': 'dashboard', '/home': 'dashboard', '/explore': 'dashboard', '/dashboard': 'dashboard',
    '/create': 'create', '/generate': 'studio', '/director': 'studio',
    '/session': 'session',
    '/studio': 'studio',
    '/gallery': 'gallery', '/characters': 'gallery', '/library': 'gallery',
    '/storyboard': 'gallery',
    '/tools': 'studio',
    '/pricing': 'pricing', '/profile': 'profile',
    '/login': 'create', '/register': 'create',
  };
  const initialWs = PATH_TO_PAGE[window.location.pathname] ?? 'dashboard';
  const [activeWorkspace, _setActiveWorkspace] =
    useState<AppWorkspace>(initialWs);
  const setActiveWorkspace = React.useCallback((ws: AppWorkspace) => {
    _setActiveWorkspace(ws);
    const wsPath = ws === 'dashboard' ? '/' : `/${ws}`;
    if (window.location.pathname !== wsPath) {
      window.history.pushState({}, '', wsPath);
    }
  }, []);

  // ─── Handle browser back/forward ────────────────────────────────────────
  React.useEffect(() => {
    const onPop = () => {
      const ws = PATH_TO_PAGE[window.location.pathname] ?? 'dashboard';
      _setActiveWorkspace(ws);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // ─── Dynamic page title + meta description ──────────────────────────────
  useEffect(() => {
    const PAGE_META: Record<AppPage, { title: string; description: string }> = {
      dashboard: { title: 'VIST Studio — AI Character & Image Generator', description: 'Create AI-generated characters, images, and videos with multiple engines.' },
      create: { title: 'Create Character — VIST Studio', description: 'Build AI characters with a step-by-step wizard. Choose style, appearance, personality and niche.' },
      session: { title: 'Photo Session — VIST Studio', description: 'Generate multi-angle photo shoots from a reference image with 11 style presets.' },
      studio: { title: 'Studio Editor — VIST Studio', description: 'Edit characters with Pose, Face Swap, Relight, Camera, Objects and Scenes tools.' },
      gallery: { title: 'Gallery — VIST Studio', description: 'Browse your AI characters and generated images. Filter, search and manage your creative assets.' },
      pricing: { title: 'Plans & Pricing — VIST Studio', description: 'Choose a plan for AI image and video generation. Free tier available.' },
      profile: { title: 'Profile — VIST Studio', description: 'Manage your VIST Studio account, subscription, and settings.' },
    };
    const meta = PAGE_META[activeWorkspace];
    document.title = meta.title;
    let descTag = document.querySelector('meta[name="description"]');
    if (!descTag) {
      descTag = document.createElement('meta');
      descTag.setAttribute('name', 'description');
      document.head.appendChild(descTag);
    }
    descTag.setAttribute('content', meta.description);
  }, [activeWorkspace]);

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

  // UI state (not worth moving to context — purely local)
  const [showDbManager, setShowDbManager] = useState(false);

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

  const { isGenerating, progress, handleGenerate, stopGeneration } =
    useGeneration();

  // ─── Sync form.activeMode when workspace changes ───────
  React.useEffect(() => {
    if (activeWorkspace === "create") {
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

  // ─── Navigate from Dashboard / legacy routes ───────
  const handleExploreNavigate = (workspace: string, mode?: string, modelId?: string) => {
    // Map old workspace names to new pages
    const mapped: AppWorkspace =
      workspace === "create" || workspace === "video" || workspace === "generate" || workspace === "director" ? "studio" :
      workspace === "explore" || workspace === "home" ? "dashboard" :
      workspace === "storyboard" || workspace === "characters" || workspace === "library" ? "gallery" :
      workspace === "tools" ? "studio" :
      workspace as AppWorkspace;
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
      // Load as base image for editing in the VIST editor
      form.setBaseImageForEdit(file);
      form.setActiveMode("edit");
      setActiveWorkspace("studio");
    } catch {
      toast.error("Could not load the image for the editor.");
    }
  };

  // ─── Load character from library into Studio ───────
  const handleLoadCharacterInDirector = (char: SavedCharacter) => {
    const char0 = form.characters[0];
    if (!char0) return;
    charLib.loadCharacterIntoForm(char, char0.id, form.updateCharacter);
    charLib.incrementUsage(char.id);
    setActiveWorkspace("studio");
  };

  // ─── Upload image from computer to Studio ───────
  const handleUploadToStudio = (file: File) => {
    // Set the file as the first face image so the Studio canvas has something
    form.setDirectorFaceImages([file]);
    setActiveWorkspace("studio");
  };

  // ─── Open character in Studio Editor ───────
  const handleOpenInStudio = (char: SavedCharacter) => {
    // Load character's first image as canvas image for the Studio
    if (char.modelImageBlobs && char.modelImageBlobs.length > 0) {
      const blob = char.modelImageBlobs[0];
      const file = new File([blob], `${char.name}-ref.jpg`, { type: blob.type || 'image/jpeg' });
      form.setBaseImageForEdit(file);
    }
    charLib.incrementUsage(char.id);
    setActiveWorkspace("studio");
  };

  // ─── Start Photo Session with character ───────
  const handleShootSession = (char: SavedCharacter) => {
    // Load character's face image so PhotoSession has it preloaded
    if (char.modelImageBlobs && char.modelImageBlobs.length > 0) {
      const blob = char.modelImageBlobs[0];
      const file = new File([blob], `${char.name}-ref.jpg`, { type: blob.type || 'image/jpeg' });
      form.setDirectorFaceImages([file]);
    }
    charLib.incrementUsage(char.id);
    setActiveWorkspace("session");
  };

  // ─── Compute Studio canvas image from form state ───────
  const studioCanvasImage = useMemo(() => {
    const src = form.baseImageForEdit ?? form.directorFaceImages[0] ?? null;
    if (!src) return undefined;
    return URL.createObjectURL(src);
  }, [form.baseImageForEdit, form.directorFaceImages]);

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
      // Restore provider and model
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
  };

  // ─── Batch outfit generation ──────────────────
  const handleBatchGenerate = async () => {
    const character = form.characters[0];
    if (!character || (character.modelImages?.length ?? 0) === 0) {
      setBatchError(
        "Upload at least one reference photo of the model (Face/Body) before using Batch mode.",
      );
      return;
    }
    const validOutfits = form.batchOutfits.filter(
      (o) => o.outfitImages.length > 0 || o.outfitText.trim(),
    );
    if (validOutfits.length < 1) {
      setBatchError(
        "Add at least one outfit (image or description) to generate variations.",
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
      toast.success(`${results.length} outfit variations generated`);
    } catch (err: any) {
      setBatchError(
        err?.message || "Error generating variations. Please try again.",
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
      toast.info("Image loaded — describe or upload the new pose");
    } catch {
      toast.error("Could not load the image to edit the pose.");
    }
  };

  // ─── Upscale image 4× ─────────────────────
  const handleUpscale = async (item: GeneratedContent) => {
    if (item.type === "video" || upscalingId) return;
    setUpscalingId(item.id);
    toast.info("Upscaling resolution 4×… may take ~30 seconds");
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
      toast.success("Upscaled image saved to gallery");
    } catch (err: any) {
      toast.error(
        err?.message || "Error upscaling resolution. Check your FAL_KEY.",
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
    toast.success("Image saved to gallery");
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
    const filename = `vist-${item.id}.${ext}`;

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
      toast.error("Could not download the file. Please try again.");
    }
  };

  // ─── Batch delete ─────────────────────────
  const handleBatchDelete = async () => {
    const { selectedIds, batchDeleteItems } = gallery;
    if (selectedIds.size === 0) return;
    if (
      window.confirm(
        `Are you sure you want to permanently delete ${selectedIds.size} selected items?`,
      )
    ) {
      await batchDeleteItems(Array.from(selectedIds));
    }
  };

  // ─── Copy to Clipboard ────────────────────
  const handleCopyToClipboard = async (item: GeneratedContent) => {
    if (item.type === "video") {
      toast.error("Cannot copy videos to clipboard");
      return;
    }
    try {
      // Get the image blob (supports data URLs and remote URLs)
      let blob: Blob;
      if (item.url.startsWith("data:")) {
        const res = await fetch(item.url);
        blob = await res.blob();
      } else {
        const resp = await fetch(item.url);
        blob = await resp.blob();
      }

      // Convert to PNG if needed (Clipboard API only accepts image/png)
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
                else reject(new Error("Could not convert the image to PNG"));
              }, "image/png");
            })
            .catch(reject);
        });
      }

      if (!navigator.clipboard?.write) {
        throw new Error(
          "Your browser does not support copying images to clipboard",
        );
      }
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": pngBlob }),
      ]);
      toast.success("Image copied to clipboard");
    } catch (err: any) {
      toast.error(
        "Could not copy: " + (err?.message || "Unknown error"),
      );
    }
  };

  // ─── Remove Background ────────────────────
  const handleRemoveBg = async (item: GeneratedContent) => {
    if (item.type === "video" || removingBgId) return;
    setRemovingBgId(item.id);
    toast.info("Removing background… may take ~20 seconds");
    try {
      const dataUrl = await removeBackground(item.url);
      const newItem: GeneratedContent = {
        id: crypto.randomUUID(),
        url: dataUrl,
        params: item.params,
        timestamp: Date.now(),
        type: item.type,
        tags: [...(item.tags || []), "no-background"],
      };
      await gallery.addItems([newItem]);
      toast.success("Background removed — saved to gallery");
    } catch (err: any) {
      toast.error(
        err?.message || "Error removing background. Check your FAL_KEY.",
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
    toast.success("Added to storyboard");
  };

  // ─── Batch ZIP Download ───────────────────
  const handleBatchZipDownload = async () => {
    const { selectedIds, generatedHistory } = gallery;
    if (selectedIds.size === 0) return;
    setBatchZipLoading(true);
    toast.info(`Preparing ZIP with ${selectedIds.size} files…`);
    try {
      const zip = new JSZip();
      const items = generatedHistory.filter((item) => selectedIds.has(item.id));
      await Promise.all(
        items.map(async (item, i) => {
          const ext = item.type === "video" ? "mp4" : "png";
          const filename = `vist-${i + 1}-${item.id.slice(0, 8)}.${ext}`;
          const resp = await fetch(item.url);
          const blob = await resp.blob();
          zip.file(filename, blob);
        }),
      );
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gallery-${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`ZIP with ${items.length} files downloaded`);
    } catch (err: any) {
      toast.error("Error creating ZIP: " + (err?.message || ""));
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
    toast.info(
      `"${image.name}" added to ${target === "scenario" ? "scenario" : target}`,
    );
  };

  // ─── Preset save ──────────────────────────
  const handleSavePreset = async () => {
    const name = prompt("Give your preset a name:");
    if (name && name.trim() && form.characters.length > 0) {
      const firstChar = form.characters[0];

      // Generate thumbnail from the first model image (if it exists)
      let thumbnail: string | undefined;
      if (firstChar.modelImages && firstChar.modelImages.length > 0) {
        try {
          thumbnail = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(firstChar.modelImages![0]);
          });
        } catch {
          // If it fails, continue without thumbnail
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
      toast.success(`Preset "${name.trim()}" saved`);
    }
  };

  // ─── DB Manager ──────────────────────────
  const handleExportBackup = async () => {
    const json = await exportDatabaseToJson();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vist-studio-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Backup exported successfully");
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
      ".jsonl file downloaded. You can upload this file directly to a BigQuery table to analyze your history.",
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
          toast.success("Database restored successfully");
          setShowDbManager(false);
        }
      } catch {
        toast.error("Import error: invalid or corrupt file");
      }
    };
    reader.readAsText(file);
  };

  const handleSwitchKey = async () => {
    const aistudio = (window as any).aistudio;
    if (aistudio?.openSelectKey) await aistudio.openSelectKey();
    else alert("API Key selection is not available.");
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

  // ─── Auth gate — public pages: explore, pricing ───────────────
  const PUBLIC_WORKSPACES: AppWorkspace[] = ['dashboard', 'pricing'];
  const isPublicWorkspace = PUBLIC_WORKSPACES.includes(activeWorkspace);

  if (!user && !isPublicWorkspace) {
    // Protected workspace — redirect to login with context
    const intendedWorkspace = activeWorkspace;
    return <AuthScreen onAuthenticated={() => {
      // Check if there's a checkout intent → go back to pricing
      const checkoutIntent = sessionStorage.getItem('vist_checkout_intent');
      if (checkoutIntent) {
        setActiveWorkspace('pricing');
      } else if (intendedWorkspace) {
        setActiveWorkspace(intendedWorkspace);
      }
    }} intendedWorkspace={intendedWorkspace} />;
  }

  // ─── Render ──────────────────────────────
  const { activeMode, setActiveMode } = form;
  const { selectedIds, isSelectionMode, filteredHistory, inspirationImages } =
    gallery;


  return (
    <ApiKeyGuard>
      <div className="relative w-screen h-screen overflow-hidden text-zinc-300 font-body flex" style={{ background: '#0D0A0A' }}>
        {/* ─── Sidebar Navigation (desktop) ─── */}
        <SidebarNav activePage={activeWorkspace} onNavigate={setActiveWorkspace} />

        {/* ─── Mobile header ─── */}
        <div className="flex-1 flex flex-col min-w-0">
          <header className="lg:hidden h-14 flex items-center justify-between px-4 shrink-0 z-40" style={{ background: 'rgba(13,10,10,0.92)', borderBottom: '1px solid #2A1F1C' }}>
            <h1 className="flex items-center gap-1.5 font-display">
              <span className="text-base font-extrabold text-gradient-brand">VIST</span>
              <span className="text-base font-light" style={{ color: '#6B5A56' }}>Studio</span>
            </h1>
          </header>

          {/* ─── Mobile Bottom Tab Bar ─── */}
          <MobileNav activePage={activeWorkspace} onNavigate={setActiveWorkspace} />

          {/* ─── Page Router ─── */}
          <div className="relative flex-1 overflow-hidden">
            <Suspense fallback={
              <div className="absolute inset-0 flex items-center justify-center" style={{ background: '#0D0A0A' }}>
                <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#FF5C35', borderTopColor: 'transparent' }} />
              </div>
            }>

            {/* ────── PAGE: DASHBOARD ────── */}
            {activeWorkspace === "dashboard" && (
              <div className="absolute inset-0 overflow-hidden">
                <DashboardPage onNavigate={setActiveWorkspace} />
              </div>
            )}

            {/* ────── PAGE: CREATE CHARACTER ────── */}
            {activeWorkspace === "create" && (
              <div className="absolute inset-0 overflow-hidden">
                <CharacterBuilderPage
                  onGenerate={(characteristics, _style, _niche) => {
                    // Set characteristics on the first character in form context
                    const charId = form.characters[0]?.id;
                    if (charId) {
                      form.updateCharacter(charId, 'characteristics', characteristics);
                    }
                    handleGenerate();
                  }}
                  onNavigate={setActiveWorkspace}
                  isGenerating={isGenerating}
                  onSaveCharacter={(name, characteristics, niche) => {
                    charLib.saveCurrentCharacter(name, {
                      id: crypto.randomUUID(),
                      characteristics,
                      outfitDescription: niche,
                      accessory: '',
                    });
                  }}
                  generatedImageUrl={gallery.generatedHistory[0]?.url}
                />
              </div>
            )}

            {/* ────── PAGE: PHOTO SESSION ────── */}
            {activeWorkspace === "session" && (
              <div className="absolute inset-0 overflow-hidden">
                <PhotoSessionPage
                  onNavigate={(ws) => setActiveWorkspace(ws as AppWorkspace)}
                />
              </div>
            )}

            {/* ────── PAGE: STUDIO EDITOR ────── */}
            {activeWorkspace === "studio" && (
              <div className="absolute inset-0 overflow-hidden">
                <StudioEditorPage
                  onNavigate={(ws) => setActiveWorkspace(ws as AppWorkspace)}
                  canvasImage={studioCanvasImage}
                />
              </div>
            )}

            {/* ────── PAGE: GALLERY ────── */}
            {activeWorkspace === "gallery" && (
              <div className="absolute inset-0 overflow-hidden">
                <CharactersPage
                  onLoadCharacter={handleLoadCharacterInDirector}
                  onNewCharacter={() => setActiveWorkspace("create")}
                  onNavigate={(ws) => setActiveWorkspace(ws as AppWorkspace)}
                  onUploadToStudio={handleUploadToStudio}
                  onOpenInStudio={handleOpenInStudio}
                  onShootSession={handleShootSession}
                />
              </div>
            )}

            {/* ────── PAGE: PRICING ────── */}
            {activeWorkspace === "pricing" && (
              <div className="absolute inset-0 overflow-y-auto">
                <PricingPage onNavigate={(ws) => setActiveWorkspace(ws as AppWorkspace)} />
              </div>
            )}

            {/* ────── PAGE: PROFILE ────── */}
            {activeWorkspace === "profile" && (
              <div className="absolute inset-0 overflow-hidden">
                <ProfilePage onNavigate={(ws) => setActiveWorkspace(ws as AppWorkspace)} />
              </div>
            )}

            </Suspense>
          </div>
        </div>

        {/* Modals (lazy-loaded — Suspense with null fallback since modals overlay) */}
        <Suspense fallback={null}>
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
        </Suspense>

        {/* Floating Pose Assistant */}
        <PoseAssistantWidget />

        {/* Welcome onboarding modal — first visit only */}
        {showWelcome && user && (
          <WelcomeModal
            onClose={() => setShowWelcome(false)}
            onNavigate={(ws, mode) => {
              setActiveWorkspace(ws as AppWorkspace);
              if (mode && ws === 'create') form.setActiveMode(mode as any);
            }}
          />
        )}
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
