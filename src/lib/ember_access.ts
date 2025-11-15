
import type Ember from 'ember';

type GlobalEmber = typeof Ember;

let emberInstance: GlobalEmber;

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