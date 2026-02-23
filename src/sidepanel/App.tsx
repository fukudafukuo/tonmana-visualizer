import React, { useState, useCallback, useEffect, useRef } from "react";
import type { AnalysisResult, ProgressPayload } from "../shared/types";
import { AnalyzeButton } from "./components/AnalyzeButton";
import { StyleDNA } from "./components/StyleDNA";
import { ColorPalette } from "./components/ColorPalette";
import { Typography } from "./components/Typography";
import { Spacing } from "./components/Spacing";
import { Decorations } from "./components/Decorations";
import { ContentWidth } from "./components/ContentWidth";
import { ContrastChecker } from "./components/ContrastChecker";

type AppState = "idle" | "analyzing" | "done" | "error";

interface SourceInfo {
  url: string;
  title: string;
}

export default function App() {
  const [state, setState] = useState<AppState>("idle");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [source, setSource] = useState<SourceInfo | null>(null);
  const [error, setError] = useState<string>("");
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

  // タブ切り替え時にエラーをクリア
  useEffect(() => {
    if (currentTabId && currentTabId !== analyzedTabId) {
      setError("");
    }
  }, [currentTabId, analyzedTabId]);

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
        </>
      )}
    </div>
  );
}
