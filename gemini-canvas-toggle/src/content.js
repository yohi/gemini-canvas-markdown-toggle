// src/content.js

(function() {
    'use strict';

    console.log("Gemini Canvas Toggle: Loaded");

    const SELECTORS = {
        // Heuristic: Look for contenteditable or textarea
        editor: 'textarea, [contenteditable="true"]',
        // Class to mark processed containers
        processed: 'gemini-canvas-processed'
    };

    let turndownService;

    function init() {
        // Initialize TurndownService
        if (typeof TurndownService !== 'undefined') {
            turndownService = new TurndownService({
                headingStyle: 'atx',
                codeBlockStyle: 'fenced'
            });
            if (typeof turndownPluginGfm !== 'undefined' && turndownPluginGfm.gfm) {
                turndownService.use(turndownPluginGfm.gfm);
            }
        } else {
            console.warn("Gemini Canvas Toggle: TurndownService not found. Markdown conversion might be limited.");
        }

        const observer = new MutationObserver((mutations) => {
            detectCanvas();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // Initial check
        detectCanvas();
    }

    function detectCanvas() {
        // Find potential editor elements
        const editors = document.querySelectorAll(SELECTORS.editor);

        editors.forEach(editor => {
            // Check if this specific editor is already processed (or its container)
            // We search up to find if we already attached our UI to a parent
            if (editor.closest(`.${SELECTORS.processed}`)) {
                return;
            }

            const rect = editor.getBoundingClientRect();
            // Heuristic: Canvas editor should be reasonably large
            if (rect.width < 300 || rect.height < 150) {
                return;
            }

            // Identify a suitable container to inject our UI
            // We want a container that wraps the editor directly or close to it.
            // Using parentElement is a safe bet for a start.
            let container = editor.parentElement;

            // Try to find a better container if the immediate parent is too small or inline
            // But usually immediate parent is fine.

            // Mark as processed
            container.classList.add(SELECTORS.processed);
            container.classList.add('gemini-canvas-container-relative');

            injectUI(container, editor);
        });
    }

    function injectUI(container, editor) {
        console.log("Gemini Canvas Toggle: Injecting UI", container);

        // Create Preview Container
        const preview = document.createElement('div');
        preview.className = 'gemini-canvas-preview markdown-body';
        // Ensure preview has a background so it covers the editor
        // Styles are in content.css
        container.appendChild(preview);

        // Create Copy Button (Hidden by default)
        const copyBtn = document.createElement('button');
        copyBtn.className = 'gemini-canvas-copy-btn';
        copyBtn.innerText = 'Copy MD';
        copyBtn.type = 'button';
        copyBtn.style.display = 'none';
        container.appendChild(copyBtn);

        // Create Toggle Button
        const btn = document.createElement('button');
        btn.className = 'gemini-canvas-toggle-btn';
        btn.innerText = 'Preview';
        btn.type = 'button'; // Prevent form submission if inside form
        container.appendChild(btn);

        // Event Listener - Toggle
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            toggleMode(container, editor, preview, btn, copyBtn);
        });

        // Event Listener - Copy
        copyBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            const text = getEditorText(editor);
            navigator.clipboard.writeText(text).then(() => {
                const originalText = copyBtn.innerText;
                copyBtn.innerText = 'Copied!';
                setTimeout(() => {
                    copyBtn.innerText = originalText;
                }, 2000);
            }).catch(err => {
                console.error('Gemini Canvas Toggle: Failed to copy text: ', err);
            });
        });
    }

    function toggleMode(container, editor, preview, btn, copyBtn) {
        const isPreviewHidden = (getComputedStyle(preview).display === 'none');

        if (isPreviewHidden) {
            // Switch to PREVIEW
            const text = getEditorText(editor);
            const html = renderMarkdown(text);
            preview.innerHTML = html;
            preview.style.display = 'block';
            copyBtn.style.display = 'block';

            // Optional: Hide editor or ensure preview covers it.
            // Preview is absolute positioned with z-index.
            // If we need to interact with preview (e.g. select text), it must be on top.

            btn.innerText = 'Raw';
        } else {
            // Switch to RAW
            preview.style.display = 'none';
            copyBtn.style.display = 'none';
            btn.innerText = 'Preview';
        }
    }

    function getEditorText(editor) {
        if (editor.tagName === 'TEXTAREA' || editor.tagName === 'INPUT') {
            return editor.value;
        } else {
            // For contenteditable
            if (turndownService) {
                // Use Turndown to convert HTML to Markdown
                return turndownService.turndown(editor.innerHTML);
            }
            return editor.innerText;
        }
    }

    function renderMarkdown(text) {
        if (typeof marked === 'undefined' || typeof DOMPurify === 'undefined') {
            console.error("Gemini Canvas Toggle: marked or DOMPurify not loaded");
            return "Error: Libraries not loaded.";
        }

        try {
            // marked.parse might be synchronous
            const rawHtml = marked.parse(text);
            const cleanHtml = DOMPurify.sanitize(rawHtml);
            return cleanHtml;
        } catch (e) {
            console.error("Gemini Canvas Toggle: Error rendering markdown", e);
            return "<p>Error rendering markdown.</p>";
        }
    }

    // Start
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
