/**
 * nativeService — Capacitor plugin wrappers with web fallbacks.
 *
 * Each function works in both native (Capacitor) and web contexts.
 * On web, falls back gracefully (haptics no-op, share uses Web Share API,
 * camera returns null so callers can use <input type="file">).
 *
 * All Capacitor imports are lazy-loaded so the web bundle isn't bloated
 * and the imports don't fail on web.
 */

let _isNativeCache: boolean | null = null;

/** Returns true when running inside a Capacitor native shell (iOS/Android). */
export async function isNativePlatform(): Promise<boolean> {
  if (_isNativeCache !== null) return _isNativeCache;
  try {
    const { Capacitor } = await import('@capacitor/core');
    _isNativeCache = Boolean(Capacitor.isNativePlatform?.());
    return _isNativeCache;
  } catch {
    _isNativeCache = false;
    return false;
  }
}

// ─── Haptics ────────────────────────────────────────────────────────────

/** Light tap — for button presses, chip selections, tab changes. */
export async function hapticLight(): Promise<void> {
  if (!(await isNativePlatform())) return;
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch { /* silent */ }
}

/** Medium tap — for primary CTAs (Generate, Confirm). */
export async function hapticMedium(): Promise<void> {
  if (!(await isNativePlatform())) return;
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    await Haptics.impact({ style: ImpactStyle.Medium });
  } catch { /* silent */ }
}

/** Strong tap — for destructive confirmations. */
export async function hapticHeavy(): Promise<void> {
  if (!(await isNativePlatform())) return;
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    await Haptics.impact({ style: ImpactStyle.Heavy });
  } catch { /* silent */ }
}

/** Success notification — for generation complete, save success. */
export async function hapticSuccess(): Promise<void> {
  if (!(await isNativePlatform())) return;
  try {
    const { Haptics, NotificationType } = await import('@capacitor/haptics');
    await Haptics.notification({ type: NotificationType.Success });
  } catch { /* silent */ }
}

/** Warning notification — for non-fatal warnings. */
export async function hapticWarning(): Promise<void> {
  if (!(await isNativePlatform())) return;
  try {
    const { Haptics, NotificationType } = await import('@capacitor/haptics');
    await Haptics.notification({ type: NotificationType.Warning });
  } catch { /* silent */ }
}

/** Error notification — for failures, blocks. */
export async function hapticError(): Promise<void> {
  if (!(await isNativePlatform())) return;
  try {
    const { Haptics, NotificationType } = await import('@capacitor/haptics');
    await Haptics.notification({ type: NotificationType.Error });
  } catch { /* silent */ }
}

// ─── Camera ─────────────────────────────────────────────────────────────

export interface CapturedPhoto {
  /** File object suitable for upload/FormData. */
  file: File;
  /** data: URL useful for previews. */
  dataUrl: string;
}

/**
 * Open native camera + gallery picker. Returns null on web (caller should
 * fall back to <input type="file">) or if user cancels.
 *
 * Source: 'prompt' shows iOS-style action sheet "Camera or Gallery";
 * 'camera' opens camera directly; 'photos' opens gallery directly.
 */
export async function takePhoto(opts: {
  source?: 'prompt' | 'camera' | 'photos';
  quality?: number;
} = {}): Promise<CapturedPhoto | null> {
  if (!(await isNativePlatform())) return null;
  try {
    const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
    const sourceMap = {
      prompt: CameraSource.Prompt,
      camera: CameraSource.Camera,
      photos: CameraSource.Photos,
    };
    const photo = await Camera.getPhoto({
      quality: opts.quality ?? 90,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: sourceMap[opts.source ?? 'prompt'],
    });
    if (!photo.dataUrl) return null;
    const res = await fetch(photo.dataUrl);
    const blob = await res.blob();
    const file = new File(
      [blob],
      `photo-${Date.now()}.${photo.format || 'jpg'}`,
      { type: blob.type || 'image/jpeg' },
    );
    return { file, dataUrl: photo.dataUrl };
  } catch (err: any) {
    // User cancelled → silent return null
    const msg = String(err?.message || err).toLowerCase();
    if (msg.includes('cancel') || msg.includes('user denied')) return null;
    console.warn('takePhoto error:', err);
    return null;
  }
}

// ─── Share ──────────────────────────────────────────────────────────────

/**
 * Share an image to the native share sheet (iOS/Android) or Web Share API.
 * Returns true if shared, false if no share mechanism available or user cancelled.
 *
 * On native: downloads image to filesystem cache, then opens share sheet
 * with the file. iOS shows: Messages, Mail, IG, TikTok, AirDrop, Save to Photos.
 *
 * On web: uses navigator.share() if available (works on iOS Safari + some
 * Android browsers). Returns false if not — caller can fall back to download.
 */
export async function sharePhoto(opts: {
  url: string;
  title?: string;
  text?: string;
  filename?: string;
}): Promise<boolean> {
  // Native path
  if (await isNativePlatform()) {
    try {
      const { Share } = await import('@capacitor/share');
      const { Filesystem, Directory } = await import('@capacitor/filesystem');

      const response = await fetch(opts.url);
      const blob = await response.blob();
      const base64 = await blobToBase64(blob);

      const filename = opts.filename || `vist-${Date.now()}.jpg`;
      const written = await Filesystem.writeFile({
        path: filename,
        data: base64,
        directory: Directory.Cache,
      });

      await Share.share({
        title: opts.title || 'VIST',
        text: opts.text || 'Hecho con VIST',
        url: written.uri,
        dialogTitle: 'Compartir',
      });
      return true;
    } catch (err: any) {
      const msg = String(err?.message || err).toLowerCase();
      if (msg.includes('cancel')) return false;
      console.warn('Native share failed, trying Web Share:', err);
      // Fall through to Web Share API
    }
  }

  // Web Share API (iOS Safari, Chrome Android with files)
  if (typeof navigator !== 'undefined' && typeof (navigator as any).share === 'function') {
    try {
      // Try to attach the file blob — gives the user "Save Image" → Photos
      // on iOS, plus full sharing to apps that accept files.
      // If the fetch fails (CORS, network), keep going with URL-only share —
      // iOS still shows the share sheet which includes "Add to Photos" via
      // the "Save Image" option when sharing a URL.
      let file: File | null = null;
      try {
        const response = await fetch(opts.url);
        const blob = await response.blob();
        if (blob && blob.size > 0) {
          file = new File(
            [blob],
            opts.filename || `vist-${Date.now()}.jpg`,
            { type: blob.type || 'image/jpeg' },
          );
        }
      } catch (fetchErr) {
        console.warn('Web Share: file fetch failed, falling back to URL-only', fetchErr);
      }

      const shareData: any = { title: opts.title, text: opts.text };
      if (file && (navigator as any).canShare?.({ files: [file] })) {
        shareData.files = [file];
      } else {
        shareData.url = opts.url;
      }
      await (navigator as any).share(shareData);
      return true;
    } catch (err: any) {
      if (err?.name === 'AbortError') return false; // user cancelled
      console.warn('Web Share failed:', err);
      // fall through to iOS new-tab fallback below
    }
  }

  // iOS web fallback: open in new tab. From there the user can long-press
  // the image → "Add to Photos" which lands it in the Photos gallery.
  // We avoid <a download> on iOS because Safari saves those to Files
  // (not Photos), which is the wrong destination for our use case.
  if (isIOSWeb()) {
    try {
      window.open(opts.url, '_blank', 'noopener,noreferrer');
      return true;
    } catch {
      /* ignore */
    }
  }

  return false; // No share available — caller may fall back to <a download>
}

/** True on iOS Safari (not Capacitor native). Used to special-case the
 *  Photos-vs-Files behavior on Safari downloads. */
function isIOSWeb(): boolean {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
}

// ─── Helpers ────────────────────────────────────────────────────────────

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1] || '';
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
