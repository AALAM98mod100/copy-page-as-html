/**
 * background.js
 * Service worker for Copy Page as HTML extension.
 * Handles messages from the popup, injects content scripts, and returns cleaned HTML.
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

const SIZE_LIMIT = 512 * 1024; // 512 KB in bytes

function isRestricted(url) {
  if (!url) return true;
  return RESTRICTED_PREFIXES.some((prefix) => url.startsWith(prefix));
}

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action !== "copy-page-html") return false;

  (async () => {
    try {
      // Get the active tab
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });

      if (!tab || !tab.id) {
        sendResponse({ success: false, error: "No active tab found." });
        return;
      }

      // Check for restricted pages
      if (isRestricted(tab.url)) {
        sendResponse({ success: false, error: "restricted" });
        return;
      }

      const embedImages = !!message.embedImages;

      // Inject config into the isolated content script world first,
      // then inject the self-contained content-script.js which reads it.
      // Two separate executeScript calls share the same isolated world per tab.
      await browser.scripting.executeScript({
        target: { tabId: tab.id },
        func: (cfg) => { window.__copyPageConfig = cfg; },
        args: [{ embedImages }],
      });

      const results = await browser.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content-script.js"],
      });

      if (!results || results.length === 0) {
        sendResponse({ success: false, error: "Script injection returned no results." });
        return;
      }

      const result = results[results.length - 1];
      const value = result.result;

      if (!value || !value.html) {
        sendResponse({ success: false, error: "Page content is empty or inaccessible." });
        return;
      }

      let { html, title, url } = value;
      let truncated = false;

      // Encode to measure byte size accurately
      const byteLength = new TextEncoder().encode(html).length;

      if (byteLength > SIZE_LIMIT) {
        // Find a clean tag boundary before the size limit to avoid cutting mid-tag
        const charLimit = Math.floor((SIZE_LIMIT / byteLength) * html.length);
        const boundaryIndex = html.lastIndexOf(">", charLimit);
        const cutAt = boundaryIndex > 0 ? boundaryIndex + 1 : charLimit;
        html = html.slice(0, cutAt) + "\n<!-- Content truncated at 512 KB -->\n</body></html>";
        truncated = true;
      }

      const finalSize = new TextEncoder().encode(html).length;

      sendResponse({ success: true, html, size: finalSize, truncated, title, url });
    } catch (err) {
      console.error("[copy-page-as-html] background error:", err);
      sendResponse({ success: false, error: err.message || "Unexpected error." });
    }
  })();

  // Return true to indicate async response
  return true;
});
