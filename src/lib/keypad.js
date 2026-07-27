
import { registerAddressableKeybind, registerGlobalKeybind } from "./keybinds";

/**
 * The score keypad in the grading sidebar. Only rendered when the evaluation
 * can be scored by hand; the `--is-visible` modifier just expands it, so the
 * keys are clickable whether or not the user has opened it.
 */
const KEYPAD_SELECTOR = '.grading-e-sidebar-keypad';
/** A single key. The keys are 1-9, `.`, 0 and backspace, in that order. */
const KEYPAD_KEY_SELECTOR = '.grading-e-sidebar-keypad__key';
/** The backspace key, which is an icon and so has no text to key off. */
const KEYPAD_BACKSPACE_SELECTOR = '.feather-delete';
/** The current score. Reads "–" when the evaluation has no score yet. */
const SCORE_SELECTOR = '.grading-e-sidebar-header__score';

/** Most digits a score can have; bounds the backspace loop. */
const MAX_SCORE_LENGTH = 8;

/**
 * @returns {{ keys: Map<string, HTMLButtonElement>, backspace: HTMLButtonElement | null } | null}
 */
function getKeypad() {
    const keypad = document.querySelector(KEYPAD_SELECTOR);
    if (keypad == null) {
        return null;
    }

    /** @type {Map<string, HTMLButtonElement>} */
    const keys = new Map();
    let backspace = null;

    for (const key of keypad.querySelectorAll(KEYPAD_KEY_SELECTOR)) {
        const text = key.textContent.trim();
        if (text) {
            keys.set(text, key);
        } else if (key.querySelector(KEYPAD_BACKSPACE_SELECTOR)) {
            backspace = key;
        }
    }

    return { keys, backspace };
}

function getCurrentGrade() {
    const currentGradeElement = document.querySelector(SCORE_SELECTOR);
    if (currentGradeElement == null) {
        throw new Error("can't find current grade");
    }
    // Scores can be fractional, and an unscored evaluation reads as an en dash
    const currentGrade = parseFloat(currentGradeElement.textContent.trim());
    if (isNaN(currentGrade)) {
        return 0;
    }
    return currentGrade;
}

function getCurrentGradeLength() {
    const currentGradeElement = document.querySelector(SCORE_SELECTOR);
    return currentGradeElement == null
        ? MAX_SCORE_LENGTH
        : Math.min(currentGradeElement.textContent.trim().length, MAX_SCORE_LENGTH);
}

function inputGrade(newGrade) {
    if (newGrade < 0) {
        console.error("refusing to enter negative grade");
        return;
    }
    const keypad = getKeypad();
    if (keypad == null) {
        console.error("Can't find grading keypad");
        return;
    }
    if (keypad.backspace == null) {
        console.error("Can't find keypad backspace key");
        return;
    }

    // Trim float noise from incrementing a fractional score
    const digits = (Math.round(newGrade * 100) / 100).toString();

    // The keypad has no clear key, so delete the previous grade a key at a time
    for (let i = getCurrentGradeLength(); i > 0; i--) {
        keypad.backspace.click();
    }

    for (const digit of digits) {
        const btn = keypad.keys.get(digit);
        if (btn == null) {
            console.warn("Cannot find grading keypad button for", digit);
        } else {
            btn.click();
        }
    }
}

function incrementGrade(increment) {
    inputGrade(getCurrentGrade() + increment);
}

export function installHotkeyGradingHandler() {
    let lastIncrement = 0;

    registerAddressableKeybind('Add points to grade', 'a', 'cmt-waiting-for-digit', (incStr) => {
        const increment = parseInt(incStr, 10);
        if (isNaN(increment)) {
            return;
        }
        lastIncrement = increment;
        incrementGrade(increment);
    });

    registerGlobalKeybind('Decrement grade by 1 point', 'd', () => {
        incrementGrade(-1);
    });
}
