import React, { useState, useRef, useEffect } from "react";
import {
  Download,
  Settings,
  X,
  Plus,
  Minus,
  Sparkles,
  Search,
  RefreshCw,
  Maximize2,
  ChevronDown,
  AtSign,
} from "lucide-react";
import { useForm } from "../contexts/FormContext";
import { useGallery } from "../contexts/GalleryContext";
import {
  AIProvider,
  FalModel,
  GeminiImageModel,
  ReplicateModel,
  OpenAIModel,
  IdeogramModel,
  ModelsLabModel,
  VideoEngine,
  ImageSize,
  AspectRatio,
  GeneratedContent,
  FAL_MODEL_LABELS,
  REPLICATE_MODEL_LABELS,
  OPENAI_MODEL_LABELS,
  IDEOGRAM_MODEL_LABELS,
  VIDEO_ENGINE_LABELS,
  CREDIT_COSTS,
  OPERATION_CREDIT_COSTS,
} from "../types";
import { useSubscription } from "../hooks/useSubscription";

// ─── Props ────────────────────────────────────────────────────────────────────

interface GeneratorPageProps {
  isGenerating: boolean;
  progress: number;
  onGenerate: () => void;
  onStopGeneration: () => void;
  onDownload: (item: GeneratedContent) => void;
  onReuse: (item: GeneratedContent) => void;
  onUpscale: (item: GeneratedContent) => void;
  onCaption: (item: GeneratedContent) => void;
  onFaceSwap: (item: GeneratedContent) => void;
  onInpaint: (item: GeneratedContent) => void;
  onAddToStoryboard: (item: GeneratedContent) => void;
  onSendToDirector?: (item: GeneratedContent) => void;
}

// ─── Model Catalog ─────────────────────────────────────────────────────────────

interface ModelEntry {
  id: string;
  name: string;
  tagline: string;
  heroTagline: string;
  icon: string;
  badge?: string;
  isVideo?: boolean;
  section: "featured" | "other" | "video";
  select: (form: ReturnType<typeof useForm>) => void;
  isActive: (form: ReturnType<typeof useForm>) => boolean;
}

const ALL_MODELS: ModelEntry[] = [
  // ── Featured image models ──
  {
    id: "nb2",
    name: "NB2",
    tagline: "Pro quality at Flash speed",
    heroTagline: "Pro quality at Flash speed",
    icon: "🍌",
    badge: "TOP",
    section: "featured",
    select: (f) => { f.setAiProvider(AIProvider.Gemini); f.setGeminiModel(GeminiImageModel.Flash2); f.setActiveMode("create"); },
    isActive: (f) => f.activeMode !== "video" && f.aiProvider === AIProvider.Gemini && f.geminiModel === GeminiImageModel.Flash2,
  },
  {
    id: "seedream45",
    name: "Seedream 4.5",
    tagline: "ByteDance's next-gen 4K image model",
    heroTagline: "Create stunning high-aesthetic images in seconds",
    icon: "📊",
    badge: "NEW",
    section: "featured",
    select: (f) => { f.setAiProvider(AIProvider.Fal); f.setFalModel(FalModel.Seedream45); f.setActiveMode("create"); },
    isActive: (f) => f.activeMode !== "video" && f.aiProvider === AIProvider.Fal && f.falModel === FalModel.Seedream45,
  },
  {
    id: "seedream50",
    name: "Seedream 5.0",
    tagline: "Intelligent visual reasoning",
    heroTagline: "Web search + visual reasoning, next level",
    icon: "📊",
    badge: "NEW",
    section: "featured",
    select: (f) => { f.setAiProvider(AIProvider.Fal); f.setFalModel(FalModel.Seedream50); f.setActiveMode("create"); },
    isActive: (f) => f.activeMode !== "video" && f.aiProvider === AIProvider.Fal && f.falModel === FalModel.Seedream50,
  },
  {
    id: "gpt15",
    name: "GPT Image 1.5",
    tagline: "True-color precision rendering",
    heroTagline: "Multimodal precision — accepts any reference",
    icon: "⚙️",
    badge: "PREMIUM",
    section: "featured",
    select: (f) => { f.setAiProvider(AIProvider.OpenAI); f.setOpenaiModel(OpenAIModel.GptImage15); f.setActiveMode("create"); },
    isActive: (f) => f.activeMode !== "video" && f.aiProvider === AIProvider.OpenAI && f.openaiModel === OpenAIModel.GptImage15,
  },
  {
    id: "nb2-pro",
    name: "Gemini Pro",
    tagline: "Google's flagship generation model",
    heroTagline: "Maximum detail, maximum quality",
    icon: "G",
    badge: "PREMIUM",
    section: "featured",
    select: (f) => { f.setAiProvider(AIProvider.Gemini); f.setGeminiModel(GeminiImageModel.Pro); f.setActiveMode("create"); },
    isActive: (f) => f.activeMode !== "video" && f.aiProvider === AIProvider.Gemini && f.geminiModel === GeminiImageModel.Pro,
  },
  {
    id: "grok-imagine",
    name: "Grok Imagine",
    tagline: "xAI SOTA · ~4s per image",
    heroTagline: "State-of-the-art image generation from xAI",
    icon: "𝕏",
    badge: "NEW",
    section: "featured",
    select: (f) => { f.setAiProvider(AIProvider.Replicate); f.setReplicateModel(ReplicateModel.GrokImagine); f.setActiveMode("create"); },
    isActive: (f) => f.activeMode !== "video" && f.aiProvider === AIProvider.Replicate && f.replicateModel === ReplicateModel.GrokImagine,
  },
  // ── Other image models ──
  {
    id: "kontext-multi",
    name: "FLUX Kontext",
    tagline: "Identity multi-reference · 2026",
    heroTagline: "Consistent identity across every generation",
    icon: "⚡",
    badge: "NEW",
    section: "other",
    select: (f) => { f.setAiProvider(AIProvider.Fal); f.setFalModel(FalModel.KontextMulti); f.setActiveMode("create"); },
    isActive: (f) => f.activeMode !== "video" && f.aiProvider === AIProvider.Fal && f.falModel === FalModel.KontextMulti,
  },
  {
    id: "kontext-max",
    name: "FLUX Kontext Max",
    tagline: "Maximum quality multi-reference · 2026",
    heroTagline: "Maximum fidelity identity preservation",
    icon: "⚡",
    section: "other",
    select: (f) => { f.setAiProvider(AIProvider.Fal); f.setFalModel(FalModel.KontextMaxMulti); f.setActiveMode("create"); },
    isActive: (f) => f.activeMode !== "video" && f.aiProvider === AIProvider.Fal && f.falModel === FalModel.KontextMaxMulti,
  },
  {
    id: "gen4",
    name: "Gen-4 Image",
    tagline: "Runway — character + location consistency",
    heroTagline: "Character and location consistency in one shot",
    icon: "🎬",
    section: "other",
    select: (f) => { f.setAiProvider(AIProvider.Replicate); f.setReplicateModel(ReplicateModel.Gen4Image); f.setActiveMode("create"); },
    isActive: (f) => f.activeMode !== "video" && f.aiProvider === AIProvider.Replicate && f.replicateModel === ReplicateModel.Gen4Image,
  },
  {
    id: "flux2max",
    name: "FLUX.2 Max",
    tagline: "Maximum fidelity · up to 8 references",
    heroTagline: "Maximum fidelity with up to 8 reference images",
    icon: "🔥",
    section: "other",
    select: (f) => { f.setAiProvider(AIProvider.Replicate); f.setReplicateModel(ReplicateModel.Flux2Max); f.setActiveMode("create"); },
    isActive: (f) => f.activeMode !== "video" && f.aiProvider === AIProvider.Replicate && f.replicateModel === ReplicateModel.Flux2Max,
  },
  {
    id: "imagen4ultra",
    name: "Imagen 4 Ultra",
    tagline: "Google's highest fidelity photorealism",
    heroTagline: "Unmatched photorealism from Google DeepMind",
    icon: "✨",
    badge: "NEW",
    section: "other",
    select: (f) => { f.setAiProvider(AIProvider.Gemini); f.setGeminiModel(GeminiImageModel.Imagen4Ultra); f.setActiveMode("create"); },
    isActive: (f) => f.activeMode !== "video" && f.aiProvider === AIProvider.Gemini && f.geminiModel === GeminiImageModel.Imagen4Ultra,
  },
  {
    id: "ideogram-v3",
    name: "Ideogram V3",
    tagline: "Advanced typography & character reference",
    heroTagline: "Typography and branding like no other model",
    icon: "💡",
    section: "other",
    select: (f) => { f.setAiProvider(AIProvider.Ideogram); f.setIdeogramModel(IdeogramModel.V3); f.setActiveMode("create"); },
    isActive: (f) => f.activeMode !== "video" && f.aiProvider === AIProvider.Ideogram && f.ideogramModel === IdeogramModel.V3,
  },
  {
    id: "gemini-flash",
    name: "Gemini Flash",
    tagline: "Fast and efficient",
    heroTagline: "Speed without compromise",
    icon: "⚡",
    section: "other",
    select: (f) => { f.setAiProvider(AIProvider.Gemini); f.setGeminiModel(GeminiImageModel.Flash); f.setActiveMode("create"); },
    isActive: (f) => f.activeMode !== "video" && f.aiProvider === AIProvider.Gemini && f.geminiModel === GeminiImageModel.Flash,
  },
  // ── ModelsLab NSFW ──
  {
    id: "lustify-sdxl",
    name: "Lustify SDXL",
    tagline: "Photoreal NSFW — uncensored",
    heroTagline: "Uncensored photorealistic content — no filters",
    icon: "🔞",
    badge: "NSFW",
    section: "other",
    select: (f) => { f.setAiProvider(AIProvider.ModelsLab); f.setModelsLabModel(ModelsLabModel.LustifySdxl); f.setActiveMode("create"); },
    isActive: (f) => f.activeMode !== "video" && f.aiProvider === AIProvider.ModelsLab && f.modelsLabModel === ModelsLabModel.LustifySdxl,
  },
  {
    id: "nsfw-sdxl",
    name: "NSFW SDXL",
    tagline: "General purpose uncensored SDXL",
    heroTagline: "General purpose NSFW generation — SDXL base",
    icon: "🔞",
    badge: "NSFW",
    section: "other",
    select: (f) => { f.setAiProvider(AIProvider.ModelsLab); f.setModelsLabModel(ModelsLabModel.NsfwSdxl); f.setActiveMode("create"); },
    isActive: (f) => f.activeMode !== "video" && f.aiProvider === AIProvider.ModelsLab && f.modelsLabModel === ModelsLabModel.NsfwSdxl,
  },
  {
    id: "wai-nsfw",
    name: "WAI Illustrious",
    tagline: "NSFW anime & illustration style",
    heroTagline: "Illustrious SDXL — anime & illustrated NSFW",
    icon: "🎌",
    badge: "NSFW",
    section: "other",
    select: (f) => { f.setAiProvider(AIProvider.ModelsLab); f.setModelsLabModel(ModelsLabModel.WaiNsfw); f.setActiveMode("create"); },
    isActive: (f) => f.activeMode !== "video" && f.aiProvider === AIProvider.ModelsLab && f.modelsLabModel === ModelsLabModel.WaiNsfw,
  },
  {
    id: "flux-nsfw",
    name: "FLUX NSFW",
    tagline: "FLUX Dev fine-tuned for adult content",
    heroTagline: "FLUX architecture — uncensored adult generation",
    icon: "🔞",
    badge: "NSFW",
    section: "other",
    select: (f) => { f.setAiProvider(AIProvider.ModelsLab); f.setModelsLabModel(ModelsLabModel.FluxNsfw); f.setActiveMode("create"); },
    isActive: (f) => f.activeMode !== "video" && f.aiProvider === AIProvider.ModelsLab && f.modelsLabModel === ModelsLabModel.FluxNsfw,
  },
  {
    id: "z-image-turbo",
    name: "Z-Image Turbo",
    tagline: "Alibaba 6B · uncensored · $0.005/mp",
    heroTagline: "Tongyi-MAI 6B — uncensored, 8 steps, fast",
    icon: "🈸",
    badge: "NSFW",
    section: "other",
    select: (f) => { f.setAiProvider(AIProvider.Fal); f.setFalModel(FalModel.ZImageTurbo); f.setActiveMode("create"); },
    isActive: (f) => f.activeMode !== "video" && f.aiProvider === AIProvider.Fal && f.falModel === FalModel.ZImageTurbo,
  },
  // ── Video models ──
  {
    id: "kling-pro",
    name: "Kling 1.5 Pro",
    tagline: "Ultra-quality 1080p video",
    heroTagline: "Ultra-quality cinematic video at 1080p",
    icon: "🎬",
    badge: "PRO",
    isVideo: true,
    section: "video",
    select: (f) => { f.setVideoEngine(VideoEngine.KlingPro); f.setActiveMode("video"); },
    isActive: (f) => f.activeMode === "video" && f.videoEngine === VideoEngine.KlingPro,
  },
  {
    id: "kling-standard",
    name: "Kling 1.5 Standard",
    tagline: "Fast · 5s · Motion Control",
    heroTagline: "Fast cinematic video with Motion Control",
    icon: "🎥",
    isVideo: true,
    section: "video",
    select: (f) => { f.setVideoEngine(VideoEngine.KlingStandard); f.setActiveMode("video"); },
    isActive: (f) => f.activeMode === "video" && f.videoEngine === VideoEngine.KlingStandard,
  },
  {
    id: "runway-gen3",
    name: "Runway Gen-3",
    tagline: "Exceptional frame consistency",
    heroTagline: "Exceptional frame-to-frame consistency",
    icon: "🏃",
    isVideo: true,
    section: "video",
    select: (f) => { f.setVideoEngine(VideoEngine.RunwayGen3); f.setActiveMode("video"); },
    isActive: (f) => f.activeMode === "video" && f.videoEngine === VideoEngine.RunwayGen3,
  },
  {
    id: "luma",
    name: "Luma Dream Machine",
    tagline: "Fluid camera movements",
    heroTagline: "Fluid, dynamic camera movements and physics",
    icon: "✨",
    isVideo: true,
    section: "video",
    select: (f) => { f.setVideoEngine(VideoEngine.LumaDreamMachine); f.setActiveMode("video"); },
    isActive: (f) => f.activeMode === "video" && f.videoEngine === VideoEngine.LumaDreamMachine,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const GEMINI_NAMES: Record<GeminiImageModel, string> = {
  [GeminiImageModel.Flash]: "Gemini Flash",
  [GeminiImageModel.Flash2]: "NB2",
  [GeminiImageModel.Pro]: "Gemini Pro",
  [GeminiImageModel.Imagen4]: "Imagen 4",
  [GeminiImageModel.Imagen4Ultra]: "Imagen 4 Ultra",
  [GeminiImageModel.Imagen4Fast]: "Imagen 4 Fast",
};

const getActiveModel = (form: ReturnType<typeof useForm>): ModelEntry | undefined =>
  ALL_MODELS.find((m) => m.isActive(form));

const AR_OPTIONS: { label: string; desc: string; value: AspectRatio }[] = [
  { label: "3:4",  desc: "Portrait",  value: AspectRatio.Portrait },
  { label: "1:1",  desc: "Square",    value: AspectRatio.Square },
  { label: "4:3",  desc: "Landscape", value: AspectRatio.Landscape },
  { label: "16:9", desc: "Wide",      value: AspectRatio.Wide },
  { label: "9:16", desc: "Story",     value: AspectRatio.Tall },
];

const SIZE_OPTIONS: { label: string; value: ImageSize }[] = [
  { label: "1K", value: ImageSize.Size1K },
  { label: "2K", value: ImageSize.Size2K },
  { label: "4K", value: ImageSize.Size4K },
];

// ─── Badge component ──────────────────────────────────────────────────────────

const Badge: React.FC<{ text: string }> = ({ text }) => {
  const isNew = text === "NEW";
  const isPremium = text === "PREMIUM" || text === "PRO";
  return (
    <span
      className="text-[8px] font-black px-1.5 py-0.5 rounded leading-none tracking-wider font-jet text-white"
      style={
        isNew      ? { background: 'linear-gradient(135deg,#FF5C35,#FFB347)' } :
        isPremium  ? { background: 'rgba(255,92,53,0.2)', color: '#FF5C35', border: '1px solid rgba(255,92,53,0.3)' } :
                    { background: 'rgba(255,255,255,0.1)', color: '#B8A9A5' }
      }
    >
      {text}
    </span>
  );
};

// ─── Provider icon pill ────────────────────────────────────────────────────────

const ModelIconPill: React.FC<{ icon: string; size?: "sm" | "md" }> = ({
  icon,
  size = "md",
}) => {
  const isLetter = icon.length === 1 && /[A-Za-z]/.test(icon);
  const sz = size === "sm" ? "w-6 h-6 text-[10px]" : "w-8 h-8 text-sm";
  return (
    <div
      className={`${sz} rounded-lg bg-zinc-800 border border-zinc-700/50 flex items-center justify-center flex-none`}
    >
      {isLetter ? (
        <span className="font-bold text-zinc-300">{icon}</span>
      ) : (
        <span className="leading-none">{icon}</span>
      )}
    </div>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────

const GeneratorPage: React.FC<GeneratorPageProps> = ({
  isGenerating,
  progress,
  onGenerate,
  onStopGeneration,
  onDownload,
  onReuse,
  onUpscale,
  onCaption,
  onFaceSwap,
  onInpaint,
  onAddToStoryboard,
  onSendToDirector,
}) => {
  const form = useForm();
  const gallery = useGallery();
  const sub = useSubscription();

  // Credit cost for current config
  const genCreditCost = (() => {
    if (form.activeMode === 'video') return CREDIT_COSTS[form.videoEngine as string] ?? 50;
    let costPerImage = 5;
    if (form.aiProvider === AIProvider.Fal) costPerImage = CREDIT_COSTS[form.falModel] ?? 10;
    else if (form.aiProvider === AIProvider.Replicate) costPerImage = CREDIT_COSTS[form.replicateModel] ?? 15;
    else if (form.aiProvider === AIProvider.OpenAI) costPerImage = CREDIT_COSTS[form.openaiModel] ?? 20;
    else if (form.aiProvider === AIProvider.Ideogram) costPerImage = CREDIT_COSTS[form.ideogramModel] ?? 10;
    else if (form.aiProvider === AIProvider.ModelsLab) costPerImage = CREDIT_COSTS[form.modelsLabModel] ?? 5;
    else costPerImage = CREDIT_COSTS[form.geminiModel] ?? 5;
    return costPerImage * form.numberOfImages;
  })();

  const [showModelPicker, setShowModelPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedItem, setSelectedItem] = useState<GeneratedContent | null>(null);
  const [hoveredCanvas, setHoveredCanvas] = useState(false);
  const [canvasDragOver, setCanvasDragOver] = useState(false);
  const [showArDropdown, setShowArDropdown] = useState(false);
  const [showSizeDropdown, setShowSizeDropdown] = useState(false);

  const modelPickerRef = useRef<HTMLDivElement>(null);
  const refInputRef = useRef<HTMLInputElement>(null);
  const arRef = useRef<HTMLDivElement>(null);
  const sizeRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (modelPickerRef.current && !modelPickerRef.current.contains(e.target as Node))
        setShowModelPicker(false);
      if (arRef.current && !arRef.current.contains(e.target as Node))
        setShowArDropdown(false);
      if (sizeRef.current && !sizeRef.current.contains(e.target as Node))
        setShowSizeDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const char0 = form.characters[0];
  const isVideo = form.activeMode === "video";

  const activeModel = getActiveModel(form);

  // Filtered models for picker
  const q = searchQuery.toLowerCase();
  const filter = (m: ModelEntry) =>
    !q || m.name.toLowerCase().includes(q) || m.tagline.toLowerCase().includes(q);

  const featuredModels = ALL_MODELS.filter((m) => m.section === "featured" && filter(m));
  const otherModels = ALL_MODELS.filter((m) => m.section === "other" && filter(m));
  const videoModels = ALL_MODELS.filter((m) => m.section === "video" && filter(m));

  const isFirstTime = gallery.generatedHistory.length === 0;

  // Gallery items
  const recentItems = gallery.generatedHistory.slice(0, 8);
  const canvasItem = selectedItem ?? (recentItems[0] ?? null);

  const currentAr = AR_OPTIONS.find((o) => o.value === form.aspectRatio);
  const currentArLabel = currentAr ? `${currentAr.label} ${currentAr.desc}` : "3:4 Portrait";
  const currentSizeLabel = SIZE_OPTIONS.find((o) => o.value === form.imageSize)?.label ?? "1K";

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setCanvasDragOver(false);
    const files = Array.from<File>(e.dataTransfer.files).filter((f) =>
      f.type.startsWith("image/"),
    );
    if (files.length > 0 && char0) {
      form.updateCharacter(char0.id, "modelImages", files);
    }
  };

  const handleRefFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0 && char0) {
      form.updateCharacter(char0.id, "modelImages", files);
    }
  };

  return (
    <div className="flex flex-col h-full bg-black overflow-hidden">

      {/* ─── Canvas ─── */}
      <div
        className={`flex-1 relative overflow-hidden flex flex-col items-center justify-center transition-colors ${
          canvasDragOver ? "bg-zinc-900/50" : "bg-black"
        }`}
        onDragOver={(e) => { e.preventDefault(); setCanvasDragOver(true); }}
        onDragLeave={() => setCanvasDragOver(false)}
        onDrop={handleCanvasDrop}
      >
        {/* Skeleton loader — shown when generating with no prior image */}
        {isGenerating && !canvasItem && (
          <div className="absolute inset-0 z-10 p-8 flex flex-col gap-3">
            <div className="skeleton-shimmer flex-1 rounded-2xl" />
            <div className="skeleton-shimmer h-4 w-2/3 rounded-lg" />
            <div className="skeleton-shimmer h-3 w-1/3 rounded-lg" />
          </div>
        )}

        {/* Generating overlay */}
        {isGenerating && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-4">
              <div className="w-10 h-10 rounded-full border-2 border-coral/30 border-t-coral animate-spin" style={{ borderTopColor: '#FF5C35' }} />
              <p className="text-sm font-medium" style={{ color: '#B8A9A5' }}>Generating…</p>
              {progress > 0 && (
                <div className="w-48 h-1 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${progress}%`, background: 'linear-gradient(90deg,#FF5C35,#FFB347)' }}
                  />
                </div>
              )}
              <button
                onClick={onStopGeneration}
                className="text-xs transition-colors flex items-center gap-1.5 mt-1"
                style={{ color: '#6B5A56' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#fff'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#6B5A56'}
              >
                <X className="w-3 h-3" /> Cancel
              </button>
            </div>
          </div>
        )}

        {/* Drag overlay */}
        {canvasDragOver && (
          <div className="absolute inset-0 z-10 flex items-center justify-center border-2 border-dashed border-zinc-600 rounded-lg m-4 pointer-events-none">
            <p className="text-zinc-400 text-sm font-medium">Drop reference image</p>
          </div>
        )}

        {canvasItem ? (
          /* ── Result view ── */
          <div
            className="relative w-full h-full flex items-center justify-center"
            onMouseEnter={() => setHoveredCanvas(true)}
            onMouseLeave={() => setHoveredCanvas(false)}
          >
            {canvasItem.type === "video" ? (
              <video
                src={canvasItem.url}
                controls
                autoPlay
                loop
                muted
                className="max-w-full max-h-full object-contain"
                style={{ maxHeight: "calc(100% - 72px)" }}
              />
            ) : (
              <img
                key={canvasItem.id}
                src={canvasItem.url}
                alt="Generated"
                className="max-w-full max-h-full object-contain animate-in fade-in zoom-in-[0.98] duration-300"
                style={{ maxHeight: "calc(100% - 72px)" }}
              />
            )}

            {/* Hover action bar */}
            {hoveredCanvas && !isGenerating && (
              <div className="absolute bottom-[80px] left-1/2 -translate-x-1/2 flex items-center gap-1 bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/60 rounded-2xl px-3 py-2 shadow-2xl">
                <ActionBtn icon={<Download className="w-3.5 h-3.5" />} label="Download" onClick={() => onDownload(canvasItem)} />
                <Sep />
                <ActionBtn icon={<RefreshCw className="w-3.5 h-3.5" />} label="Reuse" onClick={() => onReuse(canvasItem)} />
                {canvasItem.type !== "video" && (
                  <>
                    <Sep />
                    <ActionBtn icon={<Maximize2 className="w-3.5 h-3.5" />} label="4× Up" onClick={() => onUpscale(canvasItem)} />
                    <Sep />
                    <ActionBtn label="Face Swap" onClick={() => onFaceSwap(canvasItem)} />
                    <Sep />
                    <ActionBtn label="Edit" onClick={() => onInpaint(canvasItem)} />
                  </>
                )}
                {onSendToDirector && canvasItem.type !== "video" && (
                  <>
                    <Sep />
                    <ActionBtn icon={<Sparkles className="w-3.5 h-3.5" />} label="Director" onClick={() => onSendToDirector(canvasItem)} />
                  </>
                )}
                <Sep />
                <ActionBtn label="+ Board" onClick={() => onAddToStoryboard(canvasItem)} />
              </div>
            )}

            {/* Filmstrip */}
            {recentItems.length > 1 && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
                {recentItems.slice(0, 6).map((item) => {
                  const isSel = item.id === (selectedItem?.id ?? recentItems[0]?.id);
                  return (
                    <button
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className={`w-9 h-9 rounded-lg overflow-hidden border-2 transition-all ${
                        isSel ? "border-white opacity-100" : "border-zinc-700 opacity-40 hover:opacity-70"
                      }`}
                    >
                      {item.type === "video" ? (
                        <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-xs">🎬</div>
                      ) : (
                        <img src={item.url} alt="" className="w-full h-full object-cover" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* ── Empty state — model hero ── */
          <div className="flex flex-col items-center justify-center text-center px-6 select-none">
            {activeModel ? (
              <>
                {/* Model icon — big */}
                <div className="w-20 h-20 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-8 shadow-2xl">
                  <span className="text-4xl leading-none">{activeModel.icon}</span>
                </div>

                {/* Model name — HUGE */}
                <h2 className="text-6xl sm:text-7xl lg:text-8xl font-black tracking-tighter text-white uppercase leading-none mb-4">
                  {activeModel.name}
                </h2>

                {/* Model tagline */}
                <p className="text-zinc-500 text-lg font-light mb-10 max-w-sm leading-relaxed">
                  {activeModel.heroTagline}
                </p>

                {/* Reference image zone */}
                <div className="flex items-center gap-3">
                  {char0 && char0.modelImages.slice(0, 3).map((file, i) => (
                    <div key={i} className="relative w-12 h-12 rounded-xl overflow-hidden border border-zinc-700">
                      <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
                      <button
                        onClick={() => {
                          const updated = char0.modelImages.filter((_, idx) => idx !== i);
                          form.updateCharacter(char0.id, "modelImages", updated);
                        }}
                        className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/80 flex items-center justify-center"
                      >
                        <X className="w-2.5 h-2.5 text-white" />
                      </button>
                    </div>
                  ))}
                  {(!char0 || char0.modelImages.length === 0) && (
                    <button
                      onClick={() => refInputRef.current?.click()}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-zinc-700 text-zinc-600 text-sm hover:border-zinc-500 hover:text-zinc-400 transition-all"
                    >
                      <AtSign className="w-3.5 h-3.5" />
                      Add reference image
                    </button>
                  )}
                </div>

                {/* Onboarding — suggested prompts for first-time users */}
                {isFirstTime && (
                  <div className="mt-10 max-w-md">
                    <p className="text-[11px] font-jet mb-3" style={{ color: '#4A3A36' }}>
                      ✨ Pro tip: Start with a description of person, style, and setting
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {[
                        'Young woman, editorial fashion, studio lighting',
                        'Male model, streetwear, urban background',
                        'Beauty close-up, golden hour, soft bokeh',
                      ].map((prompt) => (
                        <button
                          key={prompt}
                          onClick={() => { if (char0) form.updateCharacter(char0.id, 'outfitDescription', prompt); }}
                          className="px-3 py-1.5 rounded-full text-[11px] transition-all hover:scale-[1.03]"
                          style={{ background: 'rgba(255,92,53,0.08)', border: '1px solid rgba(255,92,53,0.2)', color: '#FF5C35' }}
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* Fallback if no model active somehow */
              <h2 className="text-7xl font-black text-zinc-800 tracking-tighter">
                SELECT A MODEL
              </h2>
            )}
          </div>
        )}

        <input
          ref={refInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleRefFileChange}
        />
      </div>

      {/* ─── Advanced Drawer ─── */}
      {showAdvanced && (
        <div className="flex-none bg-zinc-950/95 border-t border-zinc-800/60 px-5 py-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <label className="text-[10px] text-zinc-600 uppercase tracking-wider block mb-1.5">CFG</label>
              <NumStepper value={form.cfg} min={1} max={20} step={0.5} onChange={form.setCfg} />
            </div>
            <div>
              <label className="text-[10px] text-zinc-600 uppercase tracking-wider block mb-1.5">Steps</label>
              <NumStepper value={form.steps} min={10} max={100} step={5} onChange={form.setSteps} />
            </div>
            <div>
              <label className="text-[10px] text-zinc-600 uppercase tracking-wider block mb-1.5">Seed</label>
              <input
                type="number"
                value={form.seed ?? ""}
                onChange={(e) => form.setSeed(e.target.value === "" ? undefined : parseInt(e.target.value))}
                placeholder="Random"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-white outline-none placeholder:text-zinc-700"
              />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] text-zinc-600 uppercase tracking-wider block mb-1.5">Negative</label>
              <input
                value={form.negativePrompt}
                onChange={(e) => form.setNegativePrompt(e.target.value)}
                placeholder="Things to avoid..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-white outline-none placeholder:text-zinc-700"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] text-zinc-600 uppercase tracking-wider block">Options</label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.antiFisheye} onChange={(e) => form.setAntiFisheye(e.target.checked)} className="w-3.5 h-3.5 accent-white" />
                <span className="text-[11px] text-zinc-400">Anti-fisheye</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* ─── Bottom Bar ─── */}
      <div className="flex-none bg-zinc-950/90 backdrop-blur-xl border-t border-zinc-800/50 px-4 py-3 space-y-2.5">

        {/* Prompt row */}
        <div className="flex items-center gap-2 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl px-4 focus-within:border-zinc-600/80 transition-colors">
          {isVideo ? (
            <input
              value={form.videoPrompt}
              onChange={(e) => form.setVideoPrompt(e.target.value)}
              placeholder="Describe the motion and scene..."
              className="flex-1 bg-transparent text-sm text-white outline-none py-3 placeholder:text-zinc-600 font-light"
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !isGenerating) { e.preventDefault(); onGenerate(); } }}
            />
          ) : (
            <input
              value={form.characters[0]?.outfitDescription ?? ""}
              onChange={(e) => char0 && form.updateCharacter(char0.id, "outfitDescription", e.target.value)}
              placeholder="Describe your image — subject, style, setting, lighting..."
              className="flex-1 bg-transparent text-sm text-white outline-none py-3 placeholder:text-zinc-600 font-light"
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !isGenerating) { e.preventDefault(); onGenerate(); } }}
            />
          )}
        </div>

        {/* Controls row */}
        <div className="flex items-center gap-2 flex-wrap">

          {/* ── Model picker ── */}
          <div className="relative" ref={modelPickerRef}>
            <button
              onClick={() => setShowModelPicker(!showModelPicker)}
              className={`flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl border transition-all text-xs font-semibold ${
                showModelPicker
                  ? "bg-zinc-800 border-zinc-600 text-white"
                  : "bg-white/[0.04] border-white/8 text-zinc-200 hover:bg-white/8 hover:border-zinc-600"
              }`}
            >
              <ModelIconPill icon={activeModel?.icon ?? "✦"} size="sm" />
              <span className="max-w-[100px] truncate">{activeModel?.name ?? "Select model"}</span>
              <ChevronDown className={`w-3 h-3 text-zinc-500 transition-transform ${showModelPicker ? "rotate-180" : ""}`} />
            </button>

            {/* ── Dropdown ── */}
            {showModelPicker && (
              <div className="absolute bottom-full mb-2 left-0 w-[360px] bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden z-50">
                {/* Search */}
                <div className="p-3 border-b border-zinc-800/80">
                  <div className="flex items-center gap-2 bg-zinc-900 rounded-xl px-3 py-2">
                    <Search className="w-3.5 h-3.5 text-zinc-500 flex-none" />
                    <input
                      autoFocus
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search..."
                      className="flex-1 bg-transparent text-xs text-white outline-none placeholder:text-zinc-600"
                    />
                    {searchQuery && (
                      <button onClick={() => setSearchQuery("")}>
                        <X className="w-3 h-3 text-zinc-500" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="max-h-[360px] overflow-y-auto custom-scrollbar">
                  {/* Featured */}
                  {featuredModels.length > 0 && (
                    <ModelSection
                      title="✦ Featured models"
                      models={featuredModels}
                      form={form}
                      onSelect={(m) => { m.select(form); setShowModelPicker(false); setSearchQuery(""); }}
                    />
                  )}

                  {/* Other */}
                  {otherModels.length > 0 && (
                    <ModelSection
                      title="⊞ Other models"
                      models={otherModels}
                      form={form}
                      onSelect={(m) => { m.select(form); setShowModelPicker(false); setSearchQuery(""); }}
                    />
                  )}

                  {/* Video */}
                  {videoModels.length > 0 && (
                    <ModelSection
                      title="▶ Video models"
                      models={videoModels}
                      form={form}
                      onSelect={(m) => { m.select(form); setShowModelPicker(false); setSearchQuery(""); }}
                    />
                  )}

                  {featuredModels.length === 0 && otherModels.length === 0 && videoModels.length === 0 && (
                    <p className="text-center text-zinc-600 text-xs py-8">No results for "{searchQuery}"</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Size pill */}
          {!isVideo && (
            <div className="relative" ref={sizeRef}>
              <button
                onClick={() => { setShowSizeDropdown(!showSizeDropdown); setShowArDropdown(false); }}
                className="flex items-center gap-1 px-3 py-1.5 bg-white/[0.04] hover:bg-white/8 border border-white/8 hover:border-zinc-600 rounded-xl text-xs font-medium text-zinc-300 transition-all"
              >
                {currentSizeLabel}
              </button>
              {showSizeDropdown && (
                <Dropdown onClose={() => setShowSizeDropdown(false)}>
                  {SIZE_OPTIONS.map((o) => (
                    <DropdownItem
                      key={o.value}
                      label={o.label}
                      active={form.imageSize === o.value}
                      onClick={() => { form.setImageSize(o.value); setShowSizeDropdown(false); }}
                    />
                  ))}
                </Dropdown>
              )}
            </div>
          )}

          {/* AR pill */}
          {!isVideo && (
            <div className="relative" ref={arRef}>
              <button
                onClick={() => { setShowArDropdown(!showArDropdown); setShowSizeDropdown(false); }}
                className="flex items-center gap-1 px-3 py-1.5 bg-white/[0.04] hover:bg-white/8 border border-white/8 hover:border-zinc-600 rounded-xl text-xs font-medium text-zinc-300 transition-all"
              >
                {currentArLabel}
              </button>
              {showArDropdown && (
                <Dropdown onClose={() => setShowArDropdown(false)}>
                  {AR_OPTIONS.map((o) => (
                    <DropdownItem
                      key={o.value}
                      label={`${o.label} · ${o.desc}`}
                      active={form.aspectRatio === o.value}
                      onClick={() => { form.setAspectRatio(o.value); setShowArDropdown(false); }}
                    />
                  ))}
                </Dropdown>
              )}
            </div>
          )}

          {/* Count stepper */}
          {!isVideo && (
            <div className="flex items-center gap-1 px-2 py-1.5 bg-white/[0.04] border border-white/8 rounded-xl">
              <button onClick={() => form.setNumberOfImages(Math.max(1, form.numberOfImages - 1))} className="text-zinc-500 hover:text-white transition-colors">
                <Minus className="w-3 h-3" />
              </button>
              <span className="text-xs text-zinc-200 w-4 text-center font-medium">{form.numberOfImages}</span>
              <button onClick={() => form.setNumberOfImages(Math.min(4, form.numberOfImages + 1))} className="text-zinc-500 hover:text-white transition-colors">
                <Plus className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* @ reference image */}
          <button
            onClick={() => refInputRef.current?.click()}
            title="Add reference image"
            className={`flex items-center justify-center w-8 h-8 rounded-xl border transition-all ${
              char0 && char0.modelImages.length > 0
                ? "bg-white/10 border-zinc-500 text-white"
                : "bg-white/[0.04] border-white/8 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300"
            }`}
          >
            <AtSign className="w-3.5 h-3.5" />
            {char0 && char0.modelImages.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-white" />
            )}
          </button>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Advanced */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`flex items-center justify-center w-8 h-8 rounded-xl border transition-all ${
              showAdvanced ? "bg-white/10 border-zinc-500 text-white" : "bg-white/[0.03] border-white/8 text-zinc-600 hover:text-zinc-300 hover:border-zinc-700"
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
          </button>

          {/* Credit cost pill */}
          {!isGenerating && (
            <div className="flex items-center gap-1.5 text-[10px] font-jet mr-1" style={{ color: '#6B5A56' }}>
              <span style={{ color: '#FFB347' }}>⚡{genCreditCost}</span>
              <span style={{ color: '#2A1F1C' }}>·</span>
              <span style={{ color: sub.credits < 20 ? '#EF4444' : sub.credits < 100 ? '#F59E0B' : '#6B5A56' }}>
                {sub.isUnlimited ? '∞' : sub.credits.toLocaleString()}
              </span>
            </div>
          )}

          {/* Generate / Stop */}
          <button
            onClick={isGenerating ? onStopGeneration : onGenerate}
            disabled={false}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 ${
              isGenerating
                ? "text-white hover:opacity-90"
                : "text-white hover:opacity-90"
            }`}
            style={isGenerating
              ? { background: 'linear-gradient(135deg,#FF5C35,#FFB347)' }
              : { background: 'linear-gradient(135deg,#FF5C35,#FFB347)', boxShadow: '0 2px 16px rgba(255,92,53,0.3)' }
            }
          >
            {isGenerating ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                Generating…
              </>
            ) : (
              <>⚡ Generate <span className="opacity-60 font-normal">→ {form.numberOfImages}</span></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Sub-components ────────────────────────────────────────────────────────────

const Sep = () => <div className="w-px h-4 bg-zinc-700/80" />;

const ActionBtn: React.FC<{ icon?: React.ReactNode; label: string; onClick: () => void }> = ({ icon, label, onClick }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-white/8"
  >
    {icon}
    {label}
  </button>
);

const NumStepper: React.FC<{ value: number; min: number; max: number; step: number; onChange: (v: number) => void }> = ({
  value, min, max, step, onChange,
}) => (
  <div className="flex items-center gap-1.5">
    <button onClick={() => onChange(Math.max(min, value - step))} className="w-5 h-5 rounded bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400">
      <Minus className="w-2.5 h-2.5" />
    </button>
    <span className="text-xs text-white w-8 text-center">{value}</span>
    <button onClick={() => onChange(Math.min(max, value + step))} className="w-5 h-5 rounded bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400">
      <Plus className="w-2.5 h-2.5" />
    </button>
  </div>
);

const Dropdown: React.FC<{ children: React.ReactNode; onClose: () => void }> = ({ children }) => (
  <div className="absolute bottom-full mb-1 left-0 bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl z-50 min-w-[80px]">
    {children}
  </div>
);

const DropdownItem: React.FC<{ label: string; active: boolean; onClick: () => void }> = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center justify-between ${
      active ? "bg-white/10 text-white" : "text-zinc-400 hover:bg-white/5 hover:text-white"
    }`}
  >
    {label}
    {active && <span className="text-white text-[10px]">✓</span>}
  </button>
);

interface ModelSectionProps {
  title: string;
  models: ModelEntry[];
  form: ReturnType<typeof useForm>;
  onSelect: (m: ModelEntry) => void;
}

const ModelSection: React.FC<ModelSectionProps> = ({ title, models, form, onSelect }) => (
  <div>
    <div className="px-4 py-2.5 border-b border-zinc-800/60">
      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{title}</span>
    </div>
    {models.map((model) => {
      const active = model.isActive(form);
      return (
        <button
          key={model.id}
          onClick={() => onSelect(model)}
          className={`w-full flex items-center gap-3 px-4 py-3 transition-all text-left hover:bg-white/5 ${
            active ? "bg-white/[0.06]" : ""
          }`}
        >
          <ModelIconPill icon={model.icon} size="md" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-semibold text-zinc-200 truncate">{model.name}</span>
              {model.badge && <Badge text={model.badge} />}
            </div>
            <p className="text-[11px] text-zinc-600 truncate mt-0.5">{model.tagline}</p>
          </div>
          {active && <span className="text-white text-xs flex-none">✓</span>}
        </button>
      );
    })}
  </div>
);

export default GeneratorPage;
