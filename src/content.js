const BLOCKED_THREADS_KEY = "blockedThreads";

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", loadBlockedThreadsAndInit);
} else {
  loadBlockedThreadsAndInit();
}

function loadBlockedThreadsAndInit() {
  chrome.storage.local.get([BLOCKED_THREADS_KEY], (result) => {
    const blockedThreads = Array.isArray(result[BLOCKED_THREADS_KEY])
      ? result[BLOCKED_THREADS_KEY]
      : [];

    filterThreads(blockedThreads);
  });
}

function filterThreads(blockedThreads) {
  const blockedIds = blockedThreads.map((entry) => entry.id)
  const items = document.querySelectorAll(
    "div.structItem.structItem--thread.js-inlineModContainer"
  );

  items.forEach((item) => {
    // Always attach a manual block button
    attachHideButton(item);

    const threadId = getThreadId(item);

    // Respect manually-hidden threads stored in memory
    if (threadId && blockedIds.includes(threadId)) {
      item.style.display = "none";
      item.dataset.asrManuallyHidden = "true";
      return;
    }
  });
}

function getThreadId(item) {
  // Extract thread ID from js-threadListItem-{id} class
  const classList = Array.from(item.classList);
  const threadListItemClass = classList.find((cls) =>
    cls.startsWith("js-threadListItem-")
  );
  const id = threadListItemClass.replace("js-threadListItem-", "");
  return id;
}

function cleanTitleText(raw) {
  if (!raw) return "";
  // Collapse newlines/tabs/extra spaces to a single space
  let cleaned = raw.replace(/\s+/g, " ").trim();
  // Remove trailing "block" (our button label) if present
  if (cleaned.endsWith("Block")) {
    cleaned = cleaned.slice(0, -5).trim();
  }
  return cleaned;
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

  btn.addEventListener("click", (event) => blockThread(event, item));

  if (titleLink && titleLink.parentNode === titleContainer) {
    // Insert directly to the right of the title link
    titleContainer.insertBefore(btn, titleLink.nextSibling);
  } else {
    container.appendChild(btn);
  }
}

const blockThread = (event, item) => {
  event.preventDefault();
  event.stopPropagation();

  const id = getThreadId(item);
  const rawTitle =
    item.querySelector(".structItem-title")?.textContent || "";
  const titleText = cleanTitleText(rawTitle);
  // Always hide visually even if we can't derive an ID
  item.style.display = "none";
  item.dataset.asrManuallyHidden = "true";

  chrome.storage.local.get([BLOCKED_THREADS_KEY], (result) => {
    const blockedThreads = Array.isArray(result[BLOCKED_THREADS_KEY])
      ? result[BLOCKED_THREADS_KEY]
      : [];

    const blockedThreadsIds = blockedThreads.map((entry) => entry.id);

    if (blockedThreadsIds.includes(id)) return;

    const updated = [
      ...blockedThreads,
      {
        id,
        title: titleText
      }
    ];

    chrome.storage.local.set({ [BLOCKED_THREADS_KEY]: updated });
  });
}