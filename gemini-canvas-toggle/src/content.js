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
            // Check if this specific editor is already processed
            if (editor.hasAttribute('data-gemini-canvas-processed')) {
                return;
            }

            const rect = editor.getBoundingClientRect();
            // Heuristic: Canvas editor should be reasonably large
            if (rect.width < 300 || rect.height < 150) {
                return;
            }

            // Identify a suitable container to inject our UI
            let container = editor.parentElement;
            
            // CLEANUP: If there's already our UI in this container, remove it first.
            // This handles cases where Gemini replaces the editor element.
            const existingUI = container.querySelectorAll('.gemini-canvas-preview, .gemini-canvas-copy-btn, .gemini-canvas-toggle-btn');
            if (existingUI.length > 0) {
                existingUI.forEach(el => el.remove());
            }

            // Mark as processed
            editor.setAttribute('data-gemini-canvas-processed', 'true');

            // Ensure container has correct positioning
            container.classList.add(SELECTORS.processed);
            if (getComputedStyle(container).position === 'static') {
                container.classList.add('gemini-canvas-container-relative');
            }

            injectUI(container, editor);
        });
    }

    function injectUI(container, editor) {
        console.log("Gemini Canvas Toggle: Injecting UI", container);

        // Create Preview Container
        const preview = document.createElement('div');
        preview.className = 'gemini-canvas-preview markdown-body';
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
        btn.innerText = 'Show Preview'; // Updated label
        btn.type = 'button';
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
            
            // Save current inline styles before hiding with scoped names
            editor.dataset.gctOrigVisibility = editor.style.visibility;
            editor.dataset.gctOrigOpacity = editor.style.opacity;
            editor.dataset.gctOrigPointerEvents = editor.style.pointerEvents;

            // Hide the original editor to ensure it doesn't peek through or interfere
            editor.style.visibility = 'hidden';
            editor.style.opacity = '0';
            editor.style.pointerEvents = 'none';

            btn.innerText = 'Show Raw';
        } else {
            // Switch to RAW
            preview.style.display = 'none';
            copyBtn.style.display = 'none';
            
            // Restore the original editor styles from dataset using scoped names
            editor.style.visibility = editor.dataset.gctOrigVisibility || '';
            editor.style.opacity = editor.dataset.gctOrigOpacity || '';
            editor.style.pointerEvents = editor.dataset.gctOrigPointerEvents || '';

            // Clear saved values to avoid leaks
            delete editor.dataset.gctOrigVisibility;
            delete editor.dataset.gctOrigOpacity;
            delete editor.dataset.gctOrigPointerEvents;
            
            btn.innerText = 'Show Preview';
        }
    }

    function getEditorText(editor) {
        if (editor.tagName === 'TEXTAREA' || editor.tagName === 'INPUT') {
            return editor.value;
        } else {
            // For contenteditable, try to get the rawest text possible.
            // Some editors might have a hidden textarea or a specific way to get markdown.
            // For now, if it's already markdown in the contenteditable, innerText is safer.
            // Turndown is only if we are dealing with rich text that we want to convert.
            
            // HEURISTIC: If the text already looks like markdown (e.g. starts with # or has **),
            // Turndown might over-process it.
            const innerText = editor.innerText;
            // Nitpick fix: Be stricter about markers, requiring following whitespace for block markers
            const looksLikeMarkdown = /^\s*(?:#+\s|>\s|[*+-]\s|\[.*\]\(.*\)|\*\*|__)/m.test(innerText);
            
            if (looksLikeMarkdown) {
                return innerText;
            }
            
            if (turndownService) {
                return turndownService.turndown(editor.innerHTML);
            }
            return innerText;
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
