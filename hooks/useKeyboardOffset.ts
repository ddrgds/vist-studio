import { useEffect, useState } from 'react';

/**
 * useKeyboardOffset — returns the pixel height the iOS / Android soft keyboard
 * currently occupies at the bottom of the screen.
 *
 *   On iOS 17+ with `<meta name="viewport" content="...interactive-widget=
 *   resizes-content">` the layout viewport already shrinks automatically and
 *   this hook reports 0 — that's correct, no manual offset needed.
 *
 *   On older iOS (and Android Chrome <108), the layout viewport stays static
 *   and the keyboard covers fixed-bottom elements. This hook listens to
 *   `visualViewport.resize` and computes the keyboard height so consumers
 *   can translate (or pad) the affected element accordingly.
 *
 *   Pattern:
 *     const kbOffset = useKeyboardOffset();
 *     <div style={{ bottom: kbOffset, transition: 'bottom 0.18s' }} />
 *
 *   Always 0 on desktop browsers — no keyboard impact there.
 */
export function useKeyboardOffset(): number {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const vv = (window as any).visualViewport as VisualViewport | undefined;
    if (!vv) return; // SSR / very old browsers — no API, no-op

    const update = () => {
      // window.innerHeight reflects the layout viewport (full window).
      // vv.height shrinks when the soft keyboard rises.
      // Their difference (clamped to ≥0) is the keyboard height.
      const layoutH = window.innerHeight;
      const visualH = vv.height;
      const kb = Math.max(0, layoutH - visualH - (vv.offsetTop ?? 0));
      // Threshold the noise: tiny address-bar shifts shouldn't count as keyboard.
      setOffset(kb > 80 ? kb : 0);
    };

    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);

  return offset;
}
