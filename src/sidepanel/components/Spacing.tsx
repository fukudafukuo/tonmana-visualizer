import React, { useState, useMemo } from "react";
import type { SpacingEntry } from "../../shared/types";

interface Props {
  entries: SpacingEntry[];
}

function detectBaseStep(values: number[]): number {
  if (values.length < 2) return 4;
  const sorted = [...values].sort((a, b) => a - b);
  const diffs: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    diffs.push(sorted[i] - sorted[i - 1]);
  }
  // 最頻の差分をベースステップとする
  const diffMap = new Map<number, number>();
  for (const d of diffs) {
    if (d > 0) diffMap.set(d, (diffMap.get(d) || 0) + 1);
  }
  let bestStep = 4;
  let bestCount = 0;
  for (const [step, count] of diffMap) {
    if (count > bestCount) {
      bestStep = step;
      bestCount = count;
    }
  }
  return bestStep;
}

export function Spacing({ entries }: Props) {
  const [open, setOpen] = useState(true);

  const { baseStep, scaleEntries, outlierEntries } = useMemo(() => {
    const values = entries.map((e) => e.value);
    const step = detectBaseStep(values);
    const scale: SpacingEntry[] = [];
    const outliers: SpacingEntry[] = [];
    for (const entry of entries) {
      if (entry.value % step === 0) {
        scale.push(entry);
      } else {
        outliers.push(entry);
      }
    }
    // スケールは値順にソート
    scale.sort((a, b) => a.value - b.value);
    return { baseStep: step, scaleEntries: scale, outlierEntries: outliers };
  }, [entries]);

  if (entries.length === 0) return null;

  return (
    <div className="section">
      <div className="section-header" onClick={() => setOpen(!open)}>
        <span>スペーシング (Spacing)</span>
        <span>{open ? "−" : "+"}</span>
      </div>
      {open && (
        <div className="section-body">
          <div className="spacing-scale-label">
            推定スケール: {baseStep}px ベース
          </div>
          <div className="chip-list">
            {scaleEntries.map((entry, i) => (
              <div key={i} className="chip chip-scale">
                <span>
                  {entry.value}
                  {entry.unit}
                </span>
                <span className="chip-count">({entry.count})</span>
              </div>
            ))}
          </div>
          {outlierEntries.length > 0 && (
            <>
              <div className="spacing-scale-label" style={{ marginTop: 8 }}>
                例外値
              </div>
              <div className="chip-list">
                {outlierEntries.map((entry, i) => (
                  <div key={i} className="chip chip-outlier">
                    <span>
                      {entry.value}
                      {entry.unit}
                    </span>
                    <span className="chip-count">({entry.count})</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
