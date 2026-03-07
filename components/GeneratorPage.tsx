import React, { useState, useRef, useEffect, useMemo } from "react";
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
  ChevronRight,
  AtSign,
  Upload,
  Image,
  Zap,
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
  CREDIT_COSTS,
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
  onTryOn?: (item: GeneratedContent) => void;
  onRelight?: (item: GeneratedContent) => void;
  onInpaint: (item: GeneratedContent) => void;
  onAddToStoryboard: (item: GeneratedContent) => void;
  onSendToDirector?: (item: GeneratedContent) => void;
}

// ─── Model Catalog ─────────────────────────────────────────────────────────────

interface ModelEntry {
  id: string;
  name: string;
  tagline: string;
  icon: string;
  badge?: string;
  isVideo?: boolean;
  section: "featured" | "other" | "video";
  creditCost: number;
  select: (form: ReturnType<typeof useForm>) => void;
  isActive: (form: ReturnType<typeof useForm>) => boolean;
}

const ALL_MODELS: ModelEntry[] = [
  // ── Featured image models ──
  {
    id: "nb2", name: "NB2", tagline: "Pro quality at Flash speed", icon: "🍌",
    badge: "TOP", section: "featured", creditCost: 5,
    select: (f) => { f.setAiProvider(AIProvider.Gemini); f.setGeminiModel(GeminiImageModel.Flash2); f.setActiveMode("create"); },
    isActive: (f) => f.activeMode !== "video" && f.aiProvider === AIProvider.Gemini && f.geminiModel === GeminiImageModel.Flash2,
  },
  {
    id: "seedream45", name: "Seedream 4.5", tagline: "ByteDance next-gen 4K", icon: "📊",
    badge: "NEW", section: "featured", creditCost: 8,
    select: (f) => { f.setAiProvider(AIProvider.Fal); f.setFalModel(FalModel.Seedream45); f.setActiveMode("create"); },
    isActive: (f) => f.activeMode !== "video" && f.aiProvider === AIProvider.Fal && f.falModel === FalModel.Seedream45,
  },
  {
    id: "seedream50", name: "Seedream 5.0", tagline: "Visual reasoning", icon: "📊",
    badge: "NEW", section: "featured", creditCost: 8,
    select: (f) => { f.setAiProvider(AIProvider.Fal); f.setFalModel(FalModel.Seedream50); f.setActiveMode("create"); },
    isActive: (f) => f.activeMode !== "video" && f.aiProvider === AIProvider.Fal && f.falModel === FalModel.Seedream50,
  },
  {
    id: "gpt15", name: "GPT Image 1.5", tagline: "True-color precision", icon: "⚙️",
    badge: "PREMIUM", section: "featured", creditCost: 20,
    select: (f) => { f.setAiProvider(AIProvider.OpenAI); f.setOpenaiModel(OpenAIModel.GptImage15); f.setActiveMode("create"); },
    isActive: (f) => f.activeMode !== "video" && f.aiProvider === AIProvider.OpenAI && f.openaiModel === OpenAIModel.GptImage15,
  },
  {
    id: "nb2-pro", name: "Gemini Pro", tagline: "Google flagship", icon: "G",
    badge: "PREMIUM", section: "featured", creditCost: 10,
    select: (f) => { f.setAiProvider(AIProvider.Gemini); f.setGeminiModel(GeminiImageModel.Pro); f.setActiveMode("create"); },
    isActive: (f) => f.activeMode !== "video" && f.aiProvider === AIProvider.Gemini && f.geminiModel === GeminiImageModel.Pro,
  },
  {
    id: "grok-imagine", name: "Grok Imagine", tagline: "xAI SOTA · ~4s", icon: "𝕏",
    badge: "NEW", section: "featured", creditCost: 10,
    select: (f) => { f.setAiProvider(AIProvider.Replicate); f.setReplicateModel(ReplicateModel.GrokImagine); f.setActiveMode("create"); },
    isActive: (f) => f.activeMode !== "video" && f.aiProvider === AIProvider.Replicate && f.replicateModel === ReplicateModel.GrokImagine,
  },
  // ── Other image models ──
  {
    id: "kontext-multi", name: "FLUX Kontext", tagline: "Identity multi-ref", icon: "⚡",
    badge: "NEW", section: "other", creditCost: 10,
    select: (f) => { f.setAiProvider(AIProvider.Fal); f.setFalModel(FalModel.KontextMulti); f.setActiveMode("create"); },
    isActive: (f) => f.activeMode !== "video" && f.aiProvider === AIProvider.Fal && f.falModel === FalModel.KontextMulti,
  },
  {
    id: "kontext-max", name: "FLUX Kontext Max", tagline: "Max quality multi-ref", icon: "⚡",
    section: "other", creditCost: 15,
    select: (f) => { f.setAiProvider(AIProvider.Fal); f.setFalModel(FalModel.KontextMaxMulti); f.setActiveMode("create"); },
    isActive: (f) => f.activeMode !== "video" && f.aiProvider === AIProvider.Fal && f.falModel === FalModel.KontextMaxMulti,
  },
  {
    id: "gen4", name: "Gen-4 Image", tagline: "Runway consistency", icon: "🎬",
    section: "other", creditCost: 15,
    select: (f) => { f.setAiProvider(AIProvider.Replicate); f.setReplicateModel(ReplicateModel.Gen4Image); f.setActiveMode("create"); },
    isActive: (f) => f.activeMode !== "video" && f.aiProvider === AIProvider.Replicate && f.replicateModel === ReplicateModel.Gen4Image,
  },
  {
    id: "flux2max", name: "FLUX.2 Max", tagline: "Max fidelity · 8 refs", icon: "🔥",
    section: "other", creditCost: 12,
    select: (f) => { f.setAiProvider(AIProvider.Replicate); f.setReplicateModel(ReplicateModel.Flux2Max); f.setActiveMode("create"); },
    isActive: (f) => f.activeMode !== "video" && f.aiProvider === AIProvider.Replicate && f.replicateModel === ReplicateModel.Flux2Max,
  },
  {
    id: "imagen4ultra", name: "Imagen 4 Ultra", tagline: "Google photorealism", icon: "✨",
    badge: "NEW", section: "other", creditCost: 20,
    select: (f) => { f.setAiProvider(AIProvider.Gemini); f.setGeminiModel(GeminiImageModel.Imagen4Ultra); f.setActiveMode("create"); },
    isActive: (f) => f.activeMode !== "video" && f.aiProvider === AIProvider.Gemini && f.geminiModel === GeminiImageModel.Imagen4Ultra,
  },
  {
    id: "ideogram-v3", name: "Ideogram V3", tagline: "Typography + char ref", icon: "💡",
    section: "other", creditCost: 15,
    select: (f) => { f.setAiProvider(AIProvider.Ideogram); f.setIdeogramModel(IdeogramModel.V3); f.setActiveMode("create"); },
    isActive: (f) => f.activeMode !== "video" && f.aiProvider === AIProvider.Ideogram && f.ideogramModel === IdeogramModel.V3,
  },
  {
    id: "gemini-flash", name: "Gemini Flash", tagline: "Fast and efficient", icon: "⚡",
    section: "other", creditCost: 5,
    select: (f) => { f.setAiProvider(AIProvider.Gemini); f.setGeminiModel(GeminiImageModel.Flash); f.setActiveMode("create"); },
    isActive: (f) => f.activeMode !== "video" && f.aiProvider === AIProvider.Gemini && f.geminiModel === GeminiImageModel.Flash,
  },
  // ── ModelsLab NSFW ──
  {
    id: "lustify-sdxl", name: "Lustify SDXL", tagline: "Photoreal uncensored", icon: "🔞",
    badge: "NSFW", section: "other", creditCost: 8,
    select: (f) => { f.setAiProvider(AIProvider.ModelsLab); f.setModelsLabModel(ModelsLabModel.LustifySdxl); f.setActiveMode("create"); },
    isActive: (f) => f.activeMode !== "video" && f.aiProvider === AIProvider.ModelsLab && f.modelsLabModel === ModelsLabModel.LustifySdxl,
  },
  {
    id: "nsfw-sdxl", name: "NSFW SDXL", tagline: "General uncensored", icon: "🔞",
    badge: "NSFW", section: "other", creditCost: 8,
    select: (f) => { f.setAiProvider(AIProvider.ModelsLab); f.setModelsLabModel(ModelsLabModel.NsfwSdxl); f.setActiveMode("create"); },
    isActive: (f) => f.activeMode !== "video" && f.aiProvider === AIProvider.ModelsLab && f.modelsLabModel === ModelsLabModel.NsfwSdxl,
  },
  {
    id: "wai-nsfw", name: "WAI Illustrious", tagline: "Anime & illustration", icon: "🎌",
    badge: "NSFW", section: "other", creditCost: 8,
    select: (f) => { f.setAiProvider(AIProvider.ModelsLab); f.setModelsLabModel(ModelsLabModel.WaiNsfw); f.setActiveMode("create"); },
    isActive: (f) => f.activeMode !== "video" && f.aiProvider === AIProvider.ModelsLab && f.modelsLabModel === ModelsLabModel.WaiNsfw,
  },
  {
    id: "flux-nsfw", name: "FLUX NSFW", tagline: "FLUX uncensored", icon: "🔞",
    badge: "NSFW", section: "other", creditCost: 8,
    select: (f) => { f.setAiProvider(AIProvider.ModelsLab); f.setModelsLabModel(ModelsLabModel.FluxNsfw); f.setActiveMode("create"); },
    isActive: (f) => f.activeMode !== "video" && f.aiProvider === AIProvider.ModelsLab && f.modelsLabModel === ModelsLabModel.FluxNsfw,
  },
  {
    id: "z-image-turbo", name: "Z-Image Turbo", tagline: "Alibaba 6B uncensored", icon: "🈸",
    badge: "NSFW", section: "other", creditCost: 5,
    select: (f) => { f.setAiProvider(AIProvider.Fal); f.setFalModel(FalModel.ZImageTurbo); f.setActiveMode("create"); },
    isActive: (f) => f.activeMode !== "video" && f.aiProvider === AIProvider.Fal && f.falModel === FalModel.ZImageTurbo,
  },
  // ── Video models ──
  {
    id: "kling-pro", name: "Kling 1.5 Pro", tagline: "Ultra 1080p video", icon: "🎬",
    badge: "PRO", isVideo: true, section: "video", creditCost: 50,
    select: (f) => { f.setVideoEngine(VideoEngine.KlingPro); f.setActiveMode("video"); },
    isActive: (f) => f.activeMode === "video" && f.videoEngine === VideoEngine.KlingPro,
  },
  {
    id: "kling-standard", name: "Kling 1.5 Standard", tagline: "Fast · Motion Control", icon: "🎥",
    isVideo: true, section: "video", creditCost: 30,
    select: (f) => { f.setVideoEngine(VideoEngine.KlingStandard); f.setActiveMode("video"); },
    isActive: (f) => f.activeMode === "video" && f.videoEngine === VideoEngine.KlingStandard,
  },
  {
    id: "runway-gen3", name: "Runway Gen-3", tagline: "Frame consistency", icon: "🏃",
    isVideo: true, section: "video", creditCost: 50,
    select: (f) => { f.setVideoEngine(VideoEngine.RunwayGen3); f.setActiveMode("video"); },
    isActive: (f) => f.activeMode === "video" && f.videoEngine === VideoEngine.RunwayGen3,
  },
  {
    id: "luma", name: "Luma Dream Machine", tagline: "Fluid camera moves", icon: "✨",
    isVideo: true, section: "video", creditCost: 40,
    select: (f) => { f.setVideoEngine(VideoEngine.LumaDreamMachine); f.setActiveMode("video"); },
    isActive: (f) => f.activeMode === "video" && f.videoEngine === VideoEngine.LumaDreamMachine,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Badge ───────────────────────────────────────────────────────────────────

const Badge: React.FC<{ text: string }> = ({ text }) => {
  const isNew = text === "NEW";
  const isPremium = text === "PREMIUM" || text === "PRO";
  return (
    <span
      className="text-[7px] font-black px-1 py-px rounded leading-none tracking-wider font-jet text-white"
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

  const [showEnginePicker, setShowEnginePicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [lightboxItem, setLightboxItem] = useState<GeneratedContent | null>(null);
  const [galleryTab, setGalleryTab] = useState<'session' | 'history'>('session');

  const enginePickerRef = useRef<HTMLDivElement>(null);
  const refInputRef = useRef<HTMLInputElement>(null);

  // Session tracking — items generated in this session
  const sessionStartRef = useRef(Date.now());

  // Close engine picker on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (enginePickerRef.current && !enginePickerRef.current.contains(e.target as Node))
        setShowEnginePicker(false);
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

  // Gallery items — session vs history
  const allItems = gallery.generatedHistory;
  const sessionItems = useMemo(() =>
    allItems.filter(item => item.timestamp >= sessionStartRef.current),
    [allItems]
  );
  const displayItems = galleryTab === 'session' ? sessionItems : allItems;

  const currentAr = AR_OPTIONS.find((o) => o.value === form.aspectRatio);
  const currentArLabel = currentAr ? currentAr.label : "3:4";
  const currentSizeLabel = SIZE_OPTIONS.find((o) => o.value === form.imageSize)?.label ?? "1K";

  const handleRefFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0 && char0) {
      form.updateCharacter(char0.id, "modelImages", files);
    }
  };

  // Engine name for the engine chip
  const engineLabel = activeModel?.name ?? "Select engine";
  const engineIcon = activeModel?.icon ?? "✦";

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: '#0D0A0A' }}>
      <input
        ref={refInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleRefFileChange}
      />

      {/* ─── Gallery Area ─── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar relative">

        {/* Generating overlay */}
        {isGenerating && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center" style={{ background: 'rgba(13,10,10,0.75)', backdropFilter: 'blur(4px)' }}>
            <div className="flex flex-col items-center gap-4">
              <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'rgba(255,92,53,0.3)', borderTopColor: '#FF5C35' }} />
              <p className="text-sm font-medium" style={{ color: '#B8A9A5' }}>Generating...</p>
              {progress > 0 && (
                <div className="w-48 h-1 rounded-full overflow-hidden" style={{ background: '#1A1210' }}>
                  <div className="h-full rounded-full transition-all duration-300" style={{ width: `${progress}%`, background: 'linear-gradient(90deg,#FF5C35,#FFB347)' }} />
                </div>
              )}
              <button onClick={onStopGeneration} className="text-xs flex items-center gap-1.5 mt-1 transition-colors" style={{ color: '#6B5A56' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#fff'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#6B5A56'}
              >
                <X className="w-3 h-3" /> Cancel
              </button>
            </div>
          </div>
        )}

        {displayItems.length > 0 ? (
          <>
            {/* Tab switcher */}
            <div className="sticky top-0 z-10 flex items-center gap-1 px-4 pt-3 pb-2" style={{ background: '#0D0A0A' }}>
              {(['session', 'history'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setGalleryTab(tab)}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-semibold font-jet transition-all"
                  style={galleryTab === tab
                    ? { background: 'rgba(255,92,53,0.1)', color: '#FF5C35', border: '1px solid rgba(255,92,53,0.2)' }
                    : { color: '#4A3A36', border: '1px solid transparent' }
                  }
                >
                  {tab === 'session' ? `Session (${sessionItems.length})` : `History (${allItems.length})`}
                </button>
              ))}
            </div>

            {/* Masonry grid */}
            <div className="px-3 pb-4">
              <div className="columns-2 sm:columns-3 lg:columns-3 xl:columns-4 gap-2">
                {displayItems.map((item) => (
                  <div
                    key={item.id}
                    className="break-inside-avoid mb-2 relative group cursor-pointer rounded-lg overflow-hidden"
                    onMouseEnter={() => setHoveredItem(item.id)}
                    onMouseLeave={() => setHoveredItem(null)}
                    onClick={() => setLightboxItem(item)}
                  >
                    {item.type === "video" ? (
                      <video src={item.url} className="w-full rounded-lg" muted loop
                        onMouseEnter={e => (e.target as HTMLVideoElement).play()}
                        onMouseLeave={e => { (e.target as HTMLVideoElement).pause(); (e.target as HTMLVideoElement).currentTime = 0; }}
                      />
                    ) : (
                      <img src={item.url} alt="" className="w-full rounded-lg" loading="lazy" />
                    )}

                    {/* Engine badge on image */}
                    {item.aiProvider && (
                      <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[8px] font-jet font-bold"
                        style={{ background: 'rgba(0,0,0,0.7)', color: '#6B5A56' }}
                      >
                        {item.aiProvider === AIProvider.Gemini ? 'Gemini' :
                         item.aiProvider === AIProvider.Fal ? 'FAL' :
                         item.aiProvider === AIProvider.Replicate ? 'Replicate' :
                         item.aiProvider === AIProvider.OpenAI ? 'OpenAI' :
                         item.aiProvider === AIProvider.Ideogram ? 'Ideogram' :
                         item.aiProvider === AIProvider.ModelsLab ? 'ModelsLab' : ''}
                      </div>
                    )}

                    {/* Hover actions */}
                    {hoveredItem === item.id && (
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent rounded-lg">
                        <div className="absolute top-1.5 right-1.5 flex flex-col gap-1">
                          <MiniAction icon={<Download className="w-3 h-3" />} onClick={(e) => { e.stopPropagation(); onDownload(item); }} title="Download" />
                          <MiniAction icon={<RefreshCw className="w-3 h-3" />} onClick={(e) => { e.stopPropagation(); onReuse(item); }} title="Reuse" />
                          {item.type !== "video" && (
                            <MiniAction icon={<Maximize2 className="w-3 h-3" />} onClick={(e) => { e.stopPropagation(); onUpscale(item); }} title="Upscale" />
                          )}
                          {onSendToDirector && item.type !== "video" && (
                            <MiniAction icon={<Sparkles className="w-3 h-3" />} onClick={(e) => { e.stopPropagation(); onSendToDirector(item); }} title="Director" />
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          /* ── Empty state ── */
          <div className="flex flex-col items-center justify-center h-full text-center px-6 select-none">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
              style={{ background: 'rgba(255,92,53,0.06)', border: '1px solid rgba(255,92,53,0.1)' }}
            >
              <Image className="w-6 h-6" style={{ color: '#FF5C35', opacity: 0.5 }} />
            </div>
            <h2 className="text-lg font-bold mb-1.5" style={{ color: '#E8DDD9' }}>Start creating</h2>
            <p className="text-sm max-w-xs mb-6" style={{ color: '#4A3A36' }}>
              Type a prompt and hit Generate. Your images will appear here.
            </p>
            <div className="flex flex-wrap gap-2 justify-center max-w-md">
              {[
                'Young woman, editorial fashion, studio lighting',
                'Male model, streetwear, urban background',
                'Beauty close-up, golden hour, soft bokeh',
              ].map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => { if (char0) form.updateCharacter(char0.id, 'outfitDescription', prompt); }}
                  className="px-3 py-1.5 rounded-full text-[11px] transition-all hover:scale-[1.02]"
                  style={{ background: 'rgba(255,92,53,0.06)', border: '1px solid rgba(255,92,53,0.12)', color: '#FF5C35' }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ─── Bottom Bar ─── */}
      <div className="flex-none border-t" style={{ background: '#0D0A0A', borderColor: '#1A1210' }}>
        {/* Row 1: Prompt + Generate */}
        <div className="flex items-center gap-2 px-3 pt-3 pb-2">
          {/* Reference image button */}
          <button
            onClick={() => refInputRef.current?.click()}
            className="flex items-center justify-center w-9 h-9 rounded-xl flex-none transition-all"
            style={char0 && char0.modelImages.length > 0
              ? { background: 'rgba(255,92,53,0.1)', border: '1px solid rgba(255,92,53,0.2)', color: '#FF5C35' }
              : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: '#4A3A36' }
            }
            title="Add reference image"
          >
            <AtSign className="w-3.5 h-3.5" />
          </button>

          {/* Prompt input */}
          <div className="flex-1 flex items-center rounded-xl px-3 py-2.5"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            {isVideo ? (
              <input
                value={form.videoPrompt}
                onChange={(e) => form.setVideoPrompt(e.target.value)}
                placeholder="Describe the motion and scene..."
                className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-zinc-700 font-light"
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !isGenerating) { e.preventDefault(); onGenerate(); } }}
              />
            ) : (
              <input
                value={form.characters[0]?.outfitDescription ?? ""}
                onChange={(e) => char0 && form.updateCharacter(char0.id, "outfitDescription", e.target.value)}
                placeholder="Describe your image..."
                className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-zinc-700 font-light"
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !isGenerating) { e.preventDefault(); onGenerate(); } }}
              />
            )}

            {/* Ref image count badge inside input */}
            {char0 && char0.modelImages.length > 0 && (
              <span className="text-[9px] font-jet ml-2 px-1.5 py-0.5 rounded flex-none"
                style={{ background: 'rgba(255,92,53,0.1)', color: '#FF5C35' }}
              >
                @{char0.modelImages.length}
              </span>
            )}
          </div>

          {/* Generate button */}
          <button
            onClick={isGenerating ? onStopGeneration : onGenerate}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 flex-none text-white"
            style={isGenerating
              ? { background: 'linear-gradient(135deg,#FF5C35,#FFB347)' }
              : { background: 'linear-gradient(135deg,#FF5C35,#FFB347)', boxShadow: '0 2px 12px rgba(255,92,53,0.25)' }
            }
          >
            {isGenerating ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                Stop
              </>
            ) : (
              <>
                Generate
                <span className="text-[10px] font-jet opacity-70 ml-0.5">
                  {genCreditCost}
                </span>
              </>
            )}
          </button>
        </div>

        {/* Row 2: Engine + Settings */}
        <div className="flex items-center gap-2 px-3 pb-3 overflow-x-auto">
          {/* Engine chip */}
          <div className="relative" ref={enginePickerRef}>
            <button
              onClick={() => setShowEnginePicker(!showEnginePicker)}
              className="flex items-center gap-1.5 pl-2 pr-2.5 py-1.5 rounded-lg transition-all text-[11px] font-semibold flex-none"
              style={showEnginePicker
                ? { background: 'rgba(255,92,53,0.1)', border: '1px solid rgba(255,92,53,0.2)', color: '#FF5C35' }
                : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: '#B8A9A5' }
              }
            >
              <span className="text-sm leading-none">{engineIcon}</span>
              <span className="max-w-[100px] truncate">{engineLabel}</span>
              <ChevronRight className={`w-3 h-3 transition-transform ${showEnginePicker ? 'rotate-90' : ''}`} style={{ color: '#4A3A36' }} />
            </button>

            {/* Engine picker popover */}
            {showEnginePicker && (
              <div className="absolute bottom-full mb-2 left-0 w-[340px] rounded-2xl shadow-2xl overflow-hidden z-50"
                style={{ background: '#0D0A0A', border: '1px solid #1A1210' }}
              >
                <div className="p-3 border-b" style={{ borderColor: '#1A1210' }}>
                  <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <Search className="w-3.5 h-3.5 flex-none" style={{ color: '#4A3A36' }} />
                    <input
                      autoFocus
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search engines..."
                      className="flex-1 bg-transparent text-xs text-white outline-none placeholder:text-zinc-700"
                    />
                    {searchQuery && (
                      <button onClick={() => setSearchQuery("")}><X className="w-3 h-3" style={{ color: '#4A3A36' }} /></button>
                    )}
                  </div>
                </div>
                <div className="max-h-[360px] overflow-y-auto custom-scrollbar">
                  {featuredModels.length > 0 && (
                    <EngineSection title="Featured" models={featuredModels} form={form}
                      onSelect={(m) => { m.select(form); setShowEnginePicker(false); setSearchQuery(""); }} />
                  )}
                  {otherModels.length > 0 && (
                    <EngineSection title="Other models" models={otherModels} form={form}
                      onSelect={(m) => { m.select(form); setShowEnginePicker(false); setSearchQuery(""); }} />
                  )}
                  {videoModels.length > 0 && (
                    <EngineSection title="Video" models={videoModels} form={form}
                      onSelect={(m) => { m.select(form); setShowEnginePicker(false); setSearchQuery(""); }} />
                  )}
                  {featuredModels.length === 0 && otherModels.length === 0 && videoModels.length === 0 && (
                    <p className="text-center text-xs py-8" style={{ color: '#4A3A36' }}>No results</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Aspect ratio chip */}
          {!isVideo && (
            <ChipButton
              label={currentArLabel}
              onClick={() => {
                const idx = AR_OPTIONS.findIndex(o => o.value === form.aspectRatio);
                const next = AR_OPTIONS[(idx + 1) % AR_OPTIONS.length];
                form.setAspectRatio(next.value);
              }}
              prefix="□"
            />
          )}

          {/* Resolution chip */}
          {!isVideo && (
            <ChipButton
              label={currentSizeLabel}
              onClick={() => {
                const idx = SIZE_OPTIONS.findIndex(o => o.value === form.imageSize);
                const next = SIZE_OPTIONS[(idx + 1) % SIZE_OPTIONS.length];
                form.setImageSize(next.value);
              }}
            />
          )}

          {/* Variations stepper */}
          {!isVideo && (
            <div className="flex items-center gap-px rounded-lg flex-none"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <button onClick={() => form.setNumberOfImages(Math.max(1, form.numberOfImages - 1))}
                className="px-1.5 py-1.5 transition-colors" style={{ color: '#4A3A36' }}>
                <Minus className="w-3 h-3" />
              </button>
              <span className="text-[11px] font-semibold w-4 text-center" style={{ color: '#B8A9A5' }}>{form.numberOfImages}</span>
              <button onClick={() => form.setNumberOfImages(Math.min(4, form.numberOfImages + 1))}
                className="px-1.5 py-1.5 transition-colors" style={{ color: '#4A3A36' }}>
                <Plus className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Advanced toggle */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center justify-center w-7 h-7 rounded-lg transition-all flex-none"
            style={showAdvanced
              ? { background: 'rgba(255,92,53,0.1)', border: '1px solid rgba(255,92,53,0.2)', color: '#FF5C35' }
              : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: '#4A3A36' }
            }
          >
            <Settings className="w-3 h-3" />
          </button>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Credits */}
          {!isGenerating && (
            <div className="flex items-center gap-1.5 text-[10px] font-jet flex-none" style={{ color: '#4A3A36' }}>
              <Zap className="w-3 h-3" style={{ color: '#FFB347' }} />
              <span style={{ color: sub.credits < 20 ? '#EF4444' : sub.credits < 100 ? '#F59E0B' : '#6B5A56' }}>
                {sub.isUnlimited ? '∞' : sub.credits.toLocaleString()}
              </span>
            </div>
          )}
        </div>

        {/* Advanced drawer */}
        {showAdvanced && (
          <div className="px-3 pb-3 border-t pt-3" style={{ borderColor: '#1A1210' }}>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div>
                <label className="text-[9px] uppercase tracking-wider block mb-1" style={{ color: '#4A3A36' }}>CFG</label>
                <AdvStepper value={form.cfg} min={1} max={20} step={0.5} onChange={form.setCfg} />
              </div>
              <div>
                <label className="text-[9px] uppercase tracking-wider block mb-1" style={{ color: '#4A3A36' }}>Steps</label>
                <AdvStepper value={form.steps} min={10} max={100} step={5} onChange={form.setSteps} />
              </div>
              <div>
                <label className="text-[9px] uppercase tracking-wider block mb-1" style={{ color: '#4A3A36' }}>Seed</label>
                <input
                  type="number"
                  value={form.seed ?? ""}
                  onChange={(e) => form.setSeed(e.target.value === "" ? undefined : parseInt(e.target.value))}
                  placeholder="Random"
                  className="w-full bg-transparent rounded-lg px-2 py-1.5 text-xs text-white outline-none placeholder:text-zinc-700 font-jet"
                  style={{ border: '1px solid rgba(255,255,255,0.06)' }}
                />
              </div>
              <div className="col-span-2">
                <label className="text-[9px] uppercase tracking-wider block mb-1" style={{ color: '#4A3A36' }}>Negative</label>
                <input
                  value={form.negativePrompt}
                  onChange={(e) => form.setNegativePrompt(e.target.value)}
                  placeholder="Things to avoid..."
                  className="w-full bg-transparent rounded-lg px-2 py-1.5 text-xs text-white outline-none placeholder:text-zinc-700 font-jet"
                  style={{ border: '1px solid rgba(255,255,255,0.06)' }}
                />
              </div>
              <div>
                <label className="flex items-center gap-2 cursor-pointer mt-3">
                  <input type="checkbox" checked={form.antiFisheye} onChange={(e) => form.setAntiFisheye(e.target.checked)} className="w-3 h-3 accent-orange-500" />
                  <span className="text-[10px]" style={{ color: '#6B5A56' }}>Anti-fisheye</span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── Lightbox ─── */}
      {lightboxItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(13,10,10,0.92)' }}
          onClick={() => setLightboxItem(null)}
        >
          <div className="relative max-w-5xl max-h-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setLightboxItem(null)}
              className="absolute -top-2 -right-2 z-10 w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: '#161110', border: '1px solid #2A1F1C' }}
            >
              <X className="w-4 h-4 text-white" />
            </button>

            {lightboxItem.type === "video" ? (
              <video src={lightboxItem.url} controls autoPlay loop className="max-w-full max-h-[85vh] rounded-xl" />
            ) : (
              <img src={lightboxItem.url} alt="" className="max-w-full max-h-[85vh] object-contain rounded-xl" />
            )}

            {/* Action bar */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 px-3 py-2 rounded-2xl"
              style={{ background: 'rgba(13,10,10,0.9)', border: '1px solid #1A1210' }}
            >
              <LbAction icon={<Download className="w-3.5 h-3.5" />} label="Download" onClick={() => onDownload(lightboxItem)} />
              <LbSep />
              <LbAction icon={<RefreshCw className="w-3.5 h-3.5" />} label="Reuse" onClick={() => { onReuse(lightboxItem); setLightboxItem(null); }} />
              {lightboxItem.type !== "video" && (
                <>
                  <LbSep />
                  <LbAction icon={<Maximize2 className="w-3.5 h-3.5" />} label="4x Up" onClick={() => onUpscale(lightboxItem)} />
                  <LbSep />
                  <LbAction label="Face Swap" onClick={() => onFaceSwap(lightboxItem)} />
                  <LbSep />
                  <LbAction label="Edit" onClick={() => onInpaint(lightboxItem)} />
                </>
              )}
              {onSendToDirector && lightboxItem.type !== "video" && (
                <>
                  <LbSep />
                  <LbAction icon={<Sparkles className="w-3.5 h-3.5" />} label="Continue in Director" onClick={() => { onSendToDirector(lightboxItem); setLightboxItem(null); }} />
                </>
              )}
              <LbSep />
              <LbAction label="+ Board" onClick={() => onAddToStoryboard(lightboxItem)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Sub-components ────────────────────────────────────────────────────────────

const ChipButton: React.FC<{ label: string; onClick: () => void; prefix?: string }> = ({ label, onClick, prefix }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all flex-none"
    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: '#B8A9A5' }}
  >
    {prefix && <span style={{ color: '#4A3A36' }}>{prefix}</span>}
    {label}
  </button>
);

const MiniAction: React.FC<{ icon: React.ReactNode; onClick: (e: React.MouseEvent) => void; title?: string }> = ({ icon, onClick, title }) => (
  <button
    onClick={onClick}
    title={title}
    className="w-6 h-6 rounded-md flex items-center justify-center transition-all"
    style={{ background: 'rgba(0,0,0,0.6)', color: '#E8DDD9' }}
    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,92,53,0.8)'; }}
    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.6)'; }}
  >
    {icon}
  </button>
);

const LbSep = () => <div className="w-px h-4" style={{ background: '#2A1F1C' }} />;

const LbAction: React.FC<{ icon?: React.ReactNode; label: string; onClick: () => void }> = ({ icon, label, onClick }) => (
  <button onClick={onClick} className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg transition-colors"
    style={{ color: '#B8A9A5' }}
    onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#fff'}
    onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#B8A9A5'}
  >
    {icon}{label}
  </button>
);

const AdvStepper: React.FC<{ value: number; min: number; max: number; step: number; onChange: (v: number) => void }> = ({
  value, min, max, step, onChange,
}) => (
  <div className="flex items-center gap-1.5">
    <button onClick={() => onChange(Math.max(min, value - step))}
      className="w-6 h-6 rounded flex items-center justify-center"
      style={{ background: 'rgba(255,255,255,0.04)', color: '#6B5A56' }}>
      <Minus className="w-2.5 h-2.5" />
    </button>
    <span className="text-xs text-white w-8 text-center font-jet">{value}</span>
    <button onClick={() => onChange(Math.min(max, value + step))}
      className="w-6 h-6 rounded flex items-center justify-center"
      style={{ background: 'rgba(255,255,255,0.04)', color: '#6B5A56' }}>
      <Plus className="w-2.5 h-2.5" />
    </button>
  </div>
);

interface EngineSectionProps {
  title: string;
  models: ModelEntry[];
  form: ReturnType<typeof useForm>;
  onSelect: (m: ModelEntry) => void;
}

const EngineSection: React.FC<EngineSectionProps> = ({ title, models, form, onSelect }) => (
  <div>
    <div className="px-4 py-2 border-b" style={{ borderColor: '#1A1210' }}>
      <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: '#4A3A36' }}>{title}</span>
    </div>
    {models.map((model) => {
      const active = model.isActive(form);
      return (
        <button
          key={model.id}
          onClick={() => onSelect(model)}
          className="w-full flex items-center gap-3 px-4 py-2.5 transition-all text-left"
          style={active ? { background: 'rgba(255,92,53,0.06)' } : {}}
          onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; }}
          onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = ''; }}
        >
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-none text-sm"
            style={{ background: active ? 'rgba(255,92,53,0.12)' : 'rgba(255,255,255,0.04)' }}
          >
            {model.icon.length === 1 && /[A-Za-z𝕏]/.test(model.icon)
              ? <span className="font-bold text-xs" style={{ color: active ? '#FF5C35' : '#6B5A56' }}>{model.icon}</span>
              : <span className="leading-none text-sm">{model.icon}</span>
            }
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[12px] font-semibold truncate" style={{ color: active ? '#FF5C35' : '#E8DDD9' }}>{model.name}</span>
              {model.badge && <Badge text={model.badge} />}
            </div>
            <p className="text-[10px] truncate mt-0.5" style={{ color: '#4A3A36' }}>{model.tagline}</p>
          </div>
          <span className="text-[9px] font-jet flex-none" style={{ color: '#FFB347' }}>{model.creditCost}</span>
          {active && <span className="text-xs flex-none ml-1" style={{ color: '#FF5C35' }}>✓</span>}
        </button>
      );
    })}
  </div>
);

export default GeneratorPage;
