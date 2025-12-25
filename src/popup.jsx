import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";

function PopupApp() {
  const [totalBlocked, setTotalBlocked] = useState(0);
  const [manuallyBlocked, setManuallyBlocked] = useState(0);

  useEffect(() => {
    // Load the total blocked count on mount
    chrome.storage.local.get(["totalBlockedThreadsCount", "blockedThreads"], (result) => {
      setTotalBlocked(result.totalBlockedThreadsCount || 0);
      const blockedThreads = Array.isArray(result.blockedThreads) ? result.blockedThreads : [];
      setManuallyBlocked(blockedThreads.length);
    });

    // Listen for updates to the counts
    const handleStorageChange = (changes) => {
      if (changes.totalBlockedThreadsCount) {
        setTotalBlocked(changes.totalBlockedThreadsCount.newValue || 0);
      }
      if (changes.blockedThreads) {
        const blockedThreads = Array.isArray(changes.blockedThreads.newValue)
          ? changes.blockedThreads.newValue
          : [];
        setManuallyBlocked(blockedThreads.length);
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
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
        Block threads you don't want to see.
      </p>
      <div className="mb-3 rounded-md bg-slate-800 px-3 py-2">
        <p className="text-[11px] text-slate-400">Total threads automatically blocked</p>
        <p className="text-lg font-semibold text-slate-50">{totalBlocked}</p>
      </div>
      <div className="mb-3 rounded-md bg-slate-800 px-3 py-2">
        <p className="text-[11px] text-slate-400">Total threads manually blocked</p>
        <p className="text-lg font-semibold text-slate-50">{manuallyBlocked}</p>
      </div>
      <button
        type="button"
        className="w-full rounded-md border border-gray-700 bg-black px-3 py-2 text-xs font-medium text-white hover:border-gray-600 hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-800 focus:ring-offset-2 focus:ring-offset-slate-950 transition-colors"
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


