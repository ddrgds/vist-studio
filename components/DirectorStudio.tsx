import React, { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Plus,
  Minus,
  Sparkles,
  ChevronDown,
  Upload,
  ImageIcon,
  AlertTriangle,
} from "lucide-react";
import { useForm } from "../contexts/FormContext";
import { useGallery } from "../contexts/GalleryContext";
import { useCharacterLibrary } from "../contexts/CharacterLibraryContext";
import {
  AIProvider,
  FalModel,
  GeminiImageModel,
  OpenAIModel,
  ReplicateModel,
  ModelsLabModel,
  REPLICATE_MODEL_LABELS,
  MODELSLAB_MODEL_LABELS,
  AspectRatio,
  ImageSize,
  GeneratedContent,
  AIEditEngine,
  PoseEngine,
  POSE_ENGINE_LABELS,
  SavedCharacter,
} from "../types";
import GalleryGrid from "./Gallery/GalleryGrid";
import CharacteristicsInput from "./CharacteristicsInput";
import InspirationBoard from "./InspirationBoard";
import { InspirationImage, CREDIT_COSTS, OPERATION_CREDIT_COSTS, VideoEngine } from "../types";
import { useSubscription } from "../hooks/useSubscription";

// ─── Props ────────────────────────────────────────────────────────────────────

interface DirectorStudioProps {
  isGenerating: boolean;
  progress: number;
  onGenerate: () => void;
  onStopGeneration: () => void;
  onDownload: (e: React.MouseEvent, item: GeneratedContent) => void;
  onEdit: (item: GeneratedContent) => void;
  onReuse: (item: GeneratedContent) => void;
  onChangePose: (item: GeneratedContent) => void;
  onUpscale: (item: GeneratedContent) => void;
  upscalingId: string | null;
  onCaption: (item: GeneratedContent) => void;
  onRemoveBg: (item: GeneratedContent) => void;
  onFaceSwap: (item: GeneratedContent) => void;
  onSkinEnhance: (item: GeneratedContent) => void;
  onRelight: (item: GeneratedContent) => void;
  onInpaint: (item: GeneratedContent) => void;
  onTryOn: (item: GeneratedContent) => void;
  onAddToStoryboard: (item: GeneratedContent) => void;
  onCopyToClipboard: (item: GeneratedContent) => void;
  onSendToGenerator?: (item: GeneratedContent) => void;
}

// ─── Static Data ─────────────────────────────────────────────────────────────

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

// ─── Sub-model catalogs per provider ─────────────────────────────────────────

const GEMINI_SUBMODELS: { label: string; badge?: string; value: GeminiImageModel }[] = [
  { label: "NB2 · Nano Banana 2",      badge: "FAST", value: GeminiImageModel.Flash2 },
  { label: "NB Pro · Nano Banana Pro", badge: "PRO",  value: GeminiImageModel.Pro },
  { label: "Imagen 4 Ultra",           badge: "4K",   value: GeminiImageModel.Imagen4Ultra },
  { label: "Gemini Flash",                             value: GeminiImageModel.Flash },
];

const FLUX_SUBMODELS: { label: string; badge?: string; value: FalModel }[] = [
  { label: "Kontext Multi",   badge: "ID",   value: FalModel.KontextMulti },
  { label: "Kontext Max",     badge: "MAX",  value: FalModel.KontextMaxMulti },
  { label: "Seedream 4.5",    badge: "4K",   value: FalModel.Seedream45 },
  { label: "Seedream 5.0",    badge: "NEW",  value: FalModel.Seedream50 },
  { label: "Z-Image Turbo",   badge: "🔞",   value: FalModel.ZImageTurbo },
];

const GPT_SUBMODELS: { label: string; badge?: string; value: OpenAIModel }[] = [
  { label: "GPT Image 1.5", badge: "BEST", value: OpenAIModel.GptImage15 },
  { label: "GPT Image 1.0",               value: OpenAIModel.GptImage1 },
];

// AI Edit engine options
const AI_EDIT_ENGINES: { engine: AIEditEngine; icon: string; label: string; color: string; desc: string }[] = [
  { engine: AIEditEngine.Gemini,       icon: "✦",  label: "Gemini",    color: "bg-violet-700",  desc: "Multimodal — accepts optional reference image to guide the effect." },
  { engine: AIEditEngine.GPTImageEdit, icon: "🤖", label: "GPT",       color: "bg-emerald-700", desc: "GPT Image 1 — precise text-instruction editing. No extra references." },
  { engine: AIEditEngine.FluxKontext,  icon: "⚡", label: "FLUX",      color: "bg-blue-700",    desc: "FLUX Kontext Pro — preserves identity and face. Text only, no reference." },
  { engine: AIEditEngine.Flux2ProEdit, icon: "🔥", label: "FLUX.2",    color: "bg-sky-700",     desc: "FLUX.2 Pro Edit — multi-reference. Best for 2D→3D, style transfer, scenario changes." },
  { engine: AIEditEngine.Seedream5Edit,icon: "🌊", label: "Seedream",  color: "bg-orange-700",  desc: "Seedream 5 Edit — up to 9 references. Use 'Figure 1' for base, 'Figure 2+' for refs." },
  { engine: AIEditEngine.GrokImagine,  icon: "𝕏",  label: "Grok",      color: "bg-zinc-600",    desc: "Grok Imagine — xAI Aurora. Fast image editing with text instructions. ~4s." },
  { engine: AIEditEngine.FaceSwapFal,       icon: "🎭", label: "Face Swap",   color: "bg-rose-700",    desc: "Face Swap — pure face replacement. Upload the face to apply below." },
  { engine: AIEditEngine.ModelsLabImg2Img,  icon: "🔞", label: "NSFW Edit",   color: "bg-red-900",     desc: "ModelsLab img2img — NSFW uncensored editing. Uses currently selected NSFW model." },
];

// Pose engine options
const POSE_ENGINE_OPTIONS = [
  { engine: PoseEngine.Gemini,       color: "bg-violet-700" },
  { engine: PoseEngine.FalAI,        color: "bg-yellow-700" },
  { engine: PoseEngine.Flux2ProEdit, color: "bg-sky-700" },
  { engine: PoseEngine.GPTImageEdit, color: "bg-emerald-700" },
  { engine: PoseEngine.GrokImagine,  color: "bg-zinc-600" },
];

// Grok sub-models (for Create mode sub-model picker)
const GROK_SUBMODELS: { label: string; badge?: string; value: ReplicateModel }[] = [
  { label: "Grok Imagine", badge: "NEW", value: ReplicateModel.GrokImagine },
];

// ModelsLab NSFW sub-models
const MODELSLAB_SUBMODELS: { label: string; badge?: string; value: ModelsLabModel }[] = [
  { label: "Lustify SDXL",    badge: "🔞",  value: ModelsLabModel.LustifySdxl },
  { label: "NSFW SDXL",       badge: "🔞",  value: ModelsLabModel.NsfwSdxl },
  { label: "WAI Illustrious", badge: "🎌",  value: ModelsLabModel.WaiNsfw },
  { label: "FLUX NSFW",       badge: "NEW", value: ModelsLabModel.FluxNsfw },
];

// ─── Photo Session Presets ────────────────────────────────────────────────────

interface SessionPreset {
  id: string;
  icon: string;
  label: string;
  shots: string[];
}

const PRESET_TOOLTIPS: Record<string, string> = {
  selfie: "Close-up self-portrait, natural lighting, phone camera feel",
  grwm: "Get Ready With Me — mirror shots, getting dressed sequence",
  stories: "Vertical 9:16 clips, casual talking-to-camera energy",
  editorial: "High fashion magazine spread, professional studio lighting",
  portrait: "Classic studio portraits, 85mm bokeh, timeless quality",
  street: "Urban outdoor fashion, candid city vibes",
  creator: "Influencer-style content, engaging and relatable",
  lifestyle: "Everyday moments — café, park, home, natural light",
  fitness: "Athletic action shots, gym and outdoor energy",
  nightout: "Evening glamour, neon lights, nightlife atmosphere",
  fotodump: "Casual mixed collection, authentic unfiltered moments",
};

const PHOTO_SESSION_PRESETS: SessionPreset[] = [
  {
    id: "selfie",
    icon: "🤳",
    label: "Selfies",
    shots: [
      "selfie angle, camera held slightly above eye level at arm's length, front-facing, natural warm smile, tight crop on face and upper shoulders",
      "eye-level selfie, camera at exact face height, playful expression, slight head tilt to one side, close crop",
      "mirror selfie, full body visible in reflection, arm extended toward camera, outfit showcase, confident casual stance",
      "low selfie angle, camera just below chin level, subject looking down into lens with a confident smirk, dramatic angle",
    ],
  },
  {
    id: "grwm",
    icon: "💄",
    label: "GRWM",
    shots: [
      "beauty close-up, extreme close on face, soft front lighting, looking directly into lens, skin texture and makeup detail fully visible, ring-light catch lights",
      "macro detail on eyes, upper face tightly cropped, eyeshadow blend and lash detail sharp, side-lit for texture",
      "macro detail on lips, extreme close-up, lip color and product texture clearly visible, slight 3/4 angle",
      "getting-ready candid, 3/4 angle slightly above, hand near hair or face mid-gesture, warm vanity or window light",
      "mirror shot, full face visible in vanity mirror, bedroom or bathroom context, backstage getting-ready atmosphere",
    ],
  },
  {
    id: "stories",
    icon: "📱",
    label: "Stories",
    shots: [
      "vertical 9:16 crop, bust shot, front-facing, talking-to-camera pose, expressive and direct, casual conversational energy",
      "vertical 9:16 crop, full body walking toward camera, dynamic movement, urban or indoor setting, candid lifestyle",
      "vertical, close crop face and shoulders, genuine mid-laugh, eyes crinkled, authentic caught-in-the-moment joy",
      "vertical, 3/4 angle, hands gesturing mid-sentence, storytelling energy, expressive body language",
      "vertical, looking away from camera then glancing back, over-the-shoulder candid, relaxed off-guard vibe",
    ],
  },
  {
    id: "editorial",
    icon: "🎞️",
    label: "Editorial",
    shots: [
      "3/4 angle, medium shot, chin slightly down, eyes slightly up, looking left of camera, magazine editorial quality, cinematic color",
      "side profile, 90-degree lateral view, full body, clean architectural negative space, elegant and sculptural composition",
      "wide environmental shot, full body, subject placed at rule-of-thirds left, rich storytelling background",
      "low angle, shooting upward, dynamic power stance, dramatic sky or ceiling context, high-fashion energy",
      "high contrast front portrait, 85mm, direct unwavering gaze, minimal background, stark editorial look",
    ],
  },
  {
    id: "portrait",
    icon: "🖼️",
    label: "Portrait",
    shots: [
      "classic bust portrait, 85mm f/1.4, eye-level, direct warm gaze, creamy bokeh, timeless studio quality",
      "3/4 face turn, looking into middle distance past camera, contemplative mood, soft Rembrandt side lighting",
      "intimate extreme close-up, eyes filling most of frame, eyelashes and iris detail crisp, rest softly blurred",
      "back 3/4, head turned over left shoulder toward camera, nape of neck and jawline visible, mysterious and elegant",
      "profile silhouette, 90-degree side, jaw and neck line sculpted by hard side light, graphic and architectural",
    ],
  },
  {
    id: "street",
    icon: "🏙️",
    label: "Street Style",
    shots: [
      "full body candid, mid-stride walking, shot from 15ft with 85mm compression, city architecture blurred background",
      "low 3/4 angle, shooting from hip height, dynamic street energy, shallow depth of field, urban attitude",
      "side profile, leaning against brick wall or doorway, cross-armed or hands in pockets, cool effortless style",
      "wide establishing, subject small in frame at rule-of-thirds, rich urban environment and city life surrounding",
      "close-up candid, looking away from camera, natural unposed expression, street light quality, documentary feel",
    ],
  },
  {
    id: "creator",
    icon: "✨",
    label: "Creator",
    shots: [
      "front-facing talking, confident expressive pose, slightly above eye level, engaging direct eye contact, creator energy",
      "holding phone or product, looking at it then glancing at camera, lifestyle influencer framing, natural light",
      "genuine mid-laugh, 3/4 angle, eyes crinkled, teeth showing, authentic and relatable, candid joy",
      "looking upward and slightly right, slight smile, thinking-dreaming expression, aspirational creative mood",
      "back-of-shoulder looking back, candid documentary feel, subject unaware then noticing camera, intimate behind-the-scenes",
    ],
  },
  {
    id: "lifestyle",
    icon: "🌿",
    label: "Lifestyle",
    shots: [
      "sitting at café table, 3/4 angle, hands wrapped around coffee cup, warm window light, cozy intimate atmosphere",
      "walking through park or tree-lined street, candid wide, natural dappled sunlight, relaxed everyday energy",
      "at home, sitting cross-legged on floor or couch, casual relaxed pose, soft interior light, comfortable and personal",
      "looking at phone or book, side angle, absorbed in moment, candid and unposed, lifestyle storytelling",
      "standing by window, side-lit by natural daylight, looking outside pensively, serene and peaceful mood",
    ],
  },
  {
    id: "fitness",
    icon: "💪",
    label: "Fitness",
    shots: [
      "action pose mid-movement, dynamic athletic stance, side angle, powerful and energetic, gym or outdoor setting",
      "low angle looking up, strong confident power stance, arms crossed or hands on hips, athletic authority",
      "stretching pose, full body side profile, flexibility and form on display, clean gym background",
      "post-workout candid, slightly above eye level, hands on hips, catching breath, authentic athletic grit",
      "close-up determination face, intense focus expression, sweat detail, athletic close crop on face and neck",
    ],
  },
  {
    id: "nightout",
    icon: "🌙",
    label: "Night Out",
    shots: [
      "soft glow front portrait, warm candlelight or bar lighting, relaxed confident expression, night atmosphere bokeh",
      "full body wide, dressed up, urban night backdrop, city lights blurred behind, elegant nightlife energy",
      "over-shoulder looking back, neon or ambient light rim, party energy, blurred movement in background",
      "3/4 angle close-medium shot, golden bar light, raised glass or drink, social celebratory mood",
      "side profile, dramatic nightclub or rooftop light, architectural silhouette, mysterious and cinematic",
    ],
  },
  {
    id: "fotodump",
    icon: "🎞️",
    label: "Foto Dump",
    shots: [
      "ultra candid, slightly tilted frame, subject caught mid-movement, motion blur on edges, film grain texture, disposable camera aesthetic, raw and unfiltered",
      "extreme close-up detail — hands, shoes, jewelry, food, or object — macro, off-center composition, spontaneous and intimate",
      "wide shot, subject very small at edge of frame, environment dominates, documentary snapshot quality, slice-of-life moment",
      "selfie from exaggerated angle — too close, tilted, or from below — unfiltered casual expression, wide grin or deadpan face, authentic",
      "over-shoulder walking-away, subject in motion or looking back, spontaneous escape energy, candid street feel",
      "slightly soft-focus portrait, analog film grain, warm or faded color cast, vintage disposable camera feel, imperfect and nostalgic",
    ],
  },
];

// ─── FaceSlot sub-component ───────────────────────────────────────────────────

interface FaceSlotProps {
  file: File | null;
  onFile: (f: File | null) => void;
  label: string;
  size?: "sm" | "md" | "lg";
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

  const dim =
    size === "sm" ? "w-[56px] h-[56px]" :
    size === "lg" ? "w-full aspect-[3/4] max-h-[160px]" :
    "w-[72px] h-[72px]";

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

// ─── Badge ─────────────────────────────────────────────────────────────────────
const Badge: React.FC<{ text: string }> = ({ text }) => {
  const style: React.CSSProperties =
    text === "FAST" ? { background: 'linear-gradient(135deg,#FF5C35,#FFB347)', color: '#fff' } :
    text === "PRO"  ? { background: 'rgba(255,92,53,0.18)', color: '#FF5C35', border: '1px solid rgba(255,92,53,0.3)' } :
    text === "4K"   ? { background: 'rgba(96,165,250,0.2)', color: '#93C5FD' } :
    text === "NEW"  ? { background: 'linear-gradient(135deg,#34d399,#2dd4bf)', color: '#022c22' } :
    text === "MAX"  ? { background: 'rgba(255,179,71,0.2)', color: '#FFB347' } :
    text === "ID"   ? { background: 'rgba(251,146,60,0.2)', color: '#FB923C' } :
    text === "BEST" ? { background: 'linear-gradient(135deg,#FF5C35,#FFB347)', color: '#fff' } :
                      { background: 'rgba(255,255,255,0.08)', color: '#B8A9A5' };
  return (
    <span className="text-[8px] font-black px-1.5 py-0.5 rounded leading-none tracking-wider font-jet" style={style}>
      {text}
    </span>
  );
};

// ─── Section label ────────────────────────────────────────────────────────────
const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="text-[12px] font-bold uppercase tracking-widest" style={{ color: '#B8A9A5' }}>{children}</span>
);

// ─── Collapsible accordion section ───────────────────────────────────────────
const AccordionSection: React.FC<{
  label: string;
  isOpen: boolean;
  onToggle: () => void;
  filled?: number;
  total?: number;
  statusText?: string;
  children: React.ReactNode;
}> = ({ label, isOpen, onToggle, filled, total, statusText, children }) => (
  <div>
    <button
      onClick={onToggle}
      className="w-full px-4 pt-3 pb-1.5 flex items-center justify-between group hover:bg-white/[0.02] transition-colors"
    >
      <div className="flex items-center gap-2">
        <SectionLabel>{label}</SectionLabel>
        {filled !== undefined && total !== undefined && filled > 0 && (
          <span className="text-[10px] font-jet px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(255,92,53,0.12)', color: '#FF5C35' }}>
            {filled}/{total}
          </span>
        )}
        {!isOpen && statusText && (
          <span className="text-[10px] font-jet truncate max-w-[100px]" style={{ color: '#8C7570' }}>
            {statusText}
          </span>
        )}
      </div>
      <ChevronDown className={`w-3 h-3 text-zinc-500 group-hover:text-zinc-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
    </button>
    {isOpen && <div>{children}</div>}
  </div>
);

// ─── Surprise me presets ──────────────────────────────────────────────────────
const SURPRISE_PRESETS = [
  { ch: "25yo, South Korean, almond eyes, soft skin, monolid",        outfit: "Minimalist white linen set, oversized blazer, wide-leg trousers",                scenario: "Modern art gallery with white walls and geometric sculptures",          lighting: "soft natural light, golden hour, sun-kissed",             camera: "shot on 85mm lens, shallow depth of field, beautiful bokeh" },
  { ch: "28yo, Brazilian, tanned skin, wavy brunette hair, athletic",  outfit: "Vintage oversized graphic tee, baggy cargo pants, chunky sneakers",          scenario: "Gritty urban alley with neon signs and graffiti walls",               lighting: "neon lighting, cyberpunk glow, vivid colors",              camera: "24mm wide angle lens, dynamic perspective, immersive view" },
  { ch: "22yo, Ethiopian, deep brown skin, sharp bone structure, afro",outfit: "Structured black velvet blazer, wide-brim hat, editorial look",             scenario: "Minimalist rooftop at golden hour, blurred city skyline",             lighting: "golden hour light, warm tones, soft shadows",             camera: "anamorphic lens, cinematic aspect ratio, film look" },
  { ch: "30yo, Japanese, porcelain skin, sleek black hair, elegant",   outfit: "Metallic silver trench coat, holographic boots, futuristic accessories",     scenario: "Tokyo street at night, LED lights on wet pavement",                   lighting: "neon lighting, cyberpunk glow, vivid colors",              camera: "shot on 85mm lens, shallow depth of field, beautiful bokeh" },
  { ch: "24yo, Swedish, blonde, blue eyes, freckles, natural beauty",  outfit: "Rust-colored chunky knit sweater, straight-leg jeans, leather boots",        scenario: "Misty forest with golden autumn leaves and soft morning fog",          lighting: "soft natural light, golden hour, sun-kissed",             camera: "vintage film camera look, 35mm film, subtle grain" },
  { ch: "27yo, Indian, warm brown skin, long dark hair, expressive",   outfit: "Geometric print maxi skirt, structured corset top, statement jewelry",       scenario: "Jaipur palace courtyard with terracotta walls and bougainvillea",     lighting: "golden hour light, warm tones, soft shadows",             camera: "anamorphic lens, cinematic aspect ratio, film look" },
  { ch: "23yo, Mexican, olive skin, curly dark hair, radiant smile",   outfit: "White crochet bikini top, flowy linen maxi skirt, straw hat",                scenario: "White sand beach at sunrise, turquoise crystal-clear water",          lighting: "soft natural light, golden hour, sun-kissed",             camera: "polaroid style, instant photo aesthetic, vintage colors" },
  { ch: "29yo, French, pale skin, auburn hair, sophisticated features",outfit: "Tailored camel coat, silk blouse, straight trousers, ballet flats",          scenario: "Parisian café terrace with iron tables and blooming flower boxes",    lighting: "soft natural light, golden hour, sun-kissed",             camera: "shot on 85mm lens, shallow depth of field, beautiful bokeh" },
  { ch: "26yo, Nigerian, deep brown skin, high cheekbones, 4C hair",  outfit: "Kente-inspired puffer jacket, black joggers, high-tops",                     scenario: "Lagos rooftop bar at sunset with vibrant city views",                 lighting: "golden hour light, warm tones, soft shadows",             camera: "24mm wide angle lens, dynamic perspective, immersive view" },
  { ch: "21yo, Colombian, golden skin, dark straight hair, playful",   outfit: "Y2K — low-rise flare jeans, butterfly crop top, platform shoes",             scenario: "Bright Miami pool party with palm trees and flamingo floats",         lighting: "soft natural light, golden hour, sun-kissed",             camera: "polaroid style, instant photo aesthetic, vintage colors" },
  { ch: "33yo, Russian, ice-blue eyes, platinum blonde, sharp features",outfit: "Black leather trench coat, vinyl corset, pointed-toe boots",                scenario: "Moscow metro station with ornate golden mosaics",                     lighting: "dramatic cinematic lighting, deep shadows",               camera: "anamorphic lens, cinematic aspect ratio, film look" },
  { ch: "25yo, Thai, light tan skin, oval face, long black hair",      outfit: "Ivory flowy maxi dress with gold embroidery, delicate anklets",             scenario: "Ancient temple ruins surrounded by tropical jungle at dusk",          lighting: "golden hour light, warm tones, soft shadows",             camera: "shot on 85mm lens, shallow depth of field, beautiful bokeh" },
  { ch: "28yo, Argentinian, tan skin, dark wavy hair, expressive eyes",outfit: "Khaki cargo jacket, white tee, leather boots, belt bag",                    scenario: "Patagonia mountain landscape with turquoise lake",                    lighting: "soft natural light, golden hour, sun-kissed",             camera: "24mm wide angle lens, dynamic perspective, immersive view" },
  { ch: "22yo, Egyptian, golden brown skin, dark kohl eyes",           outfit: "White kaftan with intricate embroidery, gold jewelry, silk headwrap",        scenario: "Desert dunes at magic hour, orange and pink sky",                    lighting: "golden hour light, warm tones, soft shadows",             camera: "anamorphic lens, cinematic aspect ratio, film look" },
  { ch: "31yo, Portuguese, warm olive skin, dark curly hair",          outfit: "Floral printed midi dress, pointed kitten heels, cat-eye sunglasses",        scenario: "Lisbon colorful tilework alley with laundry lines over cobblestones", lighting: "soft natural light, golden hour, sun-kissed",             camera: "vintage film camera look, 35mm film, subtle grain" },
  { ch: "24yo, Vietnamese, ivory skin, straight glossy hair",          outfit: "Cropped puffer vest, cargo mini skirt, platform sandals",                   scenario: "Hanoi night market with lanterns and vendor stalls",                  lighting: "neon lighting, cyberpunk glow, vivid colors",              camera: "shot on 85mm lens, shallow depth of field, beautiful bokeh" },
  { ch: "27yo, Moroccan, caramel skin, large dark eyes, strong bones", outfit: "Orange and gold kaftan, strappy heels, arm bangles",                        scenario: "Marrakech riad with turquoise pool, mosaic tiles, rose petals",       lighting: "golden hour light, warm tones, soft shadows",             camera: "shot on 85mm lens, shallow depth of field, beautiful bokeh" },
  { ch: "29yo, Puerto Rican, brown skin, voluminous curls, bold lips", outfit: "Matching bold-colored sports bra and bike shorts, clean sneakers",           scenario: "Sunrise run along San Juan Malecón, waves crashing below",           lighting: "soft natural light, golden hour, sun-kissed",             camera: "24mm wide angle lens, dynamic perspective, immersive view" },
  { ch: "23yo, Finnish, porcelain skin, ice-blonde pixie cut",         outfit: "Forest green turtleneck, tailored wool trousers, white sneakers",            scenario: "Birch forest in winter, pale Nordic light filtering through snow",    lighting: "soft natural light, golden hour, sun-kissed",             camera: "vintage film camera look, 35mm film, subtle grain" },
  { ch: "30yo, Peruvian, copper skin, long dark straight hair",        outfit: "Bold geometric print jumpsuit, statement earrings, strappy heels",           scenario: "Machu Picchu ruins with dramatic clouds and Andean mountains",        lighting: "golden hour light, warm tones, soft shadows",             camera: "anamorphic lens, cinematic aspect ratio, film look" },
];

// ─── Blob-safe <img> — creates + revokes object URL automatically ────────────

const BlobImg: React.FC<{ file: Blob; className?: string; alt?: string }> = ({ file, className, alt }) => {
  const url = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  return <img src={url} alt={alt ?? ''} className={className} />;
};

// ─── Main Component ────────────────────────────────────────────────────────────

const DirectorStudio: React.FC<DirectorStudioProps> = ({
  isGenerating,
  progress,
  onGenerate,
  onStopGeneration,
  onDownload,
  onEdit,
  onReuse,
  onChangePose,
  onUpscale,
  upscalingId,
  onCaption,
  onRemoveBg,
  onFaceSwap,
  onSkinEnhance,
  onRelight,
  onInpaint,
  onTryOn,
  onAddToStoryboard,
  onCopyToClipboard,
}) => {
  const form = useForm();
  const gallery = useGallery();

  const [showChar2, setShowChar2] = useState(false);
  const [showSubModels, setShowSubModels] = useState(false);
  const [customLighting, setCustomLighting] = useState("");
  const [customCamera, setCustomCamera] = useState("");
  const [customPose, setCustomPose] = useState("");
  const [centerTab, setCenterTab] = useState<"gallery" | "assets">("gallery");
  const [localError, setLocalError] = useState<string | null>(null);
  const [selectedPresets, setSelectedPresets] = useState<Set<string>>(new Set());

  // Studio mode: create | poses | ai | session
  const [studioMode, setStudioMode] = useState<"create" | "poses" | "ai" | "session">("create");
  const [showNoFaceWarning, setShowNoFaceWarning] = useState(false);

  // ─── Character Library state ───────────────────────────────────────────────
  const charLib = useCharacterLibrary();
  const [savingName, setSavingName] = useState('');
  const [isSavingMode, setIsSavingMode] = useState(false);
  const [savingImages, setSavingImages] = useState<File[]>([]);
  const [showSavingGalleryPicker, setShowSavingGalleryPicker] = useState(false);
  const saveNameInputRef = useRef<HTMLInputElement>(null);
  const savingFileInputRef = useRef<HTMLInputElement>(null);
  const [chipMenuId, setChipMenuId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // ─── Subscription / credits ──────────────────────────────────────────────────
  const sub = useSubscription();

  const computeDirectorCreditCost = (): number => {
    if (studioMode === 'ai') {
      if (form.editSubMode === 'ai' && form.aiEditEngine === AIEditEngine.FaceSwapFal) return OPERATION_CREDIT_COSTS.faceSwap;
      return OPERATION_CREDIT_COSTS.upscale;
    }
    if (studioMode === 'session') return OPERATION_CREDIT_COSTS.photoSession * (form.editNumberOfImages || 1);
    if (studioMode === 'poses') return 10;
    // create mode
    let costPerImage = 2;
    if (form.aiProvider === AIProvider.Fal) costPerImage = CREDIT_COSTS[form.falModel] ?? 10;
    else if (form.aiProvider === AIProvider.Replicate) costPerImage = CREDIT_COSTS[form.replicateModel] ?? 15;
    else if (form.aiProvider === AIProvider.OpenAI) costPerImage = CREDIT_COSTS[form.openaiModel] ?? 20;
    else if (form.aiProvider === AIProvider.Ideogram) costPerImage = CREDIT_COSTS[form.ideogramModel] ?? 10;
    else if (form.aiProvider === AIProvider.ModelsLab) costPerImage = CREDIT_COSTS[form.modelsLabModel] ?? 5;
    else costPerImage = CREDIT_COSTS[form.geminiModel] ?? 2;
    return costPerImage * form.numberOfImages;
  };

  const directorCreditCost = computeDirectorCreditCost();

  // ─── Mobile panel (6.1) ─────────────────────────────────────────────────────
  const [showMobilePanel, setShowMobilePanel] = useState(false);

  // ─── Quick Start modal (4.3) ────────────────────────────────────────────────
  const [showQuickStart, setShowQuickStart] = useState(false);

  React.useEffect(() => {
    if (charLib.isLoading) return;
    const dismissed = localStorage.getItem('vist-quickstart-dismissed');
    if (!dismissed && charLib.savedCharacters.length === 0 && gallery.generatedHistory.length === 0) {
      setShowQuickStart(true);
    }
  }, [charLib.isLoading, charLib.savedCharacters.length, gallery.generatedHistory.length]);

  const dismissQuickStart = () => {
    setShowQuickStart(false);
    try { localStorage.setItem('vist-quickstart-dismissed', '1'); } catch {}
  };

  const handleQuickStartGenerate = () => {
    dismissQuickStart();
    handleSurpriseMe();
    // Small delay so surprise state settles before generating
    setTimeout(() => handleDirectorGenerate(), 80);
  };
  const chipMenuRef = useRef<HTMLDivElement>(null);

  // Accordion section state (persisted to localStorage)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    try {
      const s = localStorage.getItem('vist-director-sections');
      return s ? JSON.parse(s) : { identity: true, engine: false, costume: false, pose: false };
    } catch { return { identity: true, engine: false, costume: false, pose: false }; }
  });
  const toggleSection = (key: string) => {
    setOpenSections(prev => {
      const next = { ...prev, [key]: !prev[key] };
      try { localStorage.setItem('vist-director-sections', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  // Click-outside closes chip context menu
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (chipMenuRef.current && !chipMenuRef.current.contains(e.target as Node)) {
        setChipMenuId(null);
        setRenamingId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Focus name input when save mode opens
  React.useEffect(() => {
    if (isSavingMode) saveNameInputRef.current?.focus();
  }, [isSavingMode]);

  const handleSaveCharacter = async () => {
    const name = savingName.trim();
    if (!name || !char0) return;
    try {
      // Use manually selected images if provided, otherwise fall back to form images
      const charToSave = savingImages.length > 0
        ? { ...char0, modelImages: savingImages }
        : char0;
      await charLib.saveCurrentCharacter(name, charToSave);
      setSavingName('');
      setSavingImages([]);
      setShowSavingGalleryPicker(false);
      setIsSavingMode(false);
    } catch (err) {
      console.error('Failed to save character:', err);
    }
  };

  const handleSavingLocalFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length) setSavingImages(prev => [...prev, ...files].slice(0, 3));
    e.target.value = '';
  };

  const handleSavingGalleryPick = async (item: GeneratedContent) => {
    try {
      const res = await fetch(item.url);
      const blob = await res.blob();
      const file = new File([blob], 'gallery-ref.jpg', { type: blob.type || 'image/jpeg' });
      setSavingImages(prev => [...prev, file].slice(0, 3));
      setShowSavingGalleryPicker(false);
    } catch {
      // silently ignore
    }
  };

  const handleLoadCharacter = (char: SavedCharacter) => {
    if (!char0) return;
    charLib.loadCharacterIntoForm(char, char0.id, form.updateCharacter);
    charLib.incrementUsage(char.id);
    setChipMenuId(null);
  };

  const handleSurpriseMe = () => {
    if (!char0) return;
    const p = SURPRISE_PRESETS[Math.floor(Math.random() * SURPRISE_PRESETS.length)];
    form.updateCharacter(char0.id, 'characteristics', p.ch);
    form.updateCharacter(char0.id, 'outfitDescription', p.outfit);
    form.setScenario(p.scenario);
    form.setLighting(p.lighting);
    setCustomLighting('');
    form.setCamera(p.camera);
    setCustomCamera('');
    const next = { identity: true, engine: false, costume: true, pose: false };
    setOpenSections(next);
    try { localStorage.setItem('vist-director-sections', JSON.stringify(next)); } catch {}
  };

  const char0 = form.characters[0];
  const char1 = form.characters[1];

  // Ensure at least 2 characters exist
  React.useEffect(() => {
    if (form.characters.length < 2) form.setNumCharacters(2);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync form mode when switching studio tabs
  const handleSetStudioMode = (mode: "create" | "poses" | "ai" | "session") => {
    setStudioMode(mode);
    if (mode === "create") {
      form.setActiveMode("create");
    } else {
      form.setActiveMode("edit");
      if (mode === "poses") form.setEditSubMode("poses");
      else if (mode === "ai") form.setEditSubMode("ai");
      else form.setEditSubMode("session");
    }
  };

  // Face helpers
  const setFace = (charId: string, index: number, file: File | null) => {
    const char = form.characters.find((c) => c.id === charId);
    if (!char) return;
    const updated = [...char.modelImages];
    if (file) updated[index] = file;
    else updated.splice(index, 1);
    form.updateCharacter(charId, "modelImages", updated);
  };

  const setOutfitImage = (charId: string, file: File | null) => {
    form.updateCharacter(charId, "outfitImages", file ? [file] : []);
  };

  const setPoseImage = (charId: string, file: File | null) => {
    form.updateCharacter(charId, "poseImage", file);
  };

  // Apply custom lighting/camera/pose to form when user types
  const handleCustomLighting = (val: string) => {
    setCustomLighting(val);
    if (val.trim()) form.setLighting(val);
  };
  const handleCustomCamera = (val: string) => {
    setCustomCamera(val);
    if (val.trim()) form.setCamera(val);
  };
  const handleCustomPose = (val: string) => {
    setCustomPose(val);
    if (val.trim() && char0) form.updateCharacter(char0.id, "pose", val);
  };

  // Provider chips
  const providerChips = [
    { id: AIProvider.Gemini,    icon: "✦",  label: "Gemini",
      select: () => { form.setAiProvider(AIProvider.Gemini); form.setGeminiModel(GeminiImageModel.Flash2); } },
    { id: AIProvider.Fal,       icon: "⚡",  label: "FLUX",
      select: () => { form.setAiProvider(AIProvider.Fal); form.setFalModel(FalModel.KontextMulti); } },
    { id: AIProvider.OpenAI,    icon: "🤖", label: "GPT",
      select: () => { form.setAiProvider(AIProvider.OpenAI); form.setOpenaiModel(OpenAIModel.GptImage15); } },
    { id: AIProvider.Replicate, icon: "𝕏",  label: "Grok",
      select: () => { form.setAiProvider(AIProvider.Replicate); form.setReplicateModel(ReplicateModel.GrokImagine); } },
    { id: AIProvider.ModelsLab, icon: "🔞", label: "NSFW",
      select: () => { form.setAiProvider(AIProvider.ModelsLab); form.setModelsLabModel(ModelsLabModel.LustifySdxl); } },
  ];

  // Current sub-model label
  const activeSubLabel = (() => {
    if (form.aiProvider === AIProvider.Gemini)
      return GEMINI_SUBMODELS.find((m) => m.value === form.geminiModel)?.label ?? "NB2";
    if (form.aiProvider === AIProvider.Fal)
      return FLUX_SUBMODELS.find((m) => m.value === form.falModel)?.label ?? "Kontext Multi";
    if (form.aiProvider === AIProvider.OpenAI)
      return GPT_SUBMODELS.find((m) => m.value === form.openaiModel)?.label ?? "GPT Image 1.5";
    if (form.aiProvider === AIProvider.Replicate)
      return REPLICATE_MODEL_LABELS[form.replicateModel]?.name ?? "Grok Imagine";
    if (form.aiProvider === AIProvider.ModelsLab)
      return MODELSLAB_MODEL_LABELS[form.modelsLabModel]?.name ?? "Lustify SDXL";
    return "";
  })();

  const hasGallery = gallery.generatedHistory.length > 0;

  // Session pose helpers
  const addPose = () => {
    form.setSessionPoses((prev) => [
      ...prev,
      { id: `${Date.now()}-${Math.random()}`, text: "", images: [] },
    ]);
  };
  const removePose = (idx: number) => {
    form.setSessionPoses((prev) => prev.filter((_, i) => i !== idx));
  };
  const setPoseRefImage = (idx: number, file: File | null) => {
    form.updateSessionPose(idx, "images", file ? [file] : []);
  };

  // Use inspiration image → routes to the right form field
  const handleUseInspiration = (
    image: InspirationImage,
    target: "model" | "outfit" | "pose" | "scenario" | "accessory",
  ) => {
    const file = new File([image.blob], image.name, { type: image.blob.type });
    if (target === "scenario") {
      form.setScenarioImage([file]);
    } else if (char0) {
      switch (target) {
        case "model":
          form.updateCharacter(char0.id, "modelImages", [...char0.modelImages, file]);
          break;
        case "outfit":
          form.updateCharacter(char0.id, "outfitImages", [...(char0.outfitImages || []), file]);
          break;
        case "pose":
          form.updateCharacter(char0.id, "poseImage", file);
          break;
        case "accessory":
          form.updateCharacter(char0.id, "accessoryImages", [...(char0.accessoryImages || []), file]);
          break;
      }
    }
    setCenterTab("gallery");
  };

  // Load last generated image as base for editing
  const loadLastAsBase = async () => {
    const last = gallery.generatedHistory[0];
    if (!last?.url) return;
    try {
      const resp = await fetch(last.url);
      const blob = await resp.blob();
      const file = new File([blob], "base-image.png", { type: blob.type || "image/png" });
      form.setBaseImageForEdit(file);
      setLocalError(null);
    } catch {
      setLocalError("Could not load the image. Try uploading manually.");
    }
  };

  // Photo Session preset toggle — combines shots from selected presets
  const togglePreset = (presetId: string) => {
    setSelectedPresets((prev) => {
      const next = new Set(prev);
      if (next.has(presetId)) next.delete(presetId);
      else next.add(presetId);

      // Derive combined angle list (preserve preset order)
      const combined: string[] = [];
      PHOTO_SESSION_PRESETS.forEach((p) => {
        if (next.has(p.id)) combined.push(...p.shots);
      });
      const capped = combined.slice(0, 8);
      form.setPhotoSessionAngles(capped);
      form.setPhotoSessionCount(Math.max(2, capped.length));
      return next;
    });
  };

  // Validate and generate
  const handleDirectorGenerate = () => {
    setLocalError(null);
    if (studioMode === "session") {
      if (!form.baseImageForEdit) {
        setLocalError("Upload a reference photo first — drag it into the slot on the left.");
        return;
      }
    } else if (studioMode === "poses") {
      if (!form.baseImageForEdit) {
        setLocalError("Upload a base photo first — drag it into the 'Photo to repose' slot on the left.");
        return;
      }
      if (!form.sessionPoses[0]?.text && !form.sessionPoses[0]?.images.length) {
        setLocalError("Describe the new pose or upload a reference photo in the Pose 1 slot.");
        return;
      }
    } else if (studioMode === "ai") {
      if (!form.baseImageForEdit) {
        setLocalError("Upload a base photo first — drag it into the 'Photo to edit' slot on the left.");
        return;
      }
      if (form.aiEditEngine !== AIEditEngine.FaceSwapFal && !form.aiEditInstruction.trim()) {
        setLocalError("Write an edit instruction before applying.");
        return;
      }
      if (form.aiEditEngine === AIEditEngine.FaceSwapFal && !form.aiEditReferenceImage) {
        setLocalError("Upload the face photo to swap (Reference slot on the left).");
        return;
      }
    }

    // In create mode, warn if no face reference uploaded (credits will be spent)
    if (studioMode === "create") {
      const char0 = form.characters[0];
      const hasFace = char0 && char0.modelImages.length > 0;
      if (!hasFace && !showNoFaceWarning) {
        setShowNoFaceWarning(true);
        return;
      }
      setShowNoFaceWarning(false);
    }

    onGenerate();
  };

  // Generate button label per mode
  const generateLabel =
    studioMode === "session" ? "Shoot Session →" :
    studioMode === "poses" ? "Apply Poses →" :
    studioMode === "ai" ? "Apply Edit →" : "Direct →";

  // AI Edit: does selected engine support reference images?
  const aiEditNeedsRef =
    form.aiEditEngine === AIEditEngine.Gemini ||
    form.aiEditEngine === AIEditEngine.FaceSwapFal;
  const aiEditNeedsMultiRef =
    form.aiEditEngine === AIEditEngine.Flux2ProEdit ||
    form.aiEditEngine === AIEditEngine.Seedream5Edit;

  return (
    <div className="flex h-full bg-black overflow-hidden">

      {/* ─── Mobile overlay backdrop ─── */}
      {showMobilePanel && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setShowMobilePanel(false)}
        />
      )}

      {/* ─── Mobile Setup FAB ─── */}
      {!showMobilePanel && (
        <button
          className="md:hidden fixed bottom-20 left-4 z-30 flex items-center gap-2 pl-3 pr-4 py-2.5 rounded-full text-[12px] font-semibold text-white shadow-lg"
          style={{ background: 'linear-gradient(135deg,#FF5C35,#FFB347)', boxShadow: '0 4px 20px rgba(255,92,53,0.4)' }}
          onClick={() => setShowMobilePanel(true)}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Setup
        </button>
      )}

      {/* ─── Left: Panel (changes per mode) ─── */}
      <aside
        className={[
          'flex flex-col border-zinc-800/60 bg-zinc-950 overflow-y-auto custom-scrollbar',
          'transition-transform duration-300 ease-out',
          // Mobile: bottom sheet
          'fixed bottom-0 left-0 right-0 z-50 max-h-[85vh] rounded-t-2xl border-t',
          showMobilePanel ? 'translate-y-0' : 'translate-y-full',
          // Desktop: left sidebar (override mobile styles)
          'md:relative md:bottom-auto md:left-auto md:right-auto md:z-auto',
          'md:w-[300px] md:flex-none md:max-h-full md:rounded-none md:border-t-0 md:border-r',
          'md:translate-y-0 md:bg-zinc-950/80',
        ].join(' ')}
      >
        {/* Mobile drag handle + close (hidden on desktop) */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-zinc-800/40 shrink-0">
          <div className="w-8 h-1 rounded-full bg-zinc-700 mx-auto absolute left-1/2 -translate-x-1/2" />
          <span className="text-[12px] font-semibold" style={{ color: '#B8A9A5' }}>
            Setup
          </span>
          <button
            onClick={() => setShowMobilePanel(false)}
            className="opacity-50 hover:opacity-100 transition-opacity"
          >
            <X className="w-4 h-4 text-zinc-400" />
          </button>
        </div>

        {studioMode === "create" && (
          <div className="flex flex-col">
            {/* ── LIBRARY ── (order 2 = below Identity+Engine) */}
            <div style={{ order: 2 }}>
            <div className="px-4 pt-4 pb-1 flex items-center justify-between">
              <SectionLabel>Library</SectionLabel>
              <button
                onClick={handleSurpriseMe}
                title="Fill all fields with a curated random character preset"
                className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-lg transition-colors font-jet"
                style={{ color: '#8C7570', border: '1px solid #2A1F1C' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#FFB347'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,179,71,0.3)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#6B5A56'; (e.currentTarget as HTMLElement).style.borderColor = '#2A1F1C'; }}
              >
                🎲 Surprise
              </button>
            </div>

            <div className="px-4 pb-3">
              {charLib.savedCharacters.length === 0 && !isSavingMode ? (
                /* Empty state (4.1) */
                <div className="py-3 text-center">
                  <div
                    className="w-10 h-10 mx-auto mb-2.5 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(255,92,53,0.07)', border: '1px dashed rgba(255,92,53,0.22)' }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF5C35" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="12" cy="8" r="4"/>
                      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                      <path d="M12 14v6" opacity="0.4"/><path d="M9 18l3 3 3-3" opacity="0.4"/>
                    </svg>
                  </div>
                  <p className="text-[12px] font-semibold mb-0.5" style={{ color: '#B8A9A5' }}>Your characters will live here</p>
                  <p className="text-[10px] mb-2.5 leading-relaxed" style={{ color: '#8C7570' }}>Upload 1–3 reference photos to create your first AI character</p>
                  <button
                    onClick={() => setIsSavingMode(true)}
                    className="text-[10px] px-3 py-1 rounded-full font-jet transition-all"
                    style={{ background: 'rgba(255,92,53,0.1)', color: '#FF5C35', border: '1px solid rgba(255,92,53,0.22)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,92,53,0.18)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,92,53,0.1)'; }}
                  >
                    Create your first character →
                  </button>
                </div>
              ) : (
                /* Character chips row */
                <div className="flex items-start gap-2 overflow-x-auto pb-1 custom-scrollbar">
                  {charLib.savedCharacters.map((char) => (
                    <div key={char.id} className="relative flex-none">
                      <button
                        onClick={() => handleLoadCharacter(char)}
                        onContextMenu={(e) => { e.preventDefault(); setChipMenuId(char.id); setRenamingId(null); }}
                        title={`Load ${char.name}`}
                        className="flex flex-col items-center gap-1 group"
                      >
                        <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-zinc-800 group-hover:border-zinc-500 transition-colors bg-zinc-900 flex-none">
                          {char.thumbnail ? (
                            <img src={char.thumbnail} alt={char.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-500 text-[12px] font-bold">
                              {char.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] text-zinc-600 group-hover:text-zinc-400 truncate w-9 text-center leading-tight">
                          {char.name}
                        </span>
                      </button>

                      {/* Context menu (right-click) */}
                      {chipMenuId === char.id && (
                        <div
                          ref={chipMenuRef}
                          className="absolute top-full left-0 mt-1 z-50 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden min-w-[110px]"
                        >
                          {renamingId === char.id ? (
                            <div className="px-2 py-2">
                              <input
                                autoFocus
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    const n = renameValue.trim();
                                    if (n) charLib.renameCharacter(char.id, n);
                                    setRenamingId(null);
                                    setChipMenuId(null);
                                  }
                                  if (e.key === 'Escape') { setRenamingId(null); setChipMenuId(null); }
                                }}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-[12px] text-zinc-200 outline-none"
                                placeholder="New name…"
                              />
                            </div>
                          ) : (
                            <>
                              <button
                                onClick={() => { setRenamingId(char.id); setRenameValue(char.name); }}
                                className="w-full text-left px-3 py-2 text-[12px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                              >
                                Rename
                              </button>
                              <button
                                onClick={() => { charLib.deleteCharacter(char.id); setChipMenuId(null); }}
                                className="w-full text-left px-3 py-2 text-[12px] text-red-400 hover:text-red-300 hover:bg-zinc-800 transition-colors"
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* "+" chip at end of row */}
                  {!isSavingMode && (
                    <button
                      onClick={() => setIsSavingMode(true)}
                      title="Save current character"
                      className="flex-none w-9 h-9 rounded-full bg-zinc-900 border border-dashed border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800 flex items-center justify-center transition-all mt-0.5"
                    >
                      <Plus className="w-3 h-3 text-zinc-500" />
                    </button>
                  )}
                </div>
              )}

              {/* Inline save panel */}
              {isSavingMode && (
                <div className="mt-2 bg-zinc-900/60 border border-zinc-800 rounded-xl p-2.5 space-y-2">
                  {/* Image picker row */}
                  <div className="flex items-center gap-1.5">
                    {/* Selected image thumbnails */}
                    {savingImages.map((f, i) => (
                      <div key={i} className="relative flex-none w-8 h-8">
                        <BlobImg
                          file={f}
                          className="w-8 h-8 rounded-full object-cover border border-zinc-700"
                        />
                        <button
                          onClick={() => setSavingImages(prev => prev.filter((_, idx) => idx !== i))}
                          className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-zinc-950 border border-zinc-700 flex items-center justify-center"
                        >
                          <X className="w-2 h-2 text-zinc-400" />
                        </button>
                      </div>
                    ))}

                    {/* Placeholder slots */}
                    {savingImages.length === 0 && (
                      <div className="text-[10px] text-zinc-500 flex-1">
                        {(char0?.modelImages?.length ?? 0) > 0
                          ? `Using current face refs (${char0!.modelImages.length})`
                          : 'No face refs — add below'}
                      </div>
                    )}

                    {/* Spacer */}
                    <div className="flex-1" />

                    {/* Upload from local */}
                    {savingImages.length < 3 && (
                      <button
                        onClick={() => savingFileInputRef.current?.click()}
                        title="Upload from local"
                        className="flex-none w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 hover:border-zinc-500 hover:bg-zinc-700 flex items-center justify-center transition-all"
                      >
                        <Upload className="w-3 h-3 text-zinc-500" />
                      </button>
                    )}

                    {/* Pick from gallery */}
                    {savingImages.length < 3 && (
                      <button
                        onClick={() => setShowSavingGalleryPicker(p => !p)}
                        title="Pick from gallery"
                        className={`flex-none w-7 h-7 rounded-lg border flex items-center justify-center transition-all ${
                          showSavingGalleryPicker
                            ? 'bg-zinc-700 border-zinc-500 text-zinc-200'
                            : 'bg-zinc-800 border-zinc-700 hover:border-zinc-500 hover:bg-zinc-700 text-zinc-500'
                        }`}
                      >
                        <ImageIcon className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Gallery mini-picker */}
                  {showSavingGalleryPicker && (
                    <div className="grid grid-cols-4 gap-1 max-h-28 overflow-y-auto pr-0.5">
                      {gallery.generatedHistory.length === 0 ? (
                        <p className="col-span-4 text-[10px] text-zinc-500 text-center py-2">No images in gallery yet</p>
                      ) : (
                        gallery.generatedHistory.map(item => (
                          <button
                            key={item.id}
                            onClick={() => handleSavingGalleryPick(item)}
                            className="aspect-square rounded-lg overflow-hidden border border-zinc-800 hover:border-zinc-500 transition-all"
                          >
                            <img src={item.url} className="w-full h-full object-cover" alt="" />
                          </button>
                        ))
                      )}
                    </div>
                  )}

                  {/* Name + Save/Cancel row */}
                  <div className="flex items-center gap-1.5">
                    <input
                      ref={saveNameInputRef}
                      value={savingName}
                      onChange={(e) => setSavingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveCharacter();
                        if (e.key === 'Escape') { setIsSavingMode(false); setSavingName(''); setSavingImages([]); setShowSavingGalleryPicker(false); }
                      }}
                      placeholder="Character name…"
                      className="flex-1 min-w-0 bg-zinc-950 border border-zinc-700 focus:border-zinc-500 rounded-xl px-3 py-1.5 text-[12px] text-zinc-200 outline-none placeholder:text-zinc-500 transition-colors"
                    />
                    <button
                      onClick={handleSaveCharacter}
                      disabled={!savingName.trim()}
                      className="px-2 py-1.5 rounded-xl bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-zinc-200 text-[10px] font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => { setIsSavingMode(false); setSavingName(''); setSavingImages([]); setShowSavingGalleryPicker(false); }}
                      className="p-1.5 rounded-xl hover:bg-zinc-900 text-zinc-600 hover:text-zinc-400 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}

              {/* Hidden file input for local upload */}
              <input
                ref={savingFileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleSavingLocalFiles}
              />
            </div>

            </div>{/* end Library order wrapper */}

            {/* ── IDENTITY ── (order 0 = top of panel) */}
            <div style={{ order: 0 }}>
            <AccordionSection
              label="Identity"
              isOpen={openSections.identity}
              onToggle={() => toggleSection('identity')}
              filled={(char0?.modelImages.length ?? 0) > 0 || (char0?.characteristics ?? '').trim().length > 0 ? Math.min(2, (char0?.modelImages.length ?? 0) + ((char0?.characteristics ?? '').trim().length > 0 ? 1 : 0)) : 0}
              total={2}
              statusText={(char0?.modelImages?.length ?? 0) > 0 ? `✓ ${char0!.modelImages.length} face ref` : '⚠ No face'}
            >
              {/* Face slots */}
              <div className="px-4 pb-3">
                <div className="flex gap-2 flex-wrap">
                  {[0, 1, 2].map((i) => (
                    <FaceSlot
                      key={i}
                      file={char0?.modelImages[i] ?? null}
                      onFile={(f) => char0 && setFace(char0.id, i, f)}
                      label={`Face ${i + 1}`}
                    />
                  ))}
                </div>
                <p className="text-[10px] text-zinc-500 mt-2 leading-relaxed">
                  Upload 1–3 reference photos for identity
                </p>
              </div>

              {/* Characteristics — Visual Builder */}
              <div className="px-4 pb-3">
                <CharacteristicsInput
                  value={char0?.characteristics ?? ""}
                  onChange={(v) => char0 && form.updateCharacter(char0.id, "characteristics", v)}
                />
              </div>
            </AccordionSection>
            </div>{/* end Identity order wrapper */}

            {/* Dim sections if no character face uploaded */}
            {(char0?.modelImages.length ?? 0) === 0 && (
              <div style={{ order: 1 }} className="flex items-center justify-center py-3">
                <span className="text-[10px] font-jet px-3 py-1.5 rounded-lg" style={{ background: '#161110', border: '1px solid #2A1F1C', color: '#8C7570' }}>
                  Upload a face photo first
                </span>
              </div>
            )}
            <div style={{ order: 1, ...((char0?.modelImages.length ?? 0) === 0 ? { opacity: 0.4, pointerEvents: 'none' as const } : {}) }}>

            {/* Engine / Provider */}
            <AccordionSection
              label="Engine"
              isOpen={openSections.engine}
              onToggle={() => toggleSection('engine')}
              filled={1}
              total={1}
              statusText={`${providerChips.find(c => c.id === form.aiProvider)?.label ?? 'Gemini'}`}
            >
              <div className="px-4 pb-2">
                <div className="flex gap-1.5">
                  {providerChips.map((chip) => {
                    const TIPS: Record<string, { speed: string; best: string; cost: number; needsFace?: boolean; time: string }> = {
                      [AIProvider.Gemini]:    { speed: '⚡ Fast',   best: 'Fast & versatile. No face photo required.', cost: 2, needsFace: false, time: '~5s' },
                      [AIProvider.Fal]:       { speed: '🔥 Quality', best: 'High fidelity with face consistency.', cost: 10, needsFace: true, time: '~15s' },
                      [AIProvider.OpenAI]:    { speed: '💎 Premium', best: 'Rich detail & text rendering.', cost: 20, needsFace: false, time: '~20s' },
                      [AIProvider.Replicate]: { speed: '⚡ Fast',   best: 'Strong creative interpretation.', cost: 12, needsFace: false, time: '~12s' },
                      [AIProvider.ModelsLab]: { speed: '🔥 Quality', best: 'Uncensored generation.', cost: 8, needsFace: true, time: '~10s' },
                    };
                    const tip = TIPS[chip.id];
                    const costColor = (tip?.cost ?? 2) <= 5 ? '#4ADE80' : (tip?.cost ?? 2) <= 10 ? '#FFB347' : '#FF5C35';
                    const hasFaceUploaded = (char0?.modelImages?.length ?? 0) > 0;
                    const needsFaceWarning = tip?.needsFace && !hasFaceUploaded && form.aiProvider === chip.id;
                    return (
                      <div key={chip.id} className="relative group/tip flex-1">
                        <button
                          onClick={() => { chip.select(); setShowSubModels(true); }}
                          className={`w-full flex flex-col items-center gap-1.5 py-2.5 px-1 rounded-lg border text-center transition-all ${
                            form.aiProvider === chip.id
                              ? needsFaceWarning
                                ? "bg-white/8 border-amber-500/60 text-white"
                                : "bg-white/8 border-zinc-500 text-white"
                              : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-200"
                          }`}
                        >
                          <span className="text-lg leading-none">{chip.icon}</span>
                          <span className="text-[10px] font-semibold">{chip.label}</span>
                          <span className="text-[8px] font-jet font-bold" style={{ color: costColor }}>⚡{tip?.cost ?? 2}</span>
                          {needsFaceWarning && (
                            <span className="text-[7px]" style={{ color: '#FFB347' }}>📷 needs face</span>
                          )}
                        </button>
                        {/* Tooltip */}
                        {tip && (
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150 pointer-events-none w-[140px]">
                            <div className="rounded-xl p-2 shadow-2xl text-left" style={{ background: '#161110', border: '1px solid #2A1F1C' }}>
                              <p className="text-[10px] font-bold font-jet mb-0.5" style={{ color: '#FF5C35' }}>{chip.label}</p>
                              <p className="text-[10px] font-jet mb-0.5" style={{ color: '#B8A9A5' }}>{tip.speed} · {tip.time}</p>
                              <p className="text-[10px] leading-snug mb-0.5" style={{ color: '#8C7570' }}>{tip.best}</p>
                              {tip.needsFace && (
                                <p className="text-[8px] font-jet" style={{ color: '#FFB347' }}>📷 Requires face photo</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Sub-model selector */}
              <div className="px-4 pb-3">
                <button
                  onClick={() => setShowSubModels(!showSubModels)}
                  className="w-full flex items-center justify-between px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-[12px] text-zinc-400 hover:border-zinc-600 hover:text-zinc-200 transition-all"
                >
                  <span className="truncate">{activeSubLabel}</span>
                  <ChevronDown className={`w-3 h-3 flex-none ml-1 transition-transform ${showSubModels ? "rotate-180" : ""}`} />
                </button>

                {showSubModels && (
                  <div className="mt-1.5 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                    {form.aiProvider === AIProvider.Gemini && GEMINI_SUBMODELS.map((m) => (
                      <button key={m.value}
                        onClick={() => { form.setGeminiModel(m.value); setShowSubModels(false); }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-[12px] transition-colors text-left hover:bg-white/5 ${
                          form.geminiModel === m.value ? "bg-white/8 text-white" : "text-zinc-400"
                        }`}
                      >
                        <span className="truncate">{m.label}</span>
                        {m.badge && <Badge text={m.badge} />}
                      </button>
                    ))}
                    {form.aiProvider === AIProvider.Fal && FLUX_SUBMODELS.map((m) => (
                      <button key={m.value}
                        onClick={() => { form.setFalModel(m.value); setShowSubModels(false); }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-[12px] transition-colors text-left hover:bg-white/5 ${
                          form.falModel === m.value ? "bg-white/8 text-white" : "text-zinc-400"
                        }`}
                      >
                        <span className="truncate">{m.label}</span>
                        {m.badge && <Badge text={m.badge} />}
                      </button>
                    ))}
                    {form.aiProvider === AIProvider.OpenAI && GPT_SUBMODELS.map((m) => (
                      <button key={m.value}
                        onClick={() => { form.setOpenaiModel(m.value); setShowSubModels(false); }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-[12px] transition-colors text-left hover:bg-white/5 ${
                          form.openaiModel === m.value ? "bg-white/8 text-white" : "text-zinc-400"
                        }`}
                      >
                        <span className="truncate">{m.label}</span>
                        {m.badge && <Badge text={m.badge} />}
                      </button>
                    ))}
                    {form.aiProvider === AIProvider.Replicate && GROK_SUBMODELS.map((m) => (
                      <button key={m.value}
                        onClick={() => { form.setReplicateModel(m.value); setShowSubModels(false); }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-[12px] transition-colors text-left hover:bg-white/5 ${
                          form.replicateModel === m.value ? "bg-white/8 text-white" : "text-zinc-400"
                        }`}
                      >
                        <span className="truncate">{m.label}</span>
                        {m.badge && <Badge text={m.badge} />}
                      </button>
                    ))}
                    {form.aiProvider === AIProvider.ModelsLab && MODELSLAB_SUBMODELS.map((m) => (
                      <button key={m.value}
                        onClick={() => { form.setModelsLabModel(m.value); setShowSubModels(false); }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-[12px] transition-colors text-left hover:bg-white/5 ${
                          form.modelsLabModel === m.value ? "bg-white/8 text-white" : "text-zinc-400"
                        }`}
                      >
                        <span className="truncate">{m.label}</span>
                        {m.badge && <span className="text-[10px]">{m.badge}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </AccordionSection>

            {/* ── COSTUME ── */}
            <AccordionSection
              label="Costume"
              isOpen={openSections.costume}
              onToggle={() => toggleSection('costume')}
              filled={((char0?.outfitImages?.length ?? 0) > 0 ? 1 : 0) + ((char0?.outfitDescription ?? '').trim().length > 0 ? 1 : 0)}
              total={2}
              statusText={(char0?.outfitDescription ?? '').trim() || 'Not set'}
            >
              {/* Outfit image reference + text */}
              <div className="px-4 pb-2 flex gap-2 items-start">
                <FaceSlot
                  file={char0?.outfitImages?.[0] ?? null}
                  onFile={(f) => char0 && setOutfitImage(char0.id, f)}
                  label="Outfit ref"
                  size="sm"
                />
                <textarea
                  value={char0?.outfitDescription ?? ""}
                  onChange={(e) => char0 && form.updateCharacter(char0.id, "outfitDescription", e.target.value)}
                  placeholder="Outfit — fabric, color, style..."
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-[12px] text-zinc-200 outline-none resize-none placeholder:text-zinc-500 focus:border-zinc-600 transition-colors leading-relaxed"
                  rows={3}
                />
              </div>
              {/* Quick chips with selection feedback */}
              <div className="px-4 pb-3 flex flex-wrap gap-1">
                {['Streetwear', 'Editorial', 'Casual chic', 'Swimwear', 'Formal'].map((chip) => {
                  const isChipActive = (char0?.outfitDescription ?? '').toLowerCase().includes(chip.toLowerCase());
                  return (
                    <button
                      key={chip}
                      onClick={() => char0 && form.updateCharacter(char0.id, 'outfitDescription', isChipActive ? '' : chip)}
                      className="text-[10px] px-2 py-0.5 rounded-full transition-all duration-150 font-jet"
                      style={isChipActive
                        ? { background: 'rgba(255,92,53,0.15)', border: '1px solid #FF5C35', color: '#FFB347' }
                        : { background: 'rgba(255,255,255,0.04)', border: '1px solid #2A1F1C', color: '#8C7570' }
                      }
                      onMouseEnter={e => { if (!isChipActive) { (e.currentTarget as HTMLElement).style.color = '#D4C8C4'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,92,53,0.4)'; }}}
                      onMouseLeave={e => { if (!isChipActive) { (e.currentTarget as HTMLElement).style.color = '#6B5A56'; (e.currentTarget as HTMLElement).style.borderColor = '#2A1F1C'; }}}
                    >
                      {isChipActive ? '✓' : '+'} {chip}
                    </button>
                  );
                })}
              </div>
            </AccordionSection>

            {/* ── POSE ── */}
            <AccordionSection
              label="Pose"
              isOpen={openSections.pose}
              onToggle={() => toggleSection('pose')}
              filled={(char0?.pose ? 1 : 0) + (char0?.poseImage ? 1 : 0)}
              total={2}
              statusText={char0?.pose ? POSE_OPTIONS.find(p => p.value === char0.pose)?.label ?? 'Custom' : 'Default'}
            >
              <div className="px-4 pb-2 grid grid-cols-3 gap-1.5">
                {POSE_OPTIONS.map((pose) => {
                  const isActive = char0?.pose === pose.value;
                  return (
                    <button
                      key={pose.id}
                      title={pose.value}
                      onClick={() => {
                        const next = isActive ? "" : pose.value;
                        if (char0) form.updateCharacter(char0.id, "pose", next);
                        setCustomPose("");
                      }}
                      className={`relative group/pose flex flex-col items-center gap-1 py-2.5 rounded-xl border text-center transition-all ${
                        isActive
                          ? "bg-white/10 border-zinc-500 text-white"
                          : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-200"
                      }`}
                    >
                      <span className="text-base leading-none">{pose.icon}</span>
                      <span className="text-[10px] font-medium">{pose.label}</span>
                      {/* Tooltip with pose description */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50 opacity-0 group-hover/pose:opacity-100 transition-opacity duration-150 pointer-events-none w-[130px]">
                        <div className="rounded-lg px-2 py-1.5 shadow-xl text-center" style={{ background: '#161110', border: '1px solid #2A1F1C' }}>
                          <p className="text-[8px] leading-snug" style={{ color: '#B8A9A5' }}>{pose.value}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              {/* Pose: custom text + reference image */}
              <div className="px-4 pb-1 flex gap-2 items-center">
                <FaceSlot
                  file={char0?.poseImage ?? null}
                  onFile={(f) => char0 && setPoseImage(char0.id, f)}
                  label="Pose ref"
                  size="sm"
                />
                <input
                  value={customPose}
                  onChange={(e) => handleCustomPose(e.target.value)}
                  placeholder="e.g. arms crossed, looking away, dynamic"
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-[12px] text-zinc-200 outline-none placeholder:text-zinc-500 focus:border-zinc-600 transition-colors"
                />
              </div>
              {char0?.poseImage && (
                <p className="px-4 pb-3 text-[10px] text-emerald-600">
                  ✓ Pose reference loaded — will guide generation
                </p>
              )}
              {!char0?.poseImage && (
                <p className="px-4 pb-3 text-[10px] text-zinc-500">
                  Upload a pose reference photo to guide generation
                </p>
              )}
            </AccordionSection>
            </div>{/* end dim wrapper */}

            {/* Divider */}
            <div className="mx-4 border-t border-zinc-800/60 mb-3" style={{ order: 3 }} />

            {/* ── CHARACTER 2 ── */}
            <div className="px-4 pb-4" style={{ order: 3 }}>
              <button
                onClick={() => setShowChar2(!showChar2)}
                className="w-full flex items-center justify-between text-[10px] font-bold text-zinc-600 uppercase tracking-widest hover:text-zinc-400 transition-colors py-1"
                title="Add a second character for couple or group scenes"
              >
                <span>+ Add second character</span>
                <span>{showChar2 ? "▲" : "▼"}</span>
              </button>
              {!showChar2 && (
                <p className="text-[10px] mt-0.5" style={{ color: '#8C7570' }}>For duo / couple / group scenes</p>
              )}
              {showChar2 && char1 && (
                <div className="mt-3 space-y-3">
                  <div className="flex gap-2">
                    {[0, 1].map((i) => (
                      <FaceSlot key={i} file={char1.modelImages[i] ?? null}
                        onFile={(f) => setFace(char1.id, i, f)} label={`Face ${i + 1}`} />
                    ))}
                  </div>
                  <div className="flex gap-2 items-start">
                    <FaceSlot
                      file={char1.outfitImages?.[0] ?? null}
                      onFile={(f) => setOutfitImage(char1.id, f)}
                      label="Outfit"
                      size="sm"
                    />
                    <textarea
                      value={char1.outfitDescription}
                      onChange={(e) => form.updateCharacter(char1.id, "outfitDescription", e.target.value)}
                      placeholder="Character 2 outfit..."
                      className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-[12px] text-zinc-200 outline-none resize-none placeholder:text-zinc-500 focus:border-zinc-600 transition-colors"
                      rows={2}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── POSES MODE ── */}
        {studioMode === "poses" && (
          <>
            <div className="px-4 pt-5 pb-2 flex items-center justify-between">
              <SectionLabel>Base Image <span className="text-red-500 ml-0.5">*</span></SectionLabel>
              {hasGallery && !form.baseImageForEdit && (
                <button
                  onClick={loadLastAsBase}
                  className="text-[10px] text-zinc-500 hover:text-zinc-200 transition-colors"
                >
                  Use last ↑
                </button>
              )}
            </div>
            <div className="px-4 pb-3">
              <FaceSlot
                file={form.baseImageForEdit}
                onFile={(f) => { form.setBaseImageForEdit(f); setLocalError(null); }}
                label="Photo to repose"
                size="lg"
              />
              <p className={`text-[10px] mt-2 ${form.baseImageForEdit ? "text-emerald-600" : "text-amber-700"}`}>
                {form.baseImageForEdit ? "✓ Base image loaded" : "Required — upload the photo you want to repose"}
              </p>
            </div>

            <div className="mx-4 border-t border-zinc-800/60 mb-3" />

            <div className="px-4 pb-2">
              <SectionLabel>Engine</SectionLabel>
            </div>
            <div className="px-4 pb-3">
              <div className="flex gap-1 p-1 bg-zinc-900 rounded-lg border border-zinc-800">
                {POSE_ENGINE_OPTIONS.map(({ engine, color }) => {
                  const label = POSE_ENGINE_LABELS[engine];
                  const isActive = form.poseEngine === engine;
                  return (
                    <button
                      key={engine}
                      onClick={() => form.setPoseEngine(engine)}
                      title={label.description}
                      className={`flex-1 py-1.5 text-[10px] font-medium rounded-md transition-all flex items-center justify-center gap-0.5 ${
                        isActive ? `${color} text-white shadow-sm` : "text-zinc-500 hover:text-zinc-200"
                      }`}
                    >
                      <span>{label.icon}</span>
                      <span>{label.name}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-zinc-600 mt-1.5 leading-relaxed px-0.5">
                {POSE_ENGINE_LABELS[form.poseEngine].description}
              </p>
            </div>

            <div className="mx-4 border-t border-zinc-800/60 mb-3" />

            <div className="px-4 pb-2 flex items-center justify-between">
              <SectionLabel>Session Poses</SectionLabel>
              <button
                onClick={addPose}
                className="text-[10px] text-zinc-500 hover:text-zinc-200 transition-colors flex items-center gap-0.5"
              >
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>

            <div className="px-4 pb-4 space-y-3">
              {form.sessionPoses.map((pose, i) => (
                <div key={pose.id} className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider">
                      Pose {i + 1}
                    </span>
                    {pose.images.length > 0 && (
                      <span className="text-[10px] text-purple-400">✓ Image</span>
                    )}
                    {i > 0 && (
                      <button
                        onClick={() => removePose(i)}
                        className="text-[10px] text-zinc-600 hover:text-red-400 transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2 items-start">
                    <FaceSlot
                      file={pose.images[0] ?? null}
                      onFile={(f) => setPoseRefImage(i, f)}
                      label="Ref"
                      size="sm"
                    />
                    <textarea
                      value={pose.text}
                      onChange={(e) => form.updateSessionPose(i, "text", e.target.value)}
                      placeholder="Describe the pose... e.g. sitting on steps, looking right"
                      className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-2 text-[12px] text-zinc-200 outline-none resize-none placeholder:text-zinc-500 focus:border-zinc-600 transition-colors leading-relaxed"
                      rows={3}
                    />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── PHOTO SESSION MODE ── */}
        {studioMode === "session" && (
          <>
            {/* Reference photo */}
            <div className="px-4 pt-5 pb-2 flex items-center justify-between">
              <SectionLabel>Reference <span className="text-red-500 ml-0.5">*</span></SectionLabel>
              {hasGallery && !form.baseImageForEdit && (
                <button onClick={loadLastAsBase} className="text-[10px] text-zinc-500 hover:text-zinc-200 transition-colors">
                  Use last ↑
                </button>
              )}
            </div>
            <div className="px-4 pb-3">
              <FaceSlot
                file={form.baseImageForEdit}
                onFile={(f) => { form.setBaseImageForEdit(f); setLocalError(null); }}
                label="Visual reference"
                size="lg"
              />
              <p className={`text-[10px] mt-2 leading-relaxed ${form.baseImageForEdit ? "text-emerald-600" : "text-amber-700"}`}>
                {form.baseImageForEdit ? "✓ Face, outfit & scene will be preserved" : "Upload the photo to anchor the session"}
              </p>
            </div>

            <div className="mx-4 border-t border-zinc-800/60 mb-3" />

            {/* Preset selector */}
            <div className="px-4 pb-2 flex items-center justify-between">
              <SectionLabel>Style</SectionLabel>
              {selectedPresets.size > 0 && (
                <button
                  onClick={() => {
                    setSelectedPresets(new Set());
                    form.setPhotoSessionAngles([]);
                    form.setPhotoSessionCount(4);
                  }}
                  className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="px-4 pb-1">
              <p className="text-[10px] text-zinc-500 mb-2 leading-relaxed">
                Select one or more styles to combine
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {PHOTO_SESSION_PRESETS.map((preset) => {
                  const isActive = selectedPresets.has(preset.id);
                  return (
                    <button
                      key={preset.id}
                      onClick={() => togglePreset(preset.id)}
                      title={PRESET_TOOLTIPS[preset.id] || preset.label}
                      className={`flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl border text-center transition-all ${
                        isActive
                          ? "bg-white/10 border-zinc-400 text-white"
                          : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-200"
                      }`}
                    >
                      <span className="text-lg leading-none">{preset.icon}</span>
                      <span className="text-[10px] font-semibold leading-tight">{preset.label}</span>
                      <span className={`text-[8px] leading-none ${isActive ? "text-zinc-400" : "text-zinc-500"}`}>
                        {preset.shots.length} shots
                      </span>
                    </button>
                  );
                })}
              </div>
              {selectedPresets.size > 0 && (
                <div className="mt-2 px-1 py-1.5 bg-zinc-900/60 border border-zinc-800 rounded-lg">
                  <p className="text-[10px] text-zinc-400 text-center">
                    <span className="font-bold text-white">{form.photoSessionAngles.length}</span>
                    {form.photoSessionAngles.length === 8 ? " shots (max)" : " shots combined"}
                    {" · "}{Array.from(selectedPresets).map(id => PHOTO_SESSION_PRESETS.find(p => p.id === id)?.label).join(" + ")}
                  </p>
                </div>
              )}
            </div>

            <div className="mx-4 border-t border-zinc-800/60 my-3" />

            {/* Count stepper */}
            <div className="px-4 pb-2">
              <SectionLabel>Photos to shoot</SectionLabel>
            </div>
            <div className="px-4 pb-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => form.setPhotoSessionCount(Math.max(2, form.photoSessionCount - 1))}
                  className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-600 transition-all"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <div className="flex-1 text-center">
                  <span className="text-2xl font-black text-white">{form.photoSessionCount}</span>
                  <p className="text-[10px] text-zinc-600 mt-0.5">of {selectedPresets.size > 0 ? form.photoSessionAngles.length : "8"} available</p>
                </div>
                <button
                  onClick={() => form.setPhotoSessionCount(Math.min(selectedPresets.size > 0 ? form.photoSessionAngles.length : 8, form.photoSessionCount + 1))}
                  className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-600 transition-all"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
              {selectedPresets.size === 0 && (
                <p className="text-[10px] text-zinc-500 mt-2 leading-relaxed text-center">
                  No style selected — using default camera angles
                </p>
              )}
            </div>

            <div className="mx-4 border-t border-zinc-800/60 mb-3" />

            {/* Model selector */}
            <div className="px-4 pb-2">
              <SectionLabel>Engine</SectionLabel>
            </div>
            <div className="px-4 pb-5">
              <div className="flex gap-2">
                <button
                  onClick={() => form.setPhotoSessionModel('nb2')}
                  className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl border text-center transition-all ${
                    form.photoSessionModel === 'nb2'
                      ? "bg-violet-700/30 border-violet-500 text-white"
                      : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-200"
                  }`}
                >
                  <span className="text-sm leading-none">✦</span>
                  <span className="text-[10px] font-bold">NB2</span>
                  <span className="text-[8px] text-zinc-500 leading-tight">Gemini Flash 2</span>
                </button>
                <button
                  onClick={() => form.setPhotoSessionModel('grok')}
                  className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl border text-center transition-all ${
                    form.photoSessionModel === 'grok'
                      ? "bg-zinc-600/30 border-zinc-400 text-white"
                      : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-200"
                  }`}
                >
                  <span className="text-sm leading-none">𝕏</span>
                  <span className="text-[10px] font-bold">Grok</span>
                  <span className="text-[8px] text-zinc-500 leading-tight">Aurora · fal.ai</span>
                </button>
              </div>
              <p className="text-[10px] text-zinc-500 mt-2 leading-relaxed text-center">
                {form.photoSessionModel === 'grok'
                  ? "Sequential · ~4s/shot · $0.022 per image"
                  : "Parallel · 3 concurrent · Gemini API"}
              </p>
            </div>
          </>
        )}

        {/* ── AI EDIT MODE ── */}
        {studioMode === "ai" && (
          <>
            <div className="px-4 pt-5 pb-2 flex items-center justify-between">
              <SectionLabel>Base Image <span className="text-red-500 ml-0.5">*</span></SectionLabel>
              {hasGallery && !form.baseImageForEdit && (
                <button
                  onClick={loadLastAsBase}
                  className="text-[10px] text-zinc-500 hover:text-zinc-200 transition-colors"
                >
                  Use last ↑
                </button>
              )}
            </div>
            <div className="px-4 pb-3">
              <FaceSlot
                file={form.baseImageForEdit}
                onFile={(f) => { form.setBaseImageForEdit(f); setLocalError(null); }}
                label="Photo to edit"
                size="lg"
              />
              <p className={`text-[10px] mt-2 ${form.baseImageForEdit ? "text-emerald-600" : "text-amber-700"}`}>
                {form.baseImageForEdit ? "✓ Base image loaded" : "Required — upload the photo you want to edit"}
              </p>
            </div>

            <div className="mx-4 border-t border-zinc-800/60 mb-3" />

            <div className="px-4 pb-2">
              <SectionLabel>Engine</SectionLabel>
            </div>
            <div className="px-4 pb-1">
              <div className="flex flex-wrap gap-1">
                {AI_EDIT_ENGINES.map(({ engine, icon, label, color }) => {
                  const isActive = form.aiEditEngine === engine;
                  return (
                    <button
                      key={engine}
                      onClick={() => form.setAiEditEngine(engine)}
                      className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-medium border transition-all ${
                        isActive
                          ? `${color} border-transparent text-white shadow-sm`
                          : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-200"
                      }`}
                    >
                      <span>{icon}</span>
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-zinc-600 mt-2 mb-3 leading-relaxed px-0.5">
                {AI_EDIT_ENGINES.find((e) => e.engine === form.aiEditEngine)?.desc}
              </p>
            </div>

            {/* Instruction */}
            {form.aiEditEngine !== AIEditEngine.FaceSwapFal && (
              <div className="px-4 pb-3">
                <p className="text-[10px] text-zinc-600 mb-1.5">Instruction</p>
                <textarea
                  value={form.aiEditInstruction}
                  onChange={(e) => form.setAiEditInstruction(e.target.value)}
                  placeholder={
                    form.aiEditEngine === AIEditEngine.Seedream5Edit
                      ? "e.g. Change the outfit in Figure 1 to the outfit in Figure 2. Keep same pose and face."
                      : form.aiEditEngine === AIEditEngine.Flux2ProEdit
                        ? "e.g. Transform into a 3D photorealistic portrait in a cyberpunk city at night."
                        : "e.g. Add a golden halo of light around the head, add glowing particles in the air..."
                  }
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-[12px] text-zinc-200 outline-none resize-none placeholder:text-zinc-500 focus:border-zinc-600 transition-colors leading-relaxed"
                  rows={4}
                />
              </div>
            )}

            {/* Single reference image — Gemini or Face Swap */}
            {(aiEditNeedsRef) && (
              <div className="px-4 pb-3">
                <p className="text-[10px] text-zinc-600 mb-1.5">
                  {form.aiEditEngine === AIEditEngine.FaceSwapFal ? "Face to apply" : "Reference image (optional)"}
                </p>
                <FaceSlot
                  file={form.aiEditReferenceImage}
                  onFile={form.setAiEditReferenceImage}
                  label={form.aiEditEngine === AIEditEngine.FaceSwapFal ? "Face photo" : "Reference"}
                />
                <p className="text-[10px] text-zinc-500 mt-1.5 leading-relaxed">
                  {form.aiEditEngine === AIEditEngine.FaceSwapFal
                    ? "Close-up face photo to swap onto the base image"
                    : "Visual reference for the effect to apply"}
                </p>
              </div>
            )}

            {/* Multi-reference images — FLUX.2 / Seedream */}
            {aiEditNeedsMultiRef && (
              <div className="px-4 pb-3">
                <p className="text-[10px] text-zinc-600 mb-1.5">
                  {form.aiEditEngine === AIEditEngine.Seedream5Edit
                    ? "References (Figure 2, 3…)"
                    : "Reference images (optional)"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {form.aiEditReferenceImages.map((f, i) => (
                    <div key={i} className="relative w-[56px] h-[56px] rounded-xl overflow-hidden border-2 border-zinc-800 group">
                      <BlobImg file={f} className="w-full h-full object-cover" />
                      <button
                        onClick={() => form.setAiEditReferenceImages((prev) => prev.filter((_, j) => j !== i))}
                        className="absolute inset-0 bg-black/0 group-hover:bg-black/50 flex items-center justify-center transition-colors"
                      >
                        <X className="w-3 h-3 text-white opacity-0 group-hover:opacity-100" />
                      </button>
                    </div>
                  ))}
                  {form.aiEditReferenceImages.length < 9 && (
                    <label className="w-[56px] h-[56px] rounded-xl border-2 border-dashed border-zinc-700 hover:border-zinc-500 bg-zinc-900 flex flex-col items-center justify-center cursor-pointer transition-colors text-zinc-600 hover:text-zinc-400">
                      <Plus className="w-4 h-4" />
                      <span className="text-[10px] mt-0.5">Add</span>
                      <input type="file" accept="image/*" className="hidden" multiple
                        onChange={(e) => {
                          const files = Array.from(e.target.files ?? []);
                          form.setAiEditReferenceImages((prev) => [...prev, ...files].slice(0, 9));
                          e.target.value = "";
                        }}
                      />
                    </label>
                  )}
                </div>
                <p className="text-[10px] text-zinc-500 mt-1.5 leading-relaxed">
                  {form.aiEditEngine === AIEditEngine.Seedream5Edit
                    ? "These become Figure 2, Figure 3, etc. in your prompt"
                    : "Character, outfit, or scenario references"}
                </p>
              </div>
            )}
          </>
        )}
      </aside>

      {/* ─── Center: Gallery / Assets ─── */}
      <div className="flex-1 relative overflow-hidden flex flex-col bg-black">

        {/* Mode + Tab bar */}
        <div className="flex items-center gap-1 px-4 py-2 border-b border-zinc-800/60 bg-zinc-950/80 shrink-0 flex-wrap">
          {/* Studio mode tabs — Create is dominant */}
          <button
            onClick={() => handleSetStudioMode("create")}
            title="Generate new images from your character"
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${studioMode === "create" ? "text-white" : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900"}`}
            style={studioMode === "create" ? { background: 'linear-gradient(135deg,#FF5C35,#FFB347)', color: '#fff' } : undefined}
          >
            ✦ Create
          </button>
          <button
            onClick={() => handleSetStudioMode("poses")}
            title="Repose an existing image"
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${studioMode === "poses" ? "bg-zinc-800 text-white" : "text-zinc-600 hover:text-zinc-400 hover:bg-zinc-900"}`}
          >
            🎭 Poses
          </button>
          <button
            onClick={() => handleSetStudioMode("ai")}
            title="Edit images with AI instructions"
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${studioMode === "ai" ? "bg-zinc-800 text-white" : "text-zinc-600 hover:text-zinc-400 hover:bg-zinc-900"}`}
          >
            ✨ AI Edit
          </button>
          <button
            onClick={() => handleSetStudioMode("session")}
            title="Generate a batch photo session"
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${studioMode === "session" ? "bg-zinc-800 text-white" : "text-zinc-600 hover:text-zinc-400 hover:bg-zinc-900"}`}
          >
            📷 Photo Session
          </button>

          {/* Gallery / Assets sub-tabs — only in Create mode */}
          {studioMode === "create" && (
            <div className="ml-auto flex items-center gap-1">
              <button
                onClick={() => setCenterTab("gallery")}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${centerTab === "gallery" ? "bg-zinc-800 text-white" : "text-zinc-600 hover:text-zinc-400 hover:bg-zinc-900"}`}
              >
                Gallery
              </button>
              <button
                onClick={() => setCenterTab("assets")}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${centerTab === "assets" ? "bg-zinc-800 text-white" : "text-zinc-600 hover:text-zinc-400 hover:bg-zinc-900"}`}
              >
                Assets
              </button>
            </div>
          )}
        </div>

        {/* Error banner */}
        {(localError || gallery.error) && (
          <div className="shrink-0 mx-4 mt-3 flex items-start gap-2 px-3 py-2.5 bg-red-950/60 border border-red-800/60 rounded-xl animate-in fade-in duration-200">
            <span className="text-red-400 text-sm leading-none mt-0.5">⚠</span>
            <p className="text-[12px] text-red-300 leading-relaxed flex-1">
              {localError || gallery.error}
            </p>
            <button
              onClick={() => { setLocalError(null); gallery.setError(null); }}
              className="text-red-500 hover:text-red-300 transition-colors shrink-0"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Skeleton loader — generating with no gallery yet */}
        {isGenerating && !hasGallery && (
          <div className="absolute inset-0 z-10 p-6 grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="skeleton-shimmer rounded-2xl aspect-square" style={{ animationDelay: `${i * 150}ms` }} />
            ))}
          </div>
        )}

        {/* Generating overlay */}
        {isGenerating && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 rounded-full border-2 animate-spin" style={{ borderColor: 'rgba(255,92,53,0.2)', borderTopColor: '#FF5C35' }} />
              <div className="text-sm font-medium" style={{ color: '#B8A9A5' }}>
                {studioMode === "session" ? `Shooting ${form.photoSessionCount} angles…` :
                 studioMode === "poses" ? "Changing pose…" :
                 studioMode === "ai" ? "Applying edit…" : "Directing…"}
              </div>
              {progress > 0 && (
                <div className="w-48 h-1 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-300" style={{ width: `${progress}%`, background: 'linear-gradient(90deg,#FF5C35,#FFB347)' }} />
                </div>
              )}
              <button onClick={onStopGeneration} className="mt-2 text-xs transition-colors flex items-center gap-1.5" style={{ color: '#8C7570' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#fff'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#6B5A56'}
              >
                <X className="w-3.5 h-3.5" /> Stop
              </button>
            </div>
          </div>
        )}

        {/* Gallery (shown in all modes when there's content) */}
        {(studioMode !== "create" || centerTab === "gallery") && (
          hasGallery ? (
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <GalleryGrid
                onDownload={onDownload}
                onEdit={onEdit}
                onReuse={onReuse}
                onChangePose={onChangePose}
                onUpscale={onUpscale}
                upscalingId={upscalingId}
                onOpenMobileMenu={() => {}}
                onCaption={onCaption}
                onRemoveBg={onRemoveBg}
                onFaceSwap={onFaceSwap}
                onSkinEnhance={onSkinEnhance}
                onRelight={onRelight}
                onInpaint={onInpaint}
                onTryOn={onTryOn}
                onStoryboard={onAddToStoryboard}
                onCopyToClipboard={onCopyToClipboard}
              />
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
              {studioMode === "poses" ? (
                <>
                  <div className="text-5xl mb-4">🎭</div>
                  <h2 className="text-2xl font-black text-white mb-3">Change Poses</h2>
                  <p className="text-zinc-600 text-sm max-w-xs leading-relaxed">
                    Upload a base photo, choose an engine, describe or upload pose references — then apply.
                  </p>
                </>
              ) : studioMode === "ai" ? (
                <>
                  <div className="text-5xl mb-4">✨</div>
                  <h2 className="text-2xl font-black text-white mb-3">AI Edit</h2>
                  <p className="text-zinc-600 text-sm max-w-xs leading-relaxed">
                    Upload a photo, choose an engine, write an instruction — and transform it with AI.
                  </p>
                </>
              ) : studioMode === "session" ? (
                <>
                  <div className="text-5xl mb-4">📷</div>
                  <h2 className="text-2xl font-black text-white mb-3">Photo Session</h2>
                  <p className="text-zinc-600 text-sm max-w-xs leading-relaxed">
                    Upload a reference photo — AI generates multiple shots from different camera angles, keeping the same subject, outfit and scene.
                  </p>
                  <div className="mt-6 flex items-center gap-2 text-zinc-600 text-xs">
                    {["1. Upload reference", "2. Set count", "📷 Shoot"].map((step, i, arr) => (
                      <React.Fragment key={step}>
                        <span className="px-2 py-1 bg-zinc-900 border border-zinc-800 rounded-lg">{step}</span>
                        {i < arr.length - 1 && <span className="text-zinc-500">→</span>}
                      </React.Fragment>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-white/20 mb-6 tracking-tighter leading-none">
                    DIRECT<br />YOUR SHOT
                  </h2>
                  <p className="text-zinc-600 text-base font-light mb-10 max-w-xs leading-relaxed">
                    Upload a face reference, choose a costume, set the scene — then direct.
                  </p>
                  <div className="flex items-center gap-2 text-zinc-600 text-xs">
                    {["1. Face", "2. Costume", "3. Scene", "✦ Direct"].map((step, i, arr) => (
                      <React.Fragment key={step}>
                        <span className="px-2 py-1 bg-zinc-900 border border-zinc-800 rounded-lg">{step}</span>
                        {i < arr.length - 1 && <span className="text-zinc-500">→</span>}
                      </React.Fragment>
                    ))}
                  </div>
                  <p className="mt-8 text-[12px] text-zinc-500">
                    💡 Once generated, hover images to Edit · Change Pose · Face Swap · Inpaint
                  </p>
                </>
              )}
            </div>
          )
        )}

        {/* Assets tab — only in Create mode */}
        {studioMode === "create" && centerTab === "assets" && (
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <InspirationBoard
              images={gallery.inspirationImages}
              onAdd={gallery.addInspiration}
              onDelete={gallery.deleteInspiration}
              onUse={handleUseInspiration}
            />
          </div>
        )}
      </div>

      {/* ─── Right: SHOT Panel ─── */}
      <aside className="w-[260px] flex-none flex flex-col border-l border-zinc-800/60 bg-zinc-950/80 overflow-y-auto custom-scrollbar">

        {/* Show Lighting/Camera only in Create mode */}
        {studioMode === "create" && (
          <>
            {/* ── LIGHTING ── */}
            <div className="px-4 pt-5 pb-2">
              <SectionLabel>Lighting</SectionLabel>
            </div>
            <div className="px-4 pb-2 grid grid-cols-3 gap-1.5">
              {LIGHTING_OPTIONS.map((opt) => {
                const isActive = form.lighting === opt.value;
                return (
                  <button key={opt.id}
                    onClick={() => { form.setLighting(isActive ? "" : opt.value); setCustomLighting(""); }}
                    className={`flex flex-col items-center gap-1 py-3 rounded-xl border text-center transition-all ${
                      isActive ? "bg-white/10 border-zinc-500 text-white"
                        : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-200"
                    }`}
                  >
                    <span className="text-base leading-none">{opt.icon}</span>
                    <span className="text-[10px] font-medium leading-tight">{opt.label}</span>
                  </button>
                );
              })}
            </div>
            <div className="px-4 pb-3">
              <input
                value={customLighting}
                onChange={(e) => handleCustomLighting(e.target.value)}
                placeholder="e.g. Rembrandt light, warm 3200K, soft shadows"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-[12px] text-zinc-200 outline-none placeholder:text-zinc-500 focus:border-zinc-600 transition-colors"
              />
            </div>

            {/* Divider */}
            <div className="mx-4 border-t border-zinc-800/60 mb-3" />

            {/* ── CAMERA ── */}
            <div className="px-4 pb-2">
              <SectionLabel>Camera</SectionLabel>
            </div>
            <div className="px-4 pb-2 grid grid-cols-3 gap-1.5">
              {CAMERA_OPTIONS.map((opt) => {
                const isActive = form.camera === opt.value;
                return (
                  <button key={opt.id}
                    onClick={() => { form.setCamera(isActive ? "" : opt.value); setCustomCamera(""); }}
                    className={`flex flex-col items-center gap-1 py-3 rounded-xl border text-center transition-all ${
                      isActive ? "bg-white/10 border-zinc-500 text-white"
                        : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-200"
                    }`}
                  >
                    <span className="text-base leading-none">{opt.icon}</span>
                    <span className="text-[10px] font-medium leading-tight">{opt.label}</span>
                  </button>
                );
              })}
            </div>
            <div className="px-4 pb-3">
              <input
                value={customCamera}
                onChange={(e) => handleCustomCamera(e.target.value)}
                placeholder="e.g. 85mm f/1.4, shallow DOF, eye level"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-[12px] text-zinc-200 outline-none placeholder:text-zinc-500 focus:border-zinc-600 transition-colors"
              />
            </div>

            {/* Divider */}
            <div className="mx-4 border-t border-zinc-800/60 mb-3" />
          </>
        )}

        {studioMode !== "create" && <div className="pt-5" />}

        {/* ── FORMAT (always visible) ── */}
        <div className="px-4 pb-2">
          <SectionLabel>Format</SectionLabel>
        </div>

        {/* Aspect ratio */}
        <div className="px-4 pb-3">
          <p className="text-[10px] text-zinc-500 mb-2">Aspect Ratio</p>
          <div className="flex flex-col gap-1">
            {AR_OPTIONS.map((o) => (
              <button
                key={o.value}
                onClick={() => form.setAspectRatio(o.value)}
                className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-[12px] border transition-all ${
                  form.aspectRatio === o.value
                    ? "bg-white/10 border-zinc-500 text-white"
                    : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-200"
                }`}
              >
                <span className="font-semibold">{o.label}</span>
                <span className="text-[10px] text-zinc-600">{o.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Resolution */}
        <div className="px-4 pb-3">
          <p className="text-[10px] text-zinc-500 mb-2">Resolution</p>
          <div className="flex gap-1.5">
            {SIZE_OPTIONS.map((o) => (
              <button
                key={o.value}
                onClick={() => form.setImageSize(o.value)}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-medium border transition-all ${
                  form.imageSize === o.value
                    ? "bg-white/10 border-zinc-500 text-white"
                    : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-200"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="mx-4 border-t border-zinc-800/60 mb-3" />

        {/* ── SCENE (only in Create mode) ── */}
        {studioMode === "create" && (
          <>
            <div className="px-4 pb-2">
              <SectionLabel>Scene</SectionLabel>
            </div>
            <div className="px-4 pb-3">
              <textarea
                value={form.scenario}
                onChange={(e) => form.setScenario(e.target.value)}
                placeholder="Location, atmosphere, context... e.g. rooftop Tokyo, night"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-[12px] text-zinc-200 outline-none resize-none placeholder:text-zinc-500 focus:border-zinc-600 transition-colors leading-relaxed"
                rows={3}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !isGenerating) {
                    e.preventDefault();
                    onGenerate();
                  }
                }}
              />
            </div>
          </>
        )}

        {/* Variations stepper — hidden in session mode (count managed in left panel) */}
        {studioMode !== "session" && (
          <div className="px-4 pb-3 flex items-center justify-between">
            <span className="text-[10px] text-zinc-600">
              {studioMode === "poses" ? "Poses" : "Variations"}
            </span>
            <div className="flex items-center gap-1.5 px-2 py-1 bg-zinc-900 border border-zinc-800 rounded-xl">
              {studioMode === "create" ? (
                <>
                  <button onClick={() => form.setNumberOfImages(Math.max(1, form.numberOfImages - 1))}
                    className="text-zinc-400 hover:text-white transition-colors"><Minus className="w-3 h-3" /></button>
                  <span className="text-xs text-zinc-200 w-4 text-center">{form.numberOfImages}</span>
                  <button onClick={() => form.setNumberOfImages(Math.min(4, form.numberOfImages + 1))}
                    className="text-zinc-400 hover:text-white transition-colors"><Plus className="w-3 h-3" /></button>
                </>
              ) : (
                <>
                  <button onClick={() => form.setEditNumberOfImages(Math.max(1, form.editNumberOfImages - 1))}
                    className="text-zinc-400 hover:text-white transition-colors"><Minus className="w-3 h-3" /></button>
                  <span className="text-xs text-zinc-200 w-4 text-center">{form.editNumberOfImages}</span>
                  <button onClick={() => form.setEditNumberOfImages(Math.min(4, form.editNumberOfImages + 1))}
                    className="text-zinc-400 hover:text-white transition-colors"><Plus className="w-3 h-3" /></button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Sticky Generate bar with credit indicator */}
        <div className="sticky bottom-0 z-[60] px-4 pb-4 pt-3 mt-auto" style={{ background: 'linear-gradient(to top, rgba(9,9,11,1) 60%, rgba(9,9,11,0))' }}>
          {/* Credit cost pill */}
          {!isGenerating && (
            <div className="flex items-center justify-center gap-2 mb-2 text-[12px] font-jet">
              <span style={{ color: '#FFB347' }}>⚡ {directorCreditCost} credits</span>
              <span style={{ color: '#2A1F1C' }}>·</span>
              <span style={{ color: sub.credits < 20 ? '#EF4444' : sub.credits < 100 ? '#F59E0B' : '#6B5A56' }}>
                {sub.isUnlimited ? '∞ remaining' : `${sub.credits.toLocaleString('en-US')} remaining`}
              </span>
            </div>
          )}
          <button
            onClick={isGenerating ? onStopGeneration : () => { setShowMobilePanel(false); handleDirectorGenerate(); }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all active:scale-95"
            style={isGenerating
              ? { background: 'linear-gradient(135deg,#FF5C35,#FFB347)', color: '#fff' }
              : { background: 'linear-gradient(135deg,#FF5C35,#FFB347)', color: '#fff', boxShadow: '0 4px 24px rgba(255,92,53,0.35)' }
            }
          >
            {isGenerating ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                Generating…
              </>
            ) : (
              <><Sparkles className="w-3.5 h-3.5" /> {generateLabel}</>
            )}
          </button>
        </div>
      </aside>

      {/* ─── Quick Start modal (4.3) ─── */}
      {showQuickStart && createPortal(
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center p-6"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
          onClick={dismissQuickStart}
        >
          <div
            className="relative w-full max-w-sm rounded-2xl p-7 animate-in zoom-in-95 fade-in duration-300"
            style={{ background: '#0D0A0A', border: '1px solid #2A1F1C' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={dismissQuickStart}
              className="absolute top-4 right-4 opacity-40 hover:opacity-80 transition-opacity"
            >
              <X className="w-4 h-4 text-zinc-400" />
            </button>

            {/* Icon */}
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
              style={{ background: 'rgba(255,92,53,0.08)', border: '1px solid rgba(255,92,53,0.18)' }}
            >
              <Sparkles className="w-5 h-5" style={{ color: '#FF5C35' }} />
            </div>

            {/* Copy */}
            <h2 className="text-[17px] font-bold text-white mb-2 leading-snug">
              Welcome to Director Studio
            </h2>
            <p className="text-[13px] leading-relaxed mb-6" style={{ color: '#8C7570' }}>
              Build AI influencers with full control over identity, outfit, lighting, and camera. Start with a random preset or build from scratch.
            </p>

            {/* Actions */}
            <div className="flex flex-col gap-2.5">
              <button
                onClick={handleQuickStartGenerate}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02] active:scale-95 text-white"
                style={{ background: 'linear-gradient(135deg,#FF5C35,#FFB347)' }}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Generate Example →
              </button>
              <button
                onClick={dismissQuickStart}
                className="w-full py-2.5 rounded-xl text-[13px] font-medium transition-colors"
                style={{ color: '#8C7570' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#B8A9A5'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#6B5A56'; }}
              >
                Start from scratch
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      {/* ─── No-face warning modal ─── */}
      {showNoFaceWarning && createPortal(
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center p-6"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
          onClick={() => setShowNoFaceWarning(false)}
        >
          <div
            className="relative w-full max-w-sm rounded-2xl p-7 animate-in zoom-in-95 fade-in duration-300"
            style={{ background: '#0D0A0A', border: '1px solid #2A1F1C' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: '#FF5C3515', color: '#FF5C35' }}>
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold mb-2" style={{ color: '#F5EDE8' }}>No face reference uploaded</h3>
            <p className="text-sm mb-5" style={{ color: '#8C7570' }}>
              Without reference photos, the AI won't maintain character consistency. The result will be a random face. Credits will still be consumed.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowNoFaceWarning(false)}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold transition-colors"
                style={{ color: '#8C7570', border: '1px solid #2A1F1C' }}
              >
                Upload Photos
              </button>
              <button
                onClick={() => { setShowNoFaceWarning(false); onGenerate(); }}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-white transition-all hover:scale-[1.02] active:scale-95"
                style={{ background: 'linear-gradient(135deg,#FF5C35,#FFB347)' }}
              >
                Continue Anyway
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default DirectorStudio;
