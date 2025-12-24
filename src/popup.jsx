import React from "react";
import { createRoot } from "react-dom/client";

function PopupApp() {
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


