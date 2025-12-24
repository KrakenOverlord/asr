import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

const BLOCKED_THREADS_KEY = "blockedThreads";

function loadBlockedThreadsFromStorage() {
  return new Promise((resolve) => {
    chrome.storage.local.get([BLOCKED_THREADS_KEY], (result) => {
      const raw = result[BLOCKED_THREADS_KEY] || [];
      const normalized = Array.isArray(raw)
        ? raw
            .map((entry) =>
              typeof entry === "string"
                ? { id: entry, title: entry }
                : entry
            )
            .filter((entry) => entry && entry.id)
        : [];
      resolve(normalized);
    });
  });
}

function saveBlockedThreadsToStorage(threads) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ [BLOCKED_THREADS_KEY]: threads }, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}

function OptionsApp() {
  const [status, setStatus] = useState("");
  const [blockedThreads, setBlockedThreads] = useState([]);

  useEffect(() => {
    loadBlockedThreadsFromStorage().then((loaded) => {
      setBlockedThreads(loaded);
    });
  }, []);

  function showStatus(message, timeout = 1500) {
    setStatus(message);
    if (timeout) {
      setTimeout(() => {
        setStatus((current) => (current === message ? "" : current));
      }, timeout);
    }
  }

  async function handleUnblockThread(index) {
    const current = await loadBlockedThreadsFromStorage();
    if (index < 0 || index >= current.length) return;
    const updated = [
      ...current.slice(0, index),
      ...current.slice(index + 1),
    ];
    try {
      await saveBlockedThreadsToStorage(updated);
      setBlockedThreads(updated);
      showStatus("Thread unblocked.");
    } catch (err) {
      console.error(err);
      showStatus("Failed to save.", 2500);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-950/80 px-6 py-4">
        <h1 className="text-lg font-semibold text-slate-50">ASR Blocker Settings</h1>
        <p className="mt-1 text-xs text-slate-400">
          Manage blocked threads.
        </p>
      </header>

      <main className="mx-auto max-w-xl px-6 py-5">
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-medium text-slate-100">
            Blocked Threads
          </h2>
          <p className="mb-3 text-xs text-slate-400">
            These threads were manually blocked. You can unblock them here.
          </p>

          <p className="mb-2 min-h-[18px] text-[11px] text-indigo-200">
            {status}
          </p>

          <ul className="max-h-72 list-none space-y-1 overflow-y-auto p-0">
            {blockedThreads.length === 0 ? (
              <li className="text-[11px] text-slate-400">
                No blocked threads yet.
              </li>
            ) : (
              blockedThreads.map((thread, index) => (
                <li key={thread.id} className="word-item">
                  <span className="text-[11px] text-slate-100 break-all">
                    {thread.title || thread.id}
                  </span>
                  <button
                    type="button"
                    className="delete-btn"
                    onClick={() => handleUnblockThread(index)}
                  >
                    Unblock
                  </button>
                </li>
              ))
            )}
          </ul>
        </section>
      </main>
    </div>
  );
}

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(<OptionsApp />);
}


