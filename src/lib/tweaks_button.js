import { render } from "preact";
import { ModalCloseButton } from "../ui/components/Modal";
import { useEffect, useMemo, useState } from "preact/hooks";
import { getCharForKeybind, getRegisteredKeybindIds, setCharForKeybind } from "./keybinds";
import { isFeatureEnabled, featureFlags, setFeatureEnabled } from "./feature_flags";
import { Slider } from "../ui/components/Slider";
import { replaceFeatherIcons } from "./feather";

const topbarLinkContainers = document.getElementsByClassName("grading-topbar__links");

function Keybind({ name, onClick, isRemapping }) {
    return <li>
        <span className="cmt-list-item-name">{name}</span>
        <span className={`keybind-char code code--line ${isRemapping ? "remapping" : ""}`} onClick={onClick}>{getCharForKeybind(name)}</span>
    </li>;
}

function KeybindsDialog() {
    const keybindIds = useMemo(() => getRegisteredKeybindIds(), []);
    const [remapping, setRemapping] = useState(null);
    useEffect(() => {
        const cb = e => {
            if (remapping != null) {
                const key = e.key.toLowerCase();
                if (key === "escape") {
                    setRemapping(null);
                    return;
                }
                if (
                    key.length === 1 && // single character
                    !e.ctrlKey && !e.altKey && !e.metaKey && !e.shiftKey // no modifiers
                ) {
                    setCharForKeybind(remapping, key);
                    e.stopImmediatePropagation();
                    e.preventDefault();
                    setRemapping(null);
                }
            }
        };
        document.addEventListener("keydown", cb);
        return () => document.removeEventListener("keydown", cb);
    }, [remapping]);
    return <ul className="cmt-settings-component-list">
        {keybindIds.map(id => <Keybind onClick={() => setRemapping(id)} isRemapping={remapping == id} key={id} name={id}/>)}
    </ul>
}

function FeatureFlag({name}) {
    const [isEnabled, setEnabled] = useState(isFeatureEnabled(name));
    return <li>
        <span className="cmt-list-item-name">{name}</span>
        <Slider className="cmt-feature-flag-slider" isEnabled={isEnabled} setEnabled={b => {
            setFeatureEnabled(name, b);
            setEnabled(b);
        }}/>
    </li>
}

function FeaturesDialog() {
    return <ul className="cmt-settings-component-list">
        {featureFlags.map(flag => <FeatureFlag key={flag} name={flag}/>)}
    </ul>
}

const panes = [
    { name: "Keybinds", component: <KeybindsDialog/> },
    { name: "Features", component: <FeaturesDialog/> }
]

function App() {
    const [currentPane, setCurrentPane] = useState(0);
    return <div className="modal-lg" style={{height: 636}}>
        <ModalCloseButton/>
        <div className="cmt-settings-dialog-split-pane">
            <div className="cmt-settings-dialog-tabs">
                {panes.map((pane, i) => <button key={pane.name} className={`link--button ${currentPane == i ? "cmt-active-tab" : ""}`} onClick={() => setCurrentPane(i)}>{pane.name}</button>)}
            </div>
            <div className="cmt-settings-dialog-component">
                {panes[currentPane].component}
            </div>
        </div>
    </div>;
}

function openTweaksDialog() {
    const container = document.createElement("div");
    container.id = "cmt-settings-dialog";
    container.classList.add("cm-modal__backdrop", "visible");
    document.body.appendChild(container);
    render(<App/>, container);
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
            replaceFeatherIcons();
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