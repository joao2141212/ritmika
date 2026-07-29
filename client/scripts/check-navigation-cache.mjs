import {
    createCachedRepository,
    invalidateServerState,
    serverState,
} from '../src/lib/serverState.js';

const assert = (condition, message) => {
    if (!condition) throw new Error(message);
};

const deferred = () => {
    let resolve;
    const promise = new Promise((done) => {
        resolve = done;
    });
    return { promise, resolve };
};

serverState.clear();

let readCount = 0;
let currentValue = { version: 1 };
let backgroundRead;
const repository = {
    async getSummary() {
        readCount += 1;
        if (backgroundRead) return backgroundRead.promise;
        return currentValue;
    },
    async updateSummary(nextValue) {
        currentValue = nextValue;
        return currentValue;
    },
};
const cachedRepository = createCachedRepository(repository, 'navigation-cache-test');

const first = await cachedRepository.getSummary();
const second = await cachedRepository.getSummary();
assert(first.version === 1 && second.version === 1, 'initial_cache_value_mismatch');
assert(readCount === 1, 'fresh_cache_did_not_deduplicate_reads');

backgroundRead = deferred();
await invalidateServerState('navigation-cache-test');
const staleRead = cachedRepository.getSummary();
const immediate = await Promise.race([
    staleRead,
    new Promise((resolve) => setTimeout(() => resolve('blocked'), 25)),
]);
assert(immediate?.version === 1, 'stale_cache_blocked_navigation');
assert(readCount === 2, 'stale_cache_did_not_start_background_refresh');

backgroundRead.resolve({ version: 2 });
backgroundRead = null;
await new Promise((resolve) => setTimeout(resolve, 0));
const refreshed = await cachedRepository.getSummary();
assert(refreshed.version === 2, 'background_refresh_did_not_replace_cache');

await cachedRepository.updateSummary({ version: 3 });
const afterMutation = await cachedRepository.getSummary();
assert(afterMutation.version === 3, 'mutation_did_not_force_fresh_read');
assert(readCount === 3, 'mutation_did_not_remove_cached_namespace');

serverState.clear();
process.stdout.write(`${JSON.stringify({
    status: 'ok',
    checks: 6,
    readCount,
})}\n`);
