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

async function handleStartAnalysis(tabId: number) {
  const tab = await chrome.tabs.get(tabId);
  if (!tab.url) {
    return {
      type: "ANALYSIS_ERROR",
      payload: "ページのURLを取得できませんでした。通常のWebページに移動してから再度お試しください。",
    };
  }

  const reason = getUnanalyzableReason(tab.url);
  if (reason) {
    return {
      type: "ANALYSIS_ERROR",
      payload: `${reason}は解析できません。通常のWebサイト（https://〜）を開いた状態で解析ボタンを押してください。`,
    };
  }

  // content scriptが既に注入済みか確認し、未注入なら注入
  try {
    await chrome.tabs.sendMessage(tabId, { type: "PING" });
  } catch {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content.js"],
    });
  }

  return new Promise((resolve) => {
    const listener = (msg: { type: string; payload?: unknown }) => {
      if (msg.type === "ANALYSIS_RESULT" || msg.type === "ANALYSIS_ERROR") {
        chrome.runtime.onMessage.removeListener(listener);
        resolve(msg);
      }
    };
    chrome.runtime.onMessage.addListener(listener);

    chrome.tabs.sendMessage(tabId, { type: "START_ANALYSIS" });
  });
}
