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


function applyComment(num) {
    // Only apply comments when they could be dragged to that spot
    const el = document.elementFromPoint(mouseX, mouseY);
    const isOver = el?.closest('.grading-canvas__image-capture-container') !== null;
    if (!isOver) {
        console.warn("Mouse is not over exam paper");
        return;
    }
    const librarySidebar = document.querySelector("ul.grading-toolbar__submenu--library");
    if (!librarySidebar) {
        return;
    }
    const commentElements = librarySidebar.querySelectorAll("li.tool__lib-comment");
    if ((num - 1) >= commentElements.length) {
        console.warn("Requested comment index is out of range");
        return;
    }
    const commentElement = commentElements[num - 1];
    console.log("Auto-apply comment", commentElement);
    simulateMouseDragTo(commentElement, mouseX, mouseY);
}

document.addEventListener('keydown', (event) => {
    if (!event.ctrlKey) return;

    if (event.repeat) return;

    let num = null;
    if (event.code.startsWith('Digit')) {
        num = parseInt(event.code.slice(5), 10); // 0..9
        event.preventDefault();
    } else if (event.code.startsWith('Numpad')) {
        num = parseInt(event.code.slice(6), 10); // 0..9
        event.preventDefault();
    }

    if (num != null && num >= 1 && num <= 9) {
        applyComment(num);
    }
}, { passive: false });