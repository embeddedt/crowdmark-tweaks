import { getCurrentMouseX, getCurrentMouseY, simulateClick, simulateDragAndDrop, waitForElementUnderMouse } from "./mouse";
import { registerAddressableKeybind, registerGlobalKeybind } from './keybinds';
import { CommentTrie } from './comment_trie';

/** The comment library list in the grading sidebar. */
const COMMENT_LIST_SELECTOR = 'ol.grading-e-sidebar__list';
/**
 * A single library comment. The loading skeleton uses <div>s with the same
 * class and the "Add a comment"/inline editor rows have no comment container,
 * so requiring both the <li> and the button excludes all of them.
 */
const LIBRARY_COMMENT_SELECTOR = 'li.grading-e-sidebar-category__list-item:has(> button.grading-e-sidebar-category__comment-container)';
/** The draggable element within a library comment. */
const LIBRARY_COMMENT_DRAG_SELECTOR = 'button.grading-e-sidebar-category__comment-container';
/** The text of a library comment. */
const LIBRARY_COMMENT_TEXT_SELECTOR = '.grading-e-sidebar-comment__content';
/** A comment placed on the canvas. */
const PLACED_COMMENT_SELECTOR = 'aside.grading-e-comment';
/** The clickable body within a placed comment. */
const PLACED_COMMENT_CONTENT_SELECTOR = '.grading-e-comment__content';
/**
 * The pin of a placed comment. Crowdmark gives it an id derived from the
 * comment itself, which is the only handle on a comment that survives the
 * element being replaced by a rerender.
 */
const PLACED_COMMENT_PIN_SELECTOR = '.grading-e-comment-pin';
/** The area of a booklet page that accepts annotations. */
const ANNOTATION_CAPTURE_SELECTOR = '.annotation-capture';

let commentListWrapper: HTMLDivElement | null = null;
let searchVisualizer: HTMLSpanElement | null = null;

// Wrap the comment library in a div and make the list full height. The new
// grading interface no longer virtualizes this list, so the wrapper only exists
// to host the search visualizer and the "waiting for a comment macro" outline.
(function () {
    const SELECTOR = COMMENT_LIST_SELECTOR;
    const WRAPPER_CLASS = 'cmt-comment-list-wrapper';

    function wrapTarget(list: Element | null) {
      if (!list || list.parentElement?.classList.contains(WRAPPER_CLASS)) return;
      const wrapper = document.createElement('div');
      wrapper.className = WRAPPER_CLASS;
      list.replaceWith(wrapper);
      wrapper.appendChild(list);

      searchVisualizer = document.createElement("span");
      searchVisualizer.classList.add("cm-tweaks-search-visual");
      wrapper.appendChild(searchVisualizer);

      commentListWrapper = wrapper;
      applyCommentElementObserver(list as HTMLOListElement);
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

async function applyComment(commentElement: Element, mouseX = getCurrentMouseX(), mouseY = getCurrentMouseY()) {
    console.log("Auto-apply comment", commentElement);
    const dragHandle = commentElement.querySelector<HTMLElement>(LIBRARY_COMMENT_DRAG_SELECTOR);
    if (dragHandle == null) {
        console.warn("comment has no drag handle", commentElement);
        return null;
    }
    simulateDragAndDrop(dragHandle, mouseX, mouseY);
    const undoList = commentKeybindUndoStack[commentKeybindUndoStack.length - 1];
    const element = await waitForElementUnderMouse(e => {
        return e.matches(PLACED_COMMENT_SELECTOR);
    }, mouseX + 10, mouseY + 10);
    const commentId = getPlacedCommentId(element);
    if (commentId == null) {
        console.warn("placed comment cannot be identified, so it will not be undoable", element);
    } else {
        undoList.push(commentId);
    }
    return element;
}

async function applyCommentGroup(groupList: string[]) {
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

function applyCommentElementObserver(list: HTMLOListElement) {
    function checkForMacro(li: HTMLLIElement, commentNum: number) {
        if (li.classList.contains("cm-tweaks-macro-comment")) {
            return;
        }
        let macros: string[] = [];

        // Determine if the LaTeX embeds a macro
        const matchResult = li.textContent.match(commentMacroRegex);
        if (matchResult) {
            macros.push(matchResult[1]);
        }

        // The first ten comments are bound to their position in the list
        if (commentNum <= 10) {
            const commentKey = commentNum == 10 ? "0" : commentNum.toString();
            if (!macros.includes(commentKey)) {
                macros.push(commentKey);
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
        for (const el of Array.from(list.querySelectorAll(".cm-tweaks-comment-macro-indicator"))) {
            el.parentNode?.removeChild(el);
        }
        commentTrie.clear();
        let commentNum = 0;
        for (const el of list.querySelectorAll(LIBRARY_COMMENT_SELECTOR)) {
            commentNum++;
            checkForMacro(el as HTMLLIElement, commentNum);
        }
        const config = getConfigurationCommentBlob();

        if (typeof config.groups !== 'undefined') {
            for (let [groupKey, groupList] of Object.entries<string[]>(config.groups)) {
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
                // Comments are nested inside a category, so a rerender may add
                // either a single comment or a whole category at once.
                if (!node.matches(LIBRARY_COMMENT_SELECTOR) && node.querySelector(LIBRARY_COMMENT_SELECTOR) == null) continue;
                needListRebuild = true;
                break;
            }
        }
        if (needListRebuild) {
            rebuildMacroList();
        }
    });

    observer.observe(list, { childList: true, subtree: true });
}

/** Comments are undone by id: the elements themselves do not survive rerenders. */
let commentKeybindUndoStack: string[][] = [];

function getPlacedCommentId(placedComment: Element) {
    return placedComment.querySelector(PLACED_COMMENT_PIN_SELECTOR)?.id || null;
}

function findPlacedComment(commentId: string) {
    return document.getElementById(commentId)?.closest(PLACED_COMMENT_SELECTOR) ?? null;
}

window.addEventListener('urlchange', () => {
    commentKeybindUndoStack = [];
});

const CMT_CONFIG_HEADER = "cmt_config:";

/**
 * Uses a Crowdmark comment to hold persistent configuration for the userscript.
 * Kudos to @motiwalam for the idea.
 */
export function getConfigurationCommentBlob() {
    const librarySidebar = document.querySelector(COMMENT_LIST_SELECTOR);
    if (librarySidebar) {
        const commentElements = Array.from(librarySidebar.querySelectorAll(LIBRARY_COMMENT_SELECTOR));
        for (let element of commentElements) {
            const text = element.querySelector(LIBRARY_COMMENT_TEXT_SELECTOR)?.textContent.trim() ?? "";
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
        const comment = el.closest(PLACED_COMMENT_SELECTOR);
        if (comment != null) {
            return comment;
        }
    }
    return null;
}

async function waitForElement<T extends Element>(description: string, find: () => T | null | undefined): Promise<T> {
    for (let tries = 0; tries < 100; tries++) {
        const el = find();
        if (el) {
            return el;
        }
        await new Promise(r => setTimeout(r, 50));
    }
    throw new Error("Could not find " + description);
}

function findFlyoutMenuItem(label: string) {
    // The flyout menu is rendered into a wormhole outside of the comment
    return Array.from(document.querySelectorAll<HTMLElement>(".flyout-menu__content button"))
        .find(button => button.textContent.trim() == label);
}

async function deleteComment(placedComment: Element) {
    const theComment = placedComment.querySelector(PLACED_COMMENT_CONTENT_SELECTOR);
    if (theComment == null) {
        console.warn("comment has no visible body to open", placedComment);
        return;
    }
    // Clicking a comment opens its editor, which hides deletion behind a menu
    simulateClick(theComment);
    const menuTrigger = await waitForElement("comment options menu", () =>
        theComment.querySelector<HTMLElement>('.grading-e-comment__actions-container [title="More options"]'));
    simulateClick(menuTrigger);
    const deleteBtn = await waitForElement("comment delete button", () => findFlyoutMenuItem("Delete comment"));
    deleteBtn.click();
}

registerAddressableKeybind('Enter comment macro mode', 'w', 'cmt-waiting-for-comment-idx', commentTrie.createKeybindHandler(commentData => {
    // Push a new list to the stack
    commentKeybindUndoStack.push([]);
    commentData.applyHandler();
}), () => {
    const el = document.elementFromPoint(getCurrentMouseX(), getCurrentMouseY());
    return el?.closest(ANNOTATION_CAPTURE_SELECTOR) != null;
}, (searchKey) => {
    if (!searchKey) {
        searchVisualizer!.textContent = "";
        document.documentElement.classList.remove("cm-tweaks-comment-search");
    } else {
        if (searchVisualizer!.textContent!.trim() == "") {
            for (const el of Array.from(document.querySelectorAll(".cm-tweaks-search-matches"))) {
                el.classList.remove("cm-tweaks-search-matches");
            }
        }
        searchVisualizer!.textContent = searchKey;
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

registerGlobalKeybind('Delete comment under cursor', 'x', () => {
    const theComment = getHoveredCommentElement();
    if (theComment == null) {
        return;
    }
    deleteComment(theComment);
}, () => getHoveredCommentElement() != null);

registerGlobalKeybind('Undo last comment placement', 'u', async() => {
    const undoList = commentKeybindUndoStack.pop() ?? [];
    for (const commentId of undoList) {
        // Resolved one at a time: deleting a comment rerenders the others
        const comment = findPlacedComment(commentId);
        if (comment == null) {
            console.warn("comment to undo is no longer on the page", commentId);
            continue;
        }
        await deleteComment(comment);
    }
}, () => commentKeybindUndoStack.length > 0);