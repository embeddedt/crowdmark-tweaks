
/** @type {Set<string>} */
let activeAddressableKeybinds = new Set();


function areOtherKeybindsActive(selfChar) {
    let sz = activeAddressableKeybinds.size;
    if (activeAddressableKeybinds.has(selfChar)) {
        sz--;
    }
    return sz > 0;
}

/**
 *
 * @param {KeyboardEvent} e
 */
function isRelevantKeydownEvent(e) {
    const target = e.target;
    if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
    ) {
        return false;
    }

    return true;
}

/**
 *
 * @param {string} char
 * @param {() => void} pressCallback
 */
export function registerGlobalKeybind(char, pressCallback) {
    document.addEventListener('keydown', (e) => {
        if (!isRelevantKeydownEvent(e) || e.repeat || areOtherKeybindsActive(char)) {
            return;
        }

        if (e.key.toLowerCase() === char) {
            e.stopImmediatePropagation();
            e.preventDefault();
            setTimeout(() => pressCallback(), 0);
        }
    });
}

/**
 *
 * @param {string} char
 * @param {(n: string) => void} callback
 */
export function registerAddressableKeybind(char, stateClass, valueCallback) {
    const rootEl = document.documentElement;

    document.addEventListener('keydown', (e) => {
        if (!isRelevantKeydownEvent(e) || areOtherKeybindsActive(char)) {
            return;
        }

        const waitingForDigit = rootEl.classList.contains(stateClass);
        const key = e.key.toLowerCase();

        if (!waitingForDigit) {
            if (key === char) {
                rootEl.classList.add(stateClass);
                activeAddressableKeybinds.add(char);
            }
        } else {
            if (
                key.length === 1 && // single character
                !e.ctrlKey && !e.altKey && !e.metaKey && !e.shiftKey // no modifiers
            ) {
                rootEl.classList.remove(stateClass);
                activeAddressableKeybinds.delete(char);
                e.stopImmediatePropagation();
                e.preventDefault();
                setTimeout(() => valueCallback(key), 0);
            } else if (key === char) {
                rootEl.classList.remove(stateClass);
                activeAddressableKeybinds.delete(char);
            }
        }
    });
}