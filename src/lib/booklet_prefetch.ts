
import { getOwner } from './ember_access';
import { isFeatureEnabled } from './feature_flags';

const crowdmarkImageUrl = /^https:\/\/([^\/]+)\/assignments\/(\d+)\/([^\/]+)\/([a-f0-9-]+)\?(.*)$/;
const crowdmarkExamApiUrl = /^(https:\/\/app\.crowdmark\.com)?\/api\/v2\/exams\?/;

function parseCrowdmarkImageUrl(url: string): { url: string; cacheKey: string } | null {
    const match = url.match(crowdmarkImageUrl);
    if (!match) return null;
    const [, hostname, assignmentId, type, uuid] = match;
    return { url, cacheKey: `https://${hostname}/assignments/${assignmentId}/${type}/${uuid}` };
}

const cachePromise = caches.open("cmtBookletPrefetchCache");

cachePromise.then(async(cache) => {
    // run cache maintenance
    // Clear any exam API entries left over from a previous session that didn't clean up
    const keys = await cache.keys();
    return Promise.all(keys.map(req => {
        if (crowdmarkExamApiUrl.test(req.url)) {
            return cache.delete(req);
        } else {
            return null;
        }
    }).filter(Boolean)).then(_ => cache);
}).then(cache => {
    const origFetch = unsafeWindow.fetch.bind(unsafeWindow);

    (unsafeWindow as any).fetch = async function(input: RequestInfo | URL, init?: RequestInit) {
        if (isFeatureEnabled("Booklet prefetch") && typeof input === "string" && crowdmarkExamApiUrl.test(input)) {
            const absoluteUrl = input.startsWith("/") ? "https://app.crowdmark.com" + input : input;
            const cached = await cache.match(absoluteUrl);
            if (cached) {
                cache.delete(absoluteUrl);
                return cached;
            } else {
                console.warn("exam cache miss: " + absoluteUrl);
            }
        }
        return origFetch(input, init);
    };

    function prefetchImages(urls: string[]) {
        for (const url of urls) {
            const parsed = parseCrowdmarkImageUrl(url);
            if (!parsed) {
                console.warn("unexpected booklet image: " + url);
                continue;
            }
            const { cacheKey } = parsed;
            cache.match(cacheKey).then(existing => {
                if (!existing) {
                    fetch(url).then(response => {
                        if (!response.ok) {
                            return;
                        }
                        cache.put(cacheKey, response);
                    });
                }
            });
        }
    }

    async function prefetchNextBooklet() {
        if (!isFeatureEnabled("Booklet prefetch")) return;
        const gradingService = getOwner()?.lookup('service:grading');
        if (gradingService == null) {
            console.warn("could not get grading service");
            return;
        }
        const examQuestion = gradingService.examQuestion;
        if (examQuestion == null) {
            console.warn("grading service has no active examQuestion");
            return;
        }
        const examMasterQuestionId: number = examQuestion.belongsTo('examMasterQuestion').id();
        const examQuestionId: number = examQuestion.id;

        const res = await fetch(`https://app.crowdmark.com/api/v2/exam-master-questions/${examMasterQuestionId}/exam-questions/next?include=exam.exam-pages`, {
            method: 'PUT',
            body: new URLSearchParams({
                "exam_question_id": examQuestionId.toString()
            })
        });
        const nextBookletPayload = await res.json();
        prefetchImages(nextBookletPayload.included.filter((o: any) => o.type === "exam-pages").map((o: any) => o.attributes.url));

        // prefetch exams payload as well

        const examObj = nextBookletPayload.included.find((o: any) => o.type === "exams" || o.type === "exam");
        if (!examObj) {
            console.warn("could not find exam object in next booklet payload");
            return;
        }

        const slug = examObj.relationships?.["exam-master"]?.data?.id;
        const sequence = examObj.attributes.sequence;
        if (!slug || sequence == null) {
            console.warn("could not extract slug/sequence from exam object");
            return;
        }

        const examApiUrl = "https://app.crowdmark.com/api/v2/exams?" + new URLSearchParams([
            ["filter[exam-master]", slug],
            ["filter[sequence]", String(sequence)],
            ["include[]", "exam-pages"],
            ["include[]", "exam-pages.exam-master-page"],
            ["include[]", "exam-questions"],
            ["include[]", "exam-questions.anchored-to-exam-page"],
            ["include[]", "evaluations"],
            ["include[]", "evaluations.marker"],
            ["include[]", "annotations"],
            ["include[]", "exam-questions.taggings"],
        ]);

        cache.match(examApiUrl).then(existing => {
            if (!existing) {
                origFetch(examApiUrl).then(r => {
                    if (!r.ok) return;
                    cache.put(examApiUrl, r);
                });
            }
        });
    }

    async function swapImageFromCache(img: HTMLImageElement) {
        if (!isFeatureEnabled("Booklet prefetch")) return;
        const parsed = parseCrowdmarkImageUrl(img.src);
        if (!parsed) return;
        const { cacheKey } = parsed;
        const cached = await cache.match(cacheKey);
        if (!cached) {
            console.warn(`cache miss: ${cacheKey}`);
            return;
        }
        const blob = await cached.blob();
        img.src = URL.createObjectURL(blob);
        // Evict from cache once used, to keep cache size reasonable
        cache.delete(cacheKey);
    }

    const observer = new MutationObserver(mutations => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node instanceof HTMLImageElement) {
                    swapImageFromCache(node);
                } else if (node instanceof Element) {
                    for (const img of node.querySelectorAll<HTMLImageElement>("img")) {
                        swapImageFromCache(img);
                    }
                }
            }
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    function setupGradingObserver() {
        const gradingService = getOwner()?.lookup('service:grading');
        if (gradingService == null) {
            setTimeout(setupGradingObserver, 100);
            return;
        }
        const { addObserver } = (unsafeWindow as any).requireModule('@ember/object/observers');
        addObserver(gradingService, 'examQuestion', prefetchNextBooklet);
        prefetchNextBooklet();
    }

    setupGradingObserver();
});

