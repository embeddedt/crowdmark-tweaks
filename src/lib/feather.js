
let warnedFeather = false;

export function replaceFeatherIcons() {
    if (typeof unsafeWindow.feather != 'undefined') {
        unsafeWindow.feather.replace();
    } else if (!warnedFeather) {
        warnedFeather = true;
        console.warn("Cannot use feather icons as script is running in content context");
    }
}