

document.body.classList.add("cm-tweaks-fast-grading-switch-enabled");

const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
        if (mutation.type === "attributes" && mutation.attributeName === "class") {
            const el = mutation.target;
            if (
                el.matches("article.grading-canvas__item.grading-canvas__page") &&
                el.classList.contains("is-active")
            ) {
                // Dispatch a fake resize event to kick off the dynamic image
                // loading, otherwise the evaluation may not be visible
                console.log("trigger image load");
                try {
                    window.dispatchEvent(new Event('resize'));
                } catch (e) {
                    // ignore errors
                }
            }
        }
    }
});

// Attach this mutation observer to any grading canvas pages

function observeExistingAndFuture() {
    document.querySelectorAll("article.grading-canvas__item.grading-canvas__page")
        .forEach(el => observer.observe(el, { attributes: true }));

    const domObserver = new MutationObserver(mutations => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (!(node instanceof HTMLElement)) continue;
                if (node.matches("article.grading-canvas__item.grading-canvas__page")) {
                    observer.observe(node, { attributes: true });
                }
            }
        }
    });

    domObserver.observe(document.body, { childList: true, subtree: true });
}

observeExistingAndFuture();