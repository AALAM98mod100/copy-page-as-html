/**
 * html-cleaner.js
 * Cleans a cloned DOM body node for AI-friendly output.
 * Runs in the content script sandbox (no ES module imports).
 * Attaches cleanHTML to the local scope so content-script.js can call it.
 */

function cleanHTML(bodyClone) {
  // --- Element removal ---

  // Remove scripts
  bodyClone.querySelectorAll("script").forEach((el) => el.remove());

  // Remove styles and linked stylesheets
  bodyClone.querySelectorAll("style, link[rel='stylesheet']").forEach((el) => el.remove());

  // Remove noscript
  bodyClone.querySelectorAll("noscript").forEach((el) => el.remove());

  // Remove template tags
  bodyClone.querySelectorAll("template").forEach((el) => el.remove());

  // Remove object, embed, applet
  bodyClone.querySelectorAll("object, embed, applet").forEach((el) => el.remove());

  // Remove iframes
  bodyClone.querySelectorAll("iframe").forEach((el) => el.remove());

  // Remove forms (prevent action= URL leakage if output is ever rendered)
  bodyClone.querySelectorAll("form").forEach((el) => el.remove());

  // Remove base tags (prevent relative URL hijacking)
  bodyClone.querySelectorAll("base").forEach((el) => el.remove());

  // Remove meta refresh and other http-equiv directives
  bodyClone.querySelectorAll("meta[http-equiv]").forEach((el) => el.remove());

  // Remove remaining link tags (non-stylesheet ones)
  bodyClone.querySelectorAll("link:not([rel='stylesheet'])").forEach((el) => el.remove());

  // Remove SVG sprite sheets (SVGs whose direct children are only defs/symbol/use)
  bodyClone.querySelectorAll("svg").forEach((svg) => {
    const children = Array.from(svg.children);
    if (children.length > 0 && children.every((c) => ["defs", "symbol", "use"].includes(c.tagName.toLowerCase()))) {
      svg.remove();
    }
  });

  // Remove hidden elements
  bodyClone
    .querySelectorAll("[hidden], [aria-hidden='true']")
    .forEach((el) => el.remove());

  // Remove HTML comments via TreeWalker
  const walker = document.createTreeWalker(bodyClone, NodeFilter.SHOW_COMMENT);
  const comments = [];
  let node;
  while ((node = walker.nextNode())) {
    comments.push(node);
  }
  comments.forEach((c) => c.parentNode && c.parentNode.removeChild(c));

  // --- Attribute removal ---
  bodyClone.querySelectorAll("*").forEach((el) => {
    const attrs = Array.from(el.attributes);
    attrs.forEach((attr) => {
      const name = attr.name;
      const value = attr.value;

      // Remove all event handlers
      if (name.startsWith("on")) {
        el.removeAttribute(name);
        return;
      }

      // Remove javascript: hrefs/srcs
      if ((name === "href" || name === "src") && value.trim().toLowerCase().startsWith("javascript:")) {
        el.removeAttribute(name);
        return;
      }

      // Remove inline styles
      if (name === "style") {
        el.removeAttribute(name);
        return;
      }

      // Remove data-* attributes
      if (name.startsWith("data-")) {
        el.removeAttribute(name);
        return;
      }
    });
  });

  return bodyClone.innerHTML;
}
