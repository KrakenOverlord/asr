const BLOCKED_WORDS_KEY = "blockedWords";
const BLOCKED_WORDS_COUNT_KEY = "blockedWordsCount";
const LAST_BLOCKED_WORDS_TITLE_KEY = "lastBlockedWordsTitle";
const BLOCKED_THREADS_KEY = "blockedThreads";

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", loadBlockedWordsAndInit);
} else {
  loadBlockedWordsAndInit();
}

function loadBlockedWordsAndInit() {
  chrome.storage.local.get([BLOCKED_WORDS_KEY, BLOCKED_THREADS_KEY], (result) => {
    const list = result[BLOCKED_WORDS_KEY] || [];
    const rawHidden = Array.isArray(result[BLOCKED_THREADS_KEY])
      ? result[BLOCKED_THREADS_KEY]
      : [];

    // Normalize to objects { id, title }
    const normalizedHidden = rawHidden
      .map((entry) =>
        typeof entry === "string"
          ? { id: entry, title: entry }
          : entry
      )
      .filter((entry) => entry && entry.id);

    initFiltering(list, normalizedHidden);
  });
}

function initFiltering(blockedWords, manuallyHiddenEntries) {
  const normalized = normalizeWords(blockedWords);
  filterThreads(document, normalized, manuallyHiddenEntries);
}

function normalizeWords(words) {
  return (words || [])
    .map((w) => (typeof w === "string" ? w.trim().toLowerCase() : ""))
    .filter((w) => w.length > 0);
}

function titleContainsBlockedWord(titleText, blockedWords) {
  if (!titleText || blockedWords.length === 0) return false;
  const lowerTitle = titleText.toLowerCase();
  return blockedWords.some((word) => lowerTitle.includes(word));
}

function cleanTitleText(raw) {
  if (!raw) return "";
  // Collapse newlines/tabs/extra spaces to a single space
  let cleaned = raw.replace(/\s+/g, " ").trim();
  // Remove trailing "block" (our button label) if present
  if (cleaned.endsWith("Block")) {
    cleaned = cleaned.slice(0, -4).trim();
  }
  return cleaned;
}

function saveHiddenPost(title) {
  const cleanedTitle = cleanTitleText(title);
  chrome.storage.local.get([BLOCKED_WORDS_COUNT_KEY], (result) => {
    const currentCount = result[BLOCKED_WORDS_COUNT_KEY] || 0;
    chrome.storage.local.set({
      [BLOCKED_WORDS_COUNT_KEY]: currentCount + 1,
      [LAST_BLOCKED_WORDS_TITLE_KEY]: cleanedTitle
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
  if (item.querySelector(".asr-block-btn")) return;

  const titleContainer = item.querySelector(".structItem-title");
  const container = titleContainer || item;
  const titleLink = titleContainer
    ? titleContainer.querySelector("a")
    : null;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = "Block";
  btn.className = "asr-block-btn";
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
    const rawTitle =
      item.querySelector(".structItem-title")?.textContent || "";
    const titleText = cleanTitleText(rawTitle);
    // Always hide visually even if we can't derive an ID
    item.style.display = "none";
    item.dataset.asrManuallyHidden = "true";

    if (!id) return;

    chrome.storage.local.get([BLOCKED_THREADS_KEY], (result) => {
      const raw = Array.isArray(result[BLOCKED_THREADS_KEY])
        ? result[BLOCKED_THREADS_KEY]
        : [];

      const existing = raw
        .map((entry) =>
          typeof entry === "string"
            ? { id: entry, title: entry }
            : entry
        )
        .filter((entry) => entry && entry.id);

      if (existing.some((entry) => entry.id === id)) return;

      const updated = [
        ...existing,
        {
          id,
          title: titleText || id
        }
      ];

      chrome.storage.local.set({ [BLOCKED_THREADS_KEY]: updated });
    });
  });

  if (titleLink && titleLink.parentNode === titleContainer) {
    // Insert directly to the right of the title link
    titleContainer.insertBefore(btn, titleLink.nextSibling);
  } else {
    container.appendChild(btn);
  }
}

function filterThreads(root, blockedWords, manuallyHiddenEntries) {
  const hiddenIds = Array.isArray(manuallyHiddenEntries)
    ? manuallyHiddenEntries
        .map((entry) =>
          typeof entry === "string" ? entry : entry && entry.id
        )
        .filter(Boolean)
    : [];
  const items = root.querySelectorAll(
    "div.structItem.structItem--thread.js-inlineModContainer"
  );

  items.forEach((item) => {
    // Skip if already processed and counted
    // Always attach a manual block button
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

    if (titleContainsBlockedWord(text, blockedWords)) {
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




