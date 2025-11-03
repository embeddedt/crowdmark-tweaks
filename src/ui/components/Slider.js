import { useId } from "preact/hooks";

export function Slider({isEnabled, setEnabled, className}) {
    const id = useId();
    return <>
        <input id={id} className="toggle-switch" role="switch" type="checkbox" checked={isEnabled} onChange={() => setEnabled(!isEnabled)}></input>
        <label for={id} className={`toggle-switch-label small ${className ?? ""}`}></label>
    </>;
}