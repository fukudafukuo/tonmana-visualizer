import React, { useState } from "react";
import type { CategoryColors, ColorCategory } from "../../shared/types";
import { CopyableValue } from "./CopyableValue";

interface Props {
  categories: CategoryColors[];
  onHighlight: (selector: string, index: number) => void;
}

const CATEGORY_LABELS: Record<ColorCategory, string> = {
  background: "背景色 (Background)",
  text: "文字色 (Text)",
  border: "ボーダー (Border)",
  outline: "アウトライン (Outline)",
  shadow: "シャドウ (Shadow)",
};

const BASIC_CATEGORIES: ColorCategory[] = ["background", "text"];
const ADVANCED_CATEGORIES: ColorCategory[] = ["border", "outline", "shadow"];

export function ColorPalette({ categories, onHighlight }: Props) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const basicCats = categories.filter((c) =>
    BASIC_CATEGORIES.includes(c.category)
  );
  const advancedCats = categories.filter((c) =>
    ADVANCED_CATEGORIES.includes(c.category)
  );
  const hasAdvanced = advancedCats.some((c) => c.colors.length > 0);

  return (
    <>
      {basicCats.map((cat) => (
        <ColorSection
          key={cat.category}
          category={cat}
          onHighlight={onHighlight}
        />
      ))}
      {hasAdvanced && (
        <div className="advanced-toggle-wrapper">
          <button
            className="advanced-toggle"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            {showAdvanced ? "詳細カテゴリを閉じる" : "詳細カテゴリを表示 (Border / Outline / Shadow)"}
          </button>
        </div>
      )}
      {showAdvanced &&
        advancedCats.map((cat) => (
          <ColorSection
            key={cat.category}
            category={cat}
            onHighlight={onHighlight}
          />
        ))}
    </>
  );
}

function ColorSection({
  category,
  onHighlight,
}: {
  category: CategoryColors;
  onHighlight: (selector: string, index: number) => void;
}) {
  const [open, setOpen] = useState(true);

  if (category.colors.length === 0) return null;

  return (
    <div className="section">
      <div className="section-header" onClick={() => setOpen(!open)}>
        <span>{CATEGORY_LABELS[category.category]}</span>
        <span>{open ? "−" : "+"}</span>
      </div>
      {open && (
        <div className="section-body">
          {category.colors.map((color, i) => (
            <div key={i} className="color-row">
              <div
                className="swatch"
                style={{ background: color.hex }}
              />
              <div className="color-info" style={{ flex: 1 }}>
                <CopyableValue value={color.hex}>
                  <span className="color-hex">{color.hex}</span>
                </CopyableValue>
                <span className="color-meta">{color.percentage}%</span>
                {color.representativeElements.length > 0 && (
                  <div className="element-refs">
                    {color.representativeElements.map((ref, j) => (
                      <span
                        key={j}
                        className="element-ref"
                        onClick={(e) => {
                          e.stopPropagation();
                          onHighlight(ref.selector, ref.index);
                        }}
                      >
                        {ref.selector}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div
                className="color-bar"
                style={{
                  width: `${Math.max(color.percentage, 2)}%`,
                  maxWidth: 60,
                  background: color.hex,
                }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
