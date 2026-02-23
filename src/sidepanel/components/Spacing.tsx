import React, { useState } from "react";
import type { SpacingEntry } from "../../shared/types";

interface Props {
  entries: SpacingEntry[];
}

export function Spacing({ entries }: Props) {
  const [open, setOpen] = useState(true);

  if (entries.length === 0) return null;

  return (
    <div className="section">
      <div className="section-header" onClick={() => setOpen(!open)}>
        <span>スペーシング (Spacing)</span>
        <span>{open ? "−" : "+"}</span>
      </div>
      {open && (
        <div className="section-body">
          <div className="chip-list">
            {entries.map((entry, i) => (
              <div key={i} className="chip">
                <span>
                  {entry.value}
                  {entry.unit}
                </span>
                <span className="chip-count">({entry.count})</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
