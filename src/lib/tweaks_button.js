import { render } from "preact";
import { ModalCloseButton } from "../ui/components/Modal";
import { useEffect, useMemo, useState } from "preact/hooks";
import { getCharForKeybind, getRegisteredKeybindIds, setCharForKeybind, isValidKeybindKey } from "./keybinds";
import { isFeatureEnabled, featureFlags, setFeatureEnabled } from "./feature_flags";
import { Slider } from "../ui/components/Slider";
/** The icon button list at the right of the grading topbar. */
const TOPBAR_BUTTONS_SELECTOR = "ul.grading-e-topbar__buttons-nav";

function Keybind({ name, onClick, isRemapping }) {
    return <li>
        <span className="cmt-list-item-name">{name}</span>
        <span className={`keybind-char code code--line ${isRemapping ? "remapping" : ""}`} onClick={onClick}>{getCharForKeybind(name) ?? 'NONE'}</span>
    </li>;
}

function KeybindsDialog() {
    const keybindIds = useMemo(() => getRegisteredKeybindIds(), []);
    const [remapping, setRemapping] = useState(null);
    useEffect(() => {
        const cb = e => {
            if (remapping != null) {
                const finishRemapping = (k) => {
                    setCharForKeybind(remapping, k);
                    e.stopImmediatePropagation();
                    e.preventDefault();
                    setRemapping(null);
                };
                const key = e.key.toLowerCase();
                if (key === "escape") {
                    setRemapping(null);
                    return;
                } else if (key === "backspace") {
                    finishRemapping(null);
                } else if (
                    isValidKeybindKey(key) &&
                    !e.ctrlKey && !e.altKey && !e.metaKey && !e.shiftKey // no modifiers
                ) {
                    finishRemapping(key);
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
        {Object.keys(featureFlags).map(flag => <FeatureFlag key={flag} name={flag}/>)}
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
    for (const buttonsNav of document.querySelectorAll(TOPBAR_BUTTONS_SELECTOR)) {
        if (buttonsNav.querySelector(".cmt-tweaks-settings-button") != null) {
            continue;
        }
        const btn = document.createElement("button");
        btn.type = "button";
        btn.classList.add("grading-e-topbar__button", "cmt-tweaks-settings-button");
        // Crowdmark's own topbar buttons are icon-only with an Ember tooltip;
        // a plain text label reads better and needs no tooltip of its own
        btn.textContent = "Tweaks";
        btn.addEventListener("click", openTweaksDialog);

        const item = document.createElement("li");
        item.appendChild(btn);
        buttonsNav.appendChild(item);
    }
}

updateTopbars();

// The topbar is rebuilt on navigation, so keep watching rather than
// disconnecting after the first injection
new MutationObserver(() => updateTopbars())
    .observe(document.body, { childList: true, subtree: true });