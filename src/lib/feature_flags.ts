
export const featureFlags = [
    "Pacing timer",
    "Hide questions not being graded"
] as const;

type FeatureFlag = typeof featureFlags[number];

type FeatureFlagHandler = (isEnabled: boolean) => void;

const featureFlagHandlers: Map<string, FeatureFlagHandler[]> = new Map();

export function isFeatureEnabled(name: FeatureFlag) {
    if (!featureFlags.includes(name)) {
        throw new Error("Unexpected feature flag name: " + name);
    }
    const val = window.localStorage.getItem("CMT-FEATURE:" + name);
    return val == null || val === "true";
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
    featureFlagHandlers.get(name).push(handler);
    handler(isFeatureEnabled(name));
}
