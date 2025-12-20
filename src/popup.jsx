import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";

const BLOCKED_WORDS_COUNT_KEY = "blockedWordsCount";
const LAST_BLOCKED_WORDS_TITLE_KEY = "lastBlockedWordsTitle";

function PopupApp() {
  const [blockedWordsCount, setBlockedWordsCount] = useState(0);
  const [lastBlockedWordsTitle, setlastBlockedWordsTitle] = useState("");

  useEffect(() => {
    // Load the hidden count and last hidden title from storage when popup opens
    chrome.storage.local.get([BLOCKED_WORDS_COUNT_KEY, LAST_BLOCKED_WORDS_TITLE_KEY], (result) => {
      setBlockedWordsCount(result[BLOCKED_WORDS_COUNT_KEY] || 0);
      setlastBlockedWordsTitle(result[LAST_BLOCKED_WORDS_TITLE_KEY] || "");
    });
  }, []);

  const openOptions = () => {
    if (chrome.runtime && chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    }
  };

  return (
    <div className="min-w-[260px] max-w-[320px] px-3.5 py-3.5">
      <h1 className="mb-1.5 text-sm font-semibold text-slate-50">
        ASR Blocker
      </h1>
      <p className="mb-3 text-[11px] text-slate-400">
        Block stuff you don't want to see.
      </p>
      <div className="mb-3 text-[11px] text-slate-300">
        <span className="font-medium">Posts hidden:</span>{" "}
        <span className="text-slate-200">{blockedWordsCount.toLocaleString()}</span>
      </div>
      {lastBlockedWordsTitle && (
        <div className="mb-3 text-[11px] text-slate-300">
          <div className="font-medium mb-1">Last hidden:</div>
          <div className="text-slate-200 italic line-clamp-2">{lastBlockedWordsTitle}</div>
        </div>
      )}
      <button
        type="button"
        className="w-full rounded-md bg-sky-600 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-950 transition-colors"
        onClick={openOptions}
      >
        Open ASR Blocker Settings
      </button>
    </div>
  );
}

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(<PopupApp />);
}


