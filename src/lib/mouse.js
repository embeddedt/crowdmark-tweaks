
let mouseX = 0, mouseY = 0;
document.addEventListener('mousemove', e => {
    mouseX = e.clientX;
    mouseY = e.clientY;
});

export function simulateMouseDragTo(draggableEl, endX, endY) {
    const startRect = draggableEl.getBoundingClientRect();
    const startX = startRect.left + startRect.width / 2;
    const startY = startRect.top + startRect.height / 2;

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

export function getCurrentMouseX() {
    return mouseX;
}

export function getCurrentMouseY() {
    return mouseY;
}