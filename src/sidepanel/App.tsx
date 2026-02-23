import React, { useState, useCallback, useEffect, useRef } from "react";
import type { AnalysisResult, ProgressPayload } from "../shared/types";
import { AnalyzeButton } from "./components/AnalyzeButton";
import { StyleDNA } from "./components/StyleDNA";
import { ColorPalette } from "./components/ColorPalette";
import { Typography } from "./components/Typography";
import { Spacing } from "./components/Spacing";
import { Decorations } from "./components/Decorations";
import { Gradients } from "./components/Gradients";
import { ContentWidth } from "./components/ContentWidth";
import { ContrastChecker } from "./components/ContrastChecker";
import { ExportButtons } from "./components/ExportButtons";
import { CompareView } from "./components/CompareView";

type AppState = "idle" | "analyzing" | "done" | "error";

interface SourceInfo {
  url: string;
  title: string;
}

interface SavedAnalysis {
  result: AnalysisResult;
  name: string;
}

export default function App() {
  const [state, setState] = useState<AppState>("idle");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [source, setSource] = useState<SourceInfo | null>(null);
  const [error, setError] = useState<string>("");
  const [savedForCompare, setSavedForCompare] = useState<SavedAnalysis | null>(null);
  const [progress, setProgress] = useState<ProgressPayload>({
    phase: "",
    percent: 0,
  });
  const [analyzedTabId, setAnalyzedTabId] = useState<number | null>(null);
  const [currentTabId, setCurrentTabId] = useState<number | null>(null);

  const resultRef = useRef<AnalysisResult | null>(null);
  resultRef.current = result;

  // アクティブタブの追跡
  useEffect(() => {
    const updateCurrentTab = async () => {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (tab?.id) setCurrentTabId(tab.id);
    };

    updateCurrentTab();

    const onActivated = () => {
      updateCurrentTab();
    };
    chrome.tabs.onActivated.addListener(onActivated);
    return () => chrome.tabs.onActivated.removeListener(onActivated);
  }, []);

  // content scriptからのメッセージ受信
  useEffect(() => {
    const listener = (message: { type: string; payload?: unknown }) => {
      switch (message.type) {
        case "ANALYSIS_PROGRESS":
          setProgress(message.payload as ProgressPayload);
          break;
        case "ANALYSIS_RESULT":
          setResult(message.payload as AnalysisResult);
          setState("done");
          break;
        case "ANALYSIS_ERROR":
          setError(message.payload as string);
          setState(resultRef.current ? "done" : "error");
          break;
        case "ANALYSIS_CANCELED":
          setState(resultRef.current ? "done" : "idle");
          break;
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  const handleAnalyze = useCallback(async () => {
    setState("analyzing");
    setError("");
    setProgress({ phase: "準備中...", percent: 0 });

    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!tab?.id) {
        setError("アクティブなタブが見つかりません");
        setState(resultRef.current ? "done" : "error");
        return;
      }

      const response = await chrome.runtime.sendMessage({
        type: "START_ANALYSIS",
        tabId: tab.id,
      });

      if (response?.type === "ANALYSIS_ERROR") {
        setError(response.payload as string);
        setState(resultRef.current ? "done" : "error");
      } else if (response?.type === "ANALYSIS_RESULT") {
        setResult(response.payload as AnalysisResult);
        setSource({
          url: tab.url || "",
          title: tab.title || "不明なページ",
        });
        setAnalyzedTabId(tab.id);
        setState("done");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "解析中にエラーが発生しました");
      setState(resultRef.current ? "done" : "error");
    }
  }, []);

  // タブ切り替え時に自動解析
  const prevTabIdRef = useRef<number | null>(null);

  useEffect(() => {
    // 初回マウント時はスキップ
    if (prevTabIdRef.current === null) {
      prevTabIdRef.current = currentTabId;
      return;
    }

    // タブが実際に変わった場合のみ
    if (
      currentTabId &&
      currentTabId !== prevTabIdRef.current &&
      state !== "analyzing"
    ) {
      prevTabIdRef.current = currentTabId;
      setError("");
      // 一度でも解析済みなら自動解析を実行
      if (resultRef.current) {
        handleAnalyze();
      }
    }
  }, [currentTabId, state, handleAnalyze]);

  const handleStop = useCallback(async () => {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, { type: "STOP_ANALYSIS" });
    }
    setState(resultRef.current ? "done" : "idle");
  }, []);

  const handleHighlight = useCallback(
    (selector: string, index: number) => {
      chrome.runtime.sendMessage({
        type: "HIGHLIGHT_ELEMENT",
        payload: { selector, index },
      });
    },
    []
  );

  // 別タブに切り替わった場合、「再解析」ではなく「このページを解析」を表示
  const isOnAnalyzedTab = analyzedTabId != null && analyzedTabId === currentTabId;
  const buttonState: AppState =
    state === "analyzing"
      ? "analyzing"
      : state === "done" && !isOnAnalyzedTab
        ? "idle"
        : state;

  return (
    <div>
      <AnalyzeButton
        state={buttonState}
        progress={progress}
        onAnalyze={handleAnalyze}
        onStop={handleStop}
      />

      {error && (
        <div className="error-message">{error}</div>
      )}

      {state === "idle" && !result && (
        <div className="empty-state">
          <h2>トンマナビジュアライザー</h2>
          <p>
            ボタンを押すと、現在のページの
            <br />
            色・フォント・スペーシングを解析します
          </p>
          <div className="info-note">
            解析は現在アクティブなタブに対して行います。
            <br />
            別のサイトを解析するにはタブを切り替えてから
            <br />
            再度解析ボタンを押してください。
          </div>
        </div>
      )}

      {result && (
        <>
          {source && (
            <div className="source-banner">
              <span className="source-label">解析元</span>
              <span className="source-title" title={source.url}>
                {source.title}
              </span>
            </div>
          )}
          <StyleDNA dna={result.styleDNA} />
          <ColorPalette
            categories={result.colors}
            onHighlight={handleHighlight}
          />
          <Gradients
            entries={result.gradients}
            onHighlight={handleHighlight}
          />
          <ContrastChecker pairs={result.contrastPairs} />
          <Typography
            entries={result.typography}
            onHighlight={handleHighlight}
          />
          <Spacing entries={result.spacing} />
          <ContentWidth
            entries={result.contentWidths}
            onHighlight={handleHighlight}
          />
          <Decorations
            radii={result.radii}
            shadows={result.shadows}
          />

          {savedForCompare && (
            <CompareView
              current={result}
              currentName={source?.title || "現在のページ"}
              saved={savedForCompare.result}
              savedName={savedForCompare.name}
              onClose={() => setSavedForCompare(null)}
            />
          )}

          <div className="export-bar">
            <button
              className="export-btn"
              onClick={() => {
                setSavedForCompare({
                  result,
                  name: source?.title || "不明なページ",
                });
              }}
            >
              {savedForCompare ? "比較基準を更新" : "比較用に保存"}
            </button>
          </div>
          <ExportButtons
            result={result}
            siteName={source?.title || ""}
          />
        </>
      )}
    </div>
  );
}
