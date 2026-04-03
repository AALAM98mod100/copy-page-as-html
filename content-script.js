/**
 * content-script.js
 * Injected into the active tab via scripting.executeScript.
 * Self-contained: all cleaning logic is inlined.
 * Reads window.__copyPageConfig (set by background.js before injection).
 *
 * Returns: { title: string, url: string, html: string }
 */

(async () => {
  const config = window.__copyPageConfig || {};
  const embedImages = !!config.embedImages;
  const IMAGE_SIZE_LIMIT = 500 * 1024; // skip images larger than 500 KB binary
  // --- HTML escape helpers ---
  function escapeHTML(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // Escape strings embedded in HTML comments (prevent comment breakout via -->)
  function escapeComment(str) {
    return str.replace(/-->/g, "--&gt;");
  }

  // --- Cleaning pipeline ---
  function cleanHTML(bodyClone) {
    // Element removal
    const removeSelectors = [
      "script",
      "style",
      "link[rel='stylesheet']",
      "noscript",
      "template",
      "object, embed, applet",
      "iframe",
      "form",
      "base",
      "meta[http-equiv]",
      "link:not([rel='stylesheet'])",
      "[hidden]",
      "[aria-hidden='true']",
    ];
    removeSelectors.forEach((sel) => {
      bodyClone.querySelectorAll(sel).forEach((el) => el.remove());
    });

    // Remove SVG sprite sheets (only defs/symbol/use as direct children)
    bodyClone.querySelectorAll("svg").forEach((svg) => {
      const children = Array.from(svg.children);
      if (
        children.length > 0 &&
        children.every((c) => ["defs", "symbol", "use"].includes(c.tagName.toLowerCase()))
      ) {
        svg.remove();
      }
    });

    // Remove HTML comments via TreeWalker
    const walker = document.createTreeWalker(bodyClone, NodeFilter.SHOW_COMMENT);
    const comments = [];
    let node;
    while ((node = walker.nextNode())) comments.push(node);
    comments.forEach((c) => c.parentNode && c.parentNode.removeChild(c));

    // Attribute removal
    bodyClone.querySelectorAll("*").forEach((el) => {
      Array.from(el.attributes).forEach((attr) => {
        const name = attr.name;
        const value = attr.value;
        if (name.startsWith("on")) { el.removeAttribute(name); return; }
        if ((name === "href" || name === "src") && value.trim().toLowerCase().startsWith("javascript:")) {
          el.removeAttribute(name); return;
        }
        if (name === "style") { el.removeAttribute(name); return; }
        if (name.startsWith("data-")) { el.removeAttribute(name); return; }
      });
    });

    return bodyClone.innerHTML;
  }

  // --- Image embedding ---
  async function blobToDataURL(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  async function embedImagesInClone(clone) {
    const imgs = Array.from(clone.querySelectorAll("img[src]"));
    await Promise.all(imgs.map(async (img) => {
      const src = img.getAttribute("src");
      if (!src || src.startsWith("data:")) return; // already embedded
      try {
        const response = await fetch(src);
        if (!response.ok) return;
        const blob = await response.blob();
        if (blob.size === 0 || blob.size > IMAGE_SIZE_LIMIT) return;
        const dataUrl = await blobToDataURL(blob);
        img.setAttribute("src", dataUrl);
      } catch (_) {
        // CORS failure or network error — keep original src
      }
    }));
  }

  // --- Main ---
  const title = document.title || "";
  const url = window.location.href || "";
  const timestamp = new Date().toISOString();

  const bodyClone = document.body.cloneNode(true);
  cleanHTML(bodyClone);

  if (embedImages) {
    await embedImagesInClone(bodyClone);
  }

  const cleanedBody = bodyClone.innerHTML;

  const safeTitle = escapeHTML(title);
  const safeUrl = escapeComment(escapeHTML(url));
  const safeTitleComment = escapeComment(escapeHTML(title));

  const html =
    `<!-- Source: ${safeUrl} -->\n` +
    `<!-- Title: ${safeTitleComment} -->\n` +
    `<!-- Copied: ${timestamp} -->\n` +
    `<html>\n<head><title>${safeTitle}</title></head>\n<body>\n` +
    cleanedBody +
    `\n</body>\n</html>`;

  return { title, url, html };
})();
