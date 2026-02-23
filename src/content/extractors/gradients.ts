import type { GradientEntry } from "../../shared/types";
import type { VisibleElement } from "../utils/dom-walker";
import { elementToRef } from "../utils/dom-walker";

const GRADIENT_RE = /(linear|radial|conic)-gradient\([^)]+(?:\([^)]*\))*[^)]*\)/g;
const COLOR_STOP_RE = /(?:rgba?\([^)]+\)|hsla?\([^)]+\)|#[0-9a-f]{3,8}|\b(?:transparent|currentcolor|white|black|red|blue|green|yellow|orange|purple|pink|gray|grey)\b)/gi;

function normalizeGradient(raw: string): string {
  return raw.replace(/\s+/g, " ").trim().toLowerCase();
}

export function extractGradients(elements: VisibleElement[]): GradientEntry[] {
  const map = new Map<
    string,
    { type: GradientEntry["type"]; raw: string; colors: string[]; count: number; elements: Element[] }
  >();

  for (const { el, computedStyle: cs } of elements) {
    const bgImage = cs.backgroundImage;
    if (!bgImage || bgImage === "none") continue;

    let match: RegExpExecArray | null;
    GRADIENT_RE.lastIndex = 0;
    while ((match = GRADIENT_RE.exec(bgImage)) !== null) {
      const raw = match[0];
      const type = match[1] as GradientEntry["type"];
      const normalized = normalizeGradient(raw);

      const colors: string[] = [];
      let colorMatch: RegExpExecArray | null;
      COLOR_STOP_RE.lastIndex = 0;
      while ((colorMatch = COLOR_STOP_RE.exec(raw)) !== null) {
        const c = colorMatch[0].toLowerCase();
        if (!colors.includes(c)) colors.push(c);
      }

      if (colors.length < 2) continue;

      const existing = map.get(normalized);
      if (existing) {
        existing.count++;
        if (existing.elements.length < 3) existing.elements.push(el);
      } else {
        map.set(normalized, { type, raw, colors, count: 1, elements: [el] });
      }
    }
  }

  return [...map.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map((g) => ({
      type: g.type,
      raw: g.raw,
      colors: g.colors,
      count: g.count,
      representativeElements: g.elements.map((el) => elementToRef(el)),
    }));
}
