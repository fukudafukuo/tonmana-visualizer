import React, { useState } from "react";
import type { GradientEntry } from "../../shared/types";
import { CopyableValue } from "./CopyableValue";

interface Props {
  entries: GradientEntry[];
  onHighlight: (selector: string, index: number) => void;
}

const TYPE_LABELS: Record<GradientEntry["type"], string> = {
  linear: "Linear",
  radial: "Radial",
  conic: "Conic",
};

export function Gradients({ entries, onHighlight }: Props) {
  const [open, setOpen] = useState(true);

  if (entries.length === 0) return null;

  return (
    <div className="section">
      <div className="section-header" onClick={() => setOpen(!open)}>
        <span>グラデーション (Gradients)</span>
        <span>{open ? "−" : "+"}</span>
      </div>
      {open && (
        <div className="section-body">
          {entries.map((entry, i) => (
            <div key={i} className="gradient-row">
              <div
                className="gradient-preview"
                style={{ background: entry.raw }}
              />
              <div className="gradient-info">
                <div className="gradient-type-badge">
                  {TYPE_LABELS[entry.type]}
                </div>
                <div className="gradient-colors">
                  {entry.colors.map((c, j) => (
                    <CopyableValue key={j} value={c}>
                      <span
                        className="gradient-color-chip"
                        style={{ background: c }}
                        title={c}
                      />
                    </CopyableValue>
                  ))}
                </div>
                <CopyableValue value={entry.raw}>
                  <span className="gradient-raw">{entry.count}箇所</span>
                </CopyableValue>
              </div>
              {entry.representativeElements.length > 0 && (
                <div className="element-refs">
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
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
