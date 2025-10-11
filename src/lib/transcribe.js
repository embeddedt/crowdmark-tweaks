import { getCurrentMouseX, getCurrentMouseY } from "./mouse";
import { registerGlobalKeybind } from "./keybinds";

function getAiAssistElement() {
    let element = document.querySelector("#cmt-ai-assist-popover");
    if (element == null) {
        element = document.createElement("div");
        element.id = "cmt-ai-assist-popover";
        const gradingCanvas = document.querySelector("section.grading-canvas");
        gradingCanvas.appendChild(element);
    }
    return element;
}

/** @type {AbortController} */
let previousAbortController = null;

async function mathStreamReader(element, r) {
    console.log("waiting for streamed data");
    const reader = r.response.getReader();
    const decoder = new TextDecoder();
    element.innerHTML = "";

    let currentParagraph;
    let currentLine = "";
    function startNextLine() {
        currentParagraph = document.createElement("p");
        element.appendChild(currentParagraph);
        currentLine = "";
    }

    startNextLine();

    while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n").filter(Boolean)) {
            try {
                const data = JSON.parse(line);
                if (data.response) {
                    for (const char of data.response) {
                        if (char === "\n") {
                            startNextLine();
                            currentLine = "";
                        } else {
                            currentLine += char;
                            currentParagraph.textContent = currentLine;
                            MathJax.Hub.Queue(["Typeset", MathJax.Hub, currentParagraph]);
                        }
                    }
                }
            } catch (e) {
                console.warn(e);
            }
        }
    }

    console.log("--- Stream complete ---");
}

registerGlobalKeybind(';', async() => {
    const elements = document.elementsFromPoint(getCurrentMouseX(), getCurrentMouseY()).filter(e => e.tagName === 'DIV' && e.classList.contains("grading-canvas__image-capture-container"));
    if (elements.length == 0) {
        console.warn("cannot find image under mouse");
        return;
    }

    const imgElement = elements[0].querySelector("img.cm__lazy-img__img");

    if (previousAbortController != null) {
        previousAbortController.abort();
    }

    previousAbortController = new AbortController();

    console.log("Starting AI transcription");

    const element = getAiAssistElement();
    element.innerHTML = "Processing...";

    GM_xmlhttpRequest({
        method: "POST",
        url: "http://localhost:3000/vision",
        headers: {
            "Content-Type": "application/json"
        },
        data: JSON.stringify({
            imageUrl: imgElement.src
        }),
        responseType: 'stream',
        onerror: function(r) {
            console.error("Error while trying to transcribe", r);
        },
        onloadstart: async function(r) {
            mathStreamReader(element, r);
        }
    })
})