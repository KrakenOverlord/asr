const BLOCKED_THREADS_KEY = "blockedThreads";

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

async function init() {
  // Load all threads from DOM
  const threads = document.querySelectorAll("div.structItem.structItem--thread.js-inlineModContainer") || [];

  // Load all the blocked threads from storage
  const result = await chrome.storage.local.get([BLOCKED_THREADS_KEY]);
  const blockedThreads = result[BLOCKED_THREADS_KEY] || [];

  await processThreads(threads, blockedThreads);
}

async function processThreads(threads, blockedThreads) {
  const blockedThreadsMap = new Map(blockedThreads.map((entry) => [entry.id, entry]));
  const countIncrements = new Map();
  let blockedCount = 0;

  threads.forEach((thread) => {
    const threadId = getThreadId(thread);

    if (blockedThreadsMap.has(threadId)) {
      thread.style.display = "none";
      blockedCount++;
      // Increment count for this thread (can be multiple times if thread appears multiple times)
      const currentIncrement = countIncrements.get(threadId) || 0;
      countIncrements.set(threadId, currentIncrement + 1);
    } else {
      addBlockButton(thread);
    }
  });

  // Show visual indicator if threads were blocked
  if (blockedCount > 0) {
    showBlockedIndicator(blockedCount);
  }

  // Update storage with incremented counts if any threads were blocked
  if (countIncrements.size > 0) {
    // Increment count for each processed thread
    const updatedBlockedThreads = blockedThreads.map((entry) => {
      const increment = countIncrements.get(entry.id);
      if (increment) {
        return {
          ...entry,
          count: (entry.count || 0) + increment
        };
      }
      return entry;
    });

    return new Promise((resolve) => {
      chrome.storage.local.set(
        {
          [BLOCKED_THREADS_KEY]: updatedBlockedThreads
        },
        () => {
          if (chrome.runtime.lastError) {
            console.error("ASR Blocker: Error updating counts:", chrome.runtime.lastError);
          }
          resolve();
        }
      );
    });
  }
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

function showBlockedIndicator(count) {
  // Remove existing indicator if present
  const existing = document.getElementById("asr-blocked-indicator");
  if (existing) {
    existing.remove();
  }

  // Create indicator banner
  const indicator = document.createElement("div");
  indicator.id = "asr-blocked-indicator";
  indicator.style.cssText = `
    position: fixed;
    top: 8px;
    right: 20px;
    background: #1e293b;
    color: #e2e8f0;
    padding: 12px 16px;
    border-radius: 6px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
    font-size: 13px;
    z-index: 10000;
    border: 1px solid #334155;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    max-width: 300px;
    animation: asr-slide-in 0.3s ease-out;
  `;

  const message = count === 1
    ? `1 thread was blocked`
    : `${count} threads were blocked`;

  indicator.textContent = `🚫 ${message}`;

  // Add animation
  const style = document.createElement("style");
  style.textContent = `
    @keyframes asr-slide-in {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
  `;
  if (!document.getElementById("asr-indicator-styles")) {
    style.id = "asr-indicator-styles";
    document.head.appendChild(style);
  }

  document.body.appendChild(indicator);

  // Auto-remove after 4 seconds
  setTimeout(() => {
    if (indicator.parentNode) {
      indicator.style.animation = "asr-slide-in 0.3s ease-out reverse";
      setTimeout(() => {
        if (indicator.parentNode) {
          indicator.remove();
        }
      }, 300);
    }
  }, 4000);
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
  btn.title = "Block this thread from being seen";
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

  const id = getThreadId(item);
  if (!id) {
    console.error("ASR Blocker: Could not extract thread ID");
    return;
  }

  chrome.storage.local.get([BLOCKED_THREADS_KEY], (result) => {
    if (chrome.runtime.lastError) {
      console.error("ASR Blocker: Error reading storage:", chrome.runtime.lastError);
      return;
    }

    const blockedThreads = Array.isArray(result[BLOCKED_THREADS_KEY])
      ? result[BLOCKED_THREADS_KEY]
      : [];

    const blockedThreadsIds = blockedThreads.map((entry) => entry.id);

    if (blockedThreadsIds.includes(id)) {
      console.log("ASR Blocker: Thread already blocked:", id);
      return;
    }

    const updated = [
      ...blockedThreads,
      {
        id,
        title: getTitle(item),
        count: 1
      }
    ];

    chrome.storage.local.set(
      {
        [BLOCKED_THREADS_KEY]: updated
      },
      () => {
        if (chrome.runtime.lastError) {
          console.error("ASR Blocker: Error saving to storage:", chrome.runtime.lastError);
        } else {
          console.log("ASR Blocker: Thread blocked successfully:", id);
          showBlockedIndicator(1);
        }
      }
    );
  });
}