const crypto = require('crypto');

const MAX_STRING_LENGTH = 500;
const MAX_STACK_LENGTH = 2000;
const REDACTED = '[REDACTED]';
const SENSITIVE_KEY = /(authorization|password|secret|token|api[-_]?key|access[-_]?token|refresh[-_]?token|cookie)/i;

const createCorrelationId = () => `ritmika-${crypto.randomUUID()}`;

const truncate = (value, maxLength = MAX_STRING_LENGTH) => {
    const text = String(value);
    return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
};

const normalizeError = (error) => ({
    name: error?.name || 'Error',
    message: truncate(error?.message || String(error)),
    code: error?.code || null,
    status: error?.status || error?.statusCode || null,
    stack: error?.stack ? truncate(error.stack, MAX_STACK_LENGTH) : null,
});

const sanitize = (value, key = '', seen = new WeakSet()) => {
    if (SENSITIVE_KEY.test(key)) return REDACTED;
    if (value instanceof Error) return normalizeError(value);
    if (value === null || value === undefined) return value;
    if (typeof value === 'string') return truncate(value);
    if (typeof value !== 'object') return value;
    if (seen.has(value)) return '[CIRCULAR]';
    seen.add(value);

    if (Array.isArray(value)) {
        return value.slice(0, 25).map((item) => sanitize(item, key, seen));
    }

    return Object.fromEntries(
        Object.entries(value)
            .slice(0, 50)
            .map(([entryKey, entryValue]) => [entryKey, sanitize(entryValue, entryKey, seen)]),
    );
};

const write = (level, event = {}) => {
    const safeEvent = sanitize(event);
    const payload = {
        ...safeEvent,
        app: 'ritmika',
        layer: safeEvent.layer || 'server',
        level,
        at: new Date().toISOString(),
        eventId: safeEvent.eventId || crypto.randomUUID(),
        correlationId: safeEvent.correlationId || createCorrelationId(),
        file: safeEvent.file || 'server/logger.js',
        function: safeEvent.function || safeEvent.fn || 'unknown',
        operation: safeEvent.operation || 'unknown',
        errorCode: safeEvent.errorCode || safeEvent.error?.code || null,
    };

    const output = JSON.stringify(payload);
    if (level === 'error') console.error(output);
    else if (level === 'warn') console.warn(output);
    else console.log(output);
    return payload;
};

const requestTelemetry = (req, res, next) => {
    const correlationId = req.get('x-ritmika-correlation-id') || createCorrelationId();
    const startedAt = Date.now();

    req.correlationId = correlationId;
    res.setHeader('x-ritmika-correlation-id', correlationId);
    res.on('finish', () => {
        const statusCode = res.statusCode;
        const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
        write(level, {
            file: 'server/logger.js',
            function: 'requestTelemetry',
            operation: 'http.response',
            errorCode: `HTTP_${statusCode}`,
            correlationId,
            method: req.method,
            route: req.originalUrl.split('?')[0],
            statusCode,
            durationMs: Date.now() - startedAt,
        });
    });

    next();
};

const logger = {
    error: (event) => write('error', event),
    warn: (event) => write('warn', event),
    info: (event) => write('info', event),
    debug: (event) => {
        if (process.env.RITMIKA_LOG_LEVEL === 'debug') return write('debug', event);
        return null;
    },
};

module.exports = { logger, requestTelemetry, createCorrelationId };
