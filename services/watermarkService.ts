/**
 * watermarkService — adds a subtle "@VIST" watermark to generated images for
 * free-tier users. Premium tiers skip this entirely.
 *
 * Approach: client-side canvas overlay. Loads the image, draws watermark in
 * bottom-right corner, exports as new data URL or blob URL. Fail-open: if
 * canvas/image fails for any reason, returns the original URL untouched.
 *
 * Why client-side? Server-side overlay would add latency to the generation
 * pipeline and require a Cloudflare Worker. Client-side runs once when the
 * image is first displayed/saved — zero infra cost, zero latency to user.
 *
 * Limitation: a determined user could right-click → "save unmarked image" via
 * devtools. That's fine — the watermark is a friction nudge to upgrade, not a
 * DRM lock. Users motivated enough to bypass it weren't going to convert anyway.
 */

const WATERMARK_TEXT = '@VIST'
const FONT_FAMILY = "'DM Sans', sans-serif"

interface WatermarkOptions {
  /** Position in image. Default: bottom-right. */
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  /** Opacity 0-1. Default 0.5 (subtle but readable). */
  opacity?: number
  /** Font size in px relative to image short side. Default 0.025 (2.5%). */
  sizeRatio?: number
  /** Padding from image edge in px relative to short side. Default 0.025. */
  paddingRatio?: number
}

/**
 * Apply watermark to an image URL. Returns a new data URL with the watermark
 * baked in, or the original URL if anything fails.
 */
export async function applyWatermark(
  imageUrl: string,
  options: WatermarkOptions = {},
): Promise<string> {
  const {
    position = 'bottom-right',
    opacity = 0.5,
    sizeRatio = 0.025,
    paddingRatio = 0.025,
  } = options

  try {
    // Load image
    const img = await loadImage(imageUrl)
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return imageUrl

    // Draw original image
    ctx.drawImage(img, 0, 0)

    // Calculate watermark dimensions relative to image
    const shortSide = Math.min(canvas.width, canvas.height)
    const fontSize = Math.max(14, Math.round(shortSide * sizeRatio))
    const padding = Math.max(12, Math.round(shortSide * paddingRatio))

    // Draw watermark
    ctx.save()
    ctx.font = `600 ${fontSize}px ${FONT_FAMILY}`
    ctx.globalAlpha = opacity

    // Measure text for positioning
    const metrics = ctx.measureText(WATERMARK_TEXT)
    const textWidth = metrics.width
    const textHeight = fontSize

    let x: number, y: number
    switch (position) {
      case 'bottom-left':
        x = padding
        y = canvas.height - padding
        break
      case 'top-right':
        x = canvas.width - textWidth - padding
        y = textHeight + padding
        break
      case 'top-left':
        x = padding
        y = textHeight + padding
        break
      case 'bottom-right':
      default:
        x = canvas.width - textWidth - padding
        y = canvas.height - padding
    }

    // Subtle dark outline for readability on any background
    ctx.lineWidth = Math.max(1, fontSize * 0.08)
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)'
    ctx.strokeText(WATERMARK_TEXT, x, y)

    // White fill on top
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
    ctx.fillText(WATERMARK_TEXT, x, y)
    ctx.restore()

    // Export as data URL (preserves quality, easy to use in <img src>)
    return canvas.toDataURL('image/jpeg', 0.92)
  } catch (err) {
    console.warn('Watermark failed, using original image:', err)
    return imageUrl
  }
}

/**
 * Conditional watermark — applies only if user is on a free plan.
 * Premium tiers (pro/studio/brand) get original image.
 */
export async function watermarkIfFreeTier(
  imageUrl: string,
  subscriptionPlan: string | null | undefined,
  subscriptionStatus: string | null | undefined,
  options?: WatermarkOptions,
): Promise<string> {
  // Premium plans skip watermark — anyone subscribed to pro/studio/brand
  // with active billing gets clean outputs.
  const isPremium = subscriptionStatus === 'active' || subscriptionStatus === 'on_trial'
  const isPaidPlan = subscriptionPlan === 'pro' || subscriptionPlan === 'studio' || subscriptionPlan === 'brand'
  if (isPremium && isPaidPlan) return imageUrl

  return applyWatermark(imageUrl, options)
}

// ── Internal helpers ───────────────────────────────────────────────

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = (e) => reject(e)
    img.src = src
  })
}
