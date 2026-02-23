import React, { useState } from "react";
import type { RadiusEntry, ShadowEntry } from "../../shared/types";

interface Props {
  radii: RadiusEntry[];
  shadows: ShadowEntry[];
}

export function Decorations({ radii, shadows }: Props) {
  const [openRadius, setOpenRadius] = useState(true);
  const [openShadow, setOpenShadow] = useState(true);

  if (radii.length === 0 && shadows.length === 0) return null;

  return (
    <>
      {radii.length > 0 && (
        <div className="section">
          <div
            className="section-header"
            onClick={() => setOpenRadius(!openRadius)}
          >
            <span>角丸 (Border Radius)</span>
            <span>{openRadius ? "−" : "+"}</span>
          </div>
          {openRadius && (
            <div className="section-body">
              <div className="chip-list">
                {radii.map((r, i) => (
                  <div key={i} className="chip">
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        border: "2px solid var(--text-secondary)",
                        borderRadius: r.value,
                        flexShrink: 0,
                      }}
                    />
                    <span>{r.value}</span>
                    <span className="chip-count">({r.count})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {shadows.length > 0 && (
        <div className="section">
          <div
            className="section-header"
            onClick={() => setOpenShadow(!openShadow)}
          >
            <span>シャドウ (Box Shadow)</span>
            <span>{openShadow ? "−" : "+"}</span>
          </div>
          {openShadow && (
            <div className="section-body">
              {shadows.map((s, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 0",
                    borderBottom:
                      i < shadows.length - 1
                        ? "1px solid var(--bg-secondary)"
                        : "none",
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      background: "white",
                      borderRadius: 4,
                      boxShadow: s.raw,
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 11,
                        fontFamily: "'SF Mono', Monaco, monospace",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        maxWidth: 200,
                      }}
                    >
                      {s.normalized}
                    </div>
                    <span className="chip-count">{s.count}箇所</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
