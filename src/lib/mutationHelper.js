
/**
 * @param {HTMLElement} rootElement
 * @param {(element: HTMLElement) => boolean} nodePredicate
 * @returns {Promise<HTMLElement>}
 */
export async function waitForElementToExist(rootElement, nodePredicate) {
    return new Promise(resolve => {
        const observer = new MutationObserver(mutations => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (!(node instanceof HTMLElement)) continue;
                    if (nodePredicate(node)) {
                        observer.disconnect();
                        resolve(node);
                        return;
                    }
                }
            }
        });
        observer.observe(rootElement, { childList: true, subtree: true });
    });
}