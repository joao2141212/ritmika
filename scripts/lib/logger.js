const { randomUUID } = require('crypto');

const error = ({
    file,
    functionName,
    operation,
    error: cause,
    errorCode = 'SCRIPT_OPERATION_FAILED',
    context = {},
}) => {
    const normalized = cause instanceof Error ? cause : new Error(String(cause));
    console.error(JSON.stringify({
        app: 'ritmika',
        layer: 'script',
        level: 'error',
        at: new Date().toISOString(),
        eventId: randomUUID(),
        file,
        function: functionName,
        operation,
        status: 'error',
        errorCode,
        ...context,
        error: normalized.message,
        stack: normalized.stack?.slice(0, 2000),
    }));
};

module.exports = { error };
