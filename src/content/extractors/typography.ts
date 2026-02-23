import type { TypographyEntry, FontSource } from "../../shared/types";
import type { VisibleElement } from "../utils/dom-walker";
import { elementToRef } from "../utils/dom-walker";

const TOP_TYPOGRAPHY = 8;

const SYSTEM_FONTS = new Set([
  "serif", "sans-serif", "monospace", "cursive", "fantasy", "system-ui",
  "ui-serif", "ui-sans-serif", "ui-monospace", "ui-rounded",
  "-apple-system", "blinkmacsystemfont", "segoe ui", "roboto",
  "helvetica", "helvetica neue", "arial", "verdana", "georgia",
  "times new roman", "courier new", "tahoma", "trebuchet ms",
  "lucida grande", "lucida sans", "palatino", "garamond", "bookman",
  "comic sans ms", "impact", "ms gothic", "ms pgothic", "ms mincho",
  "meiryo", "yu gothic", "hiragino kaku gothic pro", "hiragino sans",
]);

function detectFontSources(): Map<string, FontSource> {
  const sourceMap = new Map<string, FontSource>();

  const links = document.querySelectorAll("link[href]");
  for (const link of links) {
    const href = (link as HTMLLinkElement).href || "";
    if (href.includes("fonts.googleapis.com")) {
      const match = href.match(/family=([^&]+)/);
      if (match) {
        const families = decodeURIComponent(match[1]).split("|");
        for (const fam of families) {
          const name = fam.split(":")[0].replace(/\+/g, " ").trim();
          if (name) sourceMap.set(name.toLowerCase(), "Google Fonts");
        }
      }
    }
    if (href.includes("use.typekit.net") || href.includes("fonts.adobe.com")) {
      sourceMap.set("__adobe_link__", "Adobe Fonts");
    }
  }

  try {
    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules) {
          if (rule instanceof CSSFontFaceRule) {
            const family = rule.style.fontFamily?.replace(/['"]/g, "").trim().toLowerCase();
            if (!family) continue;

            const src = rule.style.getPropertyValue("src") || "";
            if (src.includes("fonts.googleapis.com") || src.includes("fonts.gstatic.com")) {
              sourceMap.set(family, "Google Fonts");
            } else if (src.includes("use.typekit.net") || src.includes("typekit.com") || src.includes("fonts.adobe.com")) {
              sourceMap.set(family, "Adobe Fonts");
            } else if (src.includes("url(")) {
              if (!sourceMap.has(family)) {
                sourceMap.set(family, "Self-hosted");
              }
            }
          }
        }
      } catch {
        // Cross-origin stylesheets throw SecurityError
      }
    }
  } catch {
    // stylesheets access may fail
  }

  return sourceMap;
}

function getFontSource(fontFamily: string, sourceMap: Map<string, FontSource>): FontSource {
  const normalized = fontFamily.toLowerCase();
  if (sourceMap.has(normalized)) return sourceMap.get(normalized)!;
  if (SYSTEM_FONTS.has(normalized)) return "System";
  if (sourceMap.has("__adobe_link__") && !SYSTEM_FONTS.has(normalized)) {
    return "Adobe Fonts";
  }
  return "Unknown";
}

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
  const fontSourceMap = detectFontSources();

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
    fontSource: getFontSource(t.key.fontFamily, fontSourceMap),
    weight: t.weight,
    percentage:
      totalWeight > 0 ? Math.round((t.weight / totalWeight) * 1000) / 10 : 0,
    representativeElements: t.elements.map((el) => elementToRef(el)),
  }));
}
