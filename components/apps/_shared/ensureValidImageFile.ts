/**
 * Normalize a File to JPEG/PNG/WebP with a matching extension before sending
 * it to a strict downstream validator (fal.ai's Seedance 2.0, Kling Video,
 * NB2 Edit, etc).
 *
 * Common problems this fixes:
 *   - File comes back from urlToFile() as `octet-stream` because the CDN
 *     didn't send a Content-Type header.
 *   - iOS uploads HEIC/HEIF photos that downstream models reject.
 *   - File extension and MIME type mismatch (e.g. character.png with JPEG
 *     bytes) — most uploaders trust the name, the validator trusts the type.
 *   - Image over the model's size limit (Seedance: 30MB; Kling: ~10MB).
 *
 * Strategy: if the file is already a valid JPEG/PNG/WebP with matching
 * extension AND under MAX_BYTES, return it untouched. Otherwise decode
 * via createImageBitmap (works for everything the browser can render) and
 * re-encode as JPEG at 0.92 quality, capped at MAX_EDGE on the longer side.
 */

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_EDGE = 2048;
const MAX_BYTES = 25 * 1024 * 1024; // 25 MB — well under Seedance's 30 MB

export async function ensureValidImageFile(file: File): Promise<File> {
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  const extMatch =
    (file.type === 'image/jpeg' && (ext === 'jpg' || ext === 'jpeg')) ||
    (file.type === 'image/png'  && ext === 'png') ||
    (file.type === 'image/webp' && ext === 'webp');

  if (ALLOWED_TYPES.includes(file.type) && extMatch && file.size <= MAX_BYTES) {
    return file;
  }

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) {
    throw new Error('Formato de imagen no soportado por el navegador');
  }
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas no disponible');
  ctx.drawImage(bitmap, 0, 0, w, h);

  const blob: Blob | null = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.92));
  if (!blob) throw new Error('No se pudo recodificar la imagen');

  const safeName = file.name.replace(/\.[^.]+$/, '') + '.jpg';
  return new File([blob], safeName, { type: 'image/jpeg' });
}
