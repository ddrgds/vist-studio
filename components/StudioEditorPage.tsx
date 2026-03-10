import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { AppPage } from './SidebarNav';
import {
  PersonStanding,
  Repeat2,
  Sun,
  Camera,
  Box,
  Image,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Share2,
  Download,
  ChevronDown,
  Upload,
  Search,
  ToggleLeft,
  ToggleRight,
  Grid3X3,
  Eye,
  X,
  Wand2,
  Loader2,
  Lock,
  Zap,
} from 'lucide-react';
import { editImageWithAI, faceSwapWithGemini, modifyInfluencerPose } from '../services/geminiService';
import { useProfile } from '../contexts/ProfileContext';
import { useToast } from '../contexts/ToastContext';
import { useGallery } from '../contexts/GalleryContext';
import { GeminiImageModel, OPERATION_CREDIT_COSTS, ImageSize, AspectRatio } from '../types';
import type { GeneratedContent } from '../types';

/* ───────────────────── Types ───────────────────── */

type ToolId = 'pose' | 'faceswap' | 'relight' | 'camera' | 'objects' | 'scenes' | 'aiedit';

interface SliderDef { label: string; value: number; min: number; max: number; unit: string; }

/* ───────────────────── Color palette ───────────────────── */

const C = {
  bg: '#0D0A0A',
  card: '#0F0C0C',
  cardHover: '#141010',
  border: '#1A1210',
  borderHover: '#2A1E1A',
  accent: '#FF5C35',
  accentDim: 'rgba(255,92,53,0.15)',
  accentHover: '#FF7A5A',
  text: '#F5EDE8',
  textSec: '#B8A9A5',
  textMuted: '#6B5A56',
  textFaint: '#4A3A36',
} as const;

/* ───────────────────── Helpers ───────────────────── */

/** Convert a data URL or blob URL to a File object. */
async function urlToFile(url: string, name: string): Promise<File> {
  const res = await fetch(url);
  const blob = await res.blob();
  return new File([blob], name, { type: blob.type || 'image/png' });
}

/* ───────────────────── Tool definitions ───────────────────── */

const TOOLS: { id: ToolId; label: string; Icon: React.ElementType }[] = [
  { id: 'pose', label: 'Pose', Icon: PersonStanding },
  { id: 'faceswap', label: 'Face Swap', Icon: Repeat2 },
  { id: 'relight', label: 'Relight', Icon: Sun },
  { id: 'camera', label: 'Camera', Icon: Camera },
  { id: 'objects', label: 'Objects', Icon: Box },
  { id: 'scenes', label: 'Scenes', Icon: Image },
  { id: 'aiedit', label: 'AI Edit', Icon: Wand2 },
];

/* ───────────────────── AI Model definitions ───────────────────── */

type StudioModelId = 'gemini-flash' | 'gemini-pro' | 'flux-kontext' | 'gpt-image' | 'grok' | 'nsfw-modelslab';

interface StudioModel {
  id: StudioModelId;
  label: string;
  cost: number;
  supportsRefPhoto: boolean;
  locked?: boolean;
  lockReason?: string;
}

const STUDIO_MODELS: StudioModel[] = [
  { id: 'gemini-flash', label: 'Gemini Flash', cost: 2, supportsRefPhoto: false },
  { id: 'gemini-pro', label: 'Gemini Pro', cost: 5, supportsRefPhoto: false },
  { id: 'flux-kontext', label: 'FLUX Kontext', cost: 10, supportsRefPhoto: true },
  { id: 'gpt-image', label: 'GPT Image 1.5', cost: 20, supportsRefPhoto: true },
  { id: 'grok', label: 'Grok', cost: 12, supportsRefPhoto: false },
  { id: 'nsfw-modelslab', label: 'NSFW Edit', cost: 15, supportsRefPhoto: false, locked: true, lockReason: 'NSFW models require age verification and a Studio+ plan.' },
];

/* ───────────────────── Reusable tiny components ───────────────────── */

function AiBadge() {
  return (
    <span
      style={{
        background: C.accentDim,
        color: C.accent,
        fontSize: 10,
        fontWeight: 700,
        padding: '2px 7px',
        borderRadius: 6,
        letterSpacing: '0.05em',
        lineHeight: 1,
      }}
    >
      AI
    </span>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h4
      style={{
        fontSize: 10,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: C.textMuted,
        margin: '18px 0 10px',
      }}
    >
      {children}
    </h4>
  );
}

function Slider({ label, value, min, max, unit, onChange }: SliderDef & { onChange: (v: number) => void }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: C.textSec }}>{label}</span>
        <span style={{ fontSize: 12, color: C.text, fontWeight: 600 }}>
          {value}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: C.accent }}
      />
    </div>
  );
}

function ApplyButton({ label, loading, disabled, onClick }: { label: string; loading?: boolean; disabled?: boolean; onClick?: () => void }) {
  const [hovered, setHovered] = useState(false);
  const isDisabled = loading || disabled;
  return (
    <button
      onClick={isDisabled ? undefined : onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%',
        padding: '12px 0',
        borderRadius: 10,
        border: 'none',
        background: isDisabled ? C.textMuted : hovered ? C.accentHover : C.accent,
        color: '#fff',
        fontWeight: 700,
        fontSize: 13,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        transition: 'background 150ms',
        marginTop: 12,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        opacity: isDisabled ? 0.7 : 1,
      }}
    >
      {loading && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
      {loading ? 'Applying...' : label}
    </button>
  );
}

const Chip: React.FC<{ label: string; active?: boolean; onClick?: () => void }> = ({ label, active, onClick }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '6px 14px',
        borderRadius: 8,
        border: `1px solid ${active ? C.accent : hovered ? C.borderHover : C.border}`,
        background: active ? C.accentDim : hovered ? C.cardHover : C.card,
        color: active ? C.accent : C.textSec,
        fontSize: 12,
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'all 150ms',
      }}
    >
      {label}
    </button>
  );
}

function ToggleSwitch({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
      }}
    >
      <span style={{ fontSize: 12, color: C.textSec }}>{label}</span>
      <button
        onClick={() => onChange(!checked)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: checked ? C.accent : C.textMuted, padding: 0 }}
      >
        {checked ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
      </button>
    </div>
  );
}

/* ───────────────────── TOOL PANELS ───────────────────── */

/* ─── Pose Panel ─── */
function PosePanel({ onApply, loading, disabled }: { onApply: (pose: string) => void; loading: boolean; disabled: boolean }) {
  const [activePose, setActivePose] = useState('standing');
  const poses = ['Standing', 'Sitting', 'Walking', 'Posing', 'Running', 'Leaning'];
  const poseIcons = ['🧍', '🪑', '🚶', '💃', '🏃', '😌'];

  const sliderDefs: SliderDef[] = [
    { label: 'Head', value: 0, min: -90, max: 90, unit: '\u00B0' },
    { label: 'Shoulders', value: 0, min: -45, max: 45, unit: '\u00B0' },
    { label: 'Arms', value: 45, min: 0, max: 180, unit: '\u00B0' },
    { label: 'Hips', value: 10, min: -30, max: 30, unit: '\u00B0' },
    { label: 'Legs', value: 0, min: -45, max: 45, unit: '\u00B0' },
  ];

  const [sliders, setSliders] = useState(sliderDefs);

  return (
    <>
      <SectionHeader>Predefined Poses</SectionHeader>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
        {poses.map((p, i) => {
          const active = activePose === p.toLowerCase();
          return (
            <button
              key={p}
              onClick={() => setActivePose(p.toLowerCase())}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                padding: '12px 4px',
                borderRadius: 10,
                border: `1px solid ${active ? C.accent : C.border}`,
                background: active ? C.accentDim : C.card,
                color: active ? C.accent : C.textSec,
                fontSize: 11,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 150ms',
              }}
            >
              <span style={{ fontSize: 22 }}>{poseIcons[i]}</span>
              {p}
            </button>
          );
        })}
      </div>

      <SectionHeader>Manual Adjustment</SectionHeader>
      {sliders.map((s, i) => (
        <Slider
          key={s.label}
          {...s}
          onChange={(v) => {
            const next = [...sliders];
            next[i] = { ...s, value: v };
            setSliders(next);
          }}
        />
      ))}

      <ApplyButton label="Apply Pose" loading={loading} disabled={disabled} onClick={() => onApply(activePose)} />
    </>
  );
}

/* ─── Face Swap Panel ─── */
function FaceSwapPanel({ onApply, loading, disabled }: { onApply: (faceFile: File) => void; loading: boolean; disabled: boolean }) {
  const [blend, setBlend] = useState(85);
  const [preserveExpr, setPreserveExpr] = useState(true);
  const [adjustLight, setAdjustLight] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const [faceFile, setFaceFile] = useState<File | null>(null);
  const [facePreview, setFacePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => { if (facePreview) URL.revokeObjectURL(facePreview); };
  }, [facePreview]);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    if (facePreview) URL.revokeObjectURL(facePreview);
    setFaceFile(file);
    setFacePreview(URL.createObjectURL(file));
  };

  return (
    <>
      <SectionHeader>Upload Reference Face</SectionHeader>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
      />
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
        }}
        style={{
          border: `2px dashed ${dragOver ? C.accent : C.border}`,
          borderRadius: 12,
          padding: facePreview ? '8px' : '28px 16px',
          textAlign: 'center',
          color: C.textMuted,
          fontSize: 12,
          marginBottom: 16,
          transition: 'border-color 150ms',
          cursor: 'pointer',
        }}
      >
        {facePreview ? (
          <img src={facePreview} alt="Face reference" style={{ width: '100%', borderRadius: 8, maxHeight: 140, objectFit: 'cover' }} />
        ) : (
          <>
            <Upload size={24} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.5 }} />
            Drag & drop or click to upload
          </>
        )}
      </div>

      <Slider label="Blend Intensity" value={blend} min={0} max={100} unit="%" onChange={setBlend} />
      <ToggleSwitch label="Preserve Expression" checked={preserveExpr} onChange={setPreserveExpr} />
      <ToggleSwitch label="Adjust Lighting" checked={adjustLight} onChange={setAdjustLight} />

      <ApplyButton
        label="Apply Face Swap"
        loading={loading}
        disabled={disabled || !faceFile}
        onClick={() => { if (faceFile) onApply(faceFile); }}
      />
    </>
  );
}

/* ─── Relight Panel ─── */
function RelightPanel({ onApply, loading, disabled }: { onApply: (prompt: string) => void; loading: boolean; disabled: boolean }) {
  const [lightAngle, setLightAngle] = useState(45);
  const [activeAmbient, setActiveAmbient] = useState('golden');
  const ambients = [
    { id: 'golden', label: 'Golden Hour', color: '#F5A623' },
    { id: 'studio', label: 'Studio', color: '#E0E0E0' },
    { id: 'neon', label: 'Neon', color: '#FF00FF' },
    { id: 'sunset', label: 'Sunset', color: '#FF6B35' },
    { id: 'moon', label: 'Moonlight', color: '#6B8EFF' },
    { id: 'cinematic', label: 'Cinematic', color: '#2EC4B6' },
  ];

  const [intensity, setIntensity] = useState(75);
  const [temperature, setTemperature] = useState(5500);
  const [shadows, setShadows] = useState(40);
  const [ambient, setAmbient] = useState(20);

  const buildPrompt = () => {
    const ambientLabel = ambients.find(a => a.id === activeAmbient)?.label ?? 'Golden Hour';
    return `Relight this photo with ${ambientLabel} lighting at ${temperature}K color temperature, intensity ${intensity}%, shadow depth ${shadows}%, ambient light ${ambient}%. Light direction from ${lightAngle} degrees.`;
  };

  return (
    <>
      <SectionHeader>Light Direction</SectionHeader>
      <div
        style={{
          width: 160,
          height: 160,
          borderRadius: '50%',
          background: 'radial-gradient(circle at 50% 50%, #2A1E1A 0%, #0F0C0C 100%)',
          border: `1px solid ${C.border}`,
          margin: '0 auto 16px',
          position: 'relative',
          cursor: 'pointer',
        }}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left - rect.width / 2;
          const y = e.clientY - rect.top - rect.height / 2;
          setLightAngle(Math.round((Math.atan2(y, x) * 180) / Math.PI));
        }}
      >
        {/* Sun indicator */}
        <div
          style={{
            position: 'absolute',
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: '#F5A623',
            boxShadow: '0 0 16px rgba(245,166,35,0.6)',
            top: '50%',
            left: '50%',
            transform: `translate(-50%, -50%) translate(${Math.cos((lightAngle * Math.PI) / 180) * 56}px, ${Math.sin((lightAngle * Math.PI) / 180) * 56}px)`,
            transition: 'transform 100ms',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: C.textFaint,
            fontSize: 10,
            pointerEvents: 'none',
          }}
        >
          {lightAngle}&deg;
        </div>
      </div>

      <SectionHeader>Ambients</SectionHeader>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
        {ambients.map((a) => {
          const active = activeAmbient === a.id;
          return (
            <button
              key={a.id}
              onClick={() => setActiveAmbient(a.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                padding: '8px 4px',
                borderRadius: 10,
                border: `1px solid ${active ? C.accent : C.border}`,
                background: active ? C.accentDim : 'transparent',
                color: active ? C.accent : C.textSec,
                fontSize: 10,
                cursor: 'pointer',
                transition: 'all 150ms',
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: `radial-gradient(circle, ${a.color} 0%, transparent 70%)`,
                }}
              />
              {a.label}
            </button>
          );
        })}
      </div>

      <Slider label="Intensity" value={intensity} min={0} max={100} unit="%" onChange={setIntensity} />
      <Slider label="Temperature" value={temperature} min={2000} max={10000} unit="K" onChange={setTemperature} />
      <Slider label="Shadows" value={shadows} min={0} max={100} unit="%" onChange={setShadows} />
      <Slider label="Ambient Light" value={ambient} min={0} max={100} unit="%" onChange={setAmbient} />

      <ApplyButton label="Apply Relight" loading={loading} disabled={disabled} onClick={() => onApply(buildPrompt())} />
    </>
  );
}

/* ─── Camera Panel ─── */
function CameraPanel({ onApply, loading, disabled }: { onApply: (prompt: string) => void; loading: boolean; disabled: boolean }) {
  const [activeLens, setActiveLens] = useState('portrait');
  const lenses = [
    { id: 'portrait', label: 'Portrait', spec: '85mm f/1.8' },
    { id: 'wide', label: 'Wide Angle', spec: '24mm f/2.8' },
    { id: 'closeup', label: 'Close-up', spec: '50mm f/1.4' },
    { id: 'cinematic', label: 'Cinematic', spec: '35mm f/2.0' },
    { id: 'fisheye', label: 'Fisheye', spec: '12mm f/5.6' },
    { id: 'tele', label: 'Telephoto', spec: '200mm f/4.0' },
  ];

  const [activeAngle, setActiveAngle] = useState('eye');
  const angles = ['Eye Level', 'Low', 'High', 'Dutch', "Worm's Eye"];

  const [fov, setFov] = useState(50);
  const [dof, setDof] = useState(35);
  const [bokeh, setBokeh] = useState(60);
  const [tilt, setTilt] = useState(0);
  const [roll, setRoll] = useState(0);
  const [grid, setGrid] = useState<'off' | '3x3' | '2x2'>('off');

  const buildPrompt = () => {
    const lens = lenses.find(l => l.id === activeLens);
    return `Reframe this photo as if shot with a ${lens?.spec ?? '85mm f/1.8'} ${lens?.label ?? 'Portrait'} lens, ${activeAngle} angle, FOV ${fov} degrees, depth of field f/${dof}, bokeh intensity ${bokeh}%.`;
  };

  return (
    <>
      <SectionHeader>Lenses</SectionHeader>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
        {lenses.map((l) => {
          const active = activeLens === l.id;
          return (
            <button
              key={l.id}
              onClick={() => setActiveLens(l.id)}
              style={{
                padding: '10px 6px',
                borderRadius: 10,
                border: `1px solid ${active ? C.accent : C.border}`,
                background: active ? C.accentDim : C.card,
                color: active ? C.accent : C.textSec,
                fontSize: 10,
                fontWeight: 500,
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 150ms',
              }}
            >
              <Camera size={16} style={{ margin: '0 auto 4px', display: 'block', opacity: 0.6 }} />
              <div style={{ fontWeight: 600, fontSize: 11, marginBottom: 2, color: active ? C.accent : C.text }}>{l.label}</div>
              <div style={{ color: C.textMuted, fontSize: 9 }}>{l.spec}</div>
            </button>
          );
        })}
      </div>

      <SectionHeader>Angle</SectionHeader>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
        {angles.map((a) => (
          <Chip key={a} label={a} active={activeAngle === a.toLowerCase().replace(/[' ]/g, '')} onClick={() => setActiveAngle(a.toLowerCase().replace(/[' ]/g, ''))} />
        ))}
      </div>

      <Slider label="FOV" value={fov} min={10} max={120} unit="\u00B0" onChange={setFov} />
      <Slider label="Depth of Field" value={dof} min={10} max={100} unit="f" onChange={setDof} />
      <Slider label="Bokeh Intensity" value={bokeh} min={0} max={100} unit="%" onChange={setBokeh} />
      <Slider label="Tilt" value={tilt} min={-45} max={45} unit="\u00B0" onChange={setTilt} />
      <Slider label="Roll" value={roll} min={-45} max={45} unit="\u00B0" onChange={setRoll} />

      <SectionHeader>Grid Guide</SectionHeader>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {(['off', '3x3', '2x2'] as const).map((g) => (
          <Chip key={g} label={g === 'off' ? 'Off' : g} active={grid === g} onClick={() => setGrid(g)} />
        ))}
      </div>

      <ApplyButton label="Apply Camera" loading={loading} disabled={disabled} onClick={() => onApply(buildPrompt())} />
    </>
  );
}

/* ─── Objects Panel ─── */
function ObjectsPanel({ onApply, loading, disabled }: { onApply: (prompt: string) => void; loading: boolean; disabled: boolean }) {
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const filters = ['All', 'Accessories', 'Clothing', 'Electronics'];

  const objects = [
    { id: '1', name: 'Chanel Bag', cat: 'accessories' },
    { id: '2', name: 'Sunglasses', cat: 'accessories' },
    { id: '3', name: 'Hat', cat: 'accessories' },
    { id: '4', name: 'Necklace', cat: 'accessories' },
    { id: '5', name: 'Gucci Dress', cat: 'clothing' },
    { id: '6', name: 'Louboutin Shoes', cat: 'clothing' },
    { id: '7', name: 'iPhone 16', cat: 'electronics' },
    { id: '8', name: 'AirPods Max', cat: 'electronics' },
    { id: '9', name: 'Silk Scarf', cat: 'accessories' },
    { id: '10', name: 'Leather Jacket', cat: 'clothing' },
    { id: '11', name: 'Ring Set', cat: 'accessories' },
    { id: '12', name: 'Camera', cat: 'electronics' },
  ];

  const filtered = objects.filter((o) => {
    if (activeFilter !== 'all' && o.cat !== activeFilter.toLowerCase()) return false;
    if (search && !o.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const buildPrompt = () => {
    const names = objects.filter(o => selected.has(o.id)).map(o => o.name);
    return `Add the following objects to this photo naturally and seamlessly: ${names.join(', ')}. Keep the person and background unchanged.`;
  };

  return (
    <>
      {/* Search */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          borderRadius: 10,
          border: `1px solid ${C.border}`,
          background: C.card,
          marginBottom: 12,
        }}
      >
        <Search size={14} style={{ color: C.textMuted, flexShrink: 0 }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search objects..."
          style={{
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: C.text,
            fontSize: 12,
            width: '100%',
          }}
        />
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {filters.map((f) => (
          <Chip key={f} label={f} active={activeFilter === f.toLowerCase()} onClick={() => setActiveFilter(f.toLowerCase())} />
        ))}
      </div>

      <SectionHeader>Objects ({filtered.length})</SectionHeader>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        {filtered.map((o) => {
          const sel = selected.has(o.id);
          return (
            <button
              key={o.id}
              onClick={() => toggle(o.id)}
              style={{
                padding: '10px 8px',
                borderRadius: 10,
                border: `1px solid ${sel ? C.accent : C.border}`,
                background: sel ? C.accentDim : C.card,
                color: sel ? C.accent : C.textSec,
                fontSize: 11,
                fontWeight: 500,
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 150ms',
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: 50,
                  borderRadius: 6,
                  background: '#1A1210',
                  marginBottom: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: C.textFaint,
                  fontSize: 18,
                }}
              >
                <Box size={18} />
              </div>
              {o.name}
            </button>
          );
        })}
      </div>

      <ApplyButton
        label={`Add ${selected.size} object${selected.size !== 1 ? 's' : ''}`}
        loading={loading}
        disabled={disabled || selected.size === 0}
        onClick={() => onApply(buildPrompt())}
      />
    </>
  );
}

/* ─── Scenes Panel ─── */
function ScenesPanel({ onApply, loading, disabled }: { onApply: (prompt: string) => void; loading: boolean; disabled: boolean }) {
  const [tab, setTab] = useState<'library' | 'ai' | 'upload'>('library');
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [integration, setIntegration] = useState(80);
  const [activeScene, setActiveScene] = useState<string | null>(null);
  const [aiScenePrompt, setAiScenePrompt] = useState('');

  const filters = ['All', 'Urban', 'Nature', 'Studio'];
  const scenes = [
    { id: '1', name: 'Neon City', tag: 'Urban', color: '#FF00FF' },
    { id: '2', name: 'Tropical Beach', tag: 'Nature', color: '#00CED1' },
    { id: '3', name: 'White Studio', tag: 'Studio', color: '#E0E0E0' },
    { id: '4', name: 'Night Skyline', tag: 'Urban', color: '#1A1A5E' },
    { id: '5', name: 'Luxury Apartment', tag: 'Interior', color: '#C4A35A' },
    { id: '6', name: 'Dark Abstract', tag: 'Abstract', color: '#2A1A1A' },
  ];

  const filtered = scenes.filter((s) => {
    if (activeFilter !== 'all' && s.tag.toLowerCase() !== activeFilter.toLowerCase()) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const buildPrompt = () => {
    if (tab === 'ai' && aiScenePrompt.trim()) {
      return `Change the background/scene of this photo to: ${aiScenePrompt.trim()}. Keep the person exactly the same. Integration level: ${integration}%.`;
    }
    const scene = scenes.find(s => s.id === activeScene);
    if (scene) {
      return `Change the background/scene of this photo to a ${scene.name} (${scene.tag}) setting. Keep the person exactly the same. Integration level: ${integration}%.`;
    }
    return '';
  };

  return (
    <>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
        {([['library', 'Library'], ['ai', 'AI Generate'], ['upload', 'Upload']] as const).map(([id, lbl]) => (
          <Chip key={id} label={lbl} active={tab === id} onClick={() => setTab(id)} />
        ))}
      </div>

      {tab === 'library' && (
        <>
          {/* Search */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 12px',
              borderRadius: 10,
              border: `1px solid ${C.border}`,
              background: C.card,
              marginBottom: 12,
            }}
          >
            <Search size={14} style={{ color: C.textMuted, flexShrink: 0 }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search scenes..."
              style={{ background: 'transparent', border: 'none', outline: 'none', color: C.text, fontSize: 12, width: '100%' }}
            />
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
            {filters.map((f) => (
              <Chip key={f} label={f} active={activeFilter === f.toLowerCase()} onClick={() => setActiveFilter(f.toLowerCase())} />
            ))}
          </div>

          {/* Scene grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
            {filtered.map((s) => {
              const active = activeScene === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveScene(active ? null : s.id)}
                  style={{
                    borderRadius: 10,
                    border: `1px solid ${active ? C.accent : C.border}`,
                    background: active ? C.accentDim : C.card,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transition: 'all 150ms',
                    textAlign: 'left',
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      height: 70,
                      background: `linear-gradient(135deg, ${s.color} 0%, ${C.card} 100%)`,
                    }}
                  />
                  <div style={{ padding: '8px 10px' }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: active ? C.accent : C.text }}>{s.name}</div>
                    <div style={{ fontSize: 9, color: C.textMuted }}>{s.tag}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}

      {tab === 'ai' && (
        <div style={{ padding: '12px 0', color: C.textMuted, fontSize: 12 }}>
          Describe your scene and AI will generate it.
          <textarea
            value={aiScenePrompt}
            onChange={(e) => setAiScenePrompt(e.target.value)}
            placeholder="e.g. Rooftop bar at sunset, city skyline..."
            style={{
              width: '100%',
              marginTop: 12,
              padding: 12,
              borderRadius: 10,
              border: `1px solid ${C.border}`,
              background: C.card,
              color: C.text,
              fontSize: 12,
              resize: 'vertical',
              minHeight: 80,
              outline: 'none',
            }}
          />
        </div>
      )}

      {tab === 'upload' && (
        <div
          style={{
            border: `2px dashed ${C.border}`,
            borderRadius: 12,
            padding: '40px 16px',
            textAlign: 'center',
            color: C.textMuted,
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          <Upload size={24} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.5 }} />
          Drop your scene image here
        </div>
      )}

      <Slider label="Character Integration" value={integration} min={0} max={100} unit="%" onChange={setIntegration} />

      <ApplyButton
        label="Apply Scene"
        loading={loading}
        disabled={disabled || !buildPrompt()}
        onClick={() => onApply(buildPrompt())}
      />
    </>
  );
}

/* ─── AI Edit Panel ─── */
function AIEditPanel({ onApply, loading, disabled }: { onApply: (prompt: string) => void; loading: boolean; disabled: boolean }) {
  const [editPrompt, setEditPrompt] = useState('');
  const [editStrength, setEditStrength] = useState(50);
  const [preserveIdentity, setPreserveIdentity] = useState(true);

  return (
    <>
      <SectionHeader>Edit Instruction</SectionHeader>
      <textarea
        value={editPrompt}
        onChange={(e) => setEditPrompt(e.target.value)}
        placeholder="Describe what you want to change..."
        rows={4}
        style={{
          width: '100%',
          padding: 12,
          borderRadius: 10,
          border: `1px solid ${C.border}`,
          background: C.card,
          color: C.text,
          fontSize: 12,
          resize: 'vertical',
          minHeight: 80,
          outline: 'none',
          marginBottom: 14,
          fontFamily: 'inherit',
        }}
      />

      <Slider label="Edit Strength" value={editStrength} min={10} max={100} unit="%" onChange={setEditStrength} />

      <ToggleSwitch label="Preserve Identity" checked={preserveIdentity} onChange={setPreserveIdentity} />

      <SectionHeader>Edit History</SectionHeader>
      <div
        style={{
          padding: '20px 12px',
          textAlign: 'center',
          color: C.textMuted,
          fontSize: 12,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          background: C.bg,
          marginBottom: 14,
        }}
      >
        No edits yet
      </div>

      <ApplyButton
        label="Apply Edit"
        loading={loading}
        disabled={disabled || !editPrompt.trim()}
        onClick={() => onApply(editPrompt.trim())}
      />
    </>
  );
}

/* ───────────────────── MAIN COMPONENT ───────────────────── */

interface StudioEditorPageProps {
  onNavigate: (page: AppPage) => void;
  canvasImage?: string;
}

const EDIT_CREDIT_COST = 8; // AI edit, camera, objects, scenes
const POSE_CREDIT_COST = 8;

const StudioEditorPage: React.FC<StudioEditorPageProps> = ({ onNavigate, canvasImage: initialCanvasImage }) => {
  const [activeTool, setActiveTool] = useState<ToolId>('pose');
  const [resolution, setResolution] = useState<'SD' | 'HD' | '4K'>('HD');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [canvasImage, setCanvasImage] = useState<string | undefined>(initialCanvasImage);
  const [selectedModel, setSelectedModel] = useState<StudioModelId>('gemini-flash');
  const [referencePhoto, setReferencePhoto] = useState<string | null>(null);
  const [nsfwWarning, setNsfwWarning] = useState(false);
  const refPhotoInputRef = useRef<HTMLInputElement>(null);
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const { decrementCredits, restoreCredits } = useProfile();
  const toast = useToast();
  const { addItems } = useGallery();

  // Sync prop changes
  useEffect(() => {
    if (initialCanvasImage) setCanvasImage(initialCanvasImage);
  }, [initialCanvasImage]);

  const hasCanvas = !!canvasImage;

  /** Push current canvas to undo stack and set new image */
  const pushCanvas = useCallback((newImageUrl: string) => {
    setCanvasImage(prev => {
      if (prev) setUndoStack(stack => [...stack, prev]);
      setRedoStack([]);
      return newImageUrl;
    });
  }, []);

  const handleUndo = useCallback(() => {
    setUndoStack(stack => {
      if (stack.length === 0) return stack;
      const prev = stack[stack.length - 1];
      setCanvasImage(current => {
        if (current) setRedoStack(rs => [...rs, current]);
        return prev;
      });
      return stack.slice(0, -1);
    });
  }, []);

  const handleRedo = useCallback(() => {
    setRedoStack(stack => {
      if (stack.length === 0) return stack;
      const next = stack[stack.length - 1];
      setCanvasImage(current => {
        if (current) setUndoStack(us => [...us, current]);
        return next;
      });
      return stack.slice(0, -1);
    });
  }, []);

  const handleUpload = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    pushCanvas(url);
    toast.success('Image loaded');
  }, [pushCanvas, toast]);

  /** Save result to gallery */
  const saveToGallery = useCallback(async (imageUrl: string, instruction: string) => {
    const item: GeneratedContent = {
      id: crypto.randomUUID(),
      url: imageUrl,
      params: { baseImage: new File([], 'canvas'), instruction } as any,
      timestamp: Date.now(),
      type: 'edit',
      source: 'director',
    };
    await addItems([item]);
  }, [addItems]);

  /* ─── Apply handlers ─── */

  const handleApplyAIEdit = useCallback(async (prompt: string) => {
    if (!canvasImage || isApplying) return;
    setIsApplying(true);
    const ok = await decrementCredits(EDIT_CREDIT_COST);
    if (!ok) { toast.error('Not enough credits'); setIsApplying(false); return; }
    try {
      const file = await urlToFile(canvasImage, 'canvas.png');
      const results = await editImageWithAI({
        baseImage: file,
        instruction: prompt,
        model: GeminiImageModel.Flash2,
      });
      if (results.length === 0) throw new Error('No image returned');
      pushCanvas(results[0]);
      await saveToGallery(results[0], prompt);
      toast.success('Edit applied');
    } catch (err: any) {
      restoreCredits(EDIT_CREDIT_COST);
      toast.error(err?.message || 'Edit failed');
    } finally {
      setIsApplying(false);
    }
  }, [canvasImage, isApplying, decrementCredits, restoreCredits, toast, pushCanvas, saveToGallery]);

  const handleApplyFaceSwap = useCallback(async (faceFile: File) => {
    if (!canvasImage || isApplying) return;
    setIsApplying(true);
    const cost = OPERATION_CREDIT_COSTS.faceSwap;
    const ok = await decrementCredits(cost);
    if (!ok) { toast.error('Not enough credits'); setIsApplying(false); return; }
    try {
      const canvasFile = await urlToFile(canvasImage, 'canvas.png');
      const result = await faceSwapWithGemini(canvasFile, faceFile);
      pushCanvas(result);
      await saveToGallery(result, 'Face swap');
      toast.success('Face swap applied');
    } catch (err: any) {
      restoreCredits(cost);
      toast.error(err?.message || 'Face swap failed');
    } finally {
      setIsApplying(false);
    }
  }, [canvasImage, isApplying, decrementCredits, restoreCredits, toast, pushCanvas, saveToGallery]);

  const handleApplyRelight = useCallback(async (prompt: string) => {
    if (!canvasImage || isApplying) return;
    setIsApplying(true);
    const cost = OPERATION_CREDIT_COSTS.relight;
    const ok = await decrementCredits(cost);
    if (!ok) { toast.error('Not enough credits'); setIsApplying(false); return; }
    try {
      const file = await urlToFile(canvasImage, 'canvas.png');
      const results = await editImageWithAI({
        baseImage: file,
        instruction: prompt,
        model: GeminiImageModel.Flash2,
      });
      if (results.length === 0) throw new Error('No image returned');
      pushCanvas(results[0]);
      await saveToGallery(results[0], prompt);
      toast.success('Relight applied');
    } catch (err: any) {
      restoreCredits(cost);
      toast.error(err?.message || 'Relight failed');
    } finally {
      setIsApplying(false);
    }
  }, [canvasImage, isApplying, decrementCredits, restoreCredits, toast, pushCanvas, saveToGallery]);

  const handleApplyPose = useCallback(async (pose: string) => {
    if (!canvasImage || isApplying) return;
    setIsApplying(true);
    const ok = await decrementCredits(POSE_CREDIT_COST);
    if (!ok) { toast.error('Not enough credits'); setIsApplying(false); return; }
    try {
      const file = await urlToFile(canvasImage, 'canvas.png');
      const results = await modifyInfluencerPose({
        baseImage: file,
        pose,
        imageSize: ImageSize.Size2K,
        aspectRatio: AspectRatio.Portrait,
        numberOfImages: 1,
        model: GeminiImageModel.Flash2,
      });
      if (results.length === 0 || !results[0].url) throw new Error('No image returned');
      pushCanvas(results[0].url);
      await saveToGallery(results[0].url, `Pose: ${pose}`);
      toast.success('Pose applied');
    } catch (err: any) {
      restoreCredits(POSE_CREDIT_COST);
      toast.error(err?.message || 'Pose change failed');
    } finally {
      setIsApplying(false);
    }
  }, [canvasImage, isApplying, decrementCredits, restoreCredits, toast, pushCanvas, saveToGallery]);

  /** Generic edit handler for camera/objects/scenes — uses editImageWithAI */
  const handleApplyGenericEdit = useCallback(async (prompt: string) => {
    if (!canvasImage || isApplying) return;
    setIsApplying(true);
    const ok = await decrementCredits(EDIT_CREDIT_COST);
    if (!ok) { toast.error('Not enough credits'); setIsApplying(false); return; }
    try {
      const file = await urlToFile(canvasImage, 'canvas.png');
      const results = await editImageWithAI({
        baseImage: file,
        instruction: prompt,
        model: GeminiImageModel.Flash2,
      });
      if (results.length === 0) throw new Error('No image returned');
      pushCanvas(results[0]);
      await saveToGallery(results[0], prompt);
      toast.success('Changes applied');
    } catch (err: any) {
      restoreCredits(EDIT_CREDIT_COST);
      toast.error(err?.message || 'Operation failed');
    } finally {
      setIsApplying(false);
    }
  }, [canvasImage, isApplying, decrementCredits, restoreCredits, toast, pushCanvas, saveToGallery]);

  const renderPanel = useCallback(() => {
    switch (activeTool) {
      case 'pose': return <PosePanel onApply={handleApplyPose} loading={isApplying} disabled={!hasCanvas} />;
      case 'faceswap': return <FaceSwapPanel onApply={handleApplyFaceSwap} loading={isApplying} disabled={!hasCanvas} />;
      case 'relight': return <RelightPanel onApply={handleApplyRelight} loading={isApplying} disabled={!hasCanvas} />;
      case 'camera': return <CameraPanel onApply={handleApplyGenericEdit} loading={isApplying} disabled={!hasCanvas} />;
      case 'objects': return <ObjectsPanel onApply={handleApplyGenericEdit} loading={isApplying} disabled={!hasCanvas} />;
      case 'scenes': return <ScenesPanel onApply={handleApplyGenericEdit} loading={isApplying} disabled={!hasCanvas} />;
      case 'aiedit': return <AIEditPanel onApply={handleApplyAIEdit} loading={isApplying} disabled={!hasCanvas} />;
    }
  }, [activeTool, hasCanvas, isApplying, handleApplyPose, handleApplyFaceSwap, handleApplyRelight, handleApplyGenericEdit, handleApplyAIEdit]);

  const activeToolLabel = TOOLS.find((t) => t.id === activeTool)?.label ?? '';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        background: C.bg,
        color: C.text,
        fontFamily: 'var(--font-display), Inter, system-ui, sans-serif',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Spin animation for loader */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Hidden file input for upload */}
      <input
        ref={uploadInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => { if (e.target.files?.[0]) handleUpload(e.target.files[0]); e.target.value = ''; }}
      />

      {/* ─── TOP TOOLBAR ─── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 52,
          padding: '0 16px',
          borderBottom: `1px solid ${C.border}`,
          background: C.card,
          flexShrink: 0,
        }}
      >
        {/* Left: character dropdown + undo/redo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              borderRadius: 8,
              border: `1px solid ${C.border}`,
              background: 'transparent',
              color: C.text,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Studio Editor <ChevronDown size={14} style={{ color: C.textMuted }} />
          </button>

          <div style={{ display: 'flex', gap: 4 }}>
            <ToolbarBtn title="Undo" onClick={handleUndo} disabled={undoStack.length === 0}><Undo2 size={16} /></ToolbarBtn>
            <ToolbarBtn title="Redo" onClick={handleRedo} disabled={redoStack.length === 0}><Redo2 size={16} /></ToolbarBtn>
            <div style={{ width: 1, height: 20, background: C.border, margin: '0 4px' }} />
            <ToolbarBtn title="Zoom in"><ZoomIn size={16} /></ToolbarBtn>
            <ToolbarBtn title="Zoom out"><ZoomOut size={16} /></ToolbarBtn>
          </div>
        </div>

        {/* Center: resolution toggle */}
        <div
          style={{
            display: 'flex',
            borderRadius: 8,
            border: `1px solid ${C.border}`,
            overflow: 'hidden',
          }}
        >
          {(['SD', 'HD', '4K'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setResolution(r)}
              style={{
                padding: '5px 14px',
                fontSize: 11,
                fontWeight: 700,
                border: 'none',
                background: resolution === r ? C.accent : 'transparent',
                color: resolution === r ? '#fff' : C.textMuted,
                cursor: 'pointer',
                transition: 'all 150ms',
              }}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Right: preview / share / export */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ToolbarBtn title="Upload image" onClick={() => uploadInputRef.current?.click()}>
            <Upload size={16} />
          </ToolbarBtn>
          <ToolbarBtn title="Preview"><Eye size={16} /></ToolbarBtn>
          <ToolbarBtn title="Share"><Share2 size={16} /></ToolbarBtn>
          <button
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 16px',
              borderRadius: 8,
              border: 'none',
              background: C.accent,
              color: '#fff',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 150ms',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = C.accentHover)}
            onMouseLeave={(e) => (e.currentTarget.style.background = C.accent)}
            onClick={() => {
              if (canvasImage) {
                const a = document.createElement('a');
                a.href = canvasImage;
                a.download = `vist-studio-${Date.now()}.png`;
                a.click();
              }
            }}
          >
            <Download size={14} />
            Export
          </button>
        </div>
      </div>

      {/* ─── MAIN AREA (toolbar + canvas + panel) ─── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left tool bar */}
        <div
          style={{
            width: 60,
            borderRight: `1px solid ${C.border}`,
            background: C.card,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            paddingTop: 12,
            gap: 4,
            flexShrink: 0,
          }}
        >
          {TOOLS.map(({ id, label, Icon }) => {
            const active = activeTool === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTool(id)}
                title={label}
                aria-label={label}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  border: 'none',
                  background: active ? C.accentDim : 'transparent',
                  color: active ? C.accent : C.textMuted,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 2,
                  cursor: 'pointer',
                  transition: 'all 150ms',
                  fontSize: 9,
                  fontWeight: 500,
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = C.cardHover;
                    e.currentTarget.style.color = C.textSec;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = C.textMuted;
                  }
                }}
              >
                <Icon size={18} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        {/* Center canvas */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            background: C.bg,
            overflow: 'hidden',
          }}
        >
          {canvasImage ? (
            /* Real image canvas */
            <div
              style={{
                width: '60%',
                maxWidth: 480,
                position: 'relative',
                borderRadius: 16,
                overflow: 'hidden',
                border: `2px solid ${C.border}`,
              }}
            >
              <img
                src={canvasImage}
                alt="Canvas"
                style={{ width: '100%', display: 'block' }}
              />
              {isApplying && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(13,10,10,0.7)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 12,
                  }}
                >
                  <Loader2 size={32} style={{ color: C.accent, animation: 'spin 1s linear infinite' }} />
                  <span style={{ fontSize: 13, color: C.textSec }}>Applying changes...</span>
                </div>
              )}
            </div>
          ) : (
            /* Empty state / placeholder */
            <div
              onClick={() => uploadInputRef.current?.click()}
              style={{
                width: '60%',
                maxWidth: 480,
                aspectRatio: '3/4',
                borderRadius: 16,
                border: `2px dashed ${C.border}`,
                background: `linear-gradient(180deg, #1A1210 0%, #0F0C0C 100%)`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                color: C.textFaint,
                position: 'relative',
                cursor: 'pointer',
                transition: 'border-color 200ms',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = C.borderHover)}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = C.border)}
            >
              <Upload size={48} style={{ opacity: 0.3 }} />
              <span style={{ fontSize: 13, color: C.textMuted }}>Upload an image to start editing</span>
              <span style={{ fontSize: 11, color: C.textFaint }}>Click here or use the upload button above</span>
            </div>
          )}

          {/* Fullscreen toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            title="Toggle fullscreen"
            aria-label="Toggle fullscreen"
            style={{
              position: 'absolute',
              top: 12,
              left: 12,
              width: 36,
              height: 36,
              borderRadius: 8,
              border: `1px solid ${C.border}`,
              background: `${C.card}cc`,
              color: C.textMuted,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 150ms',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = C.text; e.currentTarget.style.borderColor = C.borderHover; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = C.textMuted; e.currentTarget.style.borderColor = C.border; }}
          >
            <Maximize2 size={16} />
          </button>
        </div>

        {/* Right panel */}
        <div
          style={{
            width: 280,
            borderLeft: `1px solid ${C.border}`,
            background: C.card,
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
            overflow: 'hidden',
          }}
        >
          {/* Panel header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 16px',
              borderBottom: `1px solid ${C.border}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{activeToolLabel}</span>
              <AiBadge />
            </div>
            <button
              title="Close panel"
              aria-label="Close panel"
              style={{
                background: 'none',
                border: 'none',
                color: C.textMuted,
                cursor: 'pointer',
                padding: 4,
                transition: 'color 150ms',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = C.text)}
              onMouseLeave={(e) => (e.currentTarget.style.color = C.textMuted)}
            >
              <X size={16} />
            </button>
          </div>

          {/* Model selector */}
          <div style={{ padding: '10px 16px 0', borderBottom: `1px solid ${C.border}`, paddingBottom: 10 }}>
            <SectionHeader>AI Model</SectionHeader>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {STUDIO_MODELS.map((m) => {
                const isActive = selectedModel === m.id;
                const isLocked = !!m.locked;
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      if (isLocked) { setNsfwWarning(true); setTimeout(() => setNsfwWarning(false), 4000); return; }
                      setSelectedModel(m.id);
                      setReferencePhoto(null);
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      padding: '4px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600,
                      border: `1px solid ${isActive ? C.accent : C.border}`,
                      background: isActive ? C.accentDim : isLocked ? 'rgba(107,90,86,0.08)' : 'transparent',
                      color: isLocked ? C.textFaint : isActive ? C.accent : C.textSec,
                      cursor: isLocked ? 'not-allowed' : 'pointer',
                      opacity: isLocked ? 0.6 : 1,
                      transition: 'all 150ms',
                    }}
                    title={isLocked ? m.lockReason : `${m.label} — ⚡${m.cost} credits`}
                  >
                    {isLocked && <Lock size={10} />}
                    {m.label}
                    <span style={{ color: isActive ? C.accent : C.textMuted, fontSize: 9 }}>
                      <Zap size={8} style={{ display: 'inline', verticalAlign: 'middle' }} />{m.cost}
                    </span>
                  </button>
                );
              })}
            </div>
            {nsfwWarning && (
              <div style={{ marginTop: 6, padding: '6px 10px', borderRadius: 8, fontSize: 10, color: '#f87171', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>
                NSFW models require age verification and a Studio+ plan. Contact support to enable.
              </div>
            )}
          </div>

          {/* Reference photo upload (only for models that support it, and only for Scene/Pose/Object tools) */}
          {(() => {
            const model = STUDIO_MODELS.find(m => m.id === selectedModel);
            const refTools: ToolId[] = ['pose', 'scenes', 'objects'];
            if (!model?.supportsRefPhoto || !refTools.includes(activeTool)) return null;
            return (
              <div style={{ padding: '10px 16px 0', borderBottom: `1px solid ${C.border}`, paddingBottom: 10 }}>
                <SectionHeader>Reference Photo (optional)</SectionHeader>
                <input
                  ref={refPhotoInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setReferencePhoto(URL.createObjectURL(f));
                  }}
                />
                {referencePhoto ? (
                  <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', border: `1px solid ${C.border}` }}>
                    <img src={referencePhoto} alt="Reference" style={{ width: '100%', height: 100, objectFit: 'cover', display: 'block' }} />
                    <button
                      onClick={() => setReferencePhoto(null)}
                      style={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => refPhotoInputRef.current?.click()}
                    style={{
                      width: '100%', padding: '14px 0', borderRadius: 8, fontSize: 11, fontWeight: 500,
                      border: `1px dashed ${C.border}`, background: 'transparent', color: C.textMuted,
                      cursor: 'pointer', transition: 'all 150ms',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.textSec; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textMuted; }}
                  >
                    <Upload size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
                    Upload reference photo
                  </button>
                )}
              </div>
            );
          })()}

          {/* Panel body */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '4px 16px 20px',
            }}
          >
            {!hasCanvas && (
              <div style={{
                padding: '20px 12px',
                textAlign: 'center',
                color: C.textMuted,
                fontSize: 12,
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                background: C.bg,
                margin: '16px 0',
              }}>
                Upload an image first to use {activeToolLabel}
              </div>
            )}
            {renderPanel()}
          </div>
        </div>
      </div>

      {/* ─── BOTTOM BAR ─── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 44,
          borderTop: `1px solid ${C.border}`,
          background: C.card,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '6px 16px',
            borderRadius: 20,
            background: '#1A1210',
            border: `1px solid ${C.border}`,
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>Studio Editor</span>
          <span style={{ fontSize: 10, color: C.textMuted, borderLeft: `1px solid ${C.border}`, paddingLeft: 10 }}>
            {hasCanvas ? 'Image loaded' : 'No image'}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: hasCanvas ? '#34d399' : C.textMuted }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: hasCanvas ? '#34d399' : C.textMuted, display: 'inline-block' }} />
            {hasCanvas ? 'Ready' : 'Waiting'}
          </span>
        </div>
      </div>
    </div>
  );
};

/* ─── Small toolbar icon button ─── */
function ToolbarBtn({ children, title, onClick, disabled }: { children: React.ReactNode; title: string; onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      title={title}
      aria-label={title}
      onClick={disabled ? undefined : onClick}
      style={{
        width: 32,
        height: 32,
        borderRadius: 6,
        border: `1px solid transparent`,
        background: 'transparent',
        color: disabled ? C.textFaint : C.textMuted,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: disabled ? 'default' : 'pointer',
        transition: 'all 150ms',
        opacity: disabled ? 0.5 : 1,
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = C.cardHover;
          e.currentTarget.style.color = C.text;
          e.currentTarget.style.borderColor = C.border;
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.color = disabled ? C.textFaint : C.textMuted;
        e.currentTarget.style.borderColor = 'transparent';
      }}
    >
      {children}
    </button>
  );
}

export default StudioEditorPage;
