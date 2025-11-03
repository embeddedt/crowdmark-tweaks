
export const featureFlags = [
    "Pacing timer"
];

export function isFeatureEnabled(name) {
    if (!featureFlags.includes(name)) {
        throw new Error("Unexpected feature flag name: " + name);
    }
    const val = window.localStorage.getItem("CMT-FEATURE:" + name);
    return val == null || val === "true";
}

export function setFeatureEnabled(name, val) {
    window.localStorage.setItem("CMT-FEATURE:" + name, val ? "true" : "false");
}
