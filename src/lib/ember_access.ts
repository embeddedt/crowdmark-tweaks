
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
    const el = document.querySelector('[id^="ember"]');
    if (el == null) return null;
    const view = ember.ViewUtils.getElementView(el);
    if (view == null) return null;
    const { getOwner } = (unsafeWindow as any).requireModule('@ember/owner');
    ownerInstance = getOwner(view);
    return ownerInstance;
}