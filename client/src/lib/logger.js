const emit = (level, event) => {
    const payload = {
        app: 'ritmika',
        level,
        at: new Date().toISOString(),
        ...event,
    };

    if (level === 'error') {
        console.error('[Ritmika]', payload);
    } else if (level === 'warn') {
        console.warn('[Ritmika]', payload);
    }
};

export const logger = {
    error(event) {
        emit('error', event);
    },
    warn(event) {
        emit('warn', event);
    },
};
