
let mouseX = 0, mouseY = 0;
document.addEventListener('mousemove', e => {
    mouseX = e.clientX;
    mouseY = e.clientY;
});

function fire(type: string, x: number, y: number, target: Element | null = document.elementFromPoint(x, y)) {
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

function fireDrag(type: string, dataTransfer: DataTransfer, x: number, y: number, target: Element) {
    const event = new DragEvent(type, {
        bubbles: true,
        cancelable: true,
        composed: true,
        clientX: x,
        clientY: y,
        dataTransfer,
    });
    target.dispatchEvent(event);
}

export function simulateDragAndDrop(draggableEl: Element, endX: number, endY: number) {
    const dataTransfer = new DataTransfer();
    const startRect = draggableEl.getBoundingClientRect();
    const startX = startRect.left + startRect.width / 2;
    const startY = startRect.top + startRect.height / 2;

    fireDrag('dragstart', dataTransfer, startX, startY, draggableEl);

    const dropTarget = document.elementFromPoint(endX, endY);
    if (!dropTarget) {
        console.warn("can't find an element to drop onto");
        fireDrag('dragend', dataTransfer, endX, endY, draggableEl);
        return false;
    }

    fireDrag('dragenter', dataTransfer, endX, endY, dropTarget);
    fireDrag('dragover', dataTransfer, endX, endY, dropTarget);
    fireDrag('drop', dataTransfer, endX, endY, dropTarget);
    fireDrag('dragend', dataTransfer, endX, endY, draggableEl);
    return true;
}

export function simulateClick(element: Element) {
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

export async function waitForElementUnderMouse(elementPredicate: (el: Element) => boolean, curX = getCurrentMouseX(), curY = getCurrentMouseY()) {
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