import type { RadiusEntry, ShadowEntry } from "../../shared/types";
import type { VisibleElement } from "../utils/dom-walker";

const TOP_RADII = 6;
const TOP_SHADOWS = 6;

export function extractDecorations(
  elements: VisibleElement[]
): { radii: RadiusEntry[]; shadows: ShadowEntry[] } {
  const radiusMap = new Map<string, number>();
  const shadowMap = new Map<string, { raw: string; count: number }>();

  for (const { computedStyle: cs } of elements) {
    // Border radius
    const br = cs.borderRadius;
    if (br && br !== "0px") {
      // Normalize to single value if all corners are the same
      const normalized = normalizeRadius(br);
      if (normalized) {
        radiusMap.set(normalized, (radiusMap.get(normalized) || 0) + 1);
      }
    }

    // Box shadow
    const shadow = cs.boxShadow;
    if (shadow && shadow !== "none") {
      const normalized = normalizeShadow(shadow);
      const existing = shadowMap.get(normalized);
      if (existing) {
        existing.count++;
      } else {
        shadowMap.set(normalized, { raw: shadow, count: 1 });
      }
    }
  }

  const radii = [...radiusMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_RADII)
    .map(([value, count]) => ({ value, count }));

  const shadows = [...shadowMap.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, TOP_SHADOWS)
    .map(([normalized, { raw, count }]) => ({
      raw,
      normalized,
      count,
    }));

  return { radii, shadows };
}

function normalizeRadius(raw: string): string | null {
  const parts = raw.split(/\s+/).map((v) => parseFloat(v));
  if (parts.some(isNaN)) return null;
  if (parts.length === 0) return null;

  // If all are same, simplify
  if (parts.every((v) => v === parts[0])) {
    return `${parts[0]}px`;
  }

  return parts.map((v) => `${v}px`).join(" ");
}

function normalizeShadow(raw: string): string {
  // Normalize pixel values to integers for grouping
  return raw.replace(/(\d+\.?\d*)px/g, (_, n) => `${Math.round(parseFloat(n))}px`);
}
