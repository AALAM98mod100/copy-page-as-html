/**
 * popup.js
 * Controls the popup UI for Copy Page as HTML extension.
 */

const RESTRICTED_PREFIXES = [
  "about:",
  "chrome:",
  "moz-extension:",
  "resource:",
  "view-source:",
  "data:",
  "file:",
  "javascript:",
];

const DEBOUNCE_MS = 1000;
let lastClickTime = 0;

function setState(state) {
  const container = document.getElementById("container");
  container.className = `state-${state}`;
}

function truncateTitle(title, maxLen = 50) {
  if (!title) return "Untitled";
  return title.length > maxLen ? title.slice(0, maxLen - 1) + "…" : title;
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const kb = (bytes / 1024).toFixed(1);
  return `${kb} KB`;
}

function isRestricted(url) {
  if (!url) return true;
  return RESTRICTED_PREFIXES.some((prefix) => url.startsWith(prefix));
}

async function init() {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });

  if (!tab || isRestricted(tab.url)) {
    setState("restricted");
    return;
  }

  const titleEl = document.getElementById("page-title");
  const shortened = truncateTitle(tab.title);
  titleEl.textContent = shortened;
  titleEl.title = tab.title || "";

  setState("ready");
}

async function doCopy() {
  const now = Date.now();
  if (now - lastClickTime < DEBOUNCE_MS) return;
  lastClickTime = now;

  const embedImages = document.getElementById("embed-images-chk").checked;

  setState("copying");
  document.getElementById("copying-text").textContent =
    embedImages ? "Fetching images…" : "Copying…";

  try {
    const response = await browser.runtime.sendMessage({ action: "copy-page-html", embedImages });

    if (!response || !response.success) {
      const error = response && response.error;

      if (error === "restricted") {
        setState("restricted");
        return;
      }

      setState("error");
      document.getElementById("error-message").textContent =
        error || "Unknown error. Please try again.";
      return;
    }

    // Write to clipboard (popup is a secure extension context — clipboard API works here)
    await navigator.clipboard.writeText(response.html);

    setState("success");

    const sizeText = formatSize(response.size);
    const truncatedNote = response.truncated ? " (truncated)" : "";
    document.getElementById("status-message").textContent = "Copied to clipboard!";
    document.getElementById("status-size").textContent = `${sizeText} copied${truncatedNote}`;

    // Auto-close after 1.5 seconds
    setTimeout(() => window.close(), 1500);
  } catch (err) {
    console.error("[copy-page-as-html] popup error:", err);
    setState("error");
    document.getElementById("error-message").textContent =
      err.message || "Clipboard write failed. Please try again.";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  init();

  document.getElementById("copy-btn").addEventListener("click", doCopy);

  document.getElementById("try-again-btn").addEventListener("click", () => {
    setState("ready");
  });
});
