import React from "react";
import type { AnalysisResult } from "../../shared/types";
import { exportAsJSON, exportAsCSS, exportAsPDF } from "../utils/export";
import { IS_PRO } from "../config";

interface Props {
  result: AnalysisResult;
  siteName: string;
}

export function ExportButtons({ result, siteName }: Props) {
  if (!IS_PRO) {
    return (
      <div className="export-teaser">
        <span className="export-teaser-label">Export</span>
        <span className="export-teaser-text">
          PDF / JSON / CSS エクスポートは Pro 版で利用できます
        </span>
      </div>
    );
  }

  return (
    <div className="export-bar">
      <button
        className="export-btn"
        onClick={() => exportAsPDF(result, siteName)}
      >
        PDF
      </button>
      <button
        className="export-btn"
        onClick={() => exportAsJSON(result, siteName)}
      >
        JSON
      </button>
      <button
        className="export-btn"
        onClick={() => exportAsCSS(result, siteName)}
      >
        CSS
      </button>
    </div>
  );
}
