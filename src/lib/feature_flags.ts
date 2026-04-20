
export const featureFlags = {
    "Pacing timer": true,
    "Hide questions not being graded": true,
    "Booklet prefetch": false,
} as const;

type FeatureFlag = keyof typeof featureFlags;

type FeatureFlagHandler = (isEnabled: boolean) => void;

const featureFlagHandlers: Map<string, FeatureFlagHandler[]> = new Map();

export function isFeatureEnabled(name: FeatureFlag) {
    const val = window.localStorage.getItem("CMT-FEATURE:" + name);
    return val == null ? featureFlags[name] : val === "true";
}

export function setFeatureEnabled(name: FeatureFlag, val: any) {
    window.localStorage.setItem("CMT-FEATURE:" + name, val ? "true" : "false");
    const handlers = featureFlagHandlers.get(name);
    if (typeof handlers !== 'undefined') {
        const isEnabled = isFeatureEnabled(name);
        for (const handler of handlers) {
            handler(isEnabled);
        }
    }
}

export function registerFeatureFlagHandler(name: FeatureFlag, handler: FeatureFlagHandler) {
    if (!featureFlagHandlers.has(name)) {
        featureFlagHandlers.set(name, []);
    }
    featureFlagHandlers.get(name)!!.push(handler);
    handler(isFeatureEnabled(name));
}
