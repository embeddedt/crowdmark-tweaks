import { getCurrentMouseX, getCurrentMouseY, simulateClick, simulateMouseDragTo, waitForElementUnderMouse } from "./mouse";
import { extendedAddressValueCallback, registerAddressableKeybind, registerGlobalKeybind } from './keybinds';
import { waitForElementToExist } from "./mutationHelper";

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

/** @type {HTMLElement[][]} */
let commentKeybindUndoStack = [];

window.addEventListener('urlchange', () => {
    commentKeybindUndoStack = [];
});

function getCommentMap() {
    /** @type {Map<string, () => void>} */
    const commentMap = new Map();

    /** @type {Map<string, HTMLElement>} */
    const commentElementMap = new Map();

    async function applyComment(commentElement, mouseX = getCurrentMouseX(), mouseY = getCurrentMouseY()) {
        console.log("Auto-apply comment", commentElement);
        simulateMouseDragTo(commentElement, mouseX, mouseY);
        const undoList = commentKeybindUndoStack[commentKeybindUndoStack.length - 1];
        const element = await waitForElementUnderMouse(e => {
            return e.classList.contains("comment__preview-container");
        }, mouseX + 10, mouseY + 10);
        undoList.push(element);
        return element;
    }

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
                    commentElementMap.set(key, candidate);
                    commentMap.set(key, () => applyComment(candidate));
                }
            }
            if (i < 10) {
                const digitKey = ((i + 1) % 10).toString();
                commentElementMap.set(digitKey, candidate);
                commentMap.set(digitKey, () => applyComment(candidate));
            }
        }
    }

    async function applyCommentGroup(groupList) {
        console.log("Apply group ", groupList);
        let currentX = getCurrentMouseX(), currentY = getCurrentMouseY();
        for (const key of groupList) {
            const elem = commentElementMap.get(key);
            if (elem == null) {
                console.warn("missing comment", key);
                continue;
            }
            const elemOnScreen = await applyComment(elem, currentX, currentY);
            if (elemOnScreen == null) {
                console.warn("can't find applied comment");
                currentY += 30;
            } else {
                const rect = elemOnScreen.getBoundingClientRect();
                currentY += rect.height + 5;
            }
        }
    }

    const config = getConfigurationCommentBlob();

    if (typeof config.groups !== 'undefined') {
        for (let [groupKey, groupList] of Object.entries(config.groups)) {
            commentMap.set(groupKey, () => applyCommentGroup(groupList));
        }
    }

    return commentMap;
}

const CMT_CONFIG_HEADER = "cmt_config:";

/**
 * Uses a Crowdmark comment to hold persistent configuration for the userscript.
 * Kudos to @motiwalam for the idea.
 */
export function getConfigurationCommentBlob() {
    const librarySidebar = document.querySelector("ul.grading-toolbar__submenu--library");
    if (librarySidebar) {
        const commentElements = Array.from(librarySidebar.querySelectorAll("li.tool__lib-comment:not(.lib-comment--no-comment)"));
        for (let element of commentElements) {
            const text = element.querySelector(".lib-comment__text")?.textContent.trim() ?? "";
            if (text.startsWith(CMT_CONFIG_HEADER)) {
                try {
                    return JSON.parse(text.substring(CMT_CONFIG_HEADER.length));
                } catch (e) {
                    console.error("Invalid CMT config found", e);
                }
            }
        }
    }
    return {};
}

/**
 *
 * @returns {HTMLDivElement}
 */
function getHoveredCommentElement() {
    const elements = document.elementsFromPoint(getCurrentMouseX(), getCurrentMouseY());
    for (const el of elements) {
        const comment = el.closest("div.comment__preview");
        if (comment != null) {
            return comment;
        }
    }
    return null;
}

async function deleteComment(theComment) {
    simulateClick(theComment);
    const deleteBtn = await waitForElementToExist(theComment.parentElement, e => e.tagName == 'BUTTON' && e.textContent.trim() == 'Delete' && e.closest(".comment__footer") != null);
    deleteBtn.click();
}

registerAddressableKeybind('w', 'cmt-waiting-for-comment-idx', extendedAddressValueCallback(getCommentMap, commentApplyFn => {
    // Push a new list to the stack
    commentKeybindUndoStack.push([]);
    commentApplyFn();
}), () => {
    const el = document.elementFromPoint(getCurrentMouseX(), getCurrentMouseY());
    return el?.closest('.grading-canvas__image-capture-container') !== null;
});

registerGlobalKeybind('x', () => {
    const theComment = getHoveredCommentElement();
    if (theComment == null) {
        return;
    }
    deleteComment(theComment);
}, () => getHoveredCommentElement() != null);

registerGlobalKeybind('u', async() => {
    const undoList = commentKeybindUndoStack.pop();
    for (const comment of undoList) {
        await deleteComment(comment);
    }
}, () => commentKeybindUndoStack.length > 0);