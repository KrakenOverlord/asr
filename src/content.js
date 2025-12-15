const STORAGE_KEY = "blacklist";

console.log("ASR content script loaded")

function normalizeWords(words) {
  return (words || [])
    .map((w) => (typeof w === "string" ? w.trim().toLowerCase() : ""))
    .filter((w) => w.length > 0);
}

function titleContainsBlacklistedWord(titleText, blacklist) {
  if (!titleText || blacklist.length === 0) return false;
  const lowerTitle = titleText.toLowerCase();
  return blacklist.some((word) => lowerTitle.includes(word));
}

function filterThreads(root, blacklist) {
  const items = root.querySelectorAll(
    "div.structItem.structItem--thread.js-inlineModContainer"
  );

  items.forEach((item) => {
    const titleEl = item.querySelector(".structItem-title");
    if (!titleEl) return;
    const text = titleEl.textContent || "";

    if (titleContainsBlacklistedWord(text, blacklist)) {
      item.style.display = "none";
    }
  });
}

function initFiltering(blacklist) {
  const normalized = normalizeWords(blacklist);
  filterThreads(document, normalized);

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (!(node instanceof HTMLElement)) return;
        if (node.matches?.("div.structItem.structItem--thread.js-inlineModContainer")) {
          filterThreads(node.parentElement || document, normalized);
        } else {
          filterThreads(node, normalized);
        }
      });
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

function loadBlacklistAndInit() {
  chrome.storage.local.get([STORAGE_KEY], (result) => {
    const list = result[STORAGE_KEY] || [];
    initFiltering(list);
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", loadBlacklistAndInit);
} else {
  loadBlacklistAndInit();
}


