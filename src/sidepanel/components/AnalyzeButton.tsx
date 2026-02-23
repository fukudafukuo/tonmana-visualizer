import React from "react";
import type { ProgressPayload } from "../../shared/types";

interface Props {
  state: "idle" | "analyzing" | "done" | "error";
  progress: ProgressPayload;
  onAnalyze: () => void;
  onStop: () => void;
}

export function AnalyzeButton({ state, progress, onAnalyze, onStop }: Props) {
  if (state === "analyzing") {
    return (
      <div>
        <button className="btn btn-stop" onClick={onStop}>
          解析を停止
        </button>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
        <div
          style={{
            fontSize: 11,
            color: "var(--text-muted)",
            marginTop: 4,
            textAlign: "center",
          }}
        >
          {progress.phase}
        </div>
      </div>
    );
  }

  return (
    <button className="btn btn-primary" onClick={onAnalyze}>
      {state === "done" ? "再解析" : "このページを解析"}
    </button>
  );
}
