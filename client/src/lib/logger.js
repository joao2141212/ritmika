const APP_NAME = 'ritmika';
const MAX_BUFFER_SIZE = 200;
const MAX_STRING_LENGTH = 500;
const SECRET_KEY_PATTERN = /(authorization|password|passwd|secret|token|api[-_]?key|access[-_]?token|refresh[-_]?token|cookie|set-cookie)/i;
const PII_KEY_PATTERN = /^(email|phone|telefone|address|endereco)$/i;

const MODULE_FILES = Object.freeze({
    AuthContext: 'client/src/context/AuthContext.jsx',
    ChecklistBuilder: 'client/src/components/ChecklistBuilder.jsx',
    ChecklistBuilderWorkspace: 'client/src/components/ChecklistBuilderWorkspace.jsx',
    ChecklistExecutionWorkspace: 'client/src/components/ChecklistExecutionWorkspace.jsx',
    ChecklistWorkspace: 'client/src/components/ChecklistWorkspace.jsx',
    ChecklistContagem: 'client/src/pages/ChecklistContagem.jsx',
    ChecklistHistorico: 'client/src/pages/ChecklistHistorico.jsx',
    Checklists: 'client/src/pages/Checklists.jsx',
    DashboardRemote: 'client/src/pages/DashboardRemote.jsx',
    remoteChecklistRepository: 'client/src/data/remoteChecklistRepository.js',
    supabaseService: 'client/src/services/supabaseService.js',
    tracedFetch: 'client/src/lib/supabase.js',
});

const eventBuffer = [];
const sessionId = createId();
let context = {};
let globalHandlersInstalled = false;
let internalConsoleEmission = false;

function createId() {
    const randomId = globalThis.crypto?.randomUUID?.();
    return randomId || `ritmika-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function truncate(value, maxLength = MAX_STRING_LENGTH) {
    const text = String(value);
    return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
}

function sanitize(value, key = '', seen = new WeakSet()) {
    if (SECRET_KEY_PATTERN.test(key)) return '[REDACTED]';
    if (PII_KEY_PATTERN.test(key)) return '[REDACTED]';
    if (value === null || value === undefined || typeof value === 'boolean' || typeof value === 'number') return value;
    if (typeof value === 'string') return truncate(value);
    if (typeof value === 'function') return '[Function]';
    if (value instanceof Error) return normalizeError(value);
    if (typeof value !== 'object') return truncate(value);
    if (seen.has(value)) return '[Circular]';
    seen.add(value);

    if (Array.isArray(value)) return value.slice(0, 25).map((item) => sanitize(item, key, seen));

    return Object.entries(value).slice(0, 50).reduce((result, [entryKey, entryValue]) => {
        result[entryKey] = sanitize(entryValue, entryKey, seen);
        return result;
    }, {});
}

function normalizeError(error) {
    if (!error) return null;
    if (error instanceof Error) {
        return {
            name: error.name,
            message: truncate(error.message),
            code: error.code || null,
            status: error.status || error.statusCode || null,
            stack: truncate(error.stack || '', 2000),
        };
    }
    if (typeof error === 'object') {
        return {
            name: error.name || 'Error',
            message: truncate(error.message || error.error_description || String(error)),
            code: error.code || null,
            status: error.status || error.statusCode || null,
        };
    }
    return { name: 'Error', message: truncate(error), code: null, status: null };
}

function currentRoute() {
    return globalThis.location?.pathname || 'unknown';
}

function sourceDetails(event) {
    const rawFunction = event.function || event.fn || 'unknown';
    const moduleName = String(event.module || rawFunction).split('.')[0];
    const file = event.file || MODULE_FILES[moduleName] || 'unknown';
    return {
        file,
        functionName: rawFunction,
        sourceResolution: event.file ? 'declared' : (MODULE_FILES[moduleName] ? 'module-map' : 'unknown'),
    };
}

function inferredErrorCode(event, normalizedError) {
    if (event.errorCode) return event.errorCode;
    if (normalizedError?.code) return normalizedError.code;
    const statusCode = Number(event.httpStatus || event.statusCode || normalizedError?.status || 0);
    if (statusCode >= 400) return `HTTP_${statusCode}`;
    if (normalizedError?.name) return normalizedError.name.toUpperCase();
    return event.status === 'error' ? 'CLIENT_ERROR' : null;
}

function runtimeSourceFromStack(stack) {
    const frames = String(stack || '').split('\n').slice(1);
    const frame = frames.find((line) => !line.includes('/lib/logger.') && !line.includes('logger.js'));
    const match = frame?.match(/at\s+(.*?)\s+\((.*?):(\d+):(\d+)\)|at\s+(.*?):(\d+):(\d+)/);
    if (!match) return { file: 'unknown', functionName: 'console.error' };
    return {
        functionName: match[1] || match[5] || 'console.error',
        file: match[2] || match[6] || 'unknown',
        line: Number(match[3] || match[7] || 0) || null,
        column: Number(match[4] || match[8] || 0) || null,
    };
}

function writeConsole(level, payload) {
    const writer = level === 'error' ? console.error : level === 'warn' ? console.warn : console.info;
    internalConsoleEmission = true;
    try {
        writer.call(console, '[Ritmika]', payload);
    } finally {
        internalConsoleEmission = false;
    }
}

function emit(level, event = {}) {
    const safeEvent = sanitize(event);
    const normalizedError = normalizeError(event.error);
    const source = sourceDetails(event);
    const payload = {
        ...safeEvent,
        app: APP_NAME,
        layer: event.layer || 'client',
        level,
        at: new Date().toISOString(),
        eventId: createId(),
        correlationId: event.correlationId || createId(),
        sessionId,
        route: event.route || currentRoute(),
        file: source.file,
        function: source.functionName,
        operation: event.operation || event.op || source.functionName,
        sourceResolution: source.sourceResolution,
        errorCode: inferredErrorCode(event, normalizedError),
    };

    if (normalizedError) payload.error = normalizedError;
    eventBuffer.push(payload);
    if (eventBuffer.length > MAX_BUFFER_SIZE) eventBuffer.shift();

    if (typeof globalThis.dispatchEvent === 'function' && typeof globalThis.CustomEvent === 'function') {
        globalThis.dispatchEvent(new CustomEvent('ritmika:telemetry', { detail: payload }));
    }

    writeConsole(level, payload);
    return payload;
}

export const logger = {
    createCorrelationId: createId,
    getSessionId: () => sessionId,
    setContext(nextContext = {}) {
        context = { ...context, ...sanitize(nextContext) };
        return { ...context };
    },
    getContext() {
        return { ...context };
    },
    getEvents() {
        return [...eventBuffer];
    },
    clearEvents() {
        eventBuffer.length = 0;
    },
    child(childContext = {}) {
        return {
            error: (event = {}) => emit('error', { ...childContext, ...event }),
            warn: (event = {}) => emit('warn', { ...childContext, ...event }),
            info: (event = {}) => emit('info', { ...childContext, ...event }),
        };
    },
    error(event = {}) {
        return emit('error', { ...context, ...event });
    },
    warn(event = {}) {
        return emit('warn', { ...context, ...event });
    },
    info(event = {}) {
        return emit('info', { ...context, ...event });
    },
};

export const installGlobalTelemetry = () => {
    if (typeof window === 'undefined' || globalHandlersInstalled) return () => {};
    globalHandlersInstalled = true;

    const originalConsoleError = console.error.bind(console);
    const originalConsoleWarn = console.warn.bind(console);
    console.error = (...args) => {
        if (!internalConsoleEmission) {
            const stack = new Error().stack;
            const source = runtimeSourceFromStack(stack);
            logger.error({
                file: source.file,
                function: source.functionName,
                operation: 'console.error',
                errorCode: 'UNSTRUCTURED_CONSOLE_ERROR',
                line: source.line,
                column: source.column,
                stack,
                arguments: args,
            });
        }
        originalConsoleError(...args);
    };
    console.warn = (...args) => {
        if (!internalConsoleEmission) {
            const stack = new Error().stack;
            const source = runtimeSourceFromStack(stack);
            logger.warn({
                file: source.file,
                function: source.functionName.replace('console.error', 'console.warn'),
                operation: 'console.warn',
                errorCode: 'UNSTRUCTURED_CONSOLE_WARN',
                line: source.line,
                column: source.column,
                stack,
                arguments: args,
            });
        }
        originalConsoleWarn(...args);
    };

    const handleError = (event) => {
        logger.error({
            file: event.filename || event.target?.src || 'window',
            function: 'window.onerror',
            operation: 'uncaught_exception',
            errorCode: 'UNCAUGHT_CLIENT_ERROR',
            line: event.lineno || null,
            column: event.colno || null,
            error: event.error || event.message,
        });
    };
    const handleRejection = (event) => {
        logger.error({
            file: 'client/src/lib/logger.js',
            function: 'window.unhandledrejection',
            operation: 'unhandled_promise_rejection',
            errorCode: 'UNHANDLED_PROMISE_REJECTION',
            error: event.reason,
        });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);
    return () => {
        window.removeEventListener('error', handleError);
        window.removeEventListener('unhandledrejection', handleRejection);
        console.error = originalConsoleError;
        console.warn = originalConsoleWarn;
        globalHandlersInstalled = false;
    };
};

if (typeof globalThis !== 'undefined') {
    globalThis.__RITMIKA_TELEMETRY__ = {
        getEvents: () => logger.getEvents(),
        clear: () => logger.clearEvents(),
        sessionId,
    };
}
