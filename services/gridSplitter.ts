// services/gridSplitter.ts
// Canvas-based utility to split NxM grids into individual images.
// Used by photo session (grid output) and character sheets (LoRA training data).

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SheetType = 'face' | 'body' | 'expressions';

const SHEET_DIMENSIONS: Record<SheetType, { rows: number; cols: number }> = {
  face: { rows: 2, cols: 2 },         // 2x2 → 4 face angles
  body: { rows: 1, cols: 4 },         // 1x4 → 4 body angles
  expressions: { rows: 3, cols: 3 },  // 3x3 → 9 expressions
};

// ---------------------------------------------------------------------------
// Prompt template
// ---------------------------------------------------------------------------

export const GRID_2x2_PROMPT_TEMPLATE = (poses: string[]) =>
  `A 2x2 grid of 4 different photos of the SAME person from the Base Image.
Top-left: ${poses[0] || 'neutral pose'}. Top-right: ${poses[1] || 'side angle'}.
Bottom-left: ${poses[2] || 'looking down'}. Bottom-right: ${poses[3] || 'looking up'}.
SAME face, SAME outfit, SAME location across all 4 photos. Only the pose/angle changes.`;

// ---------------------------------------------------------------------------
// Image loader helper
// ---------------------------------------------------------------------------

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image for grid splitting'));
    img.src = src;
  });
}

// ---------------------------------------------------------------------------
// Core split function
// ---------------------------------------------------------------------------

/**
 * Split an image into a grid of cells.
 * @param imageDataUrl - data URL or blob URL of the image
 * @param rows - number of rows
 * @param cols - number of columns
 * @param marginPx - optional margin in pixels to trim from each cell edge (default 2)
 * @returns Array of data URLs in row-major order
 */
export async function splitGrid(
  imageDataUrl: string,
  rows: number,
  cols: number,
  marginPx: number = 2,
): Promise<string[]> {
  const img = await loadImage(imageDataUrl);

  const cellW = Math.floor(img.width / cols);
  const cellH = Math.floor(img.height / rows);

  const results: string[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const sx = c * cellW + marginPx;
      const sy = r * cellH + marginPx;
      const sw = cellW - marginPx * 2;
      const sh = cellH - marginPx * 2;

      const canvas = document.createElement('canvas');
      canvas.width = sw;
      canvas.height = sh;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Canvas 2D context not available');
      }

      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
      results.push(canvas.toDataURL('image/png'));
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Convenience wrapper
// ---------------------------------------------------------------------------

/**
 * Convenience wrapper for known sheet types.
 * @param imageDataUrl - data URL or URL of the character sheet grid
 * @param sheetType - Type of sheet: 'face' (2x2), 'body' (1x4), or 'expressions' (3x3)
 * @returns Array of individual image data URLs
 */
export async function splitCharacterSheetGrid(
  imageDataUrl: string,
  sheetType: SheetType,
): Promise<string[]> {
  const { rows, cols } = SHEET_DIMENSIONS[sheetType];
  return splitGrid(imageDataUrl, rows, cols);
}
