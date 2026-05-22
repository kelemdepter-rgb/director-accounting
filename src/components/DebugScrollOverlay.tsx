/**
 * Fixed top-right overlay that prints the live scroll/height state of the
 * page. Web-only, and only when the URL contains `?debug` (e.g. `?debug=1`).
 *
 * It exists because mobile scroll bugs on React Native Web come from the
 * height chain collapsing somewhere between `#root` and the active
 * ScrollView. The overlay surfaces the numbers that reveal it:
 *   - `rootClipped: YES`        -> content overflows the viewport unreachably
 *   - `scroller ... canScroll`  -> whether the scroll container is bounded
 *   - `body locked: YES`        -> a modal left `body { overflow: hidden }` on
 *
 * It writes straight to a DOM node on an interval rather than re-rendering
 * through React/React Native Web — a debug HUD must keep updating even if the
 * component tree around it is misbehaving, which is exactly when it is needed.
 */
import { useEffect } from 'react';
import { Platform } from 'react-native';

function isDebugEnabled(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).has('debug');
}

export function DebugScrollOverlay() {
  useEffect(() => {
    if (!isDebugEnabled()) return;

    const box = document.createElement('div');
    box.style.cssText =
      'position:fixed;top:4px;right:4px;padding:6px 8px;border-radius:6px;' +
      'background:rgba(0,0,0,0.8);color:#0f0;z-index:2147483647;max-width:300px;' +
      'pointer-events:none;white-space:pre;font:10px/1.5 monospace;';
    document.body.appendChild(box);

    const render = () => {
      const doc = document.documentElement;
      const body = document.body;
      const root = document.getElementById('root') ?? body;

      let scroller: HTMLElement | null = null;
      document.querySelectorAll<HTMLElement>('#root *').forEach((el) => {
        const ov = getComputedStyle(el).overflowY;
        if ((ov === 'auto' || ov === 'scroll') && el.scrollHeight > 0) {
          if (!scroller || el.scrollHeight > scroller.scrollHeight) scroller = el;
        }
      });
      const s = scroller as HTMLElement | null;

      box.textContent = [
        `viewport: ${window.innerWidth}x${window.innerHeight}`,
        `doc:  s=${doc.scrollHeight} c=${doc.clientHeight}`,
        `body: s=${body.scrollHeight} c=${body.clientHeight} ov=${getComputedStyle(body).overflow}`,
        `root: s=${root.scrollHeight} c=${root.clientHeight} ov=${getComputedStyle(root).overflow}`,
        s
          ? `scroller: s=${s.scrollHeight} c=${s.clientHeight} t=${Math.round(s.scrollTop)}`
          : 'scroller: NONE',
        s ? `  canScroll: ${s.scrollHeight > s.clientHeight ? 'YES' : 'no'}` : '',
        `rootClipped: ${root.scrollHeight > window.innerHeight ? 'YES' : 'no'}`,
        `body locked: ${body.style.overflow === 'hidden' ? 'YES' : 'no'}`,
        `kbd vp h: ${window.visualViewport ? Math.round(window.visualViewport.height) : 'n/a'}`,
        `ua: ${navigator.userAgent.slice(0, 52)}`,
      ]
        .filter(Boolean)
        .join('\n');
    };

    render();
    const id = window.setInterval(render, 250);
    window.addEventListener('scroll', render, true);
    window.addEventListener('resize', render);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('scroll', render, true);
      window.removeEventListener('resize', render);
      box.remove();
    };
  }, []);

  return null;
}
