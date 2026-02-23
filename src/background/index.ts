interface UnanalyzableRule {
  pattern: RegExp;
  reason: string;
}

const UNANALYZABLE_RULES: UnanalyzableRule[] = [
  { pattern: /^chrome:\/\//, reason: "Chromeの内部ページ" },
  { pattern: /^chrome-extension:\/\//, reason: "拡張機能のページ" },
  { pattern: /^edge:\/\//, reason: "Edgeの内部ページ" },
  { pattern: /^about:/, reason: "ブラウザの内部ページ" },
  { pattern: /^chrome\.google\.com\/webstore/, reason: "Chrome ウェブストア" },
  { pattern: /^addons\.mozilla\.org/, reason: "Firefox アドオンストア" },
  { pattern: /\.pdf$/i, reason: "PDFファイル" },
];

function getUnanalyzableReason(url: string): string | null {
  for (const rule of UNANALYZABLE_RULES) {
    if (rule.pattern.test(url)) return rule.reason;
  }
  return null;
}

chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id) {
    await chrome.sidePanel.open({ tabId: tab.id });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "START_ANALYSIS") {
    handleStartAnalysis(message.tabId).then(sendResponse).catch((err) => {
      sendResponse({ type: "ANALYSIS_ERROR", payload: err.message });
    });
    return true;
  }

  if (message.type === "HIGHLIGHT_ELEMENT" || message.type === "CLEAR_HIGHLIGHTS") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, message);
      }
    });
    return false;
  }

  return false;
});

// 実行中の解析を追跡し、新しい解析開始時に前回を中断
let activeAnalysisTabId: number | null = null;

async function handleStartAnalysis(tabId: number) {
  // 前回の解析が別タブで実行中なら中断
  if (activeAnalysisTabId !== null && activeAnalysisTabId !== tabId) {
    try {
      chrome.tabs.sendMessage(activeAnalysisTabId, { type: "STOP_ANALYSIS" });
    } catch {
      // 旧タブが閉じている場合は無視
    }
  }
  activeAnalysisTabId = tabId;

  const tab = await chrome.tabs.get(tabId);

  // URLが取得できる場合のみ解析不可チェックを行う
  if (tab.url) {
    const reason = getUnanalyzableReason(tab.url);
    if (reason) {
      activeAnalysisTabId = null;
      return {
        type: "ANALYSIS_ERROR",
        payload: `${reason}は解析できません。通常のWebサイト（https://〜）を開いた状態で解析ボタンを押してください。`,
      };
    }
  }

  // content scriptが既に注入済みか確認し、未注入なら注入
  try {
    await chrome.tabs.sendMessage(tabId, { type: "PING" });
  } catch {
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ["content.js"],
      });
    } catch {
      activeAnalysisTabId = null;
      return {
        type: "ANALYSIS_ERROR",
        payload: "このページには解析スクリプトを挿入できません。通常のWebサイト（https://〜）を開いた状態で再度お試しください。",
      };
    }
  }

  return new Promise((resolve) => {
    const cleanup = () => {
      chrome.runtime.onMessage.removeListener(listener);
      clearTimeout(timeout);
      activeAnalysisTabId = null;
    };

    const listener = (
      msg: { type: string; payload?: unknown },
      sender: chrome.runtime.MessageSender
    ) => {
      // このタブからの結果メッセージのみ処理
      if (sender.tab?.id !== tabId) return;
      if (
        msg.type === "ANALYSIS_RESULT" ||
        msg.type === "ANALYSIS_ERROR" ||
        msg.type === "ANALYSIS_CANCELED"
      ) {
        cleanup();
        resolve(msg);
      }
    };

    // 30秒タイムアウト保険
    const timeout = setTimeout(() => {
      chrome.runtime.onMessage.removeListener(listener);
      activeAnalysisTabId = null;
      resolve({
        type: "ANALYSIS_ERROR",
        payload: "解析がタイムアウトしました。ページを再読み込みしてお試しください。",
      });
    }, 30_000);

    chrome.runtime.onMessage.addListener(listener);

    chrome.tabs.sendMessage(tabId, { type: "START_ANALYSIS" });
  });
}
