import customCss from './userscript.scss';
import { installHotkeyGradingHandler } from './lib/keypad';
import { extendedAddressValueCallback, registerAddressableKeybind, registerGlobalKeybind } from './lib/keybinds';

GM_addStyle(customCss);
installHotkeyGradingHandler();

let mouseX = 0, mouseY = 0;
document.addEventListener('mousemove', e => {
    mouseX = e.clientX;
    mouseY = e.clientY;
});

function simulateMouseDragTo(draggableEl, endX, endY) {
    const startRect = draggableEl.getBoundingClientRect();
    const startX = startRect.left + startRect.width / 2;
    const startY = startRect.top + startRect.height / 2;

    function fire(type, x, y, target = document.elementFromPoint(x, y)) {
        if (!target) {
            console.warn("can't find target to fire event to");
            return;
        }
        const event = new MouseEvent(type, {
            bubbles: true,
            cancelable: true,
            clientX: x,
            clientY: y,
            buttons: 1, // left mouse button
        });
        target.dispatchEvent(event);
    }

    // 1. Mouse down on the draggable element
    fire('mousedown', startX, startY, draggableEl);

    // 2. Move in small steps toward the target coordinates
    const steps = 20;
    for (let i = 1; i <= steps; i++) {
        const x = startX + (endX - startX) * (i / steps);
        const y = startY + (endY - startY) * (i / steps);
        fire('mousemove', x, y);
    }

    // 3. Mouse up at final position
    fire('mouseup', endX, endY, document.elementFromPoint(endX, endY));
}

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
    simulateMouseDragTo(commentElement, mouseX, mouseY);
}

registerAddressableKeybind('w', 'cmt-waiting-for-comment-idx', extendedAddressValueCallback(getCommentMap, applyComment), () => {
    const el = document.elementFromPoint(mouseX, mouseY);
    return el?.closest('.grading-canvas__image-capture-container') !== null;
});