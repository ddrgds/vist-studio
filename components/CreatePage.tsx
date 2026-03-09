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
  ImagePlus,
  Camera,
  Shirt,
  Film,
} from "lucide-react";
import AutocompleteInput from "./AutocompleteInput";
import CharacteristicsInput from "./CharacteristicsInput";
import { useForm } from "../contexts/FormContext";
import { useGallery } from "../contexts/GalleryContext";
import {
  AIProvider,
  FalModel,
  GeminiImageModel,
  ReplicateModel,
  OpenAIModel,
  VideoEngine,
  ImageSize,
  AspectRatio,
  GeneratedContent,
  CREDIT_COSTS,
} from "../types";
import { useSubscription } from "../hooks/useSubscription";

// ─── Props ────────────────────────────────────────────────────────────────────

interface CreatePageProps {
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
  onEdit?: (item: GeneratedContent) => void;
  onChangePose?: (item: GeneratedContent) => void;
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
  {
    id: "auto", name: "Auto", tagline: "Best engine for your prompt", icon: "✨",
    badge: "SMART", section: "featured", creditCost: 2,
    select: (f) => { f.setAiProvider(AIProvider.Auto); f.setActiveMode("create"); },
    isActive: (f) => f.activeMode !== "video" && f.aiProvider === AIProvider.Auto,
  },
  {
    id: "nb2", name: "Nano Banana 2", tagline: "Pro quality at Flash speed", icon: "🍌",
    badge: "TOP", section: "featured", creditCost: 2,
    select: (f) => { f.setAiProvider(AIProvider.Gemini); f.setGeminiModel(GeminiImageModel.Flash2); f.setActiveMode("create"); },
    isActive: (f) => f.activeMode !== "video" && f.aiProvider === AIProvider.Gemini && f.geminiModel === GeminiImageModel.Flash2,
  },
  {
    id: "seedream50", name: "Seedream 5.0", tagline: "Intelligent visual reasoning", icon: "🧠",
    badge: "NEW", section: "featured", creditCost: 8,
    select: (f) => { f.setAiProvider(AIProvider.Fal); f.setFalModel(FalModel.Seedream50); f.setActiveMode("create"); },
    isActive: (f) => f.activeMode !== "video" && f.aiProvider === AIProvider.Fal && f.falModel === FalModel.Seedream50,
  },
  {
    id: "gpt15", name: "GPT Image 1.5", tagline: "True-color precision rendering", icon: "⚙️",
    badge: "PREMIUM", section: "featured", creditCost: 20,
    select: (f) => { f.setAiProvider(AIProvider.OpenAI); f.setOpenaiModel(OpenAIModel.GptImage15); f.setActiveMode("create"); },
    isActive: (f) => f.activeMode !== "video" && f.aiProvider === AIProvider.OpenAI && f.openaiModel === OpenAIModel.GptImage15,
  },
  {
    id: "grok-imagine", name: "Grok Imagine", tagline: "xAI creative interpretation, ~4s", icon: "𝕏",
    badge: "NEW", section: "featured", creditCost: 10,
    select: (f) => { f.setAiProvider(AIProvider.Replicate); f.setReplicateModel(ReplicateModel.GrokImagine); f.setActiveMode("create"); },
    isActive: (f) => f.activeMode !== "video" && f.aiProvider === AIProvider.Replicate && f.replicateModel === ReplicateModel.GrokImagine,
  },
  {
    id: "kontext-multi", name: "FLUX Kontext", tagline: "Face-consistent identity", icon: "⚡",
    badge: "FACE", section: "featured", creditCost: 10,
    select: (f) => { f.setAiProvider(AIProvider.Fal); f.setFalModel(FalModel.KontextMulti); f.setActiveMode("create"); },
    isActive: (f) => f.activeMode !== "video" && f.aiProvider === AIProvider.Fal && f.falModel === FalModel.KontextMulti,
  },
  {
    id: "nb-pro", name: "Nano Banana Pro", tagline: "Google's flagship generation", icon: "🍌",
    badge: "PRO", section: "other", creditCost: 10,
    select: (f) => { f.setAiProvider(AIProvider.Gemini); f.setGeminiModel(GeminiImageModel.Pro); f.setActiveMode("create"); },
    isActive: (f) => f.activeMode !== "video" && f.aiProvider === AIProvider.Gemini && f.geminiModel === GeminiImageModel.Pro,
  },
  {
    id: "imagen4", name: "Imagen 4", tagline: "Google's photorealistic diffusion", icon: "✨",
    section: "other", creditCost: 10,
    select: (f) => { f.setAiProvider(AIProvider.Gemini); f.setGeminiModel(GeminiImageModel.Imagen4); f.setActiveMode("create"); },
    isActive: (f) => f.activeMode !== "video" && f.aiProvider === AIProvider.Gemini && f.geminiModel === GeminiImageModel.Imagen4,
  },
  {
    id: "seedream45", name: "Seedream 4.5", tagline: "ByteDance next-gen 4K", icon: "📊",
    section: "other", creditCost: 8,
    select: (f) => { f.setAiProvider(AIProvider.Fal); f.setFalModel(FalModel.Seedream45); f.setActiveMode("create"); },
    isActive: (f) => f.activeMode !== "video" && f.aiProvider === AIProvider.Fal && f.falModel === FalModel.Seedream45,
  },
  {
    id: "flux2pro", name: "FLUX.2 Pro", tagline: "Speed-optimized detail", icon: "🔥",
    section: "other", creditCost: 10,
    select: (f) => { f.setAiProvider(AIProvider.Fal); f.setFalModel(FalModel.Flux2Pro); f.setActiveMode("create"); },
    isActive: (f) => f.activeMode !== "video" && f.aiProvider === AIProvider.Fal && f.falModel === FalModel.Flux2Pro,
  },
  {
    id: "z-image", name: "Z-Image", tagline: "Instant lifelike portraits", icon: "⚡",
    badge: "NSFW", section: "other", creditCost: 8,
    select: (f) => { f.setAiProvider(AIProvider.Fal); f.setFalModel(FalModel.ZImageTurbo); f.setActiveMode("create"); },
    isActive: (f) => f.activeMode !== "video" && f.aiProvider === AIProvider.Fal && f.falModel === FalModel.ZImageTurbo,
  },
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

const getActiveModel = (form: ReturnType<typeof useForm>): ModelEntry | undefined =>
  ALL_MODELS.find((m) => m.isActive(form));

// ─── Static Data (from DirectorStudio) ──────────────────────────────────────

const LIGHTING_OPTIONS = [
  { id: "natural",  label: "Natural",  icon: "☀️", value: "soft natural light, golden hour, sun-kissed" },
  { id: "studio",   label: "Studio",   icon: "💡", value: "professional studio lighting, softbox, rim light" },
  { id: "golden",   label: "Golden",   icon: "🌅", value: "golden hour light, warm tones, soft shadows" },
  { id: "neon",     label: "Neon",     icon: "🌆", value: "neon lighting, cyberpunk glow, vivid colors" },
  { id: "dramatic", label: "Dramatic", icon: "🎭", value: "dramatic cinematic lighting, deep shadows" },
  { id: "dark",     label: "Dark",     icon: "🌙", value: "low key lighting, dark atmosphere, moody" },
];

const CAMERA_OPTIONS = [
  { id: "portrait",  label: "Portrait",  icon: "📷", value: "shot on 85mm lens, shallow depth of field, beautiful bokeh" },
  { id: "wide",      label: "Wide",      icon: "🔭", value: "24mm wide angle lens, dynamic perspective, immersive view" },
  { id: "macro",     label: "Macro",     icon: "🔬", value: "macro photography, extreme close up, sharp microdetails" },
  { id: "cinematic", label: "Cinema",    icon: "🎬", value: "anamorphic lens, cinematic aspect ratio, film look" },
  { id: "polaroid",  label: "Polaroid",  icon: "📸", value: "polaroid style, instant photo aesthetic, vintage colors" },
  { id: "vintage",   label: "Vintage",   icon: "🎞️", value: "vintage film camera look, 35mm film, subtle grain" },
];

const POSE_OPTIONS = [
  { id: "standing",  label: "Standing",  icon: "🧍", value: "standing upright, confident posture, facing camera" },
  { id: "sitting",   label: "Sitting",   icon: "🪑", value: "seated, relaxed pose, comfortable position" },
  { id: "walking",   label: "Walking",   icon: "🚶", value: "walking towards camera, natural movement, dynamic" },
  { id: "crouching", label: "Crouching", icon: "🧎", value: "crouching down, low angle, dynamic crouch pose" },
  { id: "back",      label: "Back",      icon: "↩️", value: "looking back over shoulder, three-quarter back view" },
  { id: "leaning",   label: "Leaning",   icon: "📐", value: "leaning against wall, casual relaxed pose" },
];

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

// ─── FaceSlot sub-component (from DirectorStudio) ───────────────────────────

interface FaceSlotProps {
  file: File | null;
  onFile: (f: File | null) => void;
  label: string;
  size?: "sm" | "md";
}

const FaceSlot: React.FC<FaceSlotProps> = ({ file, onFile, label, size = "md" }) => {
  const ref = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  React.useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreview(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreview(null);
    }
  }, [file]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = Array.from<File>(e.dataTransfer.files).find((x) => x.type.startsWith("image/"));
    if (f) onFile(f);
  };

  const dim = size === "sm" ? "w-[56px] h-[56px]" : "w-[72px] h-[72px]";

  return (
    <button
      className={`relative ${dim} rounded-xl overflow-hidden border-2 border-zinc-800 hover:border-zinc-600 transition-colors bg-zinc-900 flex items-center justify-center group`}
      onClick={() => ref.current?.click()}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      title={label}
    >
      {preview ? (
        <>
          <img src={preview} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center">
            <X
              className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => { e.stopPropagation(); onFile(null); }}
            />
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center gap-1 text-zinc-600 group-hover:text-zinc-400 transition-colors">
          <Plus className="w-4 h-4" />
          <span className="text-[10px] font-medium leading-tight text-center px-1">{label}</span>
        </div>
      )}
      <input ref={ref} type="file" accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
    </button>
  );
};

// ─── Badge ───────────────────────────────────────────────────────────────────

const Badge: React.FC<{ text: string }> = ({ text }) => {
  const isNew = text === "NEW";
  const isPremium = text === "PREMIUM" || text === "PRO";
  return (
    <span
      className="text-[7px] font-black px-1 py-px rounded leading-none tracking-wider font-jet text-white"
      style={
        isNew      ? { background: 'linear-gradient(135deg,#34d399,#2dd4bf)', color: '#022c22' } :
        isPremium  ? { background: 'rgba(255,92,53,0.2)', color: '#FF5C35', border: '1px solid rgba(255,92,53,0.3)' } :
                    { background: 'rgba(255,255,255,0.1)', color: '#B8A9A5' }
      }
    >
      {text}
    </span>
  );
};

// ─── Sub-components ────────────────────────────────────────────────────────────

const PromptChip: React.FC<{ text: string; onClick: () => void }> = ({ text, onClick }) => (
  <button
    onClick={onClick}
    className="px-4 py-2 rounded-full text-[11px] font-medium transition-all hover:scale-[1.02] active:scale-[0.97]"
    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#D4C8C4' }}
    onMouseEnter={(e) => {
      (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,92,53,0.4)';
      (e.currentTarget as HTMLElement).style.color = '#FFFFFF';
      (e.currentTarget as HTMLElement).style.background = 'rgba(255,92,53,0.08)';
    }}
    onMouseLeave={(e) => {
      (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)';
      (e.currentTarget as HTMLElement).style.color = '#D4C8C4';
      (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)';
    }}
  >
    {text}
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
    <div className="px-4 py-2 border-b" style={{ borderColor: '#2A1F1C' }}>
      <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: '#8C7570' }}>{title}</span>
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
            <p className="text-[10px] truncate mt-0.5" style={{ color: '#8C7570' }}>{model.tagline}</p>
          </div>
          <span className="text-[9px] font-jet flex-none" style={{ color: '#FFB347' }}>{model.creditCost}</span>
          {active && <span className="text-xs flex-none ml-1" style={{ color: '#FF5C35' }}>✓</span>}
        </button>
      );
    })}
  </div>
);

// ─── Toggle Pill ────────────────────────────────────────────────────────────

interface TogglePillProps {
  icon: React.ReactNode;
  label: string;
  activeLabel?: string;
  isOpen: boolean;
  hasContent: boolean;
  onClick: () => void;
}

const TogglePill: React.FC<TogglePillProps> = ({ icon, label, activeLabel, isOpen, hasContent, onClick }) => {
  const displayLabel = hasContent && activeLabel ? activeLabel : label;
  const active = hasContent || isOpen;
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all flex-none"
      style={active
        ? { background: 'rgba(255,92,53,0.12)', border: '1px solid rgba(255,92,53,0.3)', color: '#FF5C35' }
        : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#8C7570' }
      }
      onMouseEnter={e => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.2)';
          (e.currentTarget as HTMLElement).style.color = '#B8A9A5';
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)';
          (e.currentTarget as HTMLElement).style.color = '#8C7570';
        }
      }}
    >
      {icon}
      <span>{displayLabel}</span>
    </button>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────

const CreatePage: React.FC<CreatePageProps> = ({
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
  onEdit,
  onChangePose,
}) => {
  const form = useForm();
  const gallery = useGallery();
  const sub = useSubscription();

  // Credit cost for current config
  const genCreditCost = (() => {
    if (form.activeMode === 'video') return CREDIT_COSTS[form.videoEngine as string] ?? 50;
    if (form.aiProvider === AIProvider.Auto) return 2 * form.numberOfImages;
    let costPerImage = 2;
    if (form.aiProvider === AIProvider.Fal) costPerImage = CREDIT_COSTS[form.falModel] ?? 10;
    else if (form.aiProvider === AIProvider.Replicate) costPerImage = CREDIT_COSTS[form.replicateModel] ?? 10;
    else if (form.aiProvider === AIProvider.OpenAI) costPerImage = CREDIT_COSTS[form.openaiModel] ?? 20;
    else costPerImage = CREDIT_COSTS[form.geminiModel] ?? 2;
    return costPerImage * form.numberOfImages;
  })();

  // Panel state — only one open at a time
  type PanelType = 'face' | 'outfit' | 'scene' | null;
  const [activePanel, setActivePanel] = useState<PanelType>(null);
  const [showDetails, setShowDetails] = useState(false);

  const togglePanel = (panel: PanelType) => {
    setActivePanel(prev => prev === panel ? null : panel);
  };

  // Settings popover
  const [showSettings, setShowSettings] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Gallery
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [lightboxItem, setLightboxItem] = useState<GeneratedContent | null>(null);
  const [galleryTab, setGalleryTab] = useState<'session' | 'history'>('session');
  const [promptShake, setPromptShake] = useState(false);

  const settingsRef = useRef<HTMLDivElement>(null);
  const refInputRef = useRef<HTMLInputElement>(null);
  const promptBarRef = useRef<HTMLDivElement>(null);

  // Session tracking
  const sessionStartRef = useRef(Date.now());

  // Close settings popover on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node))
        setShowSettings(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const char0 = form.characters[0];
  const isVideo = form.activeMode === "video";
  const activeModel = getActiveModel(form);
  const promptIsEmpty = isVideo
    ? !form.videoPrompt.trim()
    : !(char0?.outfitDescription?.trim());

  // Validated generate — shakes prompt bar if empty
  const handleGenerate = () => {
    if (promptIsEmpty) {
      setPromptShake(true);
      setTimeout(() => setPromptShake(false), 500);
      return;
    }
    onGenerate();
  };

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

  const handleRefFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0 && char0) {
      form.updateCharacter(char0.id, "modelImages", files);
    }
  };

  // Face helpers
  const setFace = (index: number, file: File | null) => {
    if (!char0) return;
    const updated = [...char0.modelImages];
    if (file) updated[index] = file;
    else updated.splice(index, 1);
    form.updateCharacter(char0.id, "modelImages", updated);
  };

  const setOutfitImage = (file: File | null) => {
    if (!char0) return;
    form.updateCharacter(char0.id, "outfitImages", file ? [file] : []);
  };

  // Panel content checks
  const hasFaceContent = (char0?.modelImages?.length ?? 0) > 0;
  const hasOutfitContent = (char0?.outfitImages?.length ?? 0) > 0;
  const hasSceneContent = !!form.lighting || !!form.camera || !!form.scenario;

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
            <div className="sticky top-0 z-10 flex items-center gap-1 px-2 py-1.5" style={{ background: '#0D0A0A' }}>
              {(['session', 'history'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setGalleryTab(tab)}
                  className="px-2.5 py-1 rounded text-[10px] font-semibold font-jet transition-all"
                  style={galleryTab === tab
                    ? { color: '#FF5C35' }
                    : { color: '#8C7570' }
                  }
                >
                  {tab === 'session' ? `Session ${sessionItems.length}` : `History ${allItems.length}`}
                </button>
              ))}
            </div>

            {/* Session Timeline Strip */}
            {galleryTab === 'session' && sessionItems.length > 0 && (
              <div className="flex gap-1 px-2 pb-2 overflow-x-auto custom-scrollbar">
                {sessionItems.map((item, i) => (
                  <button
                    key={item.id}
                    onClick={() => setLightboxItem(item)}
                    className={`relative flex-shrink-0 w-11 h-11 rounded-lg overflow-hidden border transition-all ${
                      lightboxItem?.id === item.id ? 'border-[#FF5C35] scale-105' : 'border-transparent hover:border-zinc-600'
                    }`}
                  >
                    {item.type === 'video' ? (
                      <video src={item.url} className="w-full h-full object-cover" muted />
                    ) : (
                      <img src={item.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                    )}
                    <span className="absolute bottom-0 left-0 right-0 text-[6px] font-jet font-bold text-center py-px"
                      style={{ background: 'rgba(0,0,0,0.6)', color: lightboxItem?.id === item.id ? '#FF5C35' : '#8C7570' }}>
                      {i + 1}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Masonry grid */}
            <div className="columns-3 gap-0.5 px-0.5">
              {displayItems.map((item) => (
                <div
                  key={item.id}
                  className="break-inside-avoid mb-0.5 relative group cursor-pointer overflow-hidden"
                  onMouseEnter={() => setHoveredItem(item.id)}
                  onMouseLeave={() => setHoveredItem(null)}
                  onClick={() => setLightboxItem(item)}
                >
                  {item.type === "video" ? (
                    <video src={item.url} className="w-full block" muted loop
                      onMouseEnter={e => (e.target as HTMLVideoElement).play()}
                      onMouseLeave={e => { (e.target as HTMLVideoElement).pause(); (e.target as HTMLVideoElement).currentTime = 0; }}
                    />
                  ) : (
                    <img src={item.url} alt="" className="w-full block" loading="lazy" />
                  )}

                  {/* Engine badge */}
                  {item.aiProvider && (
                    <div className="absolute top-1 left-1 px-1 py-px rounded text-[7px] font-jet font-bold"
                      style={{ background: 'rgba(0,0,0,0.7)', color: '#8C7570' }}
                    >
                      {item.aiProvider === AIProvider.Auto ? 'Auto' :
                       item.aiProvider === AIProvider.Gemini ? 'Fast' :
                       item.aiProvider === AIProvider.Fal ? 'Identity' :
                       item.aiProvider === AIProvider.Replicate ? 'Creative' :
                       item.aiProvider === AIProvider.OpenAI ? 'Detail' :
                       item.aiProvider === AIProvider.Ideogram ? 'Typography' :
                       item.aiProvider === AIProvider.ModelsLab ? 'NSFW' : ''}
                    </div>
                  )}

                  {/* Hover actions */}
                  {hoveredItem === item.id && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent">
                      <div className="absolute top-1 right-1 flex flex-col gap-0.5">
                        <MiniAction icon={<Download className="w-3 h-3" />} onClick={(e) => { e.stopPropagation(); onDownload(item); }} title="Download" />
                        <MiniAction icon={<RefreshCw className="w-3 h-3" />} onClick={(e) => { e.stopPropagation(); onReuse(item); }} title="Reuse" />
                        {item.type !== "video" && (
                          <MiniAction icon={<Maximize2 className="w-3 h-3" />} onClick={(e) => { e.stopPropagation(); onUpscale(item); }} title="Upscale" />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        ) : (
          /* ── Empty state — animated tech background + categorized prompts ── */
          <div className="relative flex flex-col items-center justify-center h-full text-center select-none px-6 overflow-hidden">
            {/* Animated tech-water background */}
            <div className="absolute inset-0 z-0 freestyle-bg-anim">
              <div className="freestyle-bg-anim-wave3" />
            </div>
            {/* Radial overlay to darken edges */}
            <div className="absolute inset-0 z-[1]" style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 45%, transparent 0%, #0D0A0A 100%)' }} />

            <div className="relative z-[2] flex flex-col items-center max-w-2xl">
              {/* Icon */}
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6" style={{ background: 'rgba(255,92,53,0.1)', border: '1px solid rgba(255,92,53,0.15)' }}>
                <Sparkles className="w-7 h-7" style={{ color: '#FF5C35' }} />
              </div>

              <h3 className="text-2xl font-bold font-display mb-2" style={{ color: '#FFFFFF' }}>
                What will you create?
              </h3>
              <p className="text-sm mb-8" style={{ color: '#B8A9A5' }}>
                Choose a suggestion or type your own prompt below
              </p>

              {/* Categorized prompt suggestions */}
              <div className="w-full space-y-4">
                <div>
                  <span className="text-[10px] font-jet font-bold uppercase tracking-widest block mb-2" style={{ color: '#8C7570' }}>Fashion & Editorial</span>
                  <div className="flex flex-wrap justify-center gap-2">
                    {[
                      "Editorial fashion shoot, golden hour, 85mm lens",
                      "Street style portrait, Tokyo neon nights",
                      "Luxury brand campaign, minimalist studio",
                      "High fashion magazine cover, dramatic lighting",
                    ].map(p => <PromptChip key={p} text={p} onClick={() => char0 && form.updateCharacter(char0.id, "outfitDescription", p)} />)}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-jet font-bold uppercase tracking-widest block mb-2" style={{ color: '#8C7570' }}>Creative & Cinematic</span>
                  <div className="flex flex-wrap justify-center gap-2">
                    {[
                      "Cyberpunk character, neon rain, cinematic",
                      "Fantasy portrait, dramatic rim lighting",
                      "Film noir aesthetic, black and white, moody",
                      "Retro 70s vibe, warm color grading, bokeh",
                    ].map(p => <PromptChip key={p} text={p} onClick={() => char0 && form.updateCharacter(char0.id, "outfitDescription", p)} />)}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-jet font-bold uppercase tracking-widest block mb-2" style={{ color: '#8C7570' }}>Lifestyle & Outdoor</span>
                  <div className="flex flex-wrap justify-center gap-2">
                    {[
                      "Athletic wear, outdoor mountain golden hour",
                      "Casual summer outfit, tropical beach paradise",
                      "Rooftop sunset, city skyline, warm tones",
                      "Cozy cafe morning, natural window light",
                    ].map(p => <PromptChip key={p} text={p} onClick={() => char0 && form.updateCharacter(char0.id, "outfitDescription", p)} />)}
                  </div>
                </div>
              </div>

              {/* Reference hint */}
              <div className="mt-8 flex items-center gap-2 px-4 py-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <ImagePlus className="w-4 h-4 flex-none" style={{ color: '#8C7570' }} />
                <span className="text-xs" style={{ color: '#8C7570' }}>Use the Face, Outfit, and Scene pills to add references</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── Expandable Panels (between gallery and prompt bar) ─── */}
      {activePanel && (
        <div
          className="flex-none border-t overflow-hidden"
          style={{ borderColor: '#2A1F1C', background: '#111010' }}
        >
          <div className="max-w-2xl mx-auto px-4 py-3">
            {/* Face Panel */}
            {activePanel === 'face' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: '#B8A9A5' }}>Face Reference</span>
                  <button onClick={() => setActivePanel(null)} className="p-1 rounded-lg transition-colors" style={{ color: '#6B5A56' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#E8DDD9'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#6B5A56'}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex gap-2 items-start">
                  {[0, 1, 2].map((i) => (
                    <FaceSlot
                      key={i}
                      file={char0?.modelImages[i] ?? null}
                      onFile={(f) => setFace(i, f)}
                      label={`Face ${i + 1}`}
                    />
                  ))}
                  <div className="flex-1 min-w-0 ml-2">
                    <p className="text-[10px] mb-1.5 leading-relaxed" style={{ color: '#8C7570' }}>
                      Upload 1-3 reference photos for face consistency across generations.
                    </p>
                    <button
                      onClick={() => setShowDetails(!showDetails)}
                      className="flex items-center gap-1.5 text-[10px] font-medium transition-colors"
                      style={{ color: showDetails ? '#FF5C35' : '#8C7570' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#E8DDD9'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = showDetails ? '#FF5C35' : '#8C7570'}
                    >
                      <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${showDetails ? 'rotate-180' : ''}`} />
                      {showDetails ? 'Hide details' : 'Add details (eyes, hair, body...)'}
                    </button>
                  </div>
                </div>
                {showDetails && (
                  <CharacteristicsInput
                    value={char0?.characteristics ?? ""}
                    onChange={(v) => char0 && form.updateCharacter(char0.id, "characteristics", v)}
                  />
                )}
              </div>
            )}

            {/* Outfit Panel */}
            {activePanel === 'outfit' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: '#B8A9A5' }}>Outfit Reference</span>
                  <button onClick={() => setActivePanel(null)} className="p-1 rounded-lg transition-colors" style={{ color: '#6B5A56' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#E8DDD9'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#6B5A56'}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex gap-3 items-start">
                  <FaceSlot
                    file={char0?.outfitImages?.[0] ?? null}
                    onFile={(f) => setOutfitImage(f)}
                    label="Outfit ref"
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] mb-2 leading-relaxed" style={{ color: '#8C7570' }}>
                      Upload an outfit image or describe it in the main prompt.
                    </p>
                    {/* Quick outfit chips */}
                    <div className="flex flex-wrap gap-1">
                      {['Streetwear', 'Editorial', 'Casual chic', 'Swimwear', 'Formal', 'Athletic'].map((chip) => {
                        const isChipActive = (char0?.outfitDescription ?? '').toLowerCase().includes(chip.toLowerCase());
                        return (
                          <button
                            key={chip}
                            onClick={() => char0 && form.updateCharacter(char0.id, 'outfitDescription',
                              isChipActive
                                ? (char0.outfitDescription ?? '').replace(new RegExp(chip, 'i'), '').replace(/^,\s*|,\s*$/g, '').trim()
                                : ((char0.outfitDescription ?? '').trim() ? `${char0.outfitDescription}, ${chip}` : chip)
                            )}
                            className="text-[10px] px-2 py-0.5 rounded-full transition-all duration-150 font-jet"
                            style={isChipActive
                              ? { background: 'rgba(255,92,53,0.15)', border: '1px solid #FF5C35', color: '#FFB347' }
                              : { background: 'rgba(255,255,255,0.04)', border: '1px solid #2A1F1C', color: '#8C7570' }
                            }
                            onMouseEnter={e => { if (!isChipActive) { (e.currentTarget as HTMLElement).style.color = '#D4C8C4'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,92,53,0.4)'; }}}
                            onMouseLeave={e => { if (!isChipActive) { (e.currentTarget as HTMLElement).style.color = '#8C7570'; (e.currentTarget as HTMLElement).style.borderColor = '#2A1F1C'; }}}
                          >
                            {isChipActive ? '✓' : '+'} {chip}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Scene Panel */}
            {activePanel === 'scene' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: '#B8A9A5' }}>Scene Settings</span>
                  <button onClick={() => setActivePanel(null)} className="p-1 rounded-lg transition-colors" style={{ color: '#6B5A56' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#E8DDD9'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#6B5A56'}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Lighting */}
                <div>
                  <span className="text-[9px] font-jet font-bold uppercase tracking-widest block mb-1.5" style={{ color: '#8C7570' }}>Lighting</span>
                  <div className="grid grid-cols-6 gap-1">
                    {LIGHTING_OPTIONS.map((opt) => {
                      const isActive = form.lighting === opt.value;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => form.setLighting(isActive ? '' : opt.value)}
                          title={opt.value}
                          className="flex flex-col items-center gap-0.5 py-1.5 rounded-lg border text-center transition-all"
                          style={isActive
                            ? { background: 'rgba(255,92,53,0.1)', borderColor: 'rgba(255,92,53,0.3)', color: '#FF5C35' }
                            : { background: 'rgba(255,255,255,0.03)', borderColor: '#2A1F1C', color: '#8C7570' }
                          }
                          onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.15)'; }}
                          onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.borderColor = '#2A1F1C'; }}
                        >
                          <span className="text-sm leading-none">{opt.icon}</span>
                          <span className="text-[8px] font-medium">{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Camera */}
                <div>
                  <span className="text-[9px] font-jet font-bold uppercase tracking-widest block mb-1.5" style={{ color: '#8C7570' }}>Camera</span>
                  <div className="grid grid-cols-6 gap-1">
                    {CAMERA_OPTIONS.map((opt) => {
                      const isActive = form.camera === opt.value;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => form.setCamera(isActive ? '' : opt.value)}
                          title={opt.value}
                          className="flex flex-col items-center gap-0.5 py-1.5 rounded-lg border text-center transition-all"
                          style={isActive
                            ? { background: 'rgba(255,92,53,0.1)', borderColor: 'rgba(255,92,53,0.3)', color: '#FF5C35' }
                            : { background: 'rgba(255,255,255,0.03)', borderColor: '#2A1F1C', color: '#8C7570' }
                          }
                          onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.15)'; }}
                          onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.borderColor = '#2A1F1C'; }}
                        >
                          <span className="text-sm leading-none">{opt.icon}</span>
                          <span className="text-[8px] font-medium">{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Pose */}
                <div>
                  <span className="text-[9px] font-jet font-bold uppercase tracking-widest block mb-1.5" style={{ color: '#8C7570' }}>Pose</span>
                  <div className="grid grid-cols-6 gap-1">
                    {POSE_OPTIONS.map((opt) => {
                      const isActive = char0?.pose === opt.value;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => char0 && form.updateCharacter(char0.id, "pose", isActive ? "" : opt.value)}
                          title={opt.value}
                          className="flex flex-col items-center gap-0.5 py-1.5 rounded-lg border text-center transition-all"
                          style={isActive
                            ? { background: 'rgba(255,92,53,0.1)', borderColor: 'rgba(255,92,53,0.3)', color: '#FF5C35' }
                            : { background: 'rgba(255,255,255,0.03)', borderColor: '#2A1F1C', color: '#8C7570' }
                          }
                          onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.15)'; }}
                          onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.borderColor = '#2A1F1C'; }}
                        >
                          <span className="text-sm leading-none">{opt.icon}</span>
                          <span className="text-[8px] font-medium">{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Scene description */}
                <div>
                  <span className="text-[9px] font-jet font-bold uppercase tracking-widest block mb-1.5" style={{ color: '#8C7570' }}>Scene Description</span>
                  <textarea
                    value={form.scenario}
                    onChange={(e) => form.setScenario(e.target.value)}
                    placeholder="e.g. Modern art gallery, white walls, geometric sculptures..."
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-[12px] text-zinc-200 outline-none resize-none placeholder:text-zinc-600 focus:border-zinc-600 transition-colors leading-relaxed"
                    rows={2}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Centered Prompt Bar ─── */}
      <div className="flex-none px-4 py-3" style={{ background: 'linear-gradient(to top, #0D0A0A 60%, rgba(13,10,10,0))' }}>
        <div className="max-w-2xl mx-auto space-y-2">
          {/* Main input container */}
          <div
            ref={promptBarRef}
            className="relative rounded-2xl transition-all"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: promptShake ? '1.5px solid rgba(239,68,68,0.6)' : '1.5px solid rgba(255,255,255,0.1)',
              animation: promptShake ? 'prompt-shake 0.4s ease-out' : undefined,
              boxShadow: '0 2px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.02) inset',
            }}
          >
            {/* Textarea area */}
            <div className="px-4 pt-3 pb-2">
              {isVideo ? (
                <textarea
                  value={form.videoPrompt}
                  onChange={(e) => form.setVideoPrompt(e.target.value)}
                  placeholder="Describe the motion and scene..."
                  className="w-full bg-transparent text-[15px] text-white outline-none resize-none placeholder:text-zinc-500 font-light leading-relaxed"
                  style={{ color: '#F5EDE8', minHeight: '72px' }}
                  rows={3}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !isGenerating) { e.preventDefault(); handleGenerate(); } }}
                />
              ) : (
                <AutocompleteInput
                  value={form.characters[0]?.outfitDescription ?? ""}
                  onChange={(v) => char0 && form.updateCharacter(char0.id, "outfitDescription", v)}
                  placeholder="Describe your image..."
                  className="w-full bg-transparent text-[15px] outline-none resize-none placeholder:text-zinc-500 font-light leading-relaxed"
                  style={{ color: '#F5EDE8' }}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !isGenerating) { e.preventDefault(); handleGenerate(); } }}
                />
              )}
            </div>

            {/* Bottom row inside input: ref button + toggle pills + generate button */}
            <div className="flex items-center gap-2 px-3 pb-3">
              {/* Reference image button */}
              <button
                onClick={() => refInputRef.current?.click()}
                className="flex items-center justify-center w-8 h-8 rounded-lg flex-none transition-all"
                style={hasFaceContent
                  ? { background: 'rgba(255,92,53,0.12)', color: '#FF5C35' }
                  : { background: 'rgba(255,255,255,0.06)', color: '#8C7570' }
                }
                title="Add reference image"
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#E8DDD9'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = hasFaceContent ? '#FF5C35' : '#8C7570'; }}
              >
                <ImagePlus className="w-4 h-4" />
              </button>

              {/* Toggle pills */}
              <TogglePill
                icon={<Camera className="w-3 h-3" />}
                label="Face"
                activeLabel={hasFaceContent ? `@${char0?.modelImages.length} ref` : undefined}
                isOpen={activePanel === 'face'}
                hasContent={hasFaceContent}
                onClick={() => togglePanel('face')}
              />
              <TogglePill
                icon={<Shirt className="w-3 h-3" />}
                label="Outfit"
                activeLabel={hasOutfitContent ? "Set" : undefined}
                isOpen={activePanel === 'outfit'}
                hasContent={hasOutfitContent}
                onClick={() => togglePanel('outfit')}
              />
              <TogglePill
                icon={<Film className="w-3 h-3" />}
                label="Scene"
                activeLabel={hasSceneContent ? "Set" : undefined}
                isOpen={activePanel === 'scene'}
                hasContent={hasSceneContent}
                onClick={() => togglePanel('scene')}
              />

              <div className="flex-1" />

              {/* Generate button */}
              <button
                onClick={isGenerating ? onStopGeneration : handleGenerate}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-[0.97] flex-none text-white"
                style={isGenerating
                  ? { background: 'linear-gradient(135deg,#FF5C35,#FFB347)' }
                  : promptIsEmpty && !isGenerating
                    ? { background: 'linear-gradient(135deg,#FF5C35,#FFB347)', opacity: 0.4, cursor: 'not-allowed', boxShadow: 'none' }
                    : { background: 'linear-gradient(135deg,#FF5C35,#FFB347)', boxShadow: '0 2px 12px rgba(255,92,53,0.3)' }
                }
                onMouseEnter={e => { if (!promptIsEmpty && !isGenerating) { (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 24px rgba(255,92,53,0.4)'; } }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = ''; (e.currentTarget as HTMLElement).style.boxShadow = promptIsEmpty ? 'none' : '0 2px 12px rgba(255,92,53,0.3)'; }}
              >
                {isGenerating ? (
                  <>
                    <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                    Stop
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Generate <span className="text-[10px] font-jet opacity-80">⚡{genCreditCost}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Controls row below input — model chip, aspect ratio, settings gear */}
          <div className="flex items-center gap-1.5 justify-center relative" ref={settingsRef}>
            {/* Engine chip */}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex-none"
              style={{ background: 'rgba(255,92,53,0.06)', border: '1px solid rgba(255,92,53,0.15)', color: '#E8DDD9' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,92,53,0.4)'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,92,53,0.1)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,92,53,0.15)'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,92,53,0.06)'; }}
            >
              <span className="text-sm leading-none">{activeModel?.icon ?? '⚡'}</span>
              <span className="truncate max-w-[100px]">{activeModel?.name ?? 'Auto'}</span>
              <ChevronDown className="w-3 h-3 flex-none" style={{ color: '#8C7570' }} />
            </button>

            <div className="w-px h-4 flex-none" style={{ background: '#2A1F1C' }} />

            {/* Aspect ratio pills */}
            {!isVideo && AR_OPTIONS.map((o) => (
              <button
                key={o.value}
                onClick={() => form.setAspectRatio(o.value)}
                className="px-2 py-1 rounded-md text-[10px] font-semibold transition-all flex-none"
                style={form.aspectRatio === o.value
                  ? { background: 'rgba(255,92,53,0.12)', color: '#FF5C35', border: '1px solid rgba(255,92,53,0.25)' }
                  : { color: '#8C7570', border: '1px solid transparent' }
                }
                title={o.desc}
              >
                {o.label}
              </button>
            ))}

            <div className="w-px h-4 flex-none" style={{ background: '#2A1F1C' }} />

            {/* Settings gear */}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center justify-center w-7 h-7 rounded-lg flex-none transition-all"
              style={showSettings
                ? { background: 'rgba(255,92,53,0.12)', color: '#FF5C35' }
                : { background: 'rgba(255,255,255,0.04)', color: '#8C7570' }
              }
              title="Advanced settings"
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#E8DDD9'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = showSettings ? '#FF5C35' : '#8C7570'; }}
            >
              <Settings className="w-3.5 h-3.5" />
            </button>

            {/* Settings popover */}
            {showSettings && (
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-[360px] rounded-xl shadow-2xl overflow-hidden z-50"
                style={{ background: '#111010', border: '1px solid #2A1F1C' }}
              >
                <div className="p-3 space-y-4">
                  {/* Engine selector */}
                  <div>
                    <label className="text-[9px] font-jet font-bold uppercase tracking-widest block mb-2" style={{ color: '#8C7570' }}>Engine</label>
                    <div className="flex items-center gap-2 rounded-lg px-3 py-1.5 mb-2" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <Search className="w-3 h-3 flex-none" style={{ color: '#8C7570' }} />
                      <input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search engines..."
                        className="flex-1 bg-transparent text-[11px] text-white outline-none placeholder:text-zinc-600"
                      />
                      {searchQuery && <button onClick={() => setSearchQuery("")}><X className="w-3 h-3" style={{ color: '#8C7570' }} /></button>}
                    </div>
                    <div className="max-h-[280px] overflow-y-auto custom-scrollbar space-y-0.5">
                      {featuredModels.length > 0 && (
                        <EngineSection title="Featured" models={featuredModels} form={form}
                          onSelect={(m) => { m.select(form); setSearchQuery(""); }} />
                      )}
                      {otherModels.length > 0 && (
                        <EngineSection title="All Models" models={otherModels} form={form}
                          onSelect={(m) => { m.select(form); setSearchQuery(""); }} />
                      )}
                      {videoModels.length > 0 && (
                        <EngineSection title="Video" models={videoModels} form={form}
                          onSelect={(m) => { m.select(form); setSearchQuery(""); }} />
                      )}
                    </div>
                  </div>

                  {/* Resolution + Variations */}
                  <div>
                    <label className="text-[9px] font-jet font-bold uppercase tracking-widest block mb-2" style={{ color: '#8C7570' }}>Output</label>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <span className="text-[9px]" style={{ color: '#8C7570' }}>Size</span>
                        {SIZE_OPTIONS.map((o) => (
                          <button
                            key={o.value}
                            onClick={() => form.setImageSize(o.value)}
                            className="px-2 py-0.5 rounded text-[10px] font-semibold transition-all"
                            style={form.imageSize === o.value
                              ? { background: 'rgba(255,92,53,0.12)', color: '#FF5C35' }
                              : { color: '#8C7570' }
                            }
                          >
                            {o.label}
                          </button>
                        ))}
                      </div>
                      <div className="w-px h-4" style={{ background: '#2A1F1C' }} />
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px]" style={{ color: '#8C7570' }}>Qty</span>
                        <button onClick={() => form.setNumberOfImages(Math.max(1, form.numberOfImages - 1))}
                          className="w-5 h-5 rounded flex items-center justify-center"
                          style={{ background: 'rgba(255,255,255,0.06)', color: '#B8A9A5' }}>
                          <Minus className="w-2.5 h-2.5" />
                        </button>
                        <span className="text-[10px] font-bold w-4 text-center font-jet" style={{ color: '#E8DDD9' }}>
                          {form.numberOfImages}
                        </span>
                        <button onClick={() => form.setNumberOfImages(Math.min(4, form.numberOfImages + 1))}
                          className="w-5 h-5 rounded flex items-center justify-center"
                          style={{ background: 'rgba(255,255,255,0.06)', color: '#B8A9A5' }}>
                          <Plus className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Advanced — CFG, Steps, Seed, Negative */}
                  <div>
                    <label className="text-[9px] font-jet font-bold uppercase tracking-widest block mb-2" style={{ color: '#8C7570' }}>Advanced</label>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[8px] uppercase block mb-1" style={{ color: '#8C7570' }} title="Controls how closely the image follows your prompt. Higher = more literal">CFG (1-20)</label>
                        <AdvStepper value={form.cfg} min={1} max={20} step={0.5} onChange={form.setCfg} />
                      </div>
                      <div>
                        <label className="text-[8px] uppercase block mb-1" style={{ color: '#8C7570' }} title="More steps = higher quality but slower generation">Steps (10-100)</label>
                        <AdvStepper value={form.steps} min={10} max={100} step={5} onChange={form.setSteps} />
                      </div>
                      <div>
                        <label className="text-[8px] uppercase block mb-1" style={{ color: '#8C7570' }}>Seed</label>
                        <input
                          type="number"
                          value={form.seed ?? ""}
                          onChange={(e) => form.setSeed(e.target.value === "" ? undefined : parseInt(e.target.value))}
                          placeholder="Seed (random)"
                          className="w-full bg-transparent rounded px-1.5 py-1 text-[10px] text-white outline-none placeholder:text-zinc-600 font-jet"
                          style={{ border: '1px solid rgba(255,255,255,0.08)' }}
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="text-[8px] uppercase block mb-1" style={{ color: '#8C7570' }}>Negative</label>
                        <input
                          value={form.negativePrompt}
                          onChange={(e) => form.setNegativePrompt(e.target.value)}
                          placeholder="Things to avoid..."
                          className="w-full bg-transparent rounded px-1.5 py-1 text-[10px] text-white outline-none placeholder:text-zinc-600 font-jet"
                          style={{ border: '1px solid rgba(255,255,255,0.08)' }}
                        />
                      </div>
                      <div>
                        <label className="flex items-center gap-1.5 cursor-pointer mt-1" title="Minimizes common AI artifacts like distorted features">
                          <input type="checkbox" checked={form.antiFisheye} onChange={(e) => form.setAntiFisheye(e.target.checked)} className="w-3 h-3 accent-orange-500" />
                          <span className="text-[9px]" style={{ color: '#B8A9A5' }}>Reduce artifacts</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
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
              {onEdit && lightboxItem.type !== "video" && (
                <>
                  <LbSep />
                  <LbAction icon={<Sparkles className="w-3.5 h-3.5" />} label="AI Edit" onClick={() => { onEdit(lightboxItem); setLightboxItem(null); }} />
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

export default CreatePage;
