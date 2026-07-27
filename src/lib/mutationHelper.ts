
export async function waitForElementToExist(rootElement: Node, nodePredicate: (element: HTMLElement) => boolean): Promise<HTMLElement> {
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