
let mouseX = 0, mouseY = 0;
document.addEventListener('mousemove', e => {
    mouseX = e.clientX;
    mouseY = e.clientY;
});

function fire(type, x, y, target = document.elementFromPoint(x, y)) {
    if (!target) {
        console.warn("can't find target to fire " + type + " event to");
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

export function simulateMouseDragTo(draggableEl, endX, endY) {
    const startRect = draggableEl.getBoundingClientRect();
    const startX = startRect.left + startRect.width / 2;
    const startY = startRect.top + startRect.height / 2;

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

/**
 * @param {HTMLElement} element
 */
export function simulateClick(element) {
    const rect = element.getBoundingClientRect();
    const x = rect.x + rect.width / 2;
    const y = rect.y + rect.height / 2;
    fire('mousedown', x, y, element);
    fire('mouseup', x, y, element);
    fire('click', x, y, element);
}

export function getCurrentMouseX() {
    return mouseX;
}

export function getCurrentMouseY() {
    return mouseY;
}

/**
 *
 * @param {(el: HTMLElement) => boolean} elementPredicate
 * @param {number} curX
 * @param {number} curY
 * @returns
 */
export async function waitForElementUnderMouse(elementPredicate, curX = getCurrentMouseX(), curY = getCurrentMouseY()) {
    let tries = 0;
    while (true) {
        const el = document.elementsFromPoint(curX, curY).find(elementPredicate);
        if (el) {
            return el;
        }
        tries++;
        if (tries >= 100) {
            throw new Error("Could not find element");
        }
        await new Promise(r => setTimeout(r, 50));
    }
}