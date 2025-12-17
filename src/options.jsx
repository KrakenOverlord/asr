import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

const STORAGE_KEY = "blacklist";

function loadWordsFromStorage() {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEY], (result) => {
      resolve(result[STORAGE_KEY] || []);
    });
  });
}

function saveWordsToStorage(words) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ [STORAGE_KEY]: words }, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}

function OptionsApp() {
  const [words, setWords] = useState([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    loadWordsFromStorage().then((loaded) => {
      const sorted = [...loaded].sort((a, b) => a.localeCompare(b));
      setWords(sorted);
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

  async function handleAdd(e) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) {
      showStatus("Please enter a non-empty word.");
      return;
    }

    const current = await loadWordsFromStorage();
    if (current.includes(trimmed)) {
      showStatus("That word is already in the list.");
      return;
    }

    const updated = [...current, trimmed].sort((a, b) => a.localeCompare(b));
    try {
      await saveWordsToStorage(updated);
      setWords(updated);
      setInput("");
      showStatus("Saved.");
    } catch (err) {
      console.error(err);
      showStatus("Failed to save.", 2500);
    }
  }

  async function handleRemove(index) {
    const current = await loadWordsFromStorage();
    const sorted = [...current].sort((a, b) => a.localeCompare(b));
    if (index < 0 || index >= sorted.length) return;
    const updated = [...sorted.slice(0, index), ...sorted.slice(index + 1)];
    try {
      await saveWordsToStorage(updated);
      setWords(updated);
      showStatus("Removed.");
    } catch (err) {
      console.error(err);
      showStatus("Failed to save.", 2500);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-950/80 px-6 py-4">
        <h1 className="text-lg font-semibold text-slate-50">ASR Settings</h1>
        <p className="mt-1 text-xs text-slate-400">
          Manage the words ASR will use to hide posts.
        </p>
      </header>

      <main className="mx-auto max-w-xl px-6 py-5">
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-medium text-slate-100">
            Blocked words
          </h2>
          <p className="mb-3 text-xs text-slate-400">
            Add words or phrases. ASR will use this list to decide which posts
            to hide.
          </p>

          <form className="mb-3 flex gap-2" onSubmit={handleAdd}>
            <input
              type="text"
              placeholder="Add a word or phrase"
              autoComplete="off"
              className="flex-1 rounded-md border border-slate-800 bg-slate-950 px-3 py-1.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-500"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button
              type="submit"
              className="rounded-md bg-emerald-500 px-3.5 py-1.5 text-xs font-semibold text-emerald-950 hover:bg-emerald-600"
            >
              Add
            </button>
          </form>

          <p className="mb-2 min-h-[18px] text-[11px] text-indigo-200">
            {status}
          </p>

          <ul className="max-h-72 list-none space-y-1 overflow-y-auto p-0">
            {words.length === 0 ? (
              <li className="text-[11px] text-slate-400">
                No blocked words yet.
              </li>
            ) : (
              words.map((word, index) => (
                <li key={word} className="word-item">
                  <span>{word}</span>
                  <button
                    type="button"
                    className="delete-btn"
                    onClick={() => handleRemove(index)}
                  >
                    Remove
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


