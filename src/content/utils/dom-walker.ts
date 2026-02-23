import type { ElementRef } from "../../shared/types";

export interface VisibleElement {
  el: Element;
  computedStyle: CSSStyleDeclaration;
  rect: DOMRect;
  visibleArea: number;
  perimeter: number;
  textLength: number;
}

const SKIP_TAGS = new Set([
  "SCRIPT",
  "STYLE",
  "NOSCRIPT",
  "LINK",
  "META",
  "HEAD",
  "TITLE",
  "BR",
  "HR",
]);

export function walkVisibleElements(
  signal?: AbortSignal,
  onProgress?: (percent: number) => void
): VisibleElement[] {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const all = document.body.querySelectorAll("*");
  const total = all.length;
  const result: VisibleElement[] = [];

  for (let i = 0; i < total; i++) {
    if (signal?.aborted) break;

    if (onProgress && i % 200 === 0) {
      onProgress(Math.round((i / total) * 100));
    }

    const el = all[i];
    if (SKIP_TAGS.has(el.tagName)) continue;

    const rect = el.getBoundingClientRect();

    // Skip offscreen elements
    if (rect.width === 0 || rect.height === 0) continue;
    if (rect.bottom < 0 || rect.top > vh) continue;
    if (rect.right < 0 || rect.left > vw) continue;

    const cs = window.getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0") {
      continue;
    }

    // Visible area within viewport
    const visX = Math.max(0, Math.min(rect.right, vw) - Math.max(rect.left, 0));
    const visY = Math.max(0, Math.min(rect.bottom, vh) - Math.max(rect.top, 0));
    const visibleArea = visX * visY;

    const perimeter = 2 * (rect.width + rect.height);

    // Direct text length (excluding child elements' text)
    let textLength = 0;
    for (const child of el.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        textLength += (child.textContent?.trim().length ?? 0);
      }
    }

    result.push({
      el,
      computedStyle: cs,
      rect,
      visibleArea,
      perimeter,
      textLength,
    });
  }

  return result;
}

export function elementToRef(el: Element): ElementRef {
  const tag = el.tagName.toLowerCase();
  const cls = el.className && typeof el.className === "string"
    ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".")
    : "";
  const selector = (tag + cls).slice(0, 40);
  return { selector, index: 0 };
}
