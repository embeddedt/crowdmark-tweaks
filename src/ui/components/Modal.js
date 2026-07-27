import { render } from "preact";
export function ModalCloseButton() {
    return <button className="modal__close cmt-modal-close" aria-label="Close" onClick={() => {
        const modal = document.getElementById("cmt-settings-dialog")
        render(null, modal)
        modal.parentElement.removeChild(modal)
    }}>
        ×
    </button>;
}
