const topbarLinkContainers = document.getElementsByClassName("grading-topbar__links");

function openTweaksDialog() {

}

function updateTopbars() {
    for(const topbar of topbarLinkContainers) {
        if (topbar.querySelector(".cmt-tweaks-settings-button") == null) {
            const btn = document.createElement("button");
            btn.classList.add("grading-topbar__filter-link", "link--button", "feather-icon", "cmt-tweaks-settings-button");
            btn.textContent = "Tweaks";
            const icon = document.createElement("i");
            icon.setAttribute("data-feather", "settings");
            btn.insertBefore(icon, btn.firstChild);
            btn.addEventListener("click", openTweaksDialog);
            topbar.insertBefore(btn, topbar.firstChild);
            unsafeWindow.feather.replace();
        }
    }
}

function addTweaksButton() {
    if (topbarLinkContainers.length > 0) {
        updateTopbars();
        return;
    }
    new MutationObserver(function(mutations, observer) {
        if (topbarLinkContainers.length > 0) {
            updateTopbars();
            observer.disconnect();
        }
    }).observe(document.body, {childList: true, subtree: true});
}

addTweaksButton();
window.addEventListener("urlchange", addTweaksButton);