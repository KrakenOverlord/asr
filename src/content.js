const STORAGE_KEY = "blacklist";
const HIDDEN_COUNT_KEY = "hiddenCount";
const LAST_HIDDEN_TITLE_KEY = "lastHiddenTitle";
const MANUAL_HIDDEN_KEY = "hiddenThreads";

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", loadBlacklistAndInit);
} else {
  loadBlacklistAndInit();
}

function loadBlacklistAndInit() {
  chrome.storage.local.get([STORAGE_KEY, MANUAL_HIDDEN_KEY], (result) => {
    const list = result[STORAGE_KEY] || [];
    const manuallyHidden = Array.isArray(result[MANUAL_HIDDEN_KEY])
      ? result[MANUAL_HIDDEN_KEY]
      : [];
    initFiltering(list, manuallyHidden);
  });
}

function initFiltering(blacklist, manuallyHiddenIds) {
  const normalized = normalizeWords(blacklist);
  filterThreads(document, normalized, manuallyHiddenIds);

  // const observer = new MutationObserver((mutations) => {
  //   mutations.forEach((mutation) => {
  //     mutation.addedNodes.forEach((node) => {
  //       if (!(node instanceof HTMLElement)) return;
  //       if (node.matches?.("div.structItem.structItem--thread.js-inlineModContainer")) {
  //         filterThreads(node.parentElement || document, normalized, manuallyHiddenIds);
  //       } else {
  //         filterThreads(node, normalized, manuallyHiddenIds);
  //       }
  //     });
  //   });
  // });

  // observer.observe(document.body, {
  //   childList: true,
  //   subtree: true
  // });
}

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

function saveHiddenPost(title) {
  chrome.storage.local.get([HIDDEN_COUNT_KEY], (result) => {
    const currentCount = result[HIDDEN_COUNT_KEY] || 0;
    chrome.storage.local.set({
      [HIDDEN_COUNT_KEY]: currentCount + 1,
      [LAST_HIDDEN_TITLE_KEY]: title
    });
  });
}

function getThreadId(item) {
  const link = item.querySelector(".structItem-title a");
  if (!link) return null;
  // Prefer a stable thread-specific ID if present, otherwise fall back to href
  return (
    link.getAttribute("data-thread-id") ||
    link.getAttribute("href") ||
    null
  );
}

function attachHideButton(item) {
  // Avoid adding multiple buttons
  if (item.querySelector(".asr-hide-btn")) return;

  const titleContainer = item.querySelector(".structItem-title");
  const container = titleContainer || item;
  const titleLink = titleContainer
    ? titleContainer.querySelector("a")
    : null;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = "Hide";
  btn.className = "asr-hide-btn";
  btn.style.cssText =
    "margin-left:6px;padding:1px 5px;font-size:11px;border-radius:3px;border:none;cursor:pointer;vertical-align:middle;";

  // Match the color of the meta text (replies/views under the title)
  const metaText =
    item.querySelector(".structItem-minor") ||
    item.querySelector(".structItem-meta") ||
    item.querySelector(".structItem-cell--meta");
  if (metaText) {
    const computed = getComputedStyle(metaText);
    if (computed && computed.color) {
      btn.style.color = computed.color;
    }
    if (computed && computed.backgroundColor) {
      btn.style.backgroundColor = computed.backgroundColor;
    }
  } else {
    // Fallback to transparent background if we can't sample one
    btn.style.backgroundColor = "transparent";
  }

  btn.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();

    const id = getThreadId(item);
    // Always hide visually even if we can't derive an ID
    item.style.display = "none";
    item.dataset.asrManuallyHidden = "true";

    if (!id) return;

    chrome.storage.local.get([MANUAL_HIDDEN_KEY], (result) => {
      const current = Array.isArray(result[MANUAL_HIDDEN_KEY])
        ? result[MANUAL_HIDDEN_KEY]
        : [];
      if (current.includes(id)) return;
      const updated = [...current, id];
      chrome.storage.local.set({ [MANUAL_HIDDEN_KEY]: updated });
    });
  });

  if (titleLink && titleLink.parentNode === titleContainer) {
    // Insert directly to the right of the title link
    titleContainer.insertBefore(btn, titleLink.nextSibling);
  } else {
    container.appendChild(btn);
  }
}

function filterThreads(root, blacklist, manuallyHiddenIds) {
  const hiddenIds = Array.isArray(manuallyHiddenIds) ? manuallyHiddenIds : [];
  const items = root.querySelectorAll(
    "div.structItem.structItem--thread.js-inlineModContainer"
  );

  items.forEach((item) => {
    // Skip if already processed and counted
    // Always attach a manual Hide button
    attachHideButton(item);

    const threadId = getThreadId(item);

    // Respect manually-hidden threads stored in memory
    if (threadId && hiddenIds.includes(threadId)) {
      item.style.display = "none";
      item.dataset.asrManuallyHidden = "true";
      return;
    }

    if (item.dataset.asrCounted === "true") {
      return;
    }

    const titleEl = item.querySelector(".structItem-title");
    if (!titleEl) return;
    const text = titleEl.textContent || "";

    if (titleContainsBlacklistedWord(text, blacklist)) {
      // Only increment if the item is currently visible (not already hidden)
      if (item.style.display !== "none") {
        item.style.display = "none";
        saveHiddenPost(text);
        // Mark as counted to prevent double-counting
        item.dataset.asrCounted = "true";
      }
    }
  });
}




