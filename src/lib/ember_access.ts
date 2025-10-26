
import type Ember from 'ember';

type GlobalEmber = typeof Ember;

export function getEmber(): GlobalEmber {
    return (unsafeWindow as any).requireModule('ember').default;
}