import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";

function PopupApp() {
  const [manuallyBlocked, setManuallyBlocked] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    // Load the blocked threads on mount
    chrome.storage.local.get(["blockedThreads"], (result) => {
      const blockedThreads = Array.isArray(result.blockedThreads) ? result.blockedThreads : [];
      setManuallyBlocked(blockedThreads.length);

      // Calculate the sum of all counts
      const sum = blockedThreads.reduce((total, thread) => {
        return total + (thread.count || 0);
      }, 0);
      setTotalCount(sum);
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
        Block threads you don't want to see.
      </p>
      <div className="mb-3 rounded-md bg-slate-800 px-3 py-2">
        {manuallyBlocked === 0 ? (
          <span className="text-[11px] text-slate-400">
            Click on the Block button to the right of thread titles to block that thread.
          </span>
        ) : (
          <>
            <span className="text-[11px] text-slate-400">
              You have blocked <span className="font-semibold text-slate-50">{manuallyBlocked}</span> thread{manuallyBlocked !== 1 ? 's' : ''}.
            </span>
            <br />
            <span className="text-[11px] text-slate-400">
              Total times blocked: <span className="font-semibold text-slate-50">{totalCount}</span>
            </span>
          </>
        )}
      </div>
      <button
        type="button"
        className="w-full rounded-md border border-gray-700 bg-black px-3 py-2 text-xs font-medium text-white hover:border-gray-600 hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-800 focus:ring-offset-2 focus:ring-offset-slate-950 transition-colors"
        onClick={openOptions}
      >
        Settings
      </button>
    </div>
  );
}

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(<PopupApp />);
}


