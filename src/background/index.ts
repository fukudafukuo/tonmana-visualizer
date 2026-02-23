const UNANALYZABLE_PATTERNS = [
  /^chrome:\/\//,
  /^chrome-extension:\/\//,
  /^edge:\/\//,
  /^about:/,
  /^chrome\.google\.com\/webstore/,
  /^addons\.mozilla\.org/,
  /\.pdf$/i,
];

function isUnanalyzable(url: string): boolean {
  return UNANALYZABLE_PATTERNS.some((p) => p.test(url));
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
  if (!tab.url || isUnanalyzable(tab.url)) {
    return {
      type: "ANALYSIS_ERROR",
      payload: "このページは解析できません（Chrome内部ページ、PDF等）",
    };
  }

  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["content.js"],
  });

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
