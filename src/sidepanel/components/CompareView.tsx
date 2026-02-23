import React, { useState } from "react";
import type { AnalysisResult } from "../../shared/types";

interface Props {
  current: AnalysisResult;
  currentName: string;
  saved: AnalysisResult;
  savedName: string;
  onClose: () => void;
}

export function CompareView({ current, currentName, saved, savedName, onClose }: Props) {
  const [open, setOpen] = useState(true);

  const curBg = current.colors.find((c) => c.category === "background")?.colors || [];
  const savBg = saved.colors.find((c) => c.category === "background")?.colors || [];
  const curText = current.colors.find((c) => c.category === "text")?.colors || [];
  const savText = saved.colors.find((c) => c.category === "text")?.colors || [];

  const curFonts = [...new Set(current.typography.map((t) => t.fontFamily))];
  const savFonts = [...new Set(saved.typography.map((t) => t.fontFamily))];

  const curTone = current.styleDNA.tone;
  const savTone = saved.styleDNA.tone;

  return (
    <div className="section">
      <div className="section-header" onClick={() => setOpen(!open)}>
        <span>サイト比較</span>
        <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            className="compare-close-btn"
            onClick={(e) => { e.stopPropagation(); onClose(); }}
          >
            解除
          </button>
          {open ? "−" : "+"}
        </span>
      </div>
      {open && (
        <div className="section-body">
          <div className="compare-header-row">
            <div className="compare-col-label" />
            <div className="compare-col" title={currentName}>
              {truncate(currentName, 20)}
            </div>
            <div className="compare-col" title={savedName}>
              {truncate(savedName, 20)}
            </div>
          </div>

          {/* Tone */}
          <CompareRow
            label="トーン"
            left={curTone ? `${curTone.primary} / ${curTone.secondary}` : "—"}
            right={savTone ? `${savTone.primary} / ${savTone.secondary}` : "—"}
          />

          {/* Background colors */}
          <div className="compare-row">
            <div className="compare-col-label">背景色</div>
            <div className="compare-col">
              <div className="compare-swatches">
                {curBg.slice(0, 4).map((c, i) => (
                  <div key={i} className="compare-swatch" style={{ background: c.hex }} title={c.hex} />
                ))}
              </div>
            </div>
            <div className="compare-col">
              <div className="compare-swatches">
                {savBg.slice(0, 4).map((c, i) => (
                  <div key={i} className="compare-swatch" style={{ background: c.hex }} title={c.hex} />
                ))}
              </div>
            </div>
          </div>

          {/* Text colors */}
          <div className="compare-row">
            <div className="compare-col-label">文字色</div>
            <div className="compare-col">
              <div className="compare-swatches">
                {curText.slice(0, 4).map((c, i) => (
                  <div key={i} className="compare-swatch" style={{ background: c.hex }} title={c.hex} />
                ))}
              </div>
            </div>
            <div className="compare-col">
              <div className="compare-swatches">
                {savText.slice(0, 4).map((c, i) => (
                  <div key={i} className="compare-swatch" style={{ background: c.hex }} title={c.hex} />
                ))}
              </div>
            </div>
          </div>

          {/* Font families */}
          <CompareRow
            label="フォント"
            left={curFonts.slice(0, 3).join(", ") || "—"}
            right={savFonts.slice(0, 3).join(", ") || "—"}
          />

          {/* Font sizes */}
          <CompareRow
            label="文字サイズ"
            left={current.styleDNA.fontSizes.slice(0, 4).join(" / ") || "—"}
            right={saved.styleDNA.fontSizes.slice(0, 4).join(" / ") || "—"}
          />

          {/* Spacing */}
          <CompareRow
            label="スペーシング"
            left={current.styleDNA.spacings.slice(0, 4).join(" / ") || "—"}
            right={saved.styleDNA.spacings.slice(0, 4).join(" / ") || "—"}
          />

          {/* Radii */}
          <CompareRow
            label="角丸"
            left={current.styleDNA.radii.join(" / ") || "—"}
            right={saved.styleDNA.radii.join(" / ") || "—"}
          />

          {/* Shadows */}
          <CompareRow
            label="シャドウ"
            left={`${current.styleDNA.shadowCount}種`}
            right={`${saved.styleDNA.shadowCount}種`}
          />

          {/* Gradients */}
          <CompareRow
            label="グラデーション"
            left={`${current.gradients.length}種`}
            right={`${saved.gradients.length}種`}
          />
        </div>
      )}
    </div>
  );
}

function CompareRow({ label, left, right }: { label: string; left: string; right: string }) {
  return (
    <div className="compare-row">
      <div className="compare-col-label">{label}</div>
      <div className="compare-col compare-value">{left}</div>
      <div className="compare-col compare-value">{right}</div>
    </div>
  );
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + "..." : s;
}
