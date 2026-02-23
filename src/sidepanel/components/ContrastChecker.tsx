import React, { useState } from "react";
import type { ContrastPair } from "../../shared/types";

interface Props {
  pairs: ContrastPair[];
}

// WCAG 2.x thresholds
const AA_NORMAL = 4.5;
const AA_LARGE = 3.0;
const AAA_NORMAL = 7.0;

function getWcagBadge(ratio: number): { label: string; className: string } {
  if (ratio >= AAA_NORMAL) {
    return { label: "AAA", className: "badge-aaa" };
  }
  if (ratio >= AA_NORMAL) {
    return { label: "AA", className: "badge-aa" };
  }
  if (ratio >= AA_LARGE) {
    return { label: "AA Large", className: "badge-aa-large" };
  }
  return { label: "Fail", className: "badge-fail" };
}

export function ContrastChecker({ pairs }: Props) {
  const [open, setOpen] = useState(true);

  if (pairs.length === 0) return null;

  return (
    <div className="section">
      <div className="section-header" onClick={() => setOpen(!open)}>
        <span>コントラスト比 (Contrast)</span>
        <span>{open ? "−" : "+"}</span>
      </div>
      {open && (
        <div className="section-body">
          {pairs.map((pair, i) => {
            const badge = getWcagBadge(pair.ratio);
            return (
              <div key={i} className="contrast-row">
                <div
                  className="contrast-sample"
                  style={{
                    background: pair.bgHex,
                    color: pair.fgHex,
                  }}
                >
                  Aa
                </div>
                <span
                  className="contrast-ratio"
                  style={{
                    fontSize: 11,
                    color: "var(--text-secondary)",
                  }}
                >
                  {pair.bgHex} × {pair.fgHex}
                </span>
                <span className={`wcag-badge ${badge.className}`}>
                  {badge.label}
                </span>
                <span
                  className="contrast-ratio"
                  style={{ marginLeft: "auto" }}
                >
                  {pair.ratio}:1
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
