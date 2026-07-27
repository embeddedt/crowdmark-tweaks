
let activeAddressableKeybinds: Set<string | null> = new Set();


function areOtherKeybindsActive(selfChar: string | null) {
    let sz = activeAddressableKeybinds.size;
    if (activeAddressableKeybinds.has(selfChar)) {
        sz--;
    }
    return sz > 0;
}

function isRelevantKeydownEvent(e: KeyboardEvent) {
    const target = e.target as HTMLElement;
    if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
    ) {
        return false;
    }

    return true;
}

export function isValidKeybindKey(key: string) {
    key = key.toLowerCase();
    return key.length === 1 || key === "tab";
}

const keybindDefaultCharsMap = new Map<string, string>();

export function getCharForKeybind(name: string): string | null {
    let char = window.localStorage.getItem("CMT-KEYBIND:" + name);
    if (char == null) {
        char = keybindDefaultCharsMap.get(name) ?? null;
    }
    if (char == "null") {
        char = null;
    }
    return char;
}

export function setCharForKeybind(name: string, char: string) {
    window.localStorage.setItem("CMT-KEYBIND:" + name, char);
}

export function getRegisteredKeybindIds() {
    return Array.from(keybindDefaultCharsMap.keys());
}

/**
 * @param char default character
 */
export function registerGlobalKeybind(name: string, defaultChar: string, pressCallback: () => void, enabledPredicate: () => boolean = () => true) {
    keybindDefaultCharsMap.set(name, defaultChar);
    document.addEventListener('keydown', (e) => {
        const char = getCharForKeybind(name);
        if (!isRelevantKeydownEvent(e) || e.repeat || areOtherKeybindsActive(char) || !enabledPredicate()) {
            return;
        }

        if (isValidKeybindKey(e.key) && e.key.toLowerCase() === char) {
            e.stopImmediatePropagation();
            e.preventDefault();
            setTimeout(() => pressCallback(), 0);
        }
    });
}

function getUniqueByPrefix<T>(map: Map<string, T>, prefix: string): { status: 'conflict' } | { status: 'unique', value: T } | { status: 'none' } {
  let result: T | null = null;
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
 * @param mapGetter returns the map of possible values
 * @param finalCallback the callback to invoke once a value is discovered
 */
export function extendedAddressValueCallback<T>(mapGetter: () => Map<string, T>, finalCallback: (v: T) => void): (v: string) => boolean {
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
 * @param char default character
 * @param valueCallback invoked when a new character is appended to the
 * addressed value. If true is returned will continue appending more
 * characters.
 */
export function registerAddressableKeybind(
    name: string,
    defaultChar: string,
    stateClass: string,
    valueCallback: (n: string) => boolean,
    enabledPredicate?: () => boolean,
    searchProgressCallback?: (key: string | null) => void
) {
    const onSearchProgress = searchProgressCallback ?? (() => {});

    keybindDefaultCharsMap.set(name, defaultChar);

    const rootEl = document.documentElement;

    let valueBuffer = "";

    function stopWaiting() {
        rootEl.classList.remove(stateClass);
        activeAddressableKeybinds.delete(getCharForKeybind(name));
        valueBuffer = "";
        onSearchProgress(null);
    }

    document.addEventListener('keydown', (e) => {
        const char = getCharForKeybind(name);
        if (!isRelevantKeydownEvent(e) || areOtherKeybindsActive(char) || (enabledPredicate && !enabledPredicate())) {
            return;
        }

        const waitingForDigit = rootEl.classList.contains(stateClass);
        const key = e.key.toLowerCase();

        if (!waitingForDigit) {
            if (key === char) {
                rootEl.classList.add(stateClass);
                activeAddressableKeybinds.add(char);
                onSearchProgress("");
            }
        } else {
            if (
                isValidKeybindKey(key) && // single character
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
                } else {
                    onSearchProgress(valueBuffer);
                }
            } else if (key === "escape") {
                stopWaiting();
            }
        }
    });
}