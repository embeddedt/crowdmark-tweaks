import { getCurrentMouseX, getCurrentMouseY, simulateClick, simulateMouseDragTo, waitForElementUnderMouse } from "./mouse";
import { registerAddressableKeybind, registerGlobalKeybind } from './keybinds';
import { waitForElementToExist } from "./mutationHelper";
import { CommentTrie } from './comment_trie';

let commentListWrapper: HTMLDivElement = null;
let searchVisualizer: HTMLSpanElement = null;

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

      searchVisualizer = document.createElement("span");
      searchVisualizer.classList.add("cm-tweaks-search-visual");
      wrapper.appendChild(searchVisualizer);

      commentListWrapper = wrapper;
      applyCommentElementObserver(ul);
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

const commentMacroRegex = /\\phantom\{([a-zA-Z0-9]+)\}/;

const commentTrie: CommentTrie<{
    rawElement?: HTMLLIElement,
    applyHandler: () => void
}> = new CommentTrie();

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

async function applyCommentGroup(groupList) {
    console.log("Apply group ", groupList);
    let currentX = getCurrentMouseX(), currentY = getCurrentMouseY();
    for (const key of groupList) {
        const elem = commentTrie.get(key);
        if (elem?.rawElement == null) {
            console.warn("missing comment", key);
            continue;
        }
        const elemOnScreen = await applyComment(elem.rawElement, currentX, currentY);
        if (elemOnScreen == null) {
            console.warn("can't find applied comment");
            currentY += 30;
        } else {
            const rect = elemOnScreen.getBoundingClientRect();
            currentY += rect.height + 5;
        }
    }
}

function applyCommentElementObserver(ul: HTMLUListElement) {
    function checkForMacro(li: HTMLLIElement) {
        if (li.classList.contains("cm-tweaks-macro-comment")) {
            return;
        }
        let numComments = 0;
        let macros: string[] = [];

        // Determine if the LaTeX embeds a macro
        const matchResult = li.textContent.match(commentMacroRegex);
        if (matchResult) {
            macros.push(matchResult[1]);
        }

        // Determine the position of this child
        for (const child of ul.children) {
            if (child.tagName === "LI" && child.classList.contains("tool__lib-comment")) {
                numComments++;
            }
            if (numComments > 10) {
                break
            }
            if (numComments >= 1 && child === li) {
                const commentNum = numComments.toString();
                if (!macros.includes(commentNum)) {
                    macros.push(commentNum);
                }
                break;
            }
        }

        if (macros.length > 0) {
            const macroContainer = document.createElement("div")
            macroContainer.classList.add("cm-tweaks-comment-macro-indicator-container");
            li.insertBefore(macroContainer, li.firstChild);
            for (const macro of macros) {
                const macroIndicator = document.createElement("span");
                macroIndicator.textContent = macro;
                macroIndicator.classList.add("cm-tweaks-comment-macro-indicator");
                macroContainer.appendChild(macroIndicator);
                commentTrie.insertChild(macro, {
                    rawElement: li,
                    applyHandler: () => applyComment(li)
                });
            }
        }

    }

    function rebuildMacroList() {
        for (const el of Array.from(ul.querySelectorAll(".cm-tweaks-comment-macro-indicator"))) {
            el.parentNode.removeChild(el);
        }
        commentTrie.clear();
        for (const el of ul.querySelectorAll("li.tool__lib-comment:not(.lib-comment--loading)")) {
            if (el.tagName === "LI") {
                checkForMacro(el as HTMLLIElement);
            }
        }
        const config = getConfigurationCommentBlob();

        if (typeof config.groups !== 'undefined') {
            for (let [groupKey, groupList] of Object.entries(config.groups)) {
                commentTrie.insertChild(groupKey, {
                    applyHandler: () => applyCommentGroup(groupList)
                });
            }
        }

    }

    rebuildMacroList();

    const observer = new MutationObserver(mutations => {
        let needListRebuild = false;
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (!(node instanceof HTMLElement)) continue;
                if (node.tagName !== "LI" || !node.classList.contains("tool__lib-comment")) continue;
                needListRebuild = true;
                break;
            }
        }
        if (needListRebuild) {
            rebuildMacroList();
        }
    });

    observer.observe(ul, { childList: true });
}

/** @type {HTMLElement[][]} */
let commentKeybindUndoStack = [];

window.addEventListener('urlchange', () => {
    commentKeybindUndoStack = [];
});

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

registerAddressableKeybind('w', 'cmt-waiting-for-comment-idx', commentTrie.createKeybindHandler(commentData => {
    // Push a new list to the stack
    commentKeybindUndoStack.push([]);
    commentData.applyHandler();
}), () => {
    const el = document.elementFromPoint(getCurrentMouseX(), getCurrentMouseY());
    return el?.closest('.grading-canvas__image-capture-container') !== null;
}, (searchKey) => {
    if (!searchKey) {
        searchVisualizer.textContent = "";
        document.documentElement.classList.remove("cm-tweaks-comment-search");
    } else {
        if (searchVisualizer.textContent.trim() == "") {
            for (const el of Array.from(document.querySelectorAll(".cm-tweaks-search-matches"))) {
                el.classList.remove("cm-tweaks-search-matches");
            }
        }
        searchVisualizer.textContent = searchKey;
        document.documentElement.classList.add("cm-tweaks-comment-search");
        commentTrie.visit((prefix, data) => {
            const el = data.rawElement;
            if (!el) {
                return;
            }
            if (prefix.startsWith(searchKey)) {
                el.classList.add("cm-tweaks-search-matches");
            }
        })
    }
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