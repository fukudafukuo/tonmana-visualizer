import type { TypographyEntry } from "../../shared/types";
import type { VisibleElement } from "../utils/dom-walker";
import { elementToRef } from "../utils/dom-walker";

const TOP_TYPOGRAPHY = 8;

interface TypoKey {
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  lineHeight: string;
}

function toKey(t: TypoKey): string {
  return `${t.fontFamily}|${t.fontSize}|${t.fontWeight}|${t.lineHeight}`;
}

export function extractTypography(
  elements: VisibleElement[]
): TypographyEntry[] {
  const map = new Map<
    string,
    { key: TypoKey; weight: number; elements: Element[] }
  >();

  for (const { el, computedStyle: cs, textLength } of elements) {
    if (textLength === 0) continue;

    const fontSize = parseFloat(cs.fontSize) || 16;
    const fontFamily = cs.fontFamily.split(",")[0].trim().replace(/['"]/g, "");
    const fontWeight = cs.fontWeight;
    const lineHeight = cs.lineHeight;

    const k: TypoKey = { fontFamily, fontSize, fontWeight, lineHeight };
    const keyStr = toKey(k);

    // Weight = textLength * fontSize (larger text has more visual impact)
    const weight = Math.min(textLength, 200) * fontSize;

    const existing = map.get(keyStr);
    if (existing) {
      existing.weight += weight;
      if (existing.elements.length < 3) existing.elements.push(el);
    } else {
      map.set(keyStr, { key: k, weight, elements: [el] });
    }
  }

  const sorted = [...map.values()].sort((a, b) => b.weight - a.weight);
  const top = sorted.slice(0, TOP_TYPOGRAPHY);
  const totalWeight = top.reduce((sum, t) => sum + t.weight, 0);

  return top.map((t) => ({
    fontFamily: t.key.fontFamily,
    fontSize: t.key.fontSize,
    fontWeight: t.key.fontWeight,
    lineHeight: t.key.lineHeight,
    weight: t.weight,
    percentage:
      totalWeight > 0 ? Math.round((t.weight / totalWeight) * 1000) / 10 : 0,
    representativeElements: t.elements.map((el) => elementToRef(el)),
  }));
}
