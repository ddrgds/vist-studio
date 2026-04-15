// Dazz Cam Engine — Hybrid: CSS preview + Canvas export
// Preview: DOM-based (<5ms), Export: Canvas compositing (~200ms)

export interface DazzPreset {
  id: string
  name: string
  film: string
  icon: string
  category: 'film' | 'cam' | 'fx'
  cost: number // 0 = free
  filter: string // CSS filter string
  // Overlay layers — 'css' = generated with CSS/SVG, path = real PNG asset
  grain: 'fine' | 'medium' | 'heavy' | 'color' | null
  grainOpacity: number
  leak: string | null  // CSS gradient or null
  leakOpacity: number
  dust: string | null   // PNG path for real dust texture
  dustOpacity: number
  halation: string | null // PNG path
  halationOpacity: number
  bokeh: string | null   // PNG path
  bokehOpacity: number
  frame: string | null   // PNG path
  vignette: number // 0-100
  scanlines: boolean
  date: boolean
}

export interface DazzAdjustments {
  grain: number      // 0-100
  leak: number       // 0-100
  vignette: number   // 0-100
  intensity: number  // 0-100
  dust: boolean
  halation: boolean
  date: boolean
  scanlines: boolean
}

const O = '/overlays/'

// ── CSS-based leak gradients (no PNG needed) ──
const LEAKS = {
  warmCorner: 'linear-gradient(135deg, rgba(255,140,60,0.45) 0%, rgba(255,100,30,0.2) 15%, transparent 40%)',
  warmEdge: 'linear-gradient(to left, rgba(255,160,60,0.4) 0%, rgba(255,120,40,0.15) 20%, transparent 50%)',
  coolTop: 'linear-gradient(to bottom, rgba(0,200,255,0.25) 0%, rgba(100,180,255,0.1) 15%, transparent 40%)',
  rainbow: 'linear-gradient(135deg, rgba(255,0,80,0.2) 0%, rgba(255,200,0,0.15) 20%, rgba(0,255,150,0.12) 40%, rgba(0,100,255,0.15) 60%, rgba(200,0,255,0.12) 80%, transparent 100%)',
  redStreak: 'linear-gradient(to bottom, rgba(255,40,20,0.5) 0%, rgba(255,120,30,0.25) 15%, transparent 35%)',
  double: 'linear-gradient(135deg, rgba(255,140,50,0.35) 0%, transparent 30%, transparent 70%, rgba(100,150,255,0.25) 100%)',
}

// ── SVG grain data URIs (tiny, inline, GPU-accelerated) ──
const GRAIN_SVGS = {
  fine: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
  medium: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
  heavy: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.45' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
  color: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='5' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
}

export { GRAIN_SVGS, LEAKS }

export const DAZZ_PRESETS: DazzPreset[] = [
  // ── FILM ──
  { id: 'original', name: 'Original', film: 'Sin filtro', icon: '📱', category: 'film', cost: 0,
    filter: 'none', grain: null, grainOpacity: 0, leak: null, leakOpacity: 0,
    dust: null, dustOpacity: 0, halation: null, halationOpacity: 0, bokeh: null, bokehOpacity: 0,
    frame: null, vignette: 0, scanlines: false, date: false },

  { id: 'portra', name: 'D Classic', film: 'Portra 400', icon: '📷', category: 'film', cost: 0,
    filter: 'saturate(0.9) contrast(1.05) sepia(0.12) brightness(1.05)',
    grain: 'fine', grainOpacity: 25, leak: LEAKS.warmCorner, leakOpacity: 40,
    dust: null, dustOpacity: 0, halation: null, halationOpacity: 0, bokeh: null, bokehOpacity: 0,
    frame: null, vignette: 30, scanlines: false, date: false },

  { id: 'superia', name: 'Fuji 400', film: 'Superia', icon: '🌸', category: 'film', cost: 0,
    filter: 'saturate(1.2) contrast(1.08) brightness(1.02) hue-rotate(5deg)',
    grain: 'fine', grainOpacity: 30, leak: LEAKS.coolTop, leakOpacity: 25,
    dust: null, dustOpacity: 0, halation: null, halationOpacity: 0, bokeh: null, bokehOpacity: 0,
    frame: null, vignette: 25, scanlines: false, date: false },

  { id: 'cinestill', name: 'CT Night', film: 'CineStill 800T', icon: '🌃', category: 'film', cost: 2,
    filter: 'saturate(1.1) contrast(1.15) brightness(0.95) hue-rotate(-5deg)',
    grain: 'medium', grainOpacity: 40, leak: LEAKS.warmEdge, leakOpacity: 20,
    dust: null, dustOpacity: 0, halation: `${O}halation-center.png`, halationOpacity: 70,
    bokeh: null, bokehOpacity: 0,
    frame: null, vignette: 45, scanlines: false, date: true },

  { id: 'ektar', name: 'Ektar 100', film: 'Ektar Fine', icon: '🔴', category: 'film', cost: 2,
    filter: 'saturate(1.4) contrast(1.12) brightness(0.98)',
    grain: 'fine', grainOpacity: 15, leak: LEAKS.warmCorner, leakOpacity: 10,
    dust: null, dustOpacity: 0, halation: null, halationOpacity: 0, bokeh: null, bokehOpacity: 0,
    frame: null, vignette: 20, scanlines: false, date: false },

  { id: 'kodachrome', name: 'K Chrome', film: 'Kodachrome 64', icon: '🌅', category: 'film', cost: 2,
    filter: 'saturate(1.5) contrast(1.2) sepia(0.08) brightness(0.97)',
    grain: 'medium', grainOpacity: 20, leak: LEAKS.warmCorner, leakOpacity: 15,
    dust: `${O}dust-light.png`, dustOpacity: 30, halation: null, halationOpacity: 0, bokeh: null, bokehOpacity: 0,
    frame: null, vignette: 35, scanlines: false, date: false },

  { id: 'bw35', name: 'BW 35', film: 'Tri-X 400', icon: '🖤', category: 'film', cost: 0,
    filter: 'grayscale(1) contrast(1.3) brightness(0.95)',
    grain: 'heavy', grainOpacity: 55, leak: null, leakOpacity: 0,
    dust: `${O}dust-light.png`, dustOpacity: 40, halation: null, halationOpacity: 0, bokeh: null, bokehOpacity: 0,
    frame: null, vignette: 40, scanlines: false, date: false },

  // ── CAMERAS ──
  { id: 'disposable', name: 'D Flash', film: 'Desechable', icon: '🔦', category: 'cam', cost: 2,
    filter: 'saturate(1.3) contrast(1.1) brightness(1.1)',
    grain: 'heavy', grainOpacity: 50, leak: LEAKS.redStreak, leakOpacity: 60,
    dust: `${O}dust-heavy.png`, dustOpacity: 50, halation: null, halationOpacity: 0, bokeh: null, bokehOpacity: 0,
    frame: null, vignette: 55, scanlines: false, date: true },

  { id: 'polaroid', name: 'Inst C', film: 'Polaroid', icon: '🖼️', category: 'cam', cost: 2,
    filter: 'saturate(0.85) contrast(0.95) brightness(1.08) sepia(0.08)',
    grain: 'fine', grainOpacity: 15, leak: LEAKS.warmCorner, leakOpacity: 10,
    dust: null, dustOpacity: 0, halation: null, halationOpacity: 0, bokeh: null, bokehOpacity: 0,
    frame: `${O}frame-polaroid.png`, vignette: 20, scanlines: false, date: false },

  { id: 'dhalf', name: 'D Half', film: 'Half Frame', icon: '📐', category: 'cam', cost: 2,
    filter: 'saturate(1.05) contrast(1.08) sepia(0.06)',
    grain: 'medium', grainOpacity: 35, leak: LEAKS.double, leakOpacity: 45,
    dust: null, dustOpacity: 0, halation: null, halationOpacity: 0, bokeh: null, bokehOpacity: 0,
    frame: null, vignette: 30, scanlines: false, date: true },

  { id: 'lomo', name: 'Lomo LC', film: 'Lomo 800', icon: '🔮', category: 'cam', cost: 2,
    filter: 'saturate(1.5) contrast(1.2) brightness(0.92)',
    grain: 'medium', grainOpacity: 35, leak: LEAKS.rainbow, leakOpacity: 50,
    dust: null, dustOpacity: 0, halation: null, halationOpacity: 0, bokeh: null, bokehOpacity: 0,
    frame: null, vignette: 65, scanlines: false, date: false },

  // ── EFFECTS ──
  { id: 'bloom', name: 'Bloom', film: 'Soft Glow', icon: '✨', category: 'fx', cost: 2,
    filter: 'contrast(0.95) brightness(1.08) saturate(1.05)',
    grain: 'fine', grainOpacity: 10, leak: null, leakOpacity: 0,
    dust: null, dustOpacity: 0, halation: null, halationOpacity: 0,
    bokeh: `${O}bokeh-warm.png`, bokehOpacity: 25,
    frame: null, vignette: 15, scanlines: false, date: false },

  { id: 'prismfx', name: 'Prisma', film: 'Rainbow', icon: '🌈', category: 'fx', cost: 3,
    filter: 'contrast(1.05) saturate(1.1)',
    grain: null, grainOpacity: 0, leak: LEAKS.rainbow, leakOpacity: 60,
    dust: null, dustOpacity: 0, halation: null, halationOpacity: 0, bokeh: null, bokehOpacity: 0,
    frame: null, vignette: 10, scanlines: false, date: false },

  { id: 'duotone', name: 'Duo Tone', film: 'Pink+Teal', icon: '💜', category: 'fx', cost: 2,
    filter: 'grayscale(0.7) contrast(1.1) brightness(1.05) sepia(0.3) hue-rotate(280deg) saturate(2)',
    grain: 'fine', grainOpacity: 10, leak: null, leakOpacity: 0,
    dust: null, dustOpacity: 0, halation: null, halationOpacity: 0, bokeh: null, bokehOpacity: 0,
    frame: null, vignette: 20, scanlines: false, date: false },

  { id: 'glitch', name: 'Glitch', film: 'RGB Split', icon: '📺', category: 'fx', cost: 3,
    filter: 'contrast(1.08) brightness(1.02)',
    grain: 'heavy', grainOpacity: 30, leak: null, leakOpacity: 0,
    dust: null, dustOpacity: 0, halation: null, halationOpacity: 0, bokeh: null, bokehOpacity: 0,
    frame: null, vignette: 10, scanlines: true, date: false },

  { id: 'vhs', name: 'VHS Rec', film: 'VHS-C', icon: '📼', category: 'fx', cost: 3,
    filter: 'saturate(0.7) contrast(0.85) brightness(1.1)',
    grain: 'heavy', grainOpacity: 65, leak: LEAKS.warmEdge, leakOpacity: 15,
    dust: null, dustOpacity: 0, halation: null, halationOpacity: 0, bokeh: null, bokehOpacity: 0,
    frame: null, vignette: 25, scanlines: true, date: true },

  { id: 'infrared', name: 'Infrared', film: 'IR Film', icon: '🔴', category: 'fx', cost: 3,
    filter: 'grayscale(0.5) contrast(1.15) sepia(0.4) hue-rotate(320deg) saturate(2.5) brightness(1.05)',
    grain: 'medium', grainOpacity: 25, leak: null, leakOpacity: 0,
    dust: null, dustOpacity: 0, halation: null, halationOpacity: 0, bokeh: null, bokehOpacity: 0,
    frame: null, vignette: 30, scanlines: false, date: false },

  { id: 'xpro', name: 'X-Pro', film: 'Cross Process', icon: '🧪', category: 'fx', cost: 2,
    filter: 'contrast(1.2) saturate(1.4) sepia(0.15) hue-rotate(15deg) brightness(0.97)',
    grain: 'medium', grainOpacity: 20, leak: LEAKS.double, leakOpacity: 35,
    dust: null, dustOpacity: 0, halation: null, halationOpacity: 0, bokeh: null, bokehOpacity: 0,
    frame: null, vignette: 30, scanlines: false, date: false },

  { id: 'dreamy', name: 'Dreamy', film: 'Soft Focus', icon: '☁️', category: 'fx', cost: 2,
    filter: 'contrast(0.9) brightness(1.12) saturate(0.95)',
    grain: 'fine', grainOpacity: 8, leak: LEAKS.warmCorner, leakOpacity: 20,
    dust: null, dustOpacity: 0, halation: null, halationOpacity: 0,
    bokeh: `${O}bokeh-warm.png`, bokehOpacity: 30,
    frame: null, vignette: 20, scanlines: false, date: false },

  { id: 'golden', name: 'Golden', film: 'Gold Hour', icon: '🌤️', category: 'fx', cost: 0,
    filter: 'saturate(1.1) contrast(1.05) sepia(0.2) brightness(1.1)',
    grain: 'fine', grainOpacity: 12, leak: LEAKS.warmEdge, leakOpacity: 40,
    dust: null, dustOpacity: 0, halation: `${O}halation-center.png`, halationOpacity: 30,
    bokeh: null, bokehOpacity: 0,
    frame: null, vignette: 25, scanlines: false, date: false },
]

export const DAZZ_CATEGORIES = [
  { id: 'all', label: 'Todos' },
  { id: 'film', label: '🎞️ Películas' },
  { id: 'cam', label: '📷 Cámaras' },
  { id: 'fx', label: '✨ Efectos' },
]

// ── Preview styles (returns CSS properties for DOM layers) ──
export function getPreviewStyles(preset: DazzPreset, adj: DazzAdjustments) {
  const int = adj.intensity / 100
  return {
    filter: preset.filter,
    grain: preset.grain ? { svg: GRAIN_SVGS[preset.grain], opacity: (adj.grain / 100) * int } : null,
    leak: preset.leak ? { gradient: preset.leak, opacity: (adj.leak / 100) * int } : null,
    vignette: (adj.vignette / 100) * int,
    dust: preset.dust && adj.dust ? { src: preset.dust, opacity: (preset.dustOpacity / 100) * int } : null,
    halation: preset.halation && adj.halation ? { src: preset.halation, opacity: (preset.halationOpacity / 100) * int } : null,
    bokeh: preset.bokeh && preset.bokehOpacity > 0 ? { src: preset.bokeh, opacity: (preset.bokehOpacity / 100) * int } : null,
    frame: preset.frame ? { src: preset.frame } : null,
    scanlines: adj.scanlines ? 0.15 * int : 0,
    date: adj.date,
  }
}

// ── Image cache ──
const imageCache = new Map<string, HTMLImageElement>()
function loadImage(src: string): Promise<HTMLImageElement> {
  if (imageCache.has(src)) return Promise.resolve(imageCache.get(src)!)
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => { imageCache.set(src, img); resolve(img) }
    img.onerror = reject
    img.src = src
  })
}

// ── Canvas export (final render) ──
export async function exportDazz(
  sourceImage: HTMLImageElement | HTMLCanvasElement,
  preset: DazzPreset,
  adj: DazzAdjustments,
): Promise<string> {
  const w = sourceImage instanceof HTMLImageElement ? sourceImage.naturalWidth : sourceImage.width
  const h = sourceImage instanceof HTMLImageElement ? sourceImage.naturalHeight : sourceImage.height
  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d')!
  const int = adj.intensity / 100

  // 1. Base image + CSS filter
  if (preset.filter !== 'none') ctx.filter = preset.filter
  ctx.drawImage(sourceImage, 0, 0, w, h)
  ctx.filter = 'none'

  // 2. Vignette (radial gradient)
  const vigAmount = (adj.vignette / 100) * int
  if (vigAmount > 0) {
    const grad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.7)
    grad.addColorStop(0, 'rgba(0,0,0,0)')
    grad.addColorStop(1, `rgba(0,0,0,${vigAmount * 0.6})`)
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)
  }

  // 3. Grain (generated noise on canvas)
  const grainAmount = (adj.grain / 100) * int
  if (preset.grain && grainAmount > 0.05) {
    const grainCanvas = document.createElement('canvas')
    const gw = 256, gh = 256
    grainCanvas.width = gw; grainCanvas.height = gh
    const gctx = grainCanvas.getContext('2d')!
    const imageData = gctx.createImageData(gw, gh)
    const d = imageData.data
    const strength = preset.grain === 'heavy' ? 80 : preset.grain === 'medium' ? 50 : 30
    for (let i = 0; i < d.length; i += 4) {
      const v = 128 + (Math.random() - 0.5) * strength
      d[i] = d[i + 1] = d[i + 2] = v
      d[i + 3] = 255
    }
    gctx.putImageData(imageData, 0, 0)
    ctx.globalCompositeOperation = 'overlay'
    ctx.globalAlpha = grainAmount
    const pat = ctx.createPattern(grainCanvas, 'repeat')
    if (pat) { ctx.fillStyle = pat; ctx.fillRect(0, 0, w, h) }
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
  }

  // 4. PNG overlays (dust, halation, bokeh — real assets)
  const pngLayers: { src: string; opacity: number; blend: GlobalCompositeOperation }[] = []
  if (preset.dust && adj.dust) pngLayers.push({ src: preset.dust, opacity: (preset.dustOpacity / 100) * int, blend: 'screen' })
  if (preset.halation && adj.halation) pngLayers.push({ src: preset.halation, opacity: (preset.halationOpacity / 100) * int, blend: 'screen' })
  if (preset.bokeh && preset.bokehOpacity > 0) pngLayers.push({ src: preset.bokeh, opacity: (preset.bokehOpacity / 100) * int, blend: 'screen' })

  for (const layer of pngLayers) {
    try {
      const img = await loadImage(layer.src)
      ctx.globalCompositeOperation = layer.blend
      ctx.globalAlpha = layer.opacity
      ctx.drawImage(img, 0, 0, w, h)
      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'source-over'
    } catch { /* skip failed loads */ }
  }

  // 5. Scanlines
  if (adj.scanlines) {
    ctx.globalAlpha = 0.15 * int
    for (let y = 0; y < h; y += 4) {
      ctx.fillStyle = 'rgba(0,0,0,0.3)'
      ctx.fillRect(0, y, w, 2)
    }
    ctx.globalAlpha = 1
  }

  // 6. Date stamp
  if (adj.date) {
    const now = new Date()
    const dateStr = `'${String(now.getFullYear()).slice(2)} ${String(now.getMonth() + 1).padStart(2, '0')} ${String(now.getDate()).padStart(2, '0')}`
    const fontSize = Math.max(16, Math.round(w * 0.03))
    ctx.font = `${fontSize}px 'JetBrains Mono', monospace`
    ctx.fillStyle = 'rgba(255,140,50,0.85)'
    ctx.shadowColor = 'rgba(255,100,0,0.5)'
    ctx.shadowBlur = fontSize * 0.5
    ctx.fillText(dateStr, w - fontSize * 5, h - fontSize * 1.2)
    ctx.shadowBlur = 0
  }

  // 7. Frame (last, on top)
  if (preset.frame) {
    try {
      const frame = await loadImage(preset.frame)
      ctx.drawImage(frame, 0, 0, w, h)
    } catch { /* skip */ }
  }

  return canvas.toDataURL('image/jpeg', 0.92)
}

// Default adjustments from preset
export function defaultAdjustments(preset: DazzPreset): DazzAdjustments {
  return {
    grain: preset.grainOpacity,
    leak: preset.leakOpacity,
    vignette: preset.vignette,
    intensity: 100,
    dust: preset.dustOpacity > 0,
    halation: preset.halationOpacity > 0,
    date: preset.date,
    scanlines: preset.scanlines,
  }
}
