

const gradingUrlRegex = /^https:\/\/app\.crowdmark\.com\/exams\/([^/]+)\/grading\/student\/(\d+)\/question\/([^/]+)/;

export function isOnGradingPage() {
    return window.location.href.match(gradingUrlRegex) != null;
}

export function getCurrentExamName() {
    return window.location.href.match(gradingUrlRegex)?.[1];
}

export function getCurrentQuestionSlug() {
    return window.location.href.match(gradingUrlRegex)?.[3];
}

export function getCurrentBookletNumber() {
    const matchResult = window.location.href.match(gradingUrlRegex);

    if (!matchResult) {
        return null;
    }

    return parseInt(matchResult[2]);
}

(function() {
    let lastUrl = null;
    new MutationObserver(() => {
        if (location.href !== lastUrl) {
            window.dispatchEvent(new CustomEvent("urlchange", {
                detail: {
                    oldUrl: lastUrl,
                    url: location.href
                }
            }))
            lastUrl = location.href;
        }
    }).observe(document, {subtree: true, childList: true})
})();