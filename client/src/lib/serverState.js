import { QueryClient } from '@tanstack/react-query';
import { logger } from './logger.js';

const READ_METHOD = /^(get|list|find|search|count)/;
const namespaceRevisions = new Map();

const getRevision = (namespace) => namespaceRevisions.get(namespace) || 0;

const advanceNamespace = (namespace) => {
    namespaceRevisions.set(namespace, (namespaceRevisions.get(namespace) || 0) + 1);
};

export const serverState = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 60_000,
            gcTime: 30 * 60_000,
            retry: 2,
            retryDelay: (attempt) => Math.min(750 * (2 ** attempt), 8_000),
            refetchOnWindowFocus: false,
            refetchOnReconnect: true,
        },
    },
});

const stableArgs = (args) => args.map((value) => {
    if (value === undefined) return '__undefined__';
    if (value instanceof Date) return value.toISOString();
    return value;
});

export const createCachedRepository = (repository, namespace = 'ritmika') => new Proxy(repository, {
    get(target, property, receiver) {
        const member = Reflect.get(target, property, receiver);
        if (typeof member !== 'function' || typeof property !== 'string') return member;

        if (READ_METHOD.test(property)) {
            return (...args) => serverState.ensureQueryData({
                queryKey: [namespace, getRevision(namespace), property, ...stableArgs(args)],
                queryFn: () => member.apply(target, args),
                revalidateIfStale: true,
            });
        }

        return async (...args) => {
            const result = await member.apply(target, args);
            // Advance the key generation instead of removing active queries.
            // The next read is fresh while requests serving another route are
            // allowed to finish without a TanStack Query CancelledError.
            advanceNamespace(namespace);
            return result;
        };
    },
});

export const invalidateServerState = (source, context = {}) => {
    logger.info({
        file: 'client/src/lib/serverState.js',
        function: 'invalidateServerState',
        operation: 'server_state.invalidate',
        layer: 'client-data',
        status: 'ok',
        source,
        ...context,
    });
    return serverState.invalidateQueries({ refetchType: 'none' });
};

export const clearServerState = (source) => {
    namespaceRevisions.clear();
    logger.info({
        file: 'client/src/lib/serverState.js',
        function: 'clearServerState',
        operation: 'server_state.clear',
        layer: 'client-data',
        status: 'ok',
        source,
    });
    serverState.clear();
};
