import type { ContentWidthEntry } from "../../shared/types";
import type { VisibleElement } from "../utils/dom-walker";
import { elementToRef } from "../utils/dom-walker";

const TOP_WIDTHS = 10;
const MIN_WIDTH = 100;
const MAX_WIDTH = 3000;

interface WidthBucket {
  count: number;
  elements: Element[];
}

export function extractContentWidths(
  elements: VisibleElement[]
): ContentWidthEntry[] {
  const maxWidthMap = new Map<number, WidthBucket>();
  const widthMap = new Map<number, WidthBucket>();

  for (const { el, computedStyle: cs } of elements) {
    // max-width: the most meaningful signal for layout containers
    const maxW = cs.getPropertyValue("max-width");
    if (maxW && maxW !== "none") {
      const val = parseFloat(maxW);
      if (!isNaN(val) && val >= MIN_WIDTH && val <= MAX_WIDTH) {
        const rounded = Math.round(val);
        const bucket = maxWidthMap.get(rounded) || { count: 0, elements: [] };
        bucket.count++;
        if (bucket.elements.length < 3) bucket.elements.push(el);
        maxWidthMap.set(rounded, bucket);
      }
    }

    // Explicit width values (skip auto, 100%, fit-content, etc.)
    const w = cs.getPropertyValue("width");
    if (w && w.endsWith("px")) {
      const val = parseFloat(w);
      if (!isNaN(val) && val >= MIN_WIDTH && val <= MAX_WIDTH) {
        // Only include elements that have an explicitly set width
        // (check inline style or if the element is a known container type)
        const tag = el.tagName;
        const isContainer = [
          "DIV",
          "SECTION",
          "MAIN",
          "ARTICLE",
          "ASIDE",
          "NAV",
          "HEADER",
          "FOOTER",
          "FORM",
        ].includes(tag);

        if (!isContainer) continue;

        // Skip elements whose width is just their parent's width (100%)
        const parent = el.parentElement;
        if (parent) {
          const parentW = parseFloat(
            window.getComputedStyle(parent).getPropertyValue("width")
          );
          if (!isNaN(parentW) && Math.abs(val - parentW) < 2) continue;
        }

        const rounded = Math.round(val);
        const bucket = widthMap.get(rounded) || { count: 0, elements: [] };
        bucket.count++;
        if (bucket.elements.length < 3) bucket.elements.push(el);
        widthMap.set(rounded, bucket);
      }
    }
  }

  const result: ContentWidthEntry[] = [];

  // Process max-width entries
  const maxWidthEntries = [...maxWidthMap.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, TOP_WIDTHS);

  const maxWidthTotal = maxWidthEntries.reduce(
    (sum, [, b]) => sum + b.count,
    0
  );

  for (const [value, bucket] of maxWidthEntries) {
    result.push({
      value,
      unit: "px",
      property: "max-width",
      count: bucket.count,
      percentage:
        maxWidthTotal > 0
          ? Math.round((bucket.count / maxWidthTotal) * 1000) / 10
          : 0,
      representativeElements: bucket.elements.map((el) => elementToRef(el)),
    });
  }

  // Process width entries
  const widthEntries = [...widthMap.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, TOP_WIDTHS);

  const widthTotal = widthEntries.reduce((sum, [, b]) => sum + b.count, 0);

  for (const [value, bucket] of widthEntries) {
    result.push({
      value,
      unit: "px",
      property: "width",
      count: bucket.count,
      percentage:
        widthTotal > 0
          ? Math.round((bucket.count / widthTotal) * 1000) / 10
          : 0,
      representativeElements: bucket.elements.map((el) => elementToRef(el)),
    });
  }

  return result;
}
