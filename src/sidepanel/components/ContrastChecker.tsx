import React, { useState } from "react";
import type { ContrastPair } from "../../shared/types";

interface Props {
  pairs: ContrastPair[];
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
          {pairs.map((pair, i) => (
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
              <span
                className="contrast-ratio"
                style={{ marginLeft: "auto" }}
              >
                {pair.ratio}:1
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
