import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";

const HIDDEN_COUNT_KEY = "hiddenCount";
const LAST_HIDDEN_TITLE_KEY = "lastHiddenTitle";
const CLOUD_FUNCTION_URL = "http://127.0.0.1:5001/gradetransferersandbox/us-central1/authASRUser";

function PopupApp() {
  const [hiddenCount, setHiddenCount] = useState(0);
  const [lastHiddenTitle, setLastHiddenTitle] = useState("");
  const [token, setToken] = useState("");
  const [tokenError, setTokenError] = useState("");
  const [cloudResponse, setCloudResponse] = useState("");
  const [cloudError, setCloudError] = useState("");
  const [cloudLoading, setCloudLoading] = useState(false);

  useEffect(() => {
    // Load the hidden count and last hidden title from storage when popup opens
    chrome.storage.local.get([HIDDEN_COUNT_KEY, LAST_HIDDEN_TITLE_KEY], (result) => {
      setHiddenCount(result[HIDDEN_COUNT_KEY] || 0);
      setLastHiddenTitle(result[LAST_HIDDEN_TITLE_KEY] || "");
    });

    // Get Chrome identity token
    if (chrome.identity && chrome.identity.getAuthToken) {
      chrome.identity.getAuthToken({ interactive: true }, (token) => {
        if (chrome.runtime.lastError) {
          setTokenError(chrome.runtime.lastError.message);
        } else {
          setToken(token);
        }
      });
    } else {
      setTokenError("Identity API not available. Make sure the extension is reloaded and 'identity' permission is set.");
    }
  }, []);

  // Send token to cloud function when token is available
  useEffect(() => {
    if (!token) return;

    setCloudLoading(true);
    setCloudError("");
    setCloudResponse("");

    fetch(CLOUD_FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        setCloudResponse(JSON.stringify(data, null, 2));
        setCloudLoading(false);
      })
      .catch((error) => {
        setCloudError(error.message);
        setCloudLoading(false);
      });
  }, [token]);

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
      <div className="mb-3 text-[11px] text-slate-300">
        <span className="font-medium">Posts hidden:</span>{" "}
        <span className="text-slate-200">{hiddenCount.toLocaleString()}</span>
      </div>
      {lastHiddenTitle && (
        <div className="mb-3 text-[11px] text-slate-300">
          <div className="font-medium mb-1">Last hidden:</div>
          <div className="text-slate-200 italic line-clamp-2">{lastHiddenTitle}</div>
        </div>
      )}
      <div className="mb-3 text-[11px] text-slate-300">
        <div className="font-medium mb-1">Identity Token:</div>
        {token ? (
          <div className="text-slate-200 break-all text-[10px] font-mono">
            {token}
          </div>
        ) : tokenError ? (
          <div className="text-red-400 text-[10px]">{tokenError}</div>
        ) : (
          <div className="text-slate-500 text-[10px]">Loading...</div>
        )}
      </div>
      {token && (
        <div className="mb-3 text-[11px] text-slate-300">
          <div className="font-medium mb-1">Cloud Function Response:</div>
          {cloudLoading ? (
            <div className="text-slate-500 text-[10px]">Sending to cloud function...</div>
          ) : cloudError ? (
            <div className="text-red-400 text-[10px] break-all">{cloudError}</div>
          ) : cloudResponse ? (
            <div className="text-slate-200 break-all text-[10px] font-mono whitespace-pre-wrap max-h-40 overflow-y-auto">
              {cloudResponse}
            </div>
          ) : null}
        </div>
      )}
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


