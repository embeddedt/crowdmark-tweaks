import { registerGlobalKeybind } from "./keybinds";

import { getCurrentBookletNumber } from "./navigation";

function formatTime(seconds) {
    const sign = seconds < 0 ? "-" : "";
    seconds = Math.abs(seconds);
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${sign}${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function getSecondsPerBooklet() {
    return window.localStorage.getItem("cmtSecondsPerBooklet") ?? 50;
}

export function installGradingTimer() {
    let observer;

    /** @type {HTMLDivElement} */
    let currentTimer;

    let currentSecondsValue = 0;

    function injectIfPresent() {
        const evalList = document.querySelector(".grading-sidebar__container > .evaluation__list");
        if (!evalList || evalList.parentElement.querySelector(".cmt-grading-timer")) {
            return;
        }
        const evalTimer = document.createElement("div");
        evalTimer.classList.add("cmt-grading-timer");
        evalTimer.textContent = "00:00";
        evalList.parentElement.appendChild(evalTimer);
        currentTimer = evalTimer;
        if (observer) observer.disconnect();
    }
    injectIfPresent();

    observer = new MutationObserver(() => injectIfPresent());
    observer.observe(document.body, { childList: true, subtree: true });

    function setCurrentValue(n) {
        currentSecondsValue = n;
        currentTimer.textContent = formatTime(n);
        if (n < getSecondsPerBooklet()) {
            currentTimer.classList.remove("cmt-grading-timer-lagging");
        } else {
            currentTimer.classList.add("cmt-grading-timer-lagging");
        }
    }

    let highestSeenBooklet = getCurrentBookletNumber() ?? -1;

    window.addEventListener("urlchange", () => {
        const bookletNumber = getCurrentBookletNumber();
        if (bookletNumber == null || highestSeenBooklet >= bookletNumber) {
            return;
        }
        highestSeenBooklet = bookletNumber;
        setCurrentValue(currentSecondsValue - getSecondsPerBooklet());
        kick();
    });

    function tick() {
        if (currentTimer == null) {
            return;
        }
        setCurrentValue(currentSecondsValue + 1);
    }

    registerGlobalKeybind('\\', () => {
        setCurrentValue(0);
        kick();
    });

    let currentInterval;

    function kick() {
        if (currentInterval != null) {
            stop();
            start();
        }
    }

    function stop() {
        if (currentInterval != null) {
            clearInterval(currentInterval);
            currentInterval = null;
        }
    }

    function start() {
        if (currentInterval == null) {
            currentInterval = setInterval(tick, 1000);
        }
    }

    if (!document.hidden) {
        start();
    }

    document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
            stop();
        } else {
            start();
        }
    });
}