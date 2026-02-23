import React, { useState } from "react";
import type { ContentWidthEntry } from "../../shared/types";

interface Props {
  entries: ContentWidthEntry[];
  onHighlight?: (selector: string, index: number) => void;
}

export function ContentWidth({ entries, onHighlight }: Props) {
  const [open, setOpen] = useState(true);

  if (entries.length === 0) return null;

  const maxWidths = entries.filter((e) => e.property === "max-width");
  const widths = entries.filter((e) => e.property === "width");

  return (
    <div className="section">
      <div className="section-header" onClick={() => setOpen(!open)}>
        <span>コンテンツ幅 (Content Width)</span>
        <span>{open ? "−" : "+"}</span>
      </div>
      {open && (
        <div className="section-body">
          {maxWidths.length > 0 && (
            <div style={{ marginBottom: widths.length > 0 ? 10 : 0 }}>
              <div className="cw-sub-label">max-width</div>
              <div className="chip-list">
                {maxWidths.map((entry, i) => (
                  <div key={`mw-${i}`} className="chip">
                    <span>
                      {entry.value}
                      {entry.unit}
                    </span>
                    <span className="chip-count">({entry.count})</span>
                    {onHighlight &&
                      entry.representativeElements.length > 0 && (
                        <span className="element-refs">
                          {entry.representativeElements.map((ref, j) => (
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
                        </span>
                      )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {widths.length > 0 && (
            <div>
              <div className="cw-sub-label">width</div>
              <div className="chip-list">
                {widths.map((entry, i) => (
                  <div key={`w-${i}`} className="chip">
                    <span>
                      {entry.value}
                      {entry.unit}
                    </span>
                    <span className="chip-count">({entry.count})</span>
                    {onHighlight &&
                      entry.representativeElements.length > 0 && (
                        <span className="element-refs">
                          {entry.representativeElements.map((ref, j) => (
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
                        </span>
                      )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
