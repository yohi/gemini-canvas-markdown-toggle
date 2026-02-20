# Gemini Canvas Markdown Toggle

A Chrome Extension that allows you to toggle between Raw Markdown and Preview in the Gemini (gemini.google.com) Canvas editor.

## Features

*   **Markdown Toggle**: Switch between raw text editing and rendered HTML preview.
*   **Secure**: Uses `DOMPurify` to sanitize HTML.
*   **Offline Libraries**: All dependencies (`marked`, `DOMPurify`, `github-markdown-css`) are bundled.
*   **Dark Mode**: Supports Gemini's dark theme.
*   **Copy to Clipboard**: Easily copy the raw markdown text while in preview mode.

## Installation (Developer Mode)

Since this extension is not yet published on the Chrome Web Store, you can install it manually:

1.  Clone or download this repository.
2.  Open Chrome and navigate to `chrome://extensions/`.
3.  Enable **Developer mode** in the top right corner.
4.  Click **Load unpacked**.
5.  Select the `gemini-canvas-toggle` directory (the folder containing `manifest.json`).

## Usage

1.  Open [Gemini](https://gemini.google.com/).
2.  Navigate to a Canvas or create a new one.
3.  Look for the **Preview** button in the top-right corner of the editor area.
4.  Click **Preview** to see the rendered Markdown.
5.  Click **Raw** to return to editing mode.
6.  In Preview mode, click **Copy MD** to copy the markdown text to your clipboard.

## Tech Stack

*   Vanilla JavaScript (ES6+)
*   [marked](https://github.com/markedjs/marked) for Markdown parsing.
*   [DOMPurify](https://github.com/cure53/DOMPurify) for sanitization.
*   [github-markdown-css](https://github.com/sindresorhus/github-markdown-css) for styling.

## License

MIT
