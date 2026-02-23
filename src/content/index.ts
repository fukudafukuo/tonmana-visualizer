import type {
  AnalysisResult,
  Message,
  HighlightPayload,
} from "../shared/types";
import { walkVisibleElements } from "./utils/dom-walker";
import { extractColors } from "./extractors/colors";
import { extractTypography } from "./extractors/typography";
import { extractSpacing } from "./extractors/spacing";
import { extractDecorations } from "./extractors/decorations";

let abortController: AbortController | null = null;
let highlightOverlay: HTMLElement | null = null;

function sendProgress(phase: string, percent: number) {
  chrome.runtime.sendMessage({
    type: "ANALYSIS_PROGRESS",
    payload: { phase, percent },
  });
}

function runAnalysis() {
  abortController = new AbortController();
  const { signal } = abortController;

  try {
    // Phase 1: DOM walk
    sendProgress("DOM走査中...", 0);
    const elements = walkVisibleElements(signal, (p) => {
      sendProgress("DOM走査中...", Math.round(p * 0.4));
    });

    if (signal.aborted) return;

    sendProgress("色を抽出中...", 40);
    const { categories, contrastPairs, styleDNA: colorDNA } =
      extractColors(elements);

    if (signal.aborted) return;

    sendProgress("タイポグラフィを解析中...", 60);
    const typography = extractTypography(elements);

    if (signal.aborted) return;

    sendProgress("スペーシングを解析中...", 75);
    const spacing = extractSpacing(elements);

    if (signal.aborted) return;

    sendProgress("装飾を解析中...", 85);
    const { radii, shadows } = extractDecorations(elements);

    if (signal.aborted) return;

    // Build Style DNA
    const fontSizes = [
      ...new Set(typography.map((t) => t.fontSize)),
    ].sort((a, b) => b - a);
    const spacings = spacing.map((s) => s.value).sort((a, b) => a - b);
    const radiiValues = radii
      .map((r) => parseFloat(r.value))
      .filter((v) => !isNaN(v))
      .sort((a, b) => a - b);

    const result: AnalysisResult = {
      colors: categories,
      typography,
      spacing,
      radii,
      shadows,
      styleDNA: {
        background: colorDNA.background || [],
        text: colorDNA.text || [],
        accent: colorDNA.accent || [],
        fontSizes: fontSizes.slice(0, 6),
        spacings: spacings.slice(0, 8),
        radii: radiiValues.slice(0, 4),
        shadowCount: shadows.length,
      },
      contrastPairs,
      elementCount: elements.length,
      timestamp: Date.now(),
    };

    sendProgress("完了", 100);

    chrome.runtime.sendMessage({
      type: "ANALYSIS_RESULT",
      payload: result,
    });
  } catch (err) {
    if (!signal.aborted) {
      chrome.runtime.sendMessage({
        type: "ANALYSIS_ERROR",
        payload: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }
}

function highlightElement(payload: HighlightPayload) {
  clearHighlights();

  const els = document.querySelectorAll(payload.selector.split(".")[0] || "*");
  const el = els[payload.index] || els[0];
  if (!el) return;

  el.scrollIntoView({ behavior: "smooth", block: "center" });

  highlightOverlay = document.createElement("div");
  const rect = el.getBoundingClientRect();
  Object.assign(highlightOverlay.style, {
    position: "fixed",
    top: `${rect.top - 2}px`,
    left: `${rect.left - 2}px`,
    width: `${rect.width + 4}px`,
    height: `${rect.height + 4}px`,
    border: "2px solid #2563EB",
    borderRadius: "4px",
    background: "rgba(37, 99, 235, 0.1)",
    zIndex: "2147483647",
    pointerEvents: "none",
    transition: "opacity 0.3s",
  });
  document.body.appendChild(highlightOverlay);

  // Auto-remove after 2 seconds
  setTimeout(clearHighlights, 2000);
}

function clearHighlights() {
  if (highlightOverlay && highlightOverlay.parentNode) {
    highlightOverlay.parentNode.removeChild(highlightOverlay);
    highlightOverlay = null;
  }
}

// Listen for messages
chrome.runtime.onMessage.addListener(
  (message: Message, _sender, _sendResponse) => {
    switch (message.type) {
      case "START_ANALYSIS":
        runAnalysis();
        break;
      case "STOP_ANALYSIS":
        if (abortController) {
          abortController.abort();
          abortController = null;
        }
        break;
      case "HIGHLIGHT_ELEMENT":
        highlightElement(message.payload as HighlightPayload);
        break;
      case "CLEAR_HIGHLIGHTS":
        clearHighlights();
        break;
    }
  }
);
