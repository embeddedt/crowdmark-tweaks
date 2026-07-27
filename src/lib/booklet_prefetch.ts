
import { getOwner } from './ember_access';
import { isFeatureEnabled } from './feature_flags';

const ORIGIN = "https://app.crowdmark.com";

const crowdmarkImageUrl = /^https:\/\/([^\/]+)\/exam_pages\/([a-f0-9-]+)\?/;
/**
 * The two API requests worth prefetching: the booklet lookup the app makes on
 * every navigation, and the page list it follows up with. The rest of what it
 * fetches (evaluations, annotations, taggings) is small and left alone.
 */
const prefetchableApiUrl = /^(https:\/\/app\.crowdmark\.com)?\/api\/v2\/exams(\?filter|\/\d+\/exam-pages)/;

function toAbsoluteUrl(url: string) {
    return url.startsWith("/") ? ORIGIN + url : url;
}

function parseCrowdmarkImageUrl(url: string): { url: string; cacheKey: string } | null {
    const match = url.match(crowdmarkImageUrl);
    if (!match) return null;
    const [, hostname, uuid] = match;
    // The Expires/Signature query is regenerated every session, so a booklet
    // prefetched now is requested under a different URL later — key on the
    // unsigned form
    return { url, cacheKey: `https://${hostname}/exam_pages/${uuid}` };
}

const cachePromise = caches.open("cmtBookletPrefetchCache");

cachePromise.then(async(cache) => {
    // run cache maintenance
    // Clear any exam API entries left over from a previous session that didn't clean up
    const keys = await cache.keys();
    return Promise.all(keys.map(req => {
        if (prefetchableApiUrl.test(req.url)) {
            return cache.delete(req);
        } else {
            return null;
        }
    }).filter(Boolean)).then(_ => cache);
}).then(cache => {
    const origFetch = unsafeWindow.fetch.bind(unsafeWindow);

    (unsafeWindow as any).fetch = async function(input: RequestInfo | URL, init?: RequestInit) {
        if (isFeatureEnabled("Booklet prefetch") && typeof input === "string" && prefetchableApiUrl.test(input)) {
            const absoluteUrl = toAbsoluteUrl(input);
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
                    origFetch(url).then(response => {
                        if (!response.ok) {
                            return;
                        }
                        cache.put(cacheKey, response);
                    });
                }
            });
        }
    }

    async function fetchJson(url: string, init?: RequestInit): Promise<any | null> {
        const res = await origFetch(url, init);
        if (!res.ok) {
            console.warn(`prefetch request failed (${res.status}): ${url}`);
            return null;
        }
        return res.json();
    }

    /**
     * Store a request in the cache under the exact URL the app will ask for,
     * and hand back its body so the prefetch can walk to the next request.
     */
    async function fetchAndCache(url: string): Promise<any | null> {
        const cached = await cache.match(url);
        if (cached) {
            return cached.clone().json();
        }
        const res = await origFetch(url);
        if (!res.ok) {
            console.warn(`prefetch failed (${res.status}): ${url}`);
            return null;
        }
        await cache.put(url, res.clone());
        return res.json();
    }

    async function prefetchNextBooklet() {
        if (!isFeatureEnabled("Booklet prefetch")) return;
        const gradingService = getOwner()?.lookup('service:grading-enhanced');
        if (gradingService == null) {
            console.warn("could not get grading-enhanced service");
            return;
        }
        // service:grading still exists but is inert on this UI; the active
        // booklet lives on service:grading-enhanced
        const slug = gradingService.examMaster?.id;
        const examMasterQuestionId = gradingService.activeExamMasterQuestion?.id;
        const examQuestionId = gradingService.activeQuestion?.id;
        if (slug == null || examMasterQuestionId == null || examQuestionId == null) {
            return;
        }

        // Ask the server where "next" points, the same way the app does. Once an
        // assessment is partly graded this is rarely the adjacent booklet, so
        // exam.nextSequence — which drives the ← → arrows — would warm the wrong
        // one for anyone navigating by next-ungraded.
        const nextPayload = await fetchJson(
            `${ORIGIN}/api/v2/exam-master-questions/${examMasterQuestionId}/exam-questions/next`,
            { method: 'PUT', body: new URLSearchParams({ exam_question_id: String(examQuestionId) }) });
        const examRelationship = nextPayload?.data?.relationships?.exam;
        const nextExamId = examRelationship?.data?.id;
        if (nextExamId == null) {
            // Nothing ungraded left to move on to
            return;
        }

        // That payload carries the *question's* sequence, not the booklet's, and
        // the app looks a booklet up by (exam-master, sequence)
        const examRecord = await fetchJson(examRelationship.links?.related ?? `${ORIGIN}/api/v2/exams/${nextExamId}`);
        const sequence = examRecord?.data?.attributes?.sequence;
        if (sequence == null) {
            console.warn("could not resolve the sequence of exam " + nextExamId);
            return;
        }

        // Byte-identical to what the app requests on navigation, since the
        // cache matches on the whole URL
        await fetchAndCache(`${ORIGIN}/api/v2/exams?` + new URLSearchParams([
            ["filter[exam-master]", slug],
            ["filter[sequence]", String(sequence)],
        ]));

        // The page images are no longer sideloaded into the booklet payload
        const pagesPayload = await fetchAndCache(`${ORIGIN}/api/v2/exams/${nextExamId}/exam-pages`);
        if (pagesPayload == null) return;

        prefetchImages((pagesPayload.data ?? [])
            .map((o: any) => o.attributes?.url)
            .filter(Boolean));
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

    // `activeQuestion` and `exam` are getters rather than tracked fields, so
    // there is nothing dependable to observe — navigation is the signal. The
    // delay lets the service catch up with the new URL before it is read.
    let prefetchTimeout: number | undefined;
    function schedulePrefetch() {
        clearTimeout(prefetchTimeout);
        prefetchTimeout = setTimeout(prefetchNextBooklet, 750) as unknown as number;
    }

    window.addEventListener("urlchange", schedulePrefetch);
    schedulePrefetch();
});

