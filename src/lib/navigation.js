

const gradingUrlRegex = /^https:\/\/app\.crowdmark\.com\/exams\/([^/]+)\/grading\/student\/(\d+)/;

export function isOnGradingPage() {
    return window.location.href.match(gradingUrlRegex) != null;
}

export function getCurrentBookletNumber() {
    const matchResult = window.location.href.match(gradingUrlRegex);

    if (!matchResult) {
        return null;
    }

    return parseInt(matchResult[2]);
}

(function() {
    const pushState = history.pushState;
    const replaceState = history.replaceState;

    let lastUrl = location.href;

    function fireUrlChangeEvent() {
        const event = new CustomEvent("urlchange", { detail: { url: location.href } });
        window.dispatchEvent(event);
    }

    function checkUrl() {
        const url = location.href;
        if (url !== lastUrl) {
        lastUrl = url;
        fireUrlChangeEvent();
        }
    }

    history.pushState = function(...args) {
      pushState.apply(this, args);
      checkUrl();
    };

    history.replaceState = function(...args) {
      replaceState.apply(this, args);
      checkUrl();
    };

    window.addEventListener("popstate", checkUrl);
})();