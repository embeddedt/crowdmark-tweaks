import { FeatherIcon } from "./FeatherIcon";
import { render } from "preact";
export function ModalCloseButton() {
    return <button className="modal__close" onClick={() => {
        const modal = document.getElementById("cmt-settings-dialog")
        render(null, modal)
        modal.parentElement.removeChild(modal)
    }}>
        <FeatherIcon name="x"/>
    </button>;
}