
import type Ember from 'ember';

type GlobalEmber = typeof Ember;

let emberInstance: GlobalEmber;
let ownerInstance: any;

export function getEmber(): GlobalEmber {
    if (emberInstance == null) {
        if (typeof (unsafeWindow as any).requireModule == 'function') {
            emberInstance = (unsafeWindow as any).requireModule('ember').default;
        } else {
            console.warn("Running in degraded mode, window.requireModule is not accessible by userscript");
        }
    }
    return emberInstance;
}

export function getOwner(): any {
    if (ownerInstance != null) return ownerInstance;
    const ember = getEmber();
    if (ember == null) return null;
    const { getOwner } = (unsafeWindow as any).requireModule('@ember/owner');
    // Not everything carrying an ember id is a view — the basic-dropdown
    // placeholders have one and resolve to null — so try each rendered view
    // rather than betting on the first element in the document
    for (const el of Array.from(document.querySelectorAll('.ember-view'))) {
        const view = ember.ViewUtils.getElementView(el);
        if (view == null) continue;
        const owner = getOwner(view);
        if (owner != null) {
            ownerInstance = owner;
            return ownerInstance;
        }
    }
    return null;
}