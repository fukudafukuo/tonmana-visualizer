import React from "react";
import type { StyleDNA as StyleDNAType } from "../../shared/types";
import { CopyableValue } from "./CopyableValue";

interface Props {
  dna: StyleDNAType;
}

export function StyleDNA({ dna }: Props) {
  return (
    <div style={{ marginTop: 12 }}>
      <div className="dna-card">
        <div
          style={{
            fontWeight: 700,
            fontSize: 14,
            marginBottom: 10,
            letterSpacing: "0.5px",
          }}
        >
          Style DNA
        </div>

        {dna.tone && (
          <div className="tone-classification">
            <span className="tone-primary">{dna.tone.primary}</span>
            <span className="tone-separator">/</span>
            <span className="tone-secondary">{dna.tone.secondary}</span>
            {dna.tone.tags.length > 0 && (
              <div className="tone-tags">
                {dna.tone.tags.map((tag, i) => (
                  <span key={i} className="tone-tag">{tag}</span>
                ))}
              </div>
            )}
          </div>
        )}

        {dna.background.length > 0 && (
          <DNAColorSection label="Background" colors={dna.background} />
        )}
        {dna.text.length > 0 && (
          <DNAColorSection label="Text" colors={dna.text} />
        )}
        {dna.accent.length > 0 && (
          <DNAColorSection label="Accent" colors={dna.accent} />
        )}

        {dna.fontSizes.length > 0 && (
          <div className="dna-section">
            <div className="dna-label">Type</div>
            <div className="dna-values">
              {dna.fontSizes.map((s) => `${s}`).join(" / ")}
            </div>
          </div>
        )}

        {dna.spacings.length > 0 && (
          <div className="dna-section">
            <div className="dna-label">Space</div>
            <div className="dna-values">
              {dna.spacings.map((s) => `${s}`).join(" / ")}
            </div>
          </div>
        )}

        {dna.radii.length > 0 && (
          <div className="dna-section">
            <div className="dna-label">Radius</div>
            <div className="dna-values">
              {dna.radii.map((r) => `${r}`).join(" / ")}
            </div>
          </div>
        )}

        {dna.shadowCount > 0 && (
          <div className="dna-section">
            <div className="dna-label">Shadow</div>
            <div className="dna-values">{dna.shadowCount}種</div>
          </div>
        )}
      </div>
    </div>
  );
}

function DNAColorSection({
  label,
  colors,
}: {
  label: string;
  colors: { label: string; hex: string }[];
}) {
  return (
    <div className="dna-section">
      <div className="dna-label">{label}</div>
      {colors.map((c, i) => (
        <div key={i} className="dna-color-row">
          <div
            className="dna-swatch"
            style={{ background: c.hex }}
          />
          <span className="dna-role">{c.label}</span>
          <CopyableValue value={c.hex}>
            <span className="dna-hex">{c.hex}</span>
          </CopyableValue>
        </div>
      ))}
    </div>
  );
}
