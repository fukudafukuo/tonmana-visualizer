import React from "react";
import type { AnalysisResult } from "../../shared/types";
import { exportAsJSON, exportAsCSS } from "../utils/export";

interface Props {
  result: AnalysisResult;
  siteName: string;
}

export function ExportButtons({ result, siteName }: Props) {
  return (
    <div className="export-bar">
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
