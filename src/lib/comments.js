import { getCurrentMouseX, getCurrentMouseY, simulateMouseDragTo } from "./mouse";
import { extendedAddressValueCallback, registerAddressableKeybind } from './keybinds';

// Wrap the comment library in a div and make the <ul> full height. This
// effectively disables the list virtualization and forces every comment element
// to be loaded. We need all comments in memory in order to trigger them by
// keybind.
(function () {
    const SELECTOR = 'ul.grading-toolbar__submenu.grading-toolbar__submenu--library';
    const WRAPPER_CLASS = 'cmt-comment-virtualization-workaround';

    function wrapTarget(ul) {
      if (!ul || ul.parentElement?.classList.contains(WRAPPER_CLASS)) return;
      const wrapper = document.createElement('div');
      wrapper.className = WRAPPER_CLASS;
      ul.replaceWith(wrapper);
      wrapper.appendChild(ul);
    }

    const existing = document.querySelector(SELECTOR);
    if (existing) {
      wrapTarget(existing);
    }

    let observer;
    observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (!(node instanceof HTMLElement)) continue;

          const target = node.matches(SELECTOR)
            ? node
            : node.querySelector(SELECTOR);

          if (target) {
            wrapTarget(target);
          }
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
})();


function getCommentMap() {
    /** @type {Map<string, HTMLElement>} */
    const commentMap = new Map();

    // Only apply comments when they could be dragged to that spot
    const librarySidebar = document.querySelector("ul.grading-toolbar__submenu--library");
    if (librarySidebar) {
         const commentElements = Array.from(librarySidebar.querySelectorAll("li.tool__lib-comment:not(.lib-comment--no-comment)"));

        // Scan all comments, see if any of them have $\phantom{<key>}$ at the start
        for (let i = 0; i < commentElements.length; i++) {
            const candidate = commentElements[i];
            const phantomMeta = candidate.querySelector("span:nth-child(1 of .MathJax) mphantom");
            if (phantomMeta != null) {
                const key = phantomMeta.textContent.trim();
                if (!commentMap.has(key)) {
                    commentMap.set(key, candidate);
                }
            }
            if (i < 10) {
                const digitKey = ((i + 1) % 10).toString();
                commentMap.set(digitKey, candidate);
            }
        }
    }

    return commentMap;
}

function applyComment(commentElement) {
    console.log("Auto-apply comment", commentElement);
    simulateMouseDragTo(commentElement, getCurrentMouseX(), getCurrentMouseY());
}

registerAddressableKeybind('w', 'cmt-waiting-for-comment-idx', extendedAddressValueCallback(getCommentMap, applyComment), () => {
    const el = document.elementFromPoint(getCurrentMouseX(), getCurrentMouseY());
    return el?.closest('.grading-canvas__image-capture-container') !== null;
});