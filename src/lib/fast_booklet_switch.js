import { registerFeatureFlagHandler } from "./feature_flags";
import { registerGlobalKeybind } from "./keybinds";
import { simulateClick } from "./mouse";

/**
 * A question in the canvas. The booklet's other questions stay in the list as
 * siblings — switching questions updates classes in place rather than
 * rebuilding the canvas.
 */
const GRADABLE_ITEM_SELECTOR = "li.grading-e-gradable-item";
/** Marks the question currently being graded. */
const ACTIVE_ITEM_CLASS = "grading-e-gradable-item--is-active";

function triggerDynamicImageLoad() {
    // Dispatch a fake resize event to kick off the dynamic image
    // loading, otherwise the evaluation may not be visible
    console.log("trigger image load");
    try {
        window.dispatchEvent(new Event('resize'));
    } catch (e) {
        // ignore errors
    }
}

registerFeatureFlagHandler("Hide questions not being graded", isEnabled => {
    const clsName = "cm-tweaks-fast-grading-switch-enabled";
    if (isEnabled) {
        document.body.classList.add(clsName);
    } else {
        document.body.classList.remove(clsName);
    }
    triggerDynamicImageLoad();
})

const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
        if (mutation.type === "attributes" && mutation.attributeName === "class") {
            const el = mutation.target;
            if (
                el.matches(GRADABLE_ITEM_SELECTOR) &&
                el.classList.contains(ACTIVE_ITEM_CLASS)
            ) {
                triggerDynamicImageLoad();
            }
        }
    }
});

// Attach this mutation observer to any grading canvas questions

function observeExistingAndFuture() {
    document.querySelectorAll(GRADABLE_ITEM_SELECTOR)
        .forEach(el => observer.observe(el, { attributes: true }));

    const domObserver = new MutationObserver(mutations => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (!(node instanceof HTMLElement)) continue;
                if (node.matches(GRADABLE_ITEM_SELECTOR)) {
                    observer.observe(node, { attributes: true });
                }
            }
        }
    });

    domObserver.observe(document.body, { childList: true, subtree: true });
}

observeExistingAndFuture();

// Crowdmark's own shortcut for this is shift+Enter; plain Enter is what
// everyone has in their fingers from the old interface
registerGlobalKeybind("Switch to next ungraded booklet", "enter", () => {
    const nextUngradedButton = document.querySelector(".grading-e-topbar__next-ungraded-button");
    if (nextUngradedButton == null) {
        console.warn("Cannot find next ungraded booklet button");
        return;
    }
    simulateClick(nextUngradedButton);
});