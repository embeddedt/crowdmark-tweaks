
import { getEmber } from './ember_access';

const ember = getEmber();

const prefetchedImageHolder = document.createElement("div");
prefetchedImageHolder.classList.add("cm-tweaks-prefetched-image-holder");
document.body.appendChild(prefetchedImageHolder);

function prefetchImages(urls: string[]) {
    for (const url of urls) {
        console.log("prefetching", url);
        const img = new Image();
        img.src = url;
        prefetchedImageHolder.appendChild(img);
    }
}

async function prefetchNextBooklet() {
    const gradingCanvas = document.querySelector(".grading-canvas__container");
    const firstPageOfCurrentQ = gradingCanvas.querySelector("article.grading-canvas__item.is-active");
    if (firstPageOfCurrentQ == null) {
        return;
    }
    console.log(firstPageOfCurrentQ);
    const emberView = ember.ViewUtils.getElementView(firstPageOfCurrentQ);
    const examMasterQuestionId: number = (emberView as any).streamItem.question.examMasterQuestion.id;
    const examQuestionId: number = (emberView as any).streamItem.question.id;

    const res = await fetch(`https://app.crowdmark.com/api/v2/exam-master-questions/${examMasterQuestionId}/exam-questions/next?include=exam.exam-pages`, {
        method: 'PUT',
        body: new URLSearchParams({
            "exam_question_id": examQuestionId.toString()
        })
    });
    const nextBookletPayload = await res.json();
    prefetchImages(nextBookletPayload.included.filter(o => o.type === "exam-pages").map(o => o.attributes.url));
}

/*
function waitAndPrefetchNextBooklet() {
    setTimeout(() => {
        prefetchNextBooklet();
    }, 2000);
}

window.addEventListener("urlchange", e => {
    waitAndPrefetchNextBooklet();
});

waitAndPrefetchNextBooklet();
*/
