import React, { useState } from "react";
import type { TypographyEntry, FontSource } from "../../shared/types";
import { CopyableValue } from "./CopyableValue";

const SOURCE_CLASS: Record<FontSource, string> = {
  "Google Fonts": "font-source-google",
  "Adobe Fonts": "font-source-adobe",
  "System": "font-source-system",
  "Self-hosted": "font-source-selfhosted",
  "Unknown": "font-source-unknown",
};

interface Props {
  entries: TypographyEntry[];
  onHighlight: (selector: string, index: number) => void;
}

export function Typography({ entries, onHighlight }: Props) {
  const [open, setOpen] = useState(true);

  if (entries.length === 0) return null;

  return (
    <div className="section">
      <div className="section-header" onClick={() => setOpen(!open)}>
        <span>タイポグラフィ (Typography)</span>
        <span>{open ? "−" : "+"}</span>
      </div>
      {open && (
        <div className="section-body">
          {entries.map((entry, i) => (
            <div key={i} className="typo-row">
              <div
                className="typo-preview"
                style={{
                  fontFamily: entry.fontFamily,
                  fontSize: Math.min(entry.fontSize, 24),
                  fontWeight: entry.fontWeight as number,
                }}
              >
                {entry.fontFamily}
              </div>
              <div className="typo-meta">
                <CopyableValue
                  value={`${entry.fontFamily} ${entry.fontSize}px / ${entry.fontWeight}`}
                >
                  <span>
                    {entry.fontSize}px / {entry.fontWeight} /{" "}
                    {entry.lineHeight} — {entry.percentage}%
                  </span>
                </CopyableValue>
                {entry.fontSource && entry.fontSource !== "Unknown" && (
                  <span className={`font-source-badge ${SOURCE_CLASS[entry.fontSource]}`}>
                    {entry.fontSource}
                  </span>
                )}
              </div>
              {entry.representativeElements.length > 0 && (
                <div className="element-refs">
                  {entry.representativeElements.map((ref, j) => (
                    <span
                      key={j}
                      className="element-ref"
                      onClick={() => onHighlight(ref.selector, ref.index)}
                    >
                      {ref.selector}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
