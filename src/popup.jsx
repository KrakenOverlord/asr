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
        ASR Blacklist
      </h1>
      <p className="mb-3 text-[11px] text-slate-400">
        Manage which words ASR uses to hide posts from the options page.
      </p>
      <button
        type="button"
        className="text-[11px] text-slate-200 underline-offset-2 hover:underline"
        onClick={openOptions}
      >
        Open ASR settings
      </button>
    </div>
  );
}

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(<PopupApp />);
}


