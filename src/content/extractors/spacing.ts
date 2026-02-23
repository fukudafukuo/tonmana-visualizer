import type { SpacingEntry } from "../../shared/types";
import type { VisibleElement } from "../utils/dom-walker";

const TOP_SPACINGS = 10;

export function extractSpacing(elements: VisibleElement[]): SpacingEntry[] {
  const map = new Map<number, number>(); // value → count

  for (const { computedStyle: cs } of elements) {
    const props = [
      "marginTop",
      "marginRight",
      "marginBottom",
      "marginLeft",
      "paddingTop",
      "paddingRight",
      "paddingBottom",
      "paddingLeft",
      "gap",
      "rowGap",
      "columnGap",
    ] as const;

    for (const prop of props) {
      const raw = cs.getPropertyValue(
        prop.replace(/([A-Z])/g, "-$1").toLowerCase()
      );
      const val = parseFloat(raw);
      if (!isNaN(val) && val > 0 && val < 1000) {
        // 4px単位に丸めてスケールを見やすくする
        const rounded = Math.round(val / 4) * 4 || 4;
        map.set(rounded, (map.get(rounded) || 0) + 1);
      }
    }
  }

  const sorted = [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_SPACINGS);

  const totalCount = sorted.reduce((sum, [, c]) => sum + c, 0);

  return sorted.map(([value, count]) => ({
    value,
    unit: "px",
    count,
    percentage:
      totalCount > 0 ? Math.round((count / totalCount) * 1000) / 10 : 0,
  }));
}
