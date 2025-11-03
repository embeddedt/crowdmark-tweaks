
import { registerAddressableKeybind, registerGlobalKeybind } from "./keybinds";

function getKeypadButtons() {
    const keypadContainer = document.querySelector(".evaluation__keypad");
    const buttons = Array.from(keypadContainer.children).filter(el => el.tagName === 'BUTTON');
    /** @type {Map<string, HTMLButtonElement>} */
    const buttonMap = new Map();

    buttons.forEach(btn => {
        const text = btn.textContent.trim();
        if (text) {
            buttonMap.set(text, btn);
        }
    });
    return buttonMap;
}

function getCurrentGrade() {
    const currentGradeElement = document.querySelector(".evaluation__points");
    if (currentGradeElement == null) {
        throw new Error("can't find current grade");
    }
    let currentGrade = parseInt(currentGradeElement.textContent.trim(), 10);
    if (isNaN(currentGrade)) {
        currentGrade = 0;
    }
    return currentGrade;
}

function inputGrade(newGrade) {
    if (newGrade < 0) {
        console.error("refusing to enter negative grade");
        return;
    }
    const keypadButtons = getKeypadButtons();
    const clearButton = keypadButtons.get("CLR");
    if (clearButton == null) {
        console.error("Can't find clear button");
        return;
    }

    const digits = [];
    while (newGrade > 0) {
        digits.unshift(newGrade % 10);
        newGrade = Math.floor(newGrade / 10);
    }

    // remove previous grade
    clearButton.click();

    for (let digit of digits) {
        const btn = keypadButtons.get(digit.toString());
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

    registerAddressableKeybind('a', 'cmt-waiting-for-digit', (incStr) => {
        const increment = parseInt(incStr, 10);
        if (isNaN(increment)) {
            return;
        }
        lastIncrement = increment;
        incrementGrade(increment);
    });

    registerGlobalKeybind('d', () => {
        incrementGrade(-1);
    });
}