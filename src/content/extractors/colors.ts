import type {
  RGBA,
  ColorCategory,
  CategoryColors,
  ColorEntry,
  ContrastPair,
  StyleDNA,
} from "../../shared/types";
import type { VisibleElement } from "../utils/dom-walker";
import { elementToRef } from "../utils/dom-walker";
import {
  parseColor,
  quantizeRGBA,
  quantizedKeyToRGBA,
  rgbaToLab,
  ciede2000,
  rgbaToHex,
  contrastRatio,
} from "../utils/color-math";

const QUANTIZE_STEP = 16;
const TOP_QUANTIZED = 200;
const TOP_COLORS = 8;
const MERGE_THRESHOLD = 3; // CIEDE2000 ΔE
const ALPHA_THRESHOLD = 0.05;

interface WeightedColor {
  key: string;
  weight: number;
  elements: Element[];
}

function extractCategoryMap(
  elements: VisibleElement[]
): Map<ColorCategory, Map<string, WeightedColor>> {
  const categories = new Map<ColorCategory, Map<string, WeightedColor>>();

  const getOrCreate = (cat: ColorCategory): Map<string, WeightedColor> => {
    if (!categories.has(cat)) categories.set(cat, new Map());
    return categories.get(cat)!;
  };

  // body/html background as base tone
  const htmlBg = parseColor(
    window.getComputedStyle(document.documentElement).backgroundColor
  );
  const bodyBg = parseColor(
    window.getComputedStyle(document.body).backgroundColor
  );

  for (const baseBg of [htmlBg, bodyBg]) {
    if (baseBg && baseBg.a >= ALPHA_THRESHOLD) {
      const key = quantizeRGBA(baseBg, QUANTIZE_STEP);
      const map = getOrCreate("background");
      const area = window.innerWidth * window.innerHeight;
      const existing = map.get(key);
      if (existing) {
        existing.weight += area * baseBg.a;
      } else {
        map.set(key, {
          key,
          weight: area * baseBg.a,
          elements: [document.body],
        });
      }
    }
  }

  for (const { el, computedStyle: cs, visibleArea, perimeter, textLength } of elements) {
    // Background
    const bg = parseColor(cs.backgroundColor);
    if (bg && bg.a >= ALPHA_THRESHOLD) {
      const key = quantizeRGBA(bg, QUANTIZE_STEP);
      const weight = visibleArea * bg.a;
      addToMap(getOrCreate("background"), key, weight, el);
    }

    // Text color
    if (textLength > 0) {
      const txt = parseColor(cs.color);
      if (txt && txt.a >= ALPHA_THRESHOLD) {
        const key = quantizeRGBA(txt, QUANTIZE_STEP);
        const fontSize = parseFloat(cs.fontSize) || 16;
        const weight = Math.min(textLength, 200) * fontSize * fontSize * txt.a;
        addToMap(getOrCreate("text"), key, weight, el);
      }
    }

    // Borders
    const sides = ["Top", "Right", "Bottom", "Left"] as const;
    for (const side of sides) {
      const style = cs.getPropertyValue(`border-${side.toLowerCase()}-style`);
      if (style && style !== "none") {
        const borderColor = parseColor(
          cs.getPropertyValue(`border-${side.toLowerCase()}-color`)
        );
        const borderWidth =
          parseFloat(
            cs.getPropertyValue(`border-${side.toLowerCase()}-width`)
          ) || 0;
        if (borderColor && borderColor.a >= ALPHA_THRESHOLD && borderWidth > 0) {
          const key = quantizeRGBA(borderColor, QUANTIZE_STEP);
          const weight = perimeter * borderWidth;
          addToMap(getOrCreate("border"), key, weight, el);
        }
      }
    }

    // Outline
    const outlineStyle = cs.outlineStyle;
    if (outlineStyle && outlineStyle !== "none") {
      const outlineColor = parseColor(cs.outlineColor);
      const outlineWidth = parseFloat(cs.outlineWidth) || 0;
      if (outlineColor && outlineColor.a >= ALPHA_THRESHOLD && outlineWidth > 0) {
        const key = quantizeRGBA(outlineColor, QUANTIZE_STEP);
        const weight = perimeter * outlineWidth;
        addToMap(getOrCreate("outline"), key, weight, el);
      }
    }

    // Box shadow
    const shadow = cs.boxShadow;
    if (shadow && shadow !== "none") {
      const shadowColors = parseShadowColors(shadow);
      for (const { color, blur, spread } of shadowColors) {
        if (color.a >= ALPHA_THRESHOLD) {
          const key = quantizeRGBA(color, QUANTIZE_STEP);
          const weight = perimeter * (blur + spread * 0.5);
          addToMap(getOrCreate("shadow"), key, weight, el);
        }
      }
    }
  }

  return categories;
}

function addToMap(
  map: Map<string, WeightedColor>,
  key: string,
  weight: number,
  el: Element
) {
  const existing = map.get(key);
  if (existing) {
    existing.weight += weight;
    if (existing.elements.length < 3) {
      existing.elements.push(el);
    }
  } else {
    map.set(key, { key, weight, elements: [el] });
  }
}

function parseShadowColors(
  raw: string
): { color: RGBA; blur: number; spread: number }[] {
  const results: { color: RGBA; blur: number; spread: number }[] = [];

  // Split multiple shadows by comma (but not commas inside rgba())
  const parts = raw.split(/,(?![^(]*\))/);

  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed === "none") continue;

    const colorMatch = trimmed.match(/rgba?\([^)]+\)/);
    if (!colorMatch) continue;

    const color = parseColor(colorMatch[0]);
    if (!color) continue;

    // Extract numeric values after removing color
    const rest = trimmed.replace(colorMatch[0], "").trim();
    const nums = rest.match(/-?[\d.]+px/g)?.map((v) => parseFloat(v)) || [];

    const blur = nums[2] || 0;
    const spread = nums[3] || 0;

    results.push({ color, blur: Math.abs(blur), spread: Math.abs(spread) });
  }

  return results;
}

function topNByWeight(
  map: Map<string, WeightedColor>,
  n: number
): WeightedColor[] {
  return [...map.values()]
    .sort((a, b) => b.weight - a.weight)
    .slice(0, n);
}

function mergeCloseColors(entries: WeightedColor[]): WeightedColor[] {
  const merged: WeightedColor[] = [];

  for (const entry of entries) {
    const rgba = quantizedKeyToRGBA(entry.key);
    const lab = rgbaToLab(rgba);

    let foundMerge = false;
    for (const m of merged) {
      const mRgba = quantizedKeyToRGBA(m.key);
      const mLab = rgbaToLab(mRgba);
      if (ciede2000(lab, mLab) < MERGE_THRESHOLD) {
        m.weight += entry.weight;
        // Keep elements from both
        for (const el of entry.elements) {
          if (m.elements.length < 3) m.elements.push(el);
        }
        foundMerge = true;
        break;
      }
    }

    if (!foundMerge) {
      merged.push({ ...entry, elements: [...entry.elements] });
    }
  }

  return merged;
}

function toColorEntries(
  items: WeightedColor[],
  totalWeight: number
): ColorEntry[] {
  return items.map((item) => {
    const rgba = quantizedKeyToRGBA(item.key);
    return {
      rgba,
      hex: rgbaToHex(rgba),
      weight: item.weight,
      percentage:
        totalWeight > 0 ? Math.round((item.weight / totalWeight) * 1000) / 10 : 0,
      representativeElements: item.elements.map((el) => elementToRef(el)),
    };
  });
}

export function extractColors(elements: VisibleElement[]): {
  categories: CategoryColors[];
  contrastPairs: ContrastPair[];
  styleDNA: Partial<StyleDNA>;
} {
  const categoryMap = extractCategoryMap(elements);
  const categories: CategoryColors[] = [];

  for (const [category, map] of categoryMap) {
    // Step 1: top 200 by weight
    const top200 = topNByWeight(map, TOP_QUANTIZED);
    // Step 2: merge close colors
    const merged = mergeCloseColors(top200);
    // Step 3: sort by weight, take top 8
    merged.sort((a, b) => b.weight - a.weight);
    const top = merged.slice(0, TOP_COLORS);

    const totalWeight = top.reduce((sum, c) => sum + c.weight, 0);
    categories.push({
      category,
      colors: toColorEntries(top, totalWeight),
    });
  }

  // Contrast pairs: bg top × text top
  const bgColors =
    categories.find((c) => c.category === "background")?.colors || [];
  const textColors =
    categories.find((c) => c.category === "text")?.colors || [];

  const contrastPairs: ContrastPair[] = [];
  for (const bg of bgColors.slice(0, 4)) {
    for (const fg of textColors.slice(0, 4)) {
      const ratio =
        Math.round(contrastRatio(bg.rgba, fg.rgba) * 10) / 10;
      contrastPairs.push({
        bgHex: bg.hex,
        fgHex: fg.hex,
        ratio,
      });
    }
  }

  // Style DNA partial (color part)
  const dnaBackground: { label: string; hex: string }[] = [];
  const dnaText: { label: string; hex: string }[] = [];
  const dnaAccent: { label: string; hex: string }[] = [];

  const bgLabels = ["Primary", "Secondary", "Tertiary"];
  for (let i = 0; i < Math.min(bgColors.length, 3); i++) {
    dnaBackground.push({ label: bgLabels[i], hex: bgColors[i].hex });
  }

  const textLabels = ["Primary", "Muted", "Tertiary"];
  for (let i = 0; i < Math.min(textColors.length, 3); i++) {
    dnaText.push({ label: textLabels[i], hex: textColors[i].hex });
  }

  // Accent = border or outline colors that are chromatic
  const borderColors =
    categories.find((c) => c.category === "border")?.colors || [];
  const accentSources = [...borderColors, ...textColors.slice(2)];
  const accentLabels = ["CTA", "Link", "Sub"];
  let accentIdx = 0;
  for (const c of accentSources) {
    if (accentIdx >= 3) break;
    // Consider it "accent" if it's chromatic enough
    const lab = rgbaToLab(c.rgba);
    const chroma = Math.sqrt(lab.a * lab.a + lab.b * lab.b);
    if (chroma > 15) {
      dnaAccent.push({ label: accentLabels[accentIdx], hex: c.hex });
      accentIdx++;
    }
  }

  return {
    categories,
    contrastPairs,
    styleDNA: {
      background: dnaBackground,
      text: dnaText,
      accent: dnaAccent,
    },
  };
}
