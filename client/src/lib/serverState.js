import { QueryClient } from '@tanstack/react-query';
import { logger } from './logger.js';

const READ_METHOD = /^(get|list|find|search|count)/;

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
                queryKey: [namespace, property, ...stableArgs(args)],
                queryFn: () => member.apply(target, args),
                revalidateIfStale: true,
            });
        }

        return async (...args) => {
            const result = await member.apply(target, args);
            // Mark related reads as stale without cancelling requests that are
            // still serving another route. Removing the namespace here caused
            // TanStack Query CancelledError failures during normal navigation.
            await serverState.invalidateQueries({
                queryKey: [namespace],
                refetchType: 'none',
            });
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
