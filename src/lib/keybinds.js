
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
 * @param {Map<string, T>} map
 * @param {string} prefix
 * @template T
 */
function getUniqueByPrefix(map, prefix) {
  let result = null;
  let count = 0;

  for (const [key, element] of map) {
    if (key.startsWith(prefix)) {
      count++;
      if (count > 1) return { status: 'conflict' }; // more than one match
      result = element;
    }
  }

  if (result != null) {
    return {status:'unique',value:result};
  }
  return {status:'none'}; // either the single match or null
}

/**
 * @param {() => Map<string, T>} mapGetter returns the map of possible values
 * @param {(v: T) => void} finalCallback the callback to invoke once a value
 * is discovered
 * @return {(v: string) => boolean}
 * @template T
 */
export function extendedAddressValueCallback(mapGetter, finalCallback) {
    return (val) => {
        const searchResult = getUniqueByPrefix(mapGetter(), val);

        if (searchResult.status == 'none') {
            console.warn("no matching value found");
            return false;
        } else if (searchResult.status == 'conflict') {
            return true;
        }

        finalCallback(searchResult.value);

        return false;
    };
}

/**
 *
 * @param {string} char
 * @param {(n: string) => boolean} callback invoked when a new character is
 * appended to the addressed value. If true is returned will continue appending
 * more characters.
 * @param {undefined|() => boolean} enabledPredicate
 */
export function registerAddressableKeybind(char, stateClass, valueCallback, enabledPredicate) {
    const rootEl = document.documentElement;

    let valueBuffer = "";

    function stopWaiting() {
        rootEl.classList.remove(stateClass);
        activeAddressableKeybinds.delete(char);
        valueBuffer = "";
    }

    document.addEventListener('keydown', (e) => {
        if (!isRelevantKeydownEvent(e) || areOtherKeybindsActive(char) || (enabledPredicate && !enabledPredicate())) {
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
                valueBuffer += key;
                e.stopImmediatePropagation();
                e.preventDefault();
                let result = false;
                try {
                    result = valueCallback(valueBuffer);
                } catch(e) {
                    console.error("Error from keybind handler", e);
                }
                if (!result) {
                    stopWaiting();
                }
            } else if (key === "escape") {
                stopWaiting();
            }
        }
    });
}