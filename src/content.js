const BLOCKED_THREADS_KEY = "blockedThreads";
const BLOCKED_THREADS_COUNT_KEY = "blockedThreadsCount";

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

async function init() {
  // Load all threads from DOM
  const threads = document.querySelectorAll("div.structItem.structItem--thread.js-inlineModContainer") || [];

  // Load all the blocked threads from storage
  const result = await chrome.storage.local.get([BLOCKED_THREADS_KEY, BLOCKED_THREADS_COUNT_KEY]);
  const blockedThreads = result[BLOCKED_THREADS_KEY] || [];
  const blockedThreadsCount = result[BLOCKED_THREADS_COUNT_KEY] || 0;

  const count = processThreads(threads, blockedThreads);

  // Increment the total blocked threads counter
  chrome.storage.local.set({
    [BLOCKED_THREADS_COUNT_KEY]: blockedThreadsCount + count
  });
}

function processThreads(threads, blockedThreads) {
  const blockedThreadsIds = blockedThreads.map((entry) => entry.id);

  let count = 0;
  threads.forEach((thread) => {
    const threadId = getThreadId(thread);

    if (blockedThreadsIds.includes(threadId)) {
      thread.style.display = "none";
      count++;
    } else {
      addBlockButton(thread);
    }
  });

  return count;
}

function getThreadId(item) {
  // Extract thread ID from js-threadListItem-{id} class
  const classList = Array.from(item.classList);
  const threadListItemClass = classList.find((cls) =>
    cls.startsWith("js-threadListItem-")
  );
  if (!threadListItemClass) return null;
  const id = threadListItemClass.replace("js-threadListItem-", "");
  return id;
}

function getTitle(item) {
  const raw = item.querySelector(".structItem-title")?.textContent || "";

  // Collapse newlines/tabs/extra spaces to a single space
  let cleaned = raw.replace(/\s+/g, " ").trim();

  // Remove trailing "block" (our button label) if present
  if (cleaned.endsWith("Block")) {
    cleaned = cleaned.slice(0, -5).trim();
  }
  return cleaned;
}

function addBlockButton(item) {
  // Avoid adding multiple buttons
  if (item.querySelector(".asr-block-btn")) return;

  const titleContainer = item.querySelector(".structItem-title");
  if (!titleContainer) return; // Can't attach button without title container

  const titleLink = titleContainer.querySelector("a");

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

  // Add hover underline effect
  btn.addEventListener("mouseenter", () => {
    btn.style.textDecoration = "underline";
  });
  btn.addEventListener("mouseleave", () => {
    btn.style.textDecoration = "none";
  });

  if (titleLink && titleLink.parentNode === titleContainer) {
    // Insert directly to the right of the title link
    titleContainer.insertBefore(btn, titleLink.nextSibling);
  } else {
    titleContainer.appendChild(btn);
  }
}

// This is called when the user presses the block button
const blockThread = (event, item) => {
  event.preventDefault();
  event.stopPropagation();

  // Always hide visually
  item.style.display = "none";

  chrome.storage.local.get([BLOCKED_THREADS_KEY, BLOCKED_THREADS_COUNT_KEY], (result) => {
    const blockedThreads = Array.isArray(result[BLOCKED_THREADS_KEY])
      ? result[BLOCKED_THREADS_KEY]
      : [];

    const blockedThreadsIds = blockedThreads.map((entry) => entry.id);

    const id = getThreadId(item);

    if (blockedThreadsIds.includes(id)) return;

    const updated = [
      ...blockedThreads,
      {
        id,
        title: getTitle(item)
      }
    ];

    // Increment the total blocked threads counter
    const currentCount = result[BLOCKED_THREADS_COUNT_KEY] || 0;
    chrome.storage.local.set({
      [BLOCKED_THREADS_KEY]: updated,
      [BLOCKED_THREADS_COUNT_KEY]: currentCount + 1
    });
  });
}