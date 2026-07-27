import { registerGlobalKeybind } from "./keybinds";

import { getCurrentBookletNumber, isOnGradingPage } from "./navigation";
import { isFeatureEnabled } from "./feature_flags";

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

/** The toolbar at the top of the grading sidebar; the timer goes at its end. */
const SIDEBAR_TOP_SELECTOR = "section.grading-e-sidebar-top";

export function installGradingTimer() {
    if (!isFeatureEnabled("Pacing timer")) {
        return;
    }

    /** @type {HTMLDivElement} */
    let currentTimer;

    let currentSecondsValue = 0;

    let currentPageIsGrading = isOnGradingPage();

    function injectIfPresent() {
        const sidebarTop = document.querySelector(SIDEBAR_TOP_SELECTOR);
        if (!sidebarTop || sidebarTop.querySelector(".cmt-grading-timer")) {
            return;
        }
        const evalTimer = document.createElement("div");
        evalTimer.classList.add("cmt-grading-timer");
        sidebarTop.appendChild(evalTimer);
        currentTimer = evalTimer;
        renderCurrentValue();
    }
    injectIfPresent();

    // Keep watching: switching booklets tears the sidebar down and rebuilds it,
    // which takes the timer with it and leaves currentTimer detached.
    new MutationObserver(() => injectIfPresent())
        .observe(document.body, { childList: true, subtree: true });

    function renderCurrentValue() {
        currentTimer.textContent = formatTime(currentSecondsValue);
        if (currentSecondsValue < getSecondsPerBooklet()) {
            currentTimer.classList.remove("cmt-grading-timer-lagging");
        } else {
            currentTimer.classList.add("cmt-grading-timer-lagging");
        }
    }

    function setCurrentValue(n) {
        currentSecondsValue = n;
        renderCurrentValue();
    }

    let highestSeenBooklet = getCurrentBookletNumber() ?? -1;

    window.addEventListener("urlchange", () => {
        const previousWasGrading = currentPageIsGrading;
        currentPageIsGrading = isOnGradingPage();
        const bookletNumber = getCurrentBookletNumber();
        if (bookletNumber == null || highestSeenBooklet >= bookletNumber) {
            return;
        }
        highestSeenBooklet = bookletNumber;
        if (previousWasGrading) {
            setCurrentValue(currentSecondsValue - getSecondsPerBooklet());
        }
        kick();
    });

    function tick() {
        if (currentTimer == null || !currentPageIsGrading) {
            return;
        }
        setCurrentValue(currentSecondsValue + 1);
    }

    registerGlobalKeybind('Reset grading timer', '\\', () => {
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