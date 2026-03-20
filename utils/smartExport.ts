// utils/smartExport.ts
// Canvas center-crop + resize per social format

export interface ExportFormat {
  name: string;
  width: number;
  height: number;
}

export const EXPORT_FORMATS: Record<string, ExportFormat> = {
  'ig-post':    { name: 'Instagram Post',    width: 1080, height: 1350 },
  'ig-story':   { name: 'Instagram Story',   width: 1080, height: 1920 },
  'tiktok':     { name: 'TikTok / Reel',     width: 1080, height: 1920 },
  'youtube':    { name: 'YouTube Thumbnail',  width: 1280, height: 720 },
  'twitter':    { name: 'Twitter / X',        width: 1600, height: 900 },
  'square':     { name: 'Square',             width: 1080, height: 1080 },
  'original':   { name: 'Original',           width: 0,    height: 0 },
};

export async function exportForFormat(
  imageUrl: string,
  formatKey: string,
): Promise<Blob> {
  const format = EXPORT_FORMATS[formatKey];
  if (!format || formatKey === 'original' || (format.width === 0 && format.height === 0)) {
    // Original -- just fetch and return
    const res = await fetch(imageUrl);
    return res.blob();
  }

  // Load image
  const img = await loadImage(imageUrl);

  // Calculate center crop
  const targetRatio = format.width / format.height;
  const imgRatio = img.width / img.height;

  let sx = 0, sy = 0, sw = img.width, sh = img.height;

  if (imgRatio > targetRatio) {
    // Image is wider -- crop sides
    sw = img.height * targetRatio;
    sx = (img.width - sw) / 2;
  } else {
    // Image is taller -- crop top/bottom
    sh = img.width / targetRatio;
    sy = (img.height - sh) / 2;
  }

  // Draw to canvas at target size
  const canvas = document.createElement('canvas');
  canvas.width = format.width;
  canvas.height = format.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, format.width, format.height);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), 'image/png');
  });
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}
