// src/content.js

(function() {
    'use strict';

    console.log("Gemini Canvas Toggle: Loaded");

    const SELECTORS = {
        editor: 'textarea, [contenteditable="true"]',
        processed: 'gemini-canvas-processed'
    };

    const MIN_MARKDOWN_RATIO = 0.5; // Threshold for falling back to innerText if Turndown conversion fails significantly

    let turndownService;
    let canvasObserver;

    function init() {
        if (typeof TurndownService !== 'undefined') {
            // Configure Turndown to be more faithful to GFM
            turndownService = new TurndownService({
                headingStyle: 'atx',
                codeBlockStyle: 'fenced',
                bulletListMarker: '-',
                strongDelimiter: '**',
                emDelimiter: '*',
                allowRawMarkdown: true
            });
            
            // Apply GFM plugin if available
            if (typeof turndownPluginGfm !== 'undefined' && turndownPluginGfm.gfm) {
                turndownService.use(turndownPluginGfm.gfm);
            }

            // STRATEGY: Do not escape markdown characters if opt-in flag is set. 
            // We want the RAW characters as they are in the source.
            const originalEscape = turndownService.escape;
            turndownService.escape = function(string) {
                if (this.options.allowRawMarkdown) return string;
                return originalEscape.call(this, string);
            };
        }

        canvasObserver = new MutationObserver(() => detectCanvas());
        canvasObserver.observe(document.body, { childList: true, subtree: true });
        detectCanvas();

        // Cleanup to prevent memory leaks
        const cleanup = () => {
            if (canvasObserver) {
                canvasObserver.disconnect();
                canvasObserver = null;
            }
        };
        window.addEventListener('beforeunload', cleanup);
        window.addEventListener('pagehide', cleanup);
    }

    function detectCanvas() {
        const editors = document.querySelectorAll(SELECTORS.editor);
        editors.forEach(editor => {
            if (editor.hasAttribute('data-gemini-canvas-processed')) return;
            const rect = editor.getBoundingClientRect();
            if (rect.width < 300 || rect.height < 150) return;

            let container = editor.parentElement;
            container.querySelectorAll('.gemini-canvas-preview, .gemini-canvas-copy-btn, .gemini-canvas-toggle-btn, .gemini-canvas-raw-source').forEach(el => el.remove());

            editor.setAttribute('data-gemini-canvas-processed', 'true');
            container.classList.add(SELECTORS.processed);
            container.style.position = 'relative';

            injectUI(container, editor);
        });
    }

    function injectUI(container, editor) {
        const preview = document.createElement('div');
        preview.className = 'gemini-canvas-preview markdown-body';
        preview.style.display = 'none';
        container.appendChild(preview);

        const rawSource = document.createElement('div');
        rawSource.className = 'gemini-canvas-raw-source';
        rawSource.style.display = 'none';
        container.appendChild(rawSource);

        const copyBtn = document.createElement('button');
        copyBtn.className = 'gemini-canvas-copy-btn';
        copyBtn.innerText = 'Copy MD';
        copyBtn.style.display = 'none';
        container.appendChild(copyBtn);

        const btn = document.createElement('button');
        btn.className = 'gemini-canvas-toggle-btn';
        btn.innerText = 'Show RAW';
        container.appendChild(btn);

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleMode(container, editor, preview, rawSource, btn, copyBtn);
        });

        copyBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const text = rawSource.textContent ?? getEditorText(container.querySelector(SELECTORS.editor) || editor);
            navigator.clipboard.writeText(text).then(() => {
                const oldText = copyBtn.innerText;
                copyBtn.innerText = 'Copied!';
                setTimeout(() => copyBtn.innerText = oldText, 2000);
            });
        });
    }

    function toggleMode(container, editor, preview, rawSource, btn, copyBtn) {
        const currentEditors = Array.from(container.querySelectorAll(SELECTORS.editor)).filter(el => !el.classList.contains('gemini-canvas-raw-source'));
        const targetEditors = currentEditors.length > 0 ? currentEditors : [editor];
        
        const isPreviewVisible = (preview.style.display === 'block');
        const isRawVisible = (rawSource.style.display === 'block');
        
        if (!isPreviewVisible && !isRawVisible) {
            // EDITOR -> RAW
            const text = getEditorText(targetEditors[0]);
            rawSource.textContent = text; // Use textContent for raw strings
            rawSource.style.display = 'block';
            preview.style.display = 'none';
            copyBtn.style.display = 'block';
            targetEditors.forEach(el => el.classList.add('gemini-canvas-editor-hidden'));
            btn.innerText = 'Show Preview';
        } else if (isRawVisible) {
            // RAW -> PREVIEW
            const text = rawSource.textContent;
            preview.innerHTML = renderMarkdown(text);
            preview.style.display = 'block';
            rawSource.style.display = 'none';
            btn.innerText = 'Show Editor';
        } else {
            // PREVIEW -> EDITOR
            preview.style.display = 'none';
            rawSource.style.display = 'none';
            copyBtn.style.display = 'none';
            targetEditors.forEach(el => {
                el.classList.remove('gemini-canvas-editor-hidden');
                el.style.display = '';
            });
            btn.innerText = 'Show RAW';
        }
    }

    function getEditorText(editor) {
        if (editor.tagName === 'TEXTAREA' || editor.tagName === 'INPUT') return editor.value;
        
        if (turndownService) {
            // STRATEGY: Gemini's ProseMirror often hides the actual markdown symbols.
            // Turndown is much better at reconstructing them from the HTML structure.
            
            // Convert to Markdown
            let markdown = turndownService.turndown(editor.innerHTML);
            
            // If the conversion result is too short but innerText is long, 
            // something went wrong with Turndown, fallback to innerText.
            const rawText = editor.innerText || "";
            if (markdown.length < rawText.length * MIN_MARKDOWN_RATIO) {
                return rawText;
            }
            
            return markdown;
        }
        return editor.innerText || "";
    }

    function renderMarkdown(text) {
        if (typeof marked === 'undefined' || typeof DOMPurify === 'undefined') return "Error: Libraries not loaded.";
        try {
            return DOMPurify.sanitize(marked.parse(text));
        } catch (e) {
            return "<p>Error rendering markdown.</p>";
        }
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
