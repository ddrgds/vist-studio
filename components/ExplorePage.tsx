import React, { useRef } from "react";
import {
  Sparkles,
  Zap,
  Users,
  Film,
  ArrowRight,
  ChevronDown,
  Image as ImageIcon,
  Video as VideoIcon,
} from "lucide-react";
import { useGallery } from "../contexts/GalleryContext";

// ─── Types ────────────────────────────────────────────────────────────────────

type AppWorkspace =
  | "explore"
  | "generate"
  | "director"
  | "storyboard"
  | "create"
  | "video"
  | "influencer";

interface ExplorePageProps {
  onNavigate: (workspace: AppWorkspace, mode?: string, modelId?: string) => void;
}

// ─── Feature Data ─────────────────────────────────────────────────────────────

const FEATURES = [
  {
    id: "generate",
    icon: <Sparkles className="w-5 h-5" />,
    title: "AI Generator",
    subtitle: "10+ models in one place",
    description:
      "FLUX Kontext, Gemini Flash, GPT Image 1.5, Ideogram V3 — switch instantly and compare results.",
    workspace: "generate" as AppWorkspace,
    mode: "create",
    accent: "#FF5C35",
  },
  {
    id: "director",
    icon: <Users className="w-5 h-5" />,
    title: "Director Studio",
    subtitle: "Consistent characters",
    description:
      "Upload face references, define outfits and characteristics. Save characters to your library and reuse them in every session.",
    workspace: "director" as AppWorkspace,
    accent: "#FFB347",
  },
  {
    id: "video",
    icon: <Film className="w-5 h-5" />,
    title: "Video Generation",
    subtitle: "Kling AI & Runway Gen-3",
    description:
      "Turn still images into cinematic video clips with smooth motion and consistent character identity across frames.",
    workspace: "generate" as AppWorkspace,
    mode: "video",
    accent: "#FF7A5A",
  },
  {
    id: "storyboard",
    icon: <Zap className="w-5 h-5" />,
    title: "Storyboard",
    subtitle: "Plan your campaigns",
    description:
      "Collect generated images and videos into narrative sequences. Build complete content campaigns, frame by frame.",
    workspace: "storyboard" as AppWorkspace,
    accent: "#FFCA7A",
  },
];

// ─── Placeholder cells for empty gallery state ────────────────────────────────

const PLACEHOLDERS = [
  { h: 220, bg: "linear-gradient(160deg,#261C18,#1A1110)" },
  { h: 150, bg: "linear-gradient(135deg,#201914,#2A1F1C)" },
  { h: 280, bg: "linear-gradient(150deg,#241A16,#1C1412)" },
  { h: 200, bg: "linear-gradient(140deg,#281E1A,#1E1614)" },
  { h: 160, bg: "linear-gradient(155deg,#221714,#261C18)" },
  { h: 240, bg: "linear-gradient(135deg,#1E1614,#2A1F1C)" },
];

// ─── Stats ────────────────────────────────────────────────────────────────────

const BASE_COUNT = 12_400; // "seed" number for social proof

// ─── ExplorePage ──────────────────────────────────────────────────────────────

const ExplorePage: React.FC<ExplorePageProps> = ({ onNavigate }) => {
  const gallery = useGallery();
  const examplesRef = useRef<HTMLElement>(null);

  const realImages = gallery.generatedHistory
    .filter((item) => item.type !== "video" && item.url)
    .slice(0, 9);

  const hasImages = realImages.length > 0;
  const totalGenerated = BASE_COUNT + gallery.generatedHistory.length;

  const scrollToExamples = () => {
    examplesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="w-full h-full overflow-y-auto text-white pb-16 lg:pb-0" style={{ background: "#0D0A0A" }}>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative px-4 sm:px-8 pt-10 sm:pt-14 pb-10 sm:pb-12 overflow-hidden">
        {/* Ambient glow */}
        <div
          className="absolute top-0 left-1/4 w-[600px] h-[400px] rounded-full blur-[120px] pointer-events-none"
          style={{ background: "rgba(255,92,53,0.07)" }}
        />
        <div
          className="absolute top-10 right-1/4 w-[400px] h-[300px] rounded-full blur-[100px] pointer-events-none"
          style={{ background: "rgba(255,179,71,0.05)" }}
        />

        <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-12">
          {/* Left: headline + CTAs */}
          <div className="w-full sm:flex-shrink-0 sm:max-w-[320px]">
            <p
              className="text-[11px] font-bold tracking-[0.2em] uppercase mb-4 font-jet"
              style={{ color: "#FF5C35" }}
            >
              AI Influencer Studio
            </p>
            <h1
              className="text-[38px] sm:text-5xl font-black tracking-tight leading-[0.95] uppercase font-display"
              style={{ color: "#F5EDE8" }}
            >
              Build Your
              <br />
              <span className="text-gradient-brand">AI Influencer.</span>
            </h1>
            <p className="mt-5 text-sm leading-relaxed" style={{ color: "#B8A9A5" }}>
              Generate photorealistic images and videos of your virtual
              character across 10+ AI models — in seconds.
            </p>

            <div className="mt-7 flex items-center gap-3">
              <button
                onClick={() => onNavigate("generate", "create")}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white active:scale-[0.97] transition-transform hover:scale-[1.02]"
                style={{
                  background: "linear-gradient(135deg, #FF5C35, #FFB347)",
                  boxShadow: "0 4px 24px rgba(255,92,53,0.35)",
                  fontFamily: "var(--font-display)",
                }}
              >
                <Sparkles className="w-4 h-4" />
                Start Free
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              {hasImages && (
                <button
                  onClick={scrollToExamples}
                  className="flex items-center gap-1.5 text-sm font-medium transition-colors"
                  style={{ color: "#6B5A56" }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.color = "#B8A9A5";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.color = "#6B5A56";
                  }}
                >
                  See examples
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Micro-stat */}
            <p className="mt-6 text-[11px] font-jet" style={{ color: "#4A3A36" }}>
              {totalGenerated.toLocaleString()}+ images created
            </p>
          </div>

          {/* Right: masonry gallery preview */}
          <div className="w-full sm:flex-1 sm:min-w-0 overflow-hidden rounded-2xl" style={{ maxHeight: 340 }}>
            <MasonryPreview
              images={hasImages ? realImages.map((i) => i.url) : null}
              onNavigate={onNavigate}
            />
          </div>
        </div>
      </section>

      {/* ── Divider ──────────────────────────────────────────────────────── */}
      <div className="mx-8 accent-line" />

      {/* ── FEATURES ─────────────────────────────────────────────────────── */}
      <section className="px-4 sm:px-8 pt-10 pb-12 max-w-[1400px] mx-auto">
        <div className="mb-7">
          <h2
            className="text-[11px] font-black tracking-widest uppercase font-display"
            style={{ color: "#FF5C35" }}
          >
            Everything you need
          </h2>
          <p className="text-xs mt-1" style={{ color: "#6B5A56" }}>
            One studio for your entire AI influencer workflow
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {FEATURES.map((feat) => (
            <FeatureCard key={feat.id} feature={feat} onNavigate={onNavigate} />
          ))}
        </div>
      </section>

      {/* ── Divider ──────────────────────────────────────────────────────── */}
      <div className="mx-8 accent-line" />

      {/* ── GALLERY (Examples) ────────────────────────────────────────────── */}
      {hasImages && (
        <section ref={examplesRef} className="px-4 sm:px-8 pt-10 pb-12 max-w-[1400px] mx-auto">
          <div className="flex items-end justify-between mb-6">
            <div>
              <h2
                className="text-[11px] font-black tracking-widest uppercase font-display"
                style={{ color: "#FF5C35" }}
              >
                Your creations
              </h2>
              <p className="text-xs mt-1" style={{ color: "#6B5A56" }}>
                {gallery.generatedHistory.length} image
                {gallery.generatedHistory.length !== 1 ? "s" : ""} in your studio
              </p>
            </div>
            <button
              onClick={() => onNavigate("generate", "create")}
              className="flex items-center gap-1 text-xs transition-colors rounded-full px-3 py-1.5"
              style={{ color: "#6B5A56", border: "1px solid #2A1F1C" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.color = "#FF5C35";
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,92,53,0.4)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.color = "#6B5A56";
                (e.currentTarget as HTMLElement).style.borderColor = "#2A1F1C";
              }}
            >
              Generate more
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Masonry columns */}
          <div className="columns-2 md:columns-3 lg:columns-4 gap-2">
            {realImages.map((item, idx) => (
              <button
                key={item.id}
                onClick={() => onNavigate("generate", "create")}
                className="block w-full mb-2 break-inside-avoid overflow-hidden rounded-xl group relative"
              >
                <img
                  src={item.url}
                  alt={`Generated image ${idx + 1}`}
                  className="w-full h-auto object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-xl" />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── SOCIAL PROOF ─────────────────────────────────────────────────── */}
      <section className="px-4 sm:px-8 pb-12 max-w-[1400px] mx-auto">
        <div
          className="rounded-2xl p-5 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 sm:gap-8"
          style={{ background: "#161110", border: "1px solid #2A1F1C" }}
        >
          <div className="flex gap-6 sm:gap-12 flex-shrink-0">
            <Stat value={totalGenerated.toLocaleString() + "+"} label="Images generated" />
            <Stat value="10+" label="AI models" />
            <Stat value="4" label="Providers" />
          </div>

          <div className="flex-1 max-w-md">
            <p className="text-xs leading-relaxed" style={{ color: "#6B5A56" }}>
              VIST Studio connects Gemini, FAL.ai, Replicate, and OpenAI into a single workflow.
              Upload once, generate everywhere — images, videos, edits, and storyboards from one canvas.
            </p>
          </div>

          <div className="flex-shrink-0">
            <button
              onClick={() => onNavigate("director")}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white active:scale-[0.97] hover:scale-[1.02] transition-transform"
              style={{
                background: "linear-gradient(135deg, #FF5C35, #FFB347)",
                boxShadow: "0 4px 24px rgba(255,92,53,0.3)",
                fontFamily: "var(--font-display)",
              }}
            >
              <Users className="w-4 h-4" />
              Open Director
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

// ─── Masonry Preview ──────────────────────────────────────────────────────────

const MasonryPreview: React.FC<{
  images: string[] | null;
  onNavigate: (workspace: AppWorkspace, mode?: string) => void;
}> = ({ images, onNavigate }) => {
  const cells = images ?? PLACEHOLDERS.map((_, i) => null as string | null);
  const display = images ? images.slice(0, 6) : PLACEHOLDERS;

  return (
    <div
      className="grid gap-1.5 h-full"
      style={{ gridTemplateColumns: "1fr 1fr 1fr", gridTemplateRows: "auto auto" }}
    >
      {(images ? images.slice(0, 6) : PLACEHOLDERS).map((item, idx) => {
        // Give middle column items in first row a taller treatment
        const isLarge = idx === 1;
        const heightStyle =
          images
            ? { height: isLarge ? 220 : 160, objectFit: "cover" as const }
            : { height: (PLACEHOLDERS[idx] as typeof PLACEHOLDERS[number]).h };

        return (
          <div
            key={idx}
            className="relative overflow-hidden rounded-xl"
            style={{ gridRow: isLarge ? "span 1" : undefined }}
          >
            {images ? (
              <img
                src={item as string}
                alt={`Example ${idx + 1}`}
                className="w-full h-full object-cover"
                style={{ height: isLarge ? 220 : 160 }}
                loading="lazy"
              />
            ) : (
              <div
                className="w-full skeleton-shimmer"
                style={{
                  height: (PLACEHOLDERS[idx] as typeof PLACEHOLDERS[number]).h,
                  background: (PLACEHOLDERS[idx] as typeof PLACEHOLDERS[number]).bg,
                }}
              >
                {/* Shimmer overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div
                    className="w-6 h-6 rounded-full"
                    style={{ background: "rgba(255,92,53,0.08)" }}
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* CTA overlay on last cell if no images */}
      {!images && (
        <button
          onClick={() => onNavigate("generate", "create")}
          className="absolute inset-0 flex items-center justify-center"
          style={{ background: "rgba(13,10,10,0)" }}
        />
      )}
    </div>
  );
};

// ─── Feature Card ─────────────────────────────────────────────────────────────

const FeatureCard: React.FC<{
  feature: (typeof FEATURES)[number];
  onNavigate: (workspace: AppWorkspace, mode?: string) => void;
}> = ({ feature, onNavigate }) => (
  <button
    onClick={() => onNavigate(feature.workspace, feature.mode)}
    className="text-left p-5 rounded-2xl border transition-all group hover:-translate-y-0.5 active:scale-[0.98]"
    style={{ background: "#161110", border: "1px solid #2A1F1C" }}
    onMouseEnter={(e) => {
      (e.currentTarget as HTMLElement).style.borderColor = `${feature.accent}40`;
    }}
    onMouseLeave={(e) => {
      (e.currentTarget as HTMLElement).style.borderColor = "#2A1F1C";
    }}
  >
    {/* Icon */}
    <div
      className="w-9 h-9 rounded-xl flex items-center justify-center mb-4"
      style={{ background: `${feature.accent}18`, color: feature.accent }}
    >
      {feature.icon}
    </div>

    {/* Text */}
    <div className="flex items-start justify-between gap-2 mb-1">
      <span className="text-sm font-bold text-white leading-tight">{feature.title}</span>
      <ArrowRight
        className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-0.5"
        style={{ color: feature.accent }}
      />
    </div>
    <p className="text-[10px] font-jet mb-2" style={{ color: feature.accent + "CC" }}>
      {feature.subtitle}
    </p>
    <p className="text-xs leading-relaxed" style={{ color: "#6B5A56" }}>
      {feature.description}
    </p>
  </button>
);

// ─── Stat ─────────────────────────────────────────────────────────────────────

const Stat: React.FC<{ value: string; label: string }> = ({ value, label }) => (
  <div>
    <div
      className="text-2xl font-black tracking-tight font-display"
      style={{ color: "#F5EDE8" }}
    >
      {value}
    </div>
    <div className="text-[11px] mt-0.5 font-jet" style={{ color: "#6B5A56" }}>
      {label}
    </div>
  </div>
);

export default ExplorePage;
