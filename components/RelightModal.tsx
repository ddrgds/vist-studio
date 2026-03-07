import React, { useState, useRef, useCallback } from 'react';
import {
  relightWithStudio, buildStudioPrompt,
  StudioSettings, StudioPreset, LightSource, LightType, GlobalParams,
  STUDIO_PRESETS, LIGHT_TYPE_ACCENT, DEFAULT_GLOBAL,
} from '../services/relightService';
import { useToast } from '../contexts/ToastContext';
import { useProfile } from '../contexts/ProfileContext';
import { OPERATION_CREDIT_COSTS } from '../types';
import ProgressBar from './ProgressBar';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const SS = 240;              // sphere SVG size
const CX = SS / 2;
const CY = SS / 2;
const SR = SS / 2 - 16;     // sphere radius boundary
const HR = SR / 2;           // horizon ring (el = 0°)

// el=90 → dist=0 (overhead)   el=0 → dist=HR   el=-90 → dist=SR
const elToDist = (el: number) => (90 - el) / 180 * SR;
const distToEl = (d: number) => Math.round(90 - (d / SR) * 180);

const azToRad = (az: number) => (az * Math.PI) / 180;
const spreadToR = (s: number) => 12 + s * 46;
const rToSpread = (r: number) => Math.max(0, Math.min(1, (r - 12) / 46));

function dotPos(az: number, el: number) {
  const d = elToDist(el);
  const r = azToRad(az);
  return { x: CX + d * Math.sin(r), y: CY - d * Math.cos(r) };
}

function tempToColor(k: number): string {
  if (k < 2800) return '#ff8030';
  if (k < 3500) return '#ffaa50';
  if (k < 4500) return '#ffd080';
  if (k < 5500) return '#fff0d0';
  if (k < 6500) return '#ffffff';
  if (k < 7500) return '#c8e4ff';
  return '#88bbff';
}

function tempToRGB(k: number): string {
  if (k < 2800) return '255,128,48';
  if (k < 3500) return '255,170,80';
  if (k < 4500) return '255,208,128';
  if (k < 5500) return '255,240,208';
  if (k < 6500) return '255,255,255';
  if (k < 7500) return '200,228,255';
  return '136,187,255';
}

// ─────────────────────────────────────────────────────────────────────────────
// Manual canvas relight
// ─────────────────────────────────────────────────────────────────────────────

async function manualRelightCanvas(blob: Blob, settings: StudioSettings): Promise<string> {
  const bmp = await createImageBitmap(blob);
  const W = bmp.width;
  const H = bmp.height;
  const maxDim = Math.max(W, H);
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const { global: g } = settings;

  // ── 1. Base image: apply contrast + saturation via ctx.filter ──
  // contrastBoost: -1→contrast(0), 0→contrast(1), +1→contrast(2)
  // saturation:     0→saturate(0), 1→saturate(1)=normal, 2→saturate(2)
  const contrastCSS = Math.max(0, 1 + g.contrastBoost).toFixed(3);
  const satCSS = Math.max(0, g.saturation).toFixed(3);
  ctx.filter = `contrast(${contrastCSS}) saturate(${satCSS})`;
  ctx.drawImage(bmp, 0, 0);
  ctx.filter = 'none';

  // ── 2. Per-light compositing ──
  for (const light of settings.lights.filter(l => l.enabled)) {
    const azRad = azToRad(light.azimuth);
    const elFactor = light.elevation / 90;
    const isBelow = light.elevation < 0;

    let lx: number, ly: number;
    if (isBelow) {
      lx = 0.5 + 0.3 * Math.sin(azRad);
      ly = 0.75 + 0.18 * (Math.abs(light.elevation) / 90);
    } else {
      lx = 0.5 + 0.42 * Math.sin(azRad) * (1 - elFactor * 0.45);
      ly = 0.5 - 0.42 * Math.cos(azRad) * (1 - elFactor * 0.5) * (1 - elFactor * 0.4);
      ly = Math.max(0.05, Math.min(0.9, ly));
    }

    const radius = maxDim * (0.35 + light.spread * 0.45);
    // Increased multiplier (0.2→0.35) so low intensity is visible
    const alpha = Math.min(0.60, light.intensity * 0.35);
    // Softness now controls gradient shape (hard=tight falloff, soft=gradual)
    const innerStop = 0.08 + light.softness * 0.55;
    const rgb = tempToRGB(light.colorTemperature);

    // Screen pass — adds light, visible on dark areas
    const grd = ctx.createRadialGradient(lx * W, ly * H, 0, lx * W, ly * H, radius);
    grd.addColorStop(0, `rgba(${rgb},${alpha.toFixed(3)})`);
    grd.addColorStop(innerStop, `rgba(${rgb},${(alpha * 0.35).toFixed(3)})`);
    grd.addColorStop(1, `rgba(${rgb},0)`);
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);

    // Overlay pass — adds color cast visible on BOTH dark AND bright areas
    // (screen alone is invisible on already-bright pixels)
    const oA = alpha * 0.22;
    const grd2 = ctx.createRadialGradient(lx * W, ly * H, 0, lx * W, ly * H, radius);
    grd2.addColorStop(0, `rgba(${rgb},${oA.toFixed(3)})`);
    grd2.addColorStop(innerStop, `rgba(${rgb},${(oA * 0.35).toFixed(3)})`);
    grd2.addColorStop(1, `rgba(${rgb},0)`);
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = grd2;
    ctx.fillRect(0, 0, W, H);
  }

  // ── 3. Shadow from key light's opposite side ──
  const key = settings.lights.find(l => l.enabled && l.type === 'key')
    ?? settings.lights.find(l => l.enabled);
  if (key && key.shadowStrength > 0.04) {
    const azRad = azToRad(key.azimuth);
    const sLx = 0.5 - 0.38 * Math.sin(azRad);
    const sLy = 0.5 + 0.38 * Math.cos(azRad);
    // Increased multiplier (0.3→0.5) so low shadow values are perceptible
    const sA = Math.min(0.75, key.shadowStrength * 0.5);
    const sGrd = ctx.createRadialGradient(sLx * W, sLy * H, 0, sLx * W, sLy * H, maxDim * 0.55);
    sGrd.addColorStop(0, `rgba(0,0,0,${sA.toFixed(3)})`);
    sGrd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = sGrd;
    ctx.fillRect(0, 0, W, H);
  }

  // ── 4. Ambient lift ──
  if (g.ambientLevel > 0.02) {
    // Increased multiplier (0.12→0.28)
    const a = Math.min(0.35, g.ambientLevel * 0.28);
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = `rgba(200,210,230,${a.toFixed(3)})`;
    ctx.fillRect(0, 0, W, H);
  }

  // ── 5. Film grain (noise canvas + overlay blend) ──
  if (g.filmGrain > 0.02) {
    const offscreen = document.createElement('canvas');
    offscreen.width = W; offscreen.height = H;
    const gCtx = offscreen.getContext('2d')!;
    const imgData = gCtx.createImageData(W, H);
    const d = imgData.data;
    const strength = g.filmGrain * 90; // 0–90 luminance swing
    for (let i = 0; i < d.length; i += 4) {
      const v = Math.max(0, Math.min(255, 128 + (Math.random() - 0.5) * strength));
      d[i] = d[i + 1] = d[i + 2] = v;
      d[i + 3] = 255;
    }
    gCtx.putImageData(imgData, 0, 0);
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = g.filmGrain * 0.45;
    ctx.drawImage(offscreen, 0, 0);
    ctx.globalAlpha = 1;
  }

  ctx.globalCompositeOperation = 'source-over';
  return canvas.toDataURL('image/jpeg', 0.92);
}

// ─────────────────────────────────────────────────────────────────────────────
// CSS multi-light preview overlay
// ─────────────────────────────────────────────────────────────────────────────

function previewOverlay(lights: LightSource[]): React.CSSProperties {
  const active = lights.filter(l => l.enabled);
  if (!active.length) return {};
  const grads = active.map(l => {
    const { x, y } = dotPos(l.azimuth, l.elevation);
    const px = (x / SS * 100).toFixed(1);
    const py = (y / SS * 100).toFixed(1);
    const col = tempToColor(l.colorTemperature);
    const alpha = Math.min(0.26, l.intensity * 0.1 * (1 - l.softness * 0.3));
    const sz = 45 + l.spread * 28;
    return `radial-gradient(ellipse ${sz}% ${sz * 0.8}% at ${px}% ${py}%, ${col}${Math.round(alpha * 255).toString(16).padStart(2, '0')} 0%, transparent 70%)`;
  });
  return { background: grads.join(', '), mixBlendMode: 'screen' as const };
}

// ─────────────────────────────────────────────────────────────────────────────
// Default settings
// ─────────────────────────────────────────────────────────────────────────────

function makeDefault(): StudioSettings {
  const p = STUDIO_PRESETS.find(p => p.id === 'beauty')!;
  return {
    ...p.settings,
    lights: p.settings.lights.map(l => ({ ...l, id: crypto.randomUUID() })),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Multi-Light Gizmo
// ─────────────────────────────────────────────────────────────────────────────

interface GizmoProps {
  lights: LightSource[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  // IMPORTANT: combined callback — single setState avoids React batching bug
  onPositionChange: (id: string, az: number, el: number) => void;
  onSpreadChange: (id: string, spread: number) => void;
}

const MultiLightGizmo: React.FC<GizmoProps> = ({
  lights, selectedId, onSelect, onPositionChange, onSpreadChange,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{ mode: 'sphere' | 'spread'; id: string } | null>(null);

  const sel = lights.find(l => l.id === selectedId);
  const selPos = sel ? dotPos(sel.azimuth, sel.elevation) : { x: CX, y: CY };
  const ringR = sel ? spreadToR(sel.spread) : 0;
  const handleX = selPos.x + ringR * Math.cos(Math.PI / 4);
  const handleY = selPos.y + ringR * Math.sin(Math.PI / 4);

  const toSVG = useCallback((cx: number, cy: number) => {
    const rect = svgRef.current!.getBoundingClientRect();
    const sc = SS / rect.width;
    return { x: (cx - rect.left) * sc, y: (cy - rect.top) * sc };
  }, []);

  const svgToAzEl = (x: number, y: number) => {
    const dx = x - CX; const dy = y - CY;
    const rawDist = Math.sqrt(dx * dx + dy * dy);
    const clampedDist = Math.min(rawDist, SR);
    const azDeg = (((Math.atan2(dx, -dy) * 180) / Math.PI) + 360) % 360;
    const az = azDeg > 180 ? azDeg - 360 : azDeg;
    return { az: Math.round(az), el: distToEl(clampedDist) };
  };

  const onDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const { x, y } = toSVG(e.clientX, e.clientY);

    // 1. Check spread handle
    if (sel) {
      const dhx = x - handleX; const dhy = y - handleY;
      if (Math.sqrt(dhx * dhx + dhy * dhy) < 11) {
        dragRef.current = { mode: 'spread', id: sel.id };
        svgRef.current.setPointerCapture(e.pointerId);
        return;
      }
    }

    // 2. Check any light dot (10px hit)
    for (const l of lights) {
      if (!l.enabled) continue;
      const p = dotPos(l.azimuth, l.elevation);
      if (Math.sqrt((x - p.x) ** 2 + (y - p.y) ** 2) < 11) {
        onSelect(l.id);
        dragRef.current = { mode: 'sphere', id: l.id };
        svgRef.current.setPointerCapture(e.pointerId);
        return;
      }
    }

    // 3. Fallback: move selected light
    if (selectedId) {
      dragRef.current = { mode: 'sphere', id: selectedId };
      svgRef.current.setPointerCapture(e.pointerId);
      const { az, el } = svgToAzEl(x, y);
      onPositionChange(selectedId, az, el);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lights, sel, selectedId, handleX, handleY, onSelect, onPositionChange, toSVG]);

  const onMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const { x, y } = toSVG(e.clientX, e.clientY);
    const { mode, id } = dragRef.current;

    if (mode === 'sphere') {
      const { az, el } = svgToAzEl(x, y);
      onPositionChange(id, az, el);
    } else {
      const light = lights.find(l => l.id === id);
      if (!light) return;
      const p = dotPos(light.azimuth, light.elevation);
      const dx = x - p.x; const dy = y - p.y;
      onSpreadChange(id, rToSpread(Math.sqrt(dx * dx + dy * dy)));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lights, onPositionChange, onSpreadChange, toSVG]);

  const onUp = useCallback(() => { dragRef.current = null; }, []);

  const selColor = sel ? tempToColor(sel.colorTemperature) : '#fff';
  const selGlowId = `rl-sg-${sel?.id ?? 'none'}`;

  return (
    <div className="flex flex-col items-center gap-2 select-none">
      <svg
        ref={svgRef}
        width={SS} height={SS}
        viewBox={`0 0 ${SS} ${SS}`}
        className="cursor-crosshair touch-none"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
      >
        <defs>
          <radialGradient id="rl-bg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#222" />
            <stop offset="100%" stopColor="#0e0e0e" />
          </radialGradient>
          <radialGradient id="rl-depth" cx="50%" cy="30%" r="65%">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.04" />
            <stop offset="100%" stopColor="#000" stopOpacity="0.28" />
          </radialGradient>
          {sel && (() => {
            const { x, y } = dotPos(sel.azimuth, sel.elevation);
            return (
              <radialGradient key={sel.id} id={selGlowId}
                cx={`${(x / SS * 100).toFixed(1)}%`}
                cy={`${(y / SS * 100).toFixed(1)}%`} r="40%">
                <stop offset="0%" stopColor={selColor} stopOpacity="0.18" />
                <stop offset="100%" stopColor={selColor} stopOpacity="0" />
              </radialGradient>
            );
          })()}
          <filter id="rl-dot-glow">
            <feGaussianBlur stdDeviation="2.5" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <clipPath id="rl-clip">
            <circle cx={CX} cy={CY} r={SR + 1} />
          </clipPath>
        </defs>

        {/* Base sphere */}
        <circle cx={CX} cy={CY} r={SR + 1} fill="url(#rl-bg)" />
        <circle cx={CX} cy={CY} r={SR + 1} fill="url(#rl-depth)" clipPath="url(#rl-clip)" />

        {/* Selected light ambient glow */}
        {sel && <circle cx={CX} cy={CY} r={SR + 1} fill={`url(#${selGlowId})`} clipPath="url(#rl-clip)" />}

        {/* Meridian lines (8 directions) */}
        {[0, 45, 90, 135].map(deg => {
          const r = (deg * Math.PI) / 180;
          return <line key={deg}
            x1={CX + SR * Math.sin(r)} y1={CY - SR * Math.cos(r)}
            x2={CX - SR * Math.sin(r)} y2={CY + SR * Math.cos(r)}
            stroke="#fff" strokeOpacity="0.05" strokeWidth="0.7" />;
        })}

        {/* Elevation parallels */}
        {[HR, elToDist(60)].map((r, i) => (
          <circle key={i} cx={CX} cy={CY} r={r}
            fill="none" stroke="#fff"
            strokeOpacity={i === 0 ? 0.12 : 0.06}
            strokeWidth={i === 0 ? 0.8 : 0.6}
            strokeDasharray={i === 0 ? '4 3' : '2 5'} />
        ))}

        {/* Outer boundary + azimuth ticks */}
        <circle cx={CX} cy={CY} r={SR} fill="none" stroke="#fff" strokeOpacity="0.18" strokeWidth="1.2" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map(deg => {
          const r = (deg * Math.PI) / 180;
          const ix = CX + SR * Math.sin(r);
          const iy = CY - SR * Math.cos(r);
          const ox = CX + (SR + 5) * Math.sin(r);
          const oy = CY - (SR + 5) * Math.cos(r);
          return <line key={deg} x1={ix} y1={iy} x2={ox} y2={oy}
            stroke="#fff" strokeOpacity="0.22" strokeWidth="1" />;
        })}

        {/* Cardinal labels */}
        {([['F', 0], ['R', 90], ['B', 180], ['L', 270]] as [string, number][]).map(([l, a]) => {
          const ar = (a * Math.PI) / 180;
          return (
            <text key={l}
              x={CX + (SR + 13) * Math.sin(ar)}
              y={CY - (SR + 13) * Math.cos(ar)}
              textAnchor="middle" dominantBaseline="middle"
              fontSize="8" fill="#ffffff30" fontFamily="monospace" fontWeight="700"
            >{l}</text>
          );
        })}

        {/* Zone labels */}
        <text x={CX} y={CY - HR / 2 - 4} textAnchor="middle" fontSize="7" fill="#ffffff18" fontFamily="sans-serif">ABOVE</text>
        <text x={CX} y={CY + (SR + HR) / 2} textAnchor="middle" fontSize="7" fill="#ff333318" fontFamily="sans-serif">BELOW</text>
        <circle cx={CX} cy={CY} r={2.5} fill="#ffffff18" />

        {/* Below-horizon tint for selected */}
        {sel && sel.elevation < 0 && (
          <circle cx={CX} cy={CY} r={SR + 1}
            fill="rgba(80,20,20,0.18)" clipPath="url(#rl-clip)" />
        )}

        {/* All light dots */}
        {lights.map(l => {
          if (!l.enabled) return null;
          const { x, y } = dotPos(l.azimuth, l.elevation);
          const col = tempToColor(l.colorTemperature);
          const isSelected = l.id === selectedId;
          const typeCol = LIGHT_TYPE_ACCENT[l.type];
          return (
            <g key={l.id} style={{ cursor: 'pointer' }}>
              {isSelected && <circle cx={x} cy={y} r={15} fill={col} fillOpacity="0.07" />}
              {isSelected && <circle cx={x} cy={y} r={10} fill={col} fillOpacity="0.12" />}
              <circle cx={x} cy={y} r={isSelected ? 6.5 : 5}
                fill={col}
                stroke={isSelected ? '#fff' : typeCol}
                strokeWidth={isSelected ? 1.8 : 1.2}
                strokeOpacity={isSelected ? 0.8 : 0.55}
                filter={isSelected ? 'url(#rl-dot-glow)' : undefined}
              />
              <text x={x} y={y - 10} textAnchor="middle" dominantBaseline="middle"
                fontSize="6.5" fill={isSelected ? '#ffffffcc' : '#ffffff44'}
                fontFamily="monospace" style={{ pointerEvents: 'none' }}>
                {l.label.charAt(0)}
              </text>
            </g>
          );
        })}

        {/* Selected light spread ring + handle */}
        {sel && (() => {
          const { x: sx, y: sy } = dotPos(sel.azimuth, sel.elevation);
          return (
            <>
              <circle cx={sx} cy={sy} r={ringR}
                fill="none" stroke={selColor} strokeWidth="0.9" strokeOpacity="0.3"
                strokeDasharray={`${ringR * 0.32} ${ringR * 0.2}`} />
              {/* Rays */}
              {[0, 60, 120, 180, 240, 300].map(a => {
                const ar = (a * Math.PI) / 180;
                const x1 = sx + 8 * Math.cos(ar); const y1 = sy + 8 * Math.sin(ar);
                const x2 = sx + (8 + 8 * sel.spread) * Math.cos(ar);
                const y2 = sy + (8 + 8 * sel.spread) * Math.sin(ar);
                return <line key={a} x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke={selColor} strokeWidth="0.9" strokeOpacity="0.35" strokeLinecap="round" />;
              })}
              {/* Spread handle */}
              <circle cx={handleX} cy={handleY} r={5}
                fill="#111" stroke={selColor} strokeWidth="1.5" strokeOpacity="0.85"
                style={{ cursor: 'ew-resize' }} filter="url(#rl-dot-glow)" />
              <text x={handleX} y={handleY} textAnchor="middle" dominantBaseline="middle"
                fontSize="5" fill={selColor} fillOpacity="0.9" style={{ pointerEvents: 'none' }}>↔</text>
            </>
          );
        })()}
      </svg>

      {/* Readout */}
      {sel && (
        <div className="flex items-center gap-4 text-[9.5px] font-mono">
          <span className="text-zinc-600">AZ <span className="text-zinc-300">{sel.azimuth > 0 ? '+' : ''}{Math.round(sel.azimuth)}°</span></span>
          <span className={sel.elevation < 0 ? 'text-red-700' : 'text-zinc-600'}>
            EL <span className={sel.elevation < 0 ? 'text-red-400' : 'text-zinc-300'}>{Math.round(sel.elevation)}°</span>
          </span>
          <span className="text-zinc-600">Ø <span className="text-zinc-300">{Math.round(sel.spread * 100)}%</span></span>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Parameter Slider
// ─────────────────────────────────────────────────────────────────────────────

interface SliderProps {
  label: string; value: number; min: number; max: number; step?: number;
  gradient?: string; formatValue?: (v: number) => string;
  onChange: (v: number) => void;
}

const ParamSlider: React.FC<SliderProps> = ({ label, value, min, max, step = 0.01, gradient, formatValue, onChange }) => {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="space-y-1">
      <div className="flex justify-between">
        <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">{label}</span>
        <span className="text-[10px] font-mono text-zinc-300">{formatValue ? formatValue(value) : value.toFixed(2)}</span>
      </div>
      <div className="relative h-1.5 rounded-full bg-zinc-800 overflow-hidden">
        {gradient
          ? <><div className="absolute inset-0 rounded-full" style={{ background: gradient }} />
              <div className="absolute inset-y-0 right-0 bg-black/55 rounded-full" style={{ width: `${100 - pct}%` }} /></>
          : <div className="absolute inset-y-0 left-0 bg-zinc-500 rounded-full" style={{ width: `${pct}%` }} />
        }
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(parseFloat(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
        <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow border border-zinc-400 pointer-events-none"
          style={{ left: `calc(${pct}% - 6px)` }} />
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Light Card
// ─────────────────────────────────────────────────────────────────────────────

const LIGHT_TYPES: { type: LightType; icon: string }[] = [
  { type: 'key', icon: '★' }, { type: 'fill', icon: '◐' }, { type: 'rim', icon: '◑' },
  { type: 'back', icon: '⊗' }, { type: 'spot', icon: '⊙' }, { type: 'area', icon: '▣' },
];
const TEMP_GRAD = 'linear-gradient(to right, #ff8030 0%, #ffaa50 15%, #ffd080 30%, #fff4d0 50%, #ffffff 60%, #c8e4ff 78%, #88bbff 100%)';

interface LightCardProps {
  light: LightSource;
  onChange: (field: keyof LightSource, value: any) => void;
  onDelete: () => void;
}

const LightCard: React.FC<LightCardProps> = ({ light, onChange, onDelete }) => (
  <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 space-y-2.5">
    <div className="flex items-center gap-2">
      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: LIGHT_TYPE_ACCENT[light.type] }} />
      <input value={light.label} onChange={e => onChange('label', e.target.value)}
        className="flex-1 bg-transparent text-xs font-semibold text-white outline-none border-b border-transparent focus:border-zinc-600" />
      <button onClick={() => onChange('enabled', !light.enabled)}
        className={`px-2 py-0.5 rounded text-[9px] font-mono border transition-all ${light.enabled ? 'bg-white/8 border-zinc-600 text-zinc-300' : 'border-zinc-800 text-zinc-600'}`}>
        {light.enabled ? 'ON' : 'OFF'}
      </button>
      <button onClick={onDelete} className="text-zinc-700 hover:text-red-400 transition-colors text-sm leading-none ml-1">×</button>
    </div>
    <div className="flex gap-1">
      {LIGHT_TYPES.map(({ type, icon }) => (
        <button key={type} onClick={() => onChange('type', type)} title={type}
          className={`flex-1 py-1 rounded text-[10px] font-medium border transition-all ${light.type === type ? 'border-zinc-500 text-white bg-white/8' : 'border-zinc-800 text-zinc-600 hover:text-zinc-400'}`}>
          {icon}
        </button>
      ))}
    </div>
    <div className="space-y-2">
      <ParamSlider label="Intensity" value={light.intensity} min={0.1} max={2.0} step={0.05}
        formatValue={v => `${v.toFixed(1)}×`} onChange={v => onChange('intensity', v)} />
      <ParamSlider label="Color Temp" value={light.colorTemperature} min={2000} max={9000} step={100}
        gradient={TEMP_GRAD} formatValue={v => `${Math.round(v)}K`} onChange={v => onChange('colorTemperature', v)} />
      <ParamSlider label="Shadows" value={light.shadowStrength} min={0} max={1} step={0.05}
        formatValue={v => `${Math.round(v * 100)}%`} onChange={v => onChange('shadowStrength', v)} />
      <ParamSlider label="Softness" value={light.softness} min={0} max={1} step={0.05}
        formatValue={v => v < 0.25 ? 'Hard' : v < 0.55 ? 'Semi' : 'Soft'} onChange={v => onChange('softness', v)} />
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Lights Tab  — KEY FIX: onPositionChange updates az+el in a single setState
// ─────────────────────────────────────────────────────────────────────────────

interface LightsTabProps {
  settings: StudioSettings;
  selectedId: string | null;
  onSelectLight: (id: string) => void;
  onUpdateSettings: (s: StudioSettings) => void;
}

const LightsTab: React.FC<LightsTabProps> = ({ settings, selectedId, onSelectLight, onUpdateSettings }) => {
  const sel = settings.lights.find(l => l.id === selectedId);

  const updateField = (id: string, field: keyof LightSource, value: any) =>
    onUpdateSettings({ ...settings, lights: settings.lights.map(l => l.id === id ? { ...l, [field]: value } : l) });

  // Single call — avoids React batching discarding azimuth
  const updatePosition = (id: string, az: number, el: number) =>
    onUpdateSettings({ ...settings, lights: settings.lights.map(l => l.id === id ? { ...l, azimuth: az, elevation: el } : l) });

  const addLight = () => {
    const newL: LightSource = {
      id: crypto.randomUUID(), type: 'fill', label: `Light ${settings.lights.length + 1}`,
      enabled: true, azimuth: 60, elevation: 30, intensity: 0.5, colorTemperature: 5500,
      shadowStrength: 0.1, softness: 0.7, spread: 0.6,
    };
    onUpdateSettings({ ...settings, lights: [...settings.lights, newL] });
    onSelectLight(newL.id);
  };

  const deleteLight = (id: string) => {
    const remaining = settings.lights.filter(l => l.id !== id);
    onUpdateSettings({ ...settings, lights: remaining });
    if (selectedId === id) onSelectLight(remaining[0]?.id ?? '');
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-center">
        <MultiLightGizmo
          lights={settings.lights}
          selectedId={selectedId}
          onSelect={onSelectLight}
          onPositionChange={updatePosition}
          onSpreadChange={(id, spread) => updateField(id, 'spread', spread)}
        />
      </div>

      {/* Light chips */}
      <div className="flex flex-wrap gap-1.5">
        {settings.lights.map(l => {
          const accent = LIGHT_TYPE_ACCENT[l.type];
          return (
            <button key={l.id} onClick={() => onSelectLight(l.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all ${l.id === selectedId ? 'bg-white/10 border-zinc-500 text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600'}`}
              style={l.id === selectedId ? { boxShadow: `0 0 8px ${accent}50` } : {}}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: l.enabled ? accent : '#444' }} />
              {l.label}
            </button>
          );
        })}
        {settings.lights.length < 5 && (
          <button onClick={addLight}
            className="px-2.5 py-1 rounded-full text-[10px] font-semibold border border-dashed border-zinc-700 text-zinc-600 hover:border-zinc-500 hover:text-zinc-400 transition-all">
            + Add
          </button>
        )}
      </div>

      {sel && (
        <LightCard
          light={sel}
          onChange={(field, value) => updateField(sel.id, field, value)}
          onDelete={() => deleteLight(sel.id)}
        />
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Presets Tab
// ─────────────────────────────────────────────────────────────────────────────

const PresetsTab: React.FC<{ onApply: (p: StudioPreset) => void; activeId: string | null }> = ({ onApply, activeId }) => (
  <div className="space-y-4">
    {(['portrait', 'cinematic', 'stylized'] as const).map(cat => (
      <div key={cat} className="space-y-1.5">
        <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">
          {{ portrait: 'Portrait', cinematic: 'Cinematic', stylized: 'Stylized' }[cat]}
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {STUDIO_PRESETS.filter(p => p.category === cat).map(preset => (
            <button key={preset.id} onClick={() => onApply(preset)}
              className={`flex items-start gap-2 p-2.5 rounded-xl border text-left transition-all ${
                activeId === preset.id
                  ? 'bg-white/8 border-zinc-500 text-white'
                  : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
              }`}>
              <span className="text-lg leading-none shrink-0">{preset.icon}</span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-zinc-200 truncate">{preset.name}</p>
                <p className="text-[9px] text-zinc-600 mt-0.5 leading-tight line-clamp-2">{preset.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    ))}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Advanced Tab
// ─────────────────────────────────────────────────────────────────────────────

const AdvancedTab: React.FC<{ global: GlobalParams; onChange: (g: GlobalParams) => void; prompt: string }> = ({ global, onChange, prompt }) => {
  const set = (k: keyof GlobalParams, v: number) => onChange({ ...global, [k]: v });
  return (
    <div className="space-y-4">
      <div className="space-y-2.5">
        <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">Global Parameters</p>
        <ParamSlider label="Ambient Level" value={global.ambientLevel} min={0} max={1} step={0.05}
          formatValue={v => `${Math.round(v * 100)}%`} onChange={v => set('ambientLevel', v)} />
        <ParamSlider label="Contrast" value={global.contrastBoost} min={-1} max={1} step={0.05}
          formatValue={v => (v >= 0 ? '+' : '') + (v * 100).toFixed(0) + '%'} onChange={v => set('contrastBoost', v)} />
        <ParamSlider label="Saturation" value={global.saturation} min={0} max={2} step={0.05}
          formatValue={v => `${(v * 100).toFixed(0)}%`} onChange={v => set('saturation', v)} />
        <ParamSlider label="Film Grain" value={global.filmGrain} min={0} max={1} step={0.05}
          formatValue={v => `${Math.round(v * 100)}%`} onChange={v => set('filmGrain', v)} />
      </div>
      <details className="group">
        <summary className="text-[10px] font-semibold text-zinc-700 uppercase tracking-wider cursor-pointer group-open:text-zinc-500 transition-colors">
          Prompt preview ▸
        </summary>
        <p className="mt-2 text-[9px] text-zinc-600 leading-relaxed bg-zinc-900/50 rounded-lg p-3 border border-zinc-800/50">{prompt}</p>
      </details>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Canvas preview
// ─────────────────────────────────────────────────────────────────────────────

interface CanvasProps {
  src: string; result: string | null; settings: StudioSettings;
  loading: boolean; progress: number; showResult: boolean; mode: 'manual' | 'ai' | null;
}

const ImageCanvas: React.FC<CanvasProps> = ({ src, result, settings, loading, progress, showResult, mode }) => (
  <div className="w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl relative flex items-center justify-center bg-black border border-white/5" style={{ aspectRatio: '1/1' }}>
    <img src={showResult && result ? result : src} alt="Preview"
      className="w-full h-full object-contain transition-opacity duration-300" />
    {!showResult && !loading && (
      <div className="absolute inset-0 pointer-events-none transition-all duration-300" style={previewOverlay(settings.lights)} />
    )}
    {loading && (
      <div className="absolute inset-0 bg-black/75 backdrop-blur-md flex flex-col items-center justify-center z-20">
        <svg className="animate-spin text-white mb-6" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
        <div className="w-72"><ProgressBar progress={progress} label={mode === 'manual' ? 'Applying…' : 'Relighting…'} /></div>
        <p className="text-xs text-zinc-500 mt-3">
          {mode === 'manual' ? 'Canvas compositing' : 'FLUX Kontext · identity preserved'}
        </p>
      </div>
    )}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Modal
// ─────────────────────────────────────────────────────────────────────────────

interface RelightModalProps {
  targetItem: { id: string; url: string; type: string };
  onClose: () => void;
  onSave: (dataUrl: string, sourceItemId: string) => Promise<void>;
}

type Tab = 'lights' | 'presets' | 'advanced';

const RelightModal: React.FC<RelightModalProps> = ({ targetItem, onClose, onSave }) => {
  const toast = useToast();
  const { decrementCredits, restoreCredits } = useProfile();
  const [settings, setSettings] = useState<StudioSettings>(makeDefault);
  const [selectedLightId, setSelectedLightId] = useState<string | null>(() => makeDefault().lights[0]?.id ?? null);
  const [activeTab, setActiveTab] = useState<Tab>('lights');
  const [activePresetId, setActivePresetId] = useState<string | null>('beauty');
  const [loading, setLoading] = useState(false);
  const [activeMode, setActiveMode] = useState<'manual' | 'ai' | null>(null);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const applyPreset = (preset: StudioPreset) => {
    const s: StudioSettings = {
      ...preset.settings,
      lights: preset.settings.lights.map(l => ({ ...l, id: crypto.randomUUID() })),
    };
    setSettings(s);
    setSelectedLightId(s.lights[0]?.id ?? null);
    setActivePresetId(preset.id);
    setResult(null); setShowResult(false);
  };

  const updateSettings = (s: StudioSettings) => {
    setSettings(s);
    setActivePresetId(null);
    setResult(null); setShowResult(false);
  };

  const handleManual = async () => {
    setLoading(true); setActiveMode('manual'); setProgress(10); setResult(null); setShowResult(false);
    try {
      const resp = await fetch(targetItem.url);
      const blob = await resp.blob();
      setProgress(40);
      const dataUrl = await manualRelightCanvas(blob, settings);
      setResult(dataUrl); setProgress(100);
    } catch (err: any) {
      toast.error(err?.message || 'Manual relight failed.');
    } finally { setLoading(false); }
  };

  const handleAI = async () => {
    const cost = OPERATION_CREDIT_COSTS.relight;
    const hasCredits = await decrementCredits(cost);
    if (!hasCredits) { toast.error('Insufficient credits. Please upgrade your plan.'); return; }

    setLoading(true); setActiveMode('ai'); setProgress(0); setResult(null); setShowResult(false);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const resp = await fetch(targetItem.url);
      const blob = await resp.blob();
      const file = new File([blob], `relight-${targetItem.id}.jpg`, { type: blob.type || 'image/jpeg' });
      const dataUrl = await relightWithStudio(file, settings, setProgress, ctrl.signal);
      setResult(dataUrl); setProgress(100);
    } catch (err: any) {
      restoreCredits(cost);
      if (err?.message !== 'Cancelled') toast.error(err?.message || 'AI relight failed.');
    } finally { setLoading(false); abortRef.current = null; }
  };

  const handleSave = async () => {
    if (!result) return;
    try { await onSave(result, targetItem.id); toast.success('Saved to gallery'); onClose(); }
    catch { toast.error('Error saving image'); }
  };

  const activeCount = settings.lights.filter(l => l.enabled).length;

  return (
    <div className="fixed inset-0 z-[100] bg-black flex animate-in fade-in duration-300">

      {/* Canvas */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 relative bg-zinc-950">
        <button onClick={onClose}
          className="absolute top-6 left-6 flex items-center gap-2 text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl backdrop-blur-md border border-white/5 transition-colors z-10 text-sm">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></svg>
          Back
        </button>

        {result && !loading && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center bg-zinc-900 border border-zinc-800 rounded-xl p-1 z-10">
            <button onClick={() => setShowResult(false)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${!showResult ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>Before</button>
            <button onClick={() => setShowResult(true)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${showResult ? 'bg-amber-600 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>After</button>
          </div>
        )}

        <ImageCanvas src={targetItem.url} result={result} settings={settings}
          loading={loading} progress={progress} showResult={showResult} mode={activeMode} />
      </div>

      {/* Inspector */}
      <aside className="w-[420px] bg-zinc-950/98 backdrop-blur-3xl border-l border-white/5 flex flex-col shadow-2xl shrink-0">

        {/* Header */}
        <div className="p-5 pb-0 shrink-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2.5">
              <span className="text-xl leading-none">☀️</span>
              <h2 className="text-base font-bold text-white tracking-wide">Relight Studio</h2>
              {activeCount > 0 && (
                <span className="text-[9px] text-zinc-500 bg-white/5 px-1.5 py-0.5 rounded border border-white/10 font-mono">
                  {activeCount}L
                </span>
              )}
            </div>
            <span className="text-[9px] text-zinc-700 uppercase tracking-widest">Studio</span>
          </div>

          {/* Tabs */}
          <div className="flex mt-4 border-b border-zinc-800">
            {(['lights', 'presets', 'advanced'] as Tab[]).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider transition-all border-b-2 -mb-px ${
                  activeTab === tab ? 'border-amber-500 text-amber-400' : 'border-transparent text-zinc-600 hover:text-zinc-400'
                }`}>
                {tab === 'lights' ? 'Lights' : tab === 'presets' ? 'Presets' : 'Advanced'}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 px-5 py-4 custom-scrollbar">
          {activeTab === 'lights' && (
            <LightsTab settings={settings} selectedId={selectedLightId}
              onSelectLight={setSelectedLightId} onUpdateSettings={updateSettings} />
          )}
          {activeTab === 'presets' && (
            <PresetsTab onApply={applyPreset} activeId={activePresetId} />
          )}
          {activeTab === 'advanced' && (
            <AdvancedTab global={settings.global}
              onChange={g => updateSettings({ ...settings, global: g })}
              prompt={buildStudioPrompt(settings)} />
          )}
        </div>

        {/* Actions */}
        <div className="p-5 border-t border-white/5 shrink-0 space-y-2.5">
          {result && !loading ? (
            <>
              {/* Retry row */}
              <div className="flex gap-2">
                <button onClick={handleManual} disabled={loading}
                  className="flex-1 py-2.5 rounded-xl border border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-white text-xs font-semibold transition-all flex items-center justify-center gap-1.5 disabled:opacity-40">
                  ⚡ Manual
                </button>
                <button onClick={handleAI} disabled={loading}
                  className="flex-1 py-2.5 rounded-xl border border-amber-800/60 text-amber-400 hover:bg-amber-600/10 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 disabled:opacity-40">
                  ✨ AI Retry
                </button>
              </div>
              {/* Save */}
              <button onClick={handleSave}
                className="w-full py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-xl text-sm font-bold tracking-wide transition-all shadow-[0_0_20px_rgba(217,119,6,0.25)] active:scale-[0.98]">
                Save to Gallery
              </button>
            </>
          ) : loading ? (
            <button onClick={() => { abortRef.current?.abort(); setLoading(false); }}
              className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white rounded-xl text-sm font-bold transition-all">
              Cancel
            </button>
          ) : (
            <>
              <div className="flex gap-2">
                <button onClick={handleManual}
                  className="flex-1 py-3 rounded-xl border border-zinc-700 text-zinc-200 hover:border-zinc-500 hover:bg-white/5 text-sm font-semibold transition-all flex items-center justify-center gap-1.5">
                  ⚡ Manual
                </button>
                <button onClick={handleAI}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-sm font-bold tracking-wide transition-all shadow-[0_0_16px_rgba(217,119,6,0.2)] active:scale-[0.98] flex items-center justify-center gap-1.5">
                  ✨ AI Relight
                </button>
              </div>
              <p className="text-center text-[9px] text-zinc-700">
                Manual: instant canvas blend · AI: FLUX Kontext, identity-preserving
              </p>
            </>
          )}
        </div>
      </aside>
    </div>
  );
};

export default RelightModal;
