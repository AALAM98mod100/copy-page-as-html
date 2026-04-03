# Copy Page as HTML

A Firefox extension that copies the current page's content as clean HTML to your clipboard with one click — ready to paste into any AI agent chat interface.

## What It Does

Click the toolbar button on any webpage and the full page HTML is cleaned and copied to your clipboard. The output is stripped of scripts, styles, event handlers, and noise — leaving readable HTML structure that AI agents can parse effectively.

**Output format:**
```html
<!-- Source: https://example.com/article -->
<!-- Title: Example Article Title -->
<!-- Copied: 2026-04-03T12:00:00.000Z -->
<html>
<head><title>Example Article Title</title></head>
<body>
  <!-- cleaned page content -->
</body>
</html>
```

## Installation (Temporary / Development)

1. Open Firefox and navigate to `about:debugging`
2. Click **"This Firefox"** in the left sidebar
3. Click **"Load Temporary Add-on…"**
4. Navigate to the extension folder and select `manifest.json`
5. The extension icon appears in the toolbar

The extension stays loaded until Firefox is restarted. Repeat these steps each session.

## Usage

1. Navigate to any webpage
2. Click the **Copy Page as HTML** button in the Firefox toolbar
3. The popup shows the page title and a **Copy as HTML** button
4. Click it — the content is copied to your clipboard
5. Paste into your AI agent chat (Claude, ChatGPT, Gemini, etc.)

## Cleaning Pipeline

The HTML is cleaned before copying:

- **Removed elements:** `<script>`, `<style>`, `<link rel="stylesheet">`, `<noscript>`, `<template>`, `<iframe>`, `<object>`, `<embed>`, `<applet>`, SVG sprite sheets, hidden elements, HTML comments
- **Removed attributes:** All `on*` event handlers, `javascript:` href/src, inline `style` attributes, `data-*` attributes
- **Preserved:** Semantic structure, `class`, `aria-*`, `role` attributes, images, links, headings, tables

## Permissions

| Permission | Why |
|---|---|
| `activeTab` | Access the current tab's content |
| `clipboardWrite` | Write to the clipboard |
| `scripting` | Inject the cleaning script into the page |

No data is sent anywhere. No storage is used. No tracking.

## Size Limit

Pages larger than 512 KB are truncated with a `<!-- Content truncated at 512 KB -->` marker appended. Most pages are well under this limit.

## Restricted Pages

The extension cannot copy browser-internal pages (`about:config`, `about:debugging`, extension pages, `file://` URLs, etc.). A lock icon is shown for these pages.

## Development

```
copy-page-as-html/
├── manifest.json          # Extension manifest (MV3)
├── background.js          # Service worker: injects scripts, returns HTML
├── content-script.js      # Runs in page: clones and formats DOM
├── lib/
│   └── html-cleaner.js    # DOM cleaning logic
├── popup/
│   ├── popup.html         # Popup UI markup
│   ├── popup.css          # Popup styles
│   └── popup.js           # Popup logic
└── icons/
    ├── icon-16.png
    ├── icon-32.png
    ├── icon-48.png
    └── icon-128.png
```

Regenerate icons after changes:
```bash
node generate-icons.js
```

## License

MIT
